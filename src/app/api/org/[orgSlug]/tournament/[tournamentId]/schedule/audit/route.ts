import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  matches,
  tournamentClasses,
  tournamentFields,
  tournamentStadiums,
  type ScheduleConfig,
} from "@/db/schema";
import { isError, requireGameAdmin } from "@/lib/game-auth";

export const dynamic = "force-dynamic";

type Params = { orgSlug: string; tournamentId: string };

// ─── Response types ───────────────────────────────────────────────────────────

interface Violation {
  type: string;
  severity: "error" | "warning";
  matchIds: number[];
  teamName?: string;
  fieldName?: string;
  message: string;
}

interface FieldDayStats {
  date: string;
  matchCount: number;
  openMinutes: number;
  usedMinutes: number;
  utilizationPct: number;
  idleGapMinutes: number;
}

interface FieldStats {
  fieldId: number;
  fieldName: string;
  stadiumName: string;
  days: FieldDayStats[];
  overallUtilizationPct: number;
}

interface TeamStats {
  teamId: number;
  teamName: string;
  totalScheduled: number;
  groupMatches: number;
  playoffMatches: number;
  matchesPerDay: Record<string, number>;
  homeMatches: number;
  awayMatches: number;
  minRestMinutes: number | null;
  avgRestMinutes: number | null;
  restViolations: number;
  backTobacks: number;
  maxConsecutiveStreak: number;   // longest back-to-back chain (gaps < comfortableRest)
  consecutiveInstances: number;   // how many times played 2+ in a row
}

interface DayLoad {
  date: string;
  matchCount: number;
  activeFields: number;
}

interface AuditReport {
  generatedAt: string;
  overview: {
    totalMatches: number;
    scheduledMatches: number;
    unscheduledMatches: number;
    hardViolations: number;
    warnings: number;
    grade: string;
    gradeScore: number;
  };
  violations: Violation[];
  fieldStats: FieldStats[];
  teamStats: TeamStats[];
  dayLoad: DayLoad[];
  roundOrderOk: boolean;
  roundOrderIssues: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert "HH:MM" to minutes since midnight */
function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Extract UTC date string "YYYY-MM-DD" from a Date (or timestamp) */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Compute match slot duration in minutes from a ScheduleConfig */
function matchSlotMinutes(cfg: ScheduleConfig): number {
  const halvesCount = cfg.halvesCount ?? 2;
  const halfDur = cfg.halfDurationMinutes ?? 20;
  const breakBetween = halvesCount === 2 ? (cfg.breakBetweenHalvesMinutes ?? 0) : 0;
  return halvesCount * halfDur + breakBetween;
}

/** Grade from score */
function gradeFromScore(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

// ─── Route ───────────────────────────────────────────────────────────────────

/**
 * GET /api/org/[orgSlug]/tournament/[tournamentId]/schedule/audit
 *
 * Computes a full schedule audit: hard violations, warnings, utilisation,
 * team stats, day load and an A+…F grade.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const tid = ctx.tournament.id;

  // ── 1. Load data ────────────────────────────────────────────────────────────

  const [rawMatches, classes, fields] = await Promise.all([
    db.query.matches.findMany({
      where: and(eq(matches.tournamentId, tid), isNull(matches.deletedAt)),
      with: {
        homeTeam: true,
        awayTeam: true,
        field: { with: { stadium: true } },
        stage: true,
        group: true,
        round: true,
      },
    }),
    db.select().from(tournamentClasses).where(eq(tournamentClasses.tournamentId, tid)),
    db.query.tournamentFields.findMany({
      where: eq(tournamentFields.tournamentId, tid),
      with: { stadium: true },
    }),
  ]);

  // Map classId → ScheduleConfig
  const classConfigMap = new Map<number, ScheduleConfig>();
  for (const cls of classes) {
    if (cls.scheduleConfig) classConfigMap.set(cls.id, cls.scheduleConfig);
  }

  // Resolve display name for teams (teams.name is optional; fall back to team id label)
  function teamName(team: { id: number; name?: string | null } | null | undefined): string {
    if (!team) return "TBD";
    return team.name ?? `Team #${team.id}`;
  }

  // Partition into scheduled / unscheduled
  const scheduled = rawMatches.filter(m => m.scheduledAt && m.fieldId);
  const unscheduled = rawMatches.filter(m => !m.scheduledAt || !m.fieldId);

  const totalMatches = rawMatches.length;
  const scheduledCount = scheduled.length;
  const unscheduledCount = unscheduled.length;

  // ── 2. Build per-match slot info ────────────────────────────────────────────

  interface MatchSlot {
    matchId: number;
    fieldId: number;
    startMins: number;   // epoch-minutes
    endMins: number;     // epoch-minutes
    durationMins: number;
    bufferBefore: number;
    bufferAfter: number;
    date: string;        // UTC date string
    homeTeamId: number | null;
    awayTeamId: number | null;
    homeTeamName: string;
    awayTeamName: string;
    groupRound: number | null;
    groupId: number | null;
    roundId: number | null; // null = group stage; non-null = knockout
    stageClassId: number | null;
    stageOrder: number;
    scheduledAt: Date;
    fieldName: string;
    stadiumId: number | null;
  }

  const slots: MatchSlot[] = [];
  for (const m of scheduled) {
    const sa = m.scheduledAt!;
    const startMins = Math.floor(new Date(sa).getTime() / 60000);
    const classId = m.stage?.classId ?? null;
    const cfg = classId ? classConfigMap.get(classId) : undefined;

    let duration = 45; // fallback
    let bufBefore = 0;
    let bufAfter = 0;
    if (cfg) {
      duration = matchSlotMinutes(cfg);
      bufBefore = m.bufferBeforeMinutes ?? cfg.bufferBeforeMinutes ?? 0;
      bufAfter = m.bufferAfterMinutes ?? cfg.bufferAfterMinutes ?? 0;
    }

    slots.push({
      matchId: m.id,
      fieldId: m.fieldId!,
      startMins,
      endMins: startMins + bufBefore + duration + bufAfter,
      durationMins: duration,
      bufferBefore: bufBefore,
      bufferAfter: bufAfter,
      date: toDateStr(new Date(sa)),
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeTeamName: teamName(m.homeTeam),
      awayTeamName: teamName(m.awayTeam),
      groupRound: m.groupRound,
      groupId: m.groupId,
      roundId: m.roundId,
      stageClassId: classId,
      stageOrder: m.stage?.order ?? 0,
      scheduledAt: new Date(sa),
      fieldName: m.field?.name ?? `Field #${m.fieldId}`,
      stadiumId: m.field?.stadiumId ?? null,
    });
  }

  // ── 3. Violations ───────────────────────────────────────────────────────────

  const violations: Violation[] = [];

  // A1: field_conflict — overlapping matches on same field
  const byField = new Map<number, MatchSlot[]>();
  for (const s of slots) {
    if (!byField.has(s.fieldId)) byField.set(s.fieldId, []);
    byField.get(s.fieldId)!.push(s);
  }
  for (const [, fieldSlots] of byField) {
    const sorted = [...fieldSlots].sort((a, b) => a.startMins - b.startMins);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (b.startMins < a.endMins) {
        violations.push({
          type: "field_conflict",
          severity: "error",
          matchIds: [a.matchId, b.matchId],
          fieldName: a.fieldName,
          message: `Конфликт на поле "${a.fieldName}": матчи #${a.matchId} и #${b.matchId} перекрываются`,
        });
      }
    }
  }

  // A2: team_conflict — same team in two overlapping matches
  const teamSlots = new Map<number, MatchSlot[]>();
  for (const s of slots) {
    for (const tid of [s.homeTeamId, s.awayTeamId]) {
      if (!tid) continue;
      if (!teamSlots.has(tid)) teamSlots.set(tid, []);
      teamSlots.get(tid)!.push(s);
    }
  }
  for (const [tId, tSlots] of teamSlots) {
    const sorted = [...tSlots].sort((a, b) => a.startMins - b.startMins);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (b.startMins < a.endMins) {
        const name = a.homeTeamId === tId ? a.homeTeamName : a.awayTeamName;
        violations.push({
          type: "team_conflict",
          severity: "error",
          matchIds: [a.matchId, b.matchId],
          teamName: name,
          message: `Конфликт команды "${name}": матчи #${a.matchId} и #${b.matchId} пересекаются`,
        });
      }
    }
  }

  // A3: outside_hours — match ends after field's close time
  // Build a map of stadiumId+date → {startTime, endTime} from class configs (stadiumDaySchedule)
  // Also fall back to class dailyEndTime
  const stadiumDayClose = new Map<string, number>(); // key="stadiumId:date" → closeTimeMins
  const stadiumDayOpen = new Map<string, number>();
  for (const cls of classes) {
    const cfg = cls.scheduleConfig;
    if (!cfg) continue;
    if (cfg.stadiumDaySchedule) {
      for (const sds of cfg.stadiumDaySchedule) {
        const key = `${sds.stadiumId}:${sds.date}`;
        if (sds.endTime && !stadiumDayClose.has(key)) {
          stadiumDayClose.set(key, timeToMins(sds.endTime));
        }
        if (sds.startTime && !stadiumDayOpen.has(key)) {
          stadiumDayOpen.set(key, timeToMins(sds.startTime));
        }
      }
    }
  }

  // Global default end time from first class config that has it
  let globalDailyEndMins: number | null = null;
  let globalDailyStartMins: number | null = null;
  for (const cls of classes) {
    const cfg = cls.scheduleConfig;
    if (cfg) {
      if (globalDailyEndMins === null && cfg.dailyEndTime) {
        globalDailyEndMins = timeToMins(cfg.dailyEndTime);
      }
      if (globalDailyStartMins === null && cfg.dailyStartTime) {
        globalDailyStartMins = timeToMins(cfg.dailyStartTime);
      }
      if (globalDailyEndMins !== null && globalDailyStartMins !== null) break;
    }
  }

  for (const s of slots) {
    const stadId = s.stadiumId;
    if (!stadId) continue;
    const key = `${stadId}:${s.date}`;
    const closeMins = stadiumDayClose.get(key) ?? globalDailyEndMins;
    if (closeMins === null) continue;

    // Convert endMins (epoch-minutes) to minutes-since-midnight (UTC)
    const endOfDayMins = s.endMins % (24 * 60);
    if (endOfDayMins > closeMins) {
      violations.push({
        type: "outside_hours",
        severity: "error",
        matchIds: [s.matchId],
        fieldName: s.fieldName,
        message: `Матч #${s.matchId} на поле "${s.fieldName}" заканчивается после закрытия (${Math.floor(endOfDayMins / 60)}:${String(endOfDayMins % 60).padStart(2, "0")} > ${Math.floor(closeMins / 60)}:${String(closeMins % 60).padStart(2, "0")})`,
      });
    }
  }

  // B4 & B5: rest_violation and back_to_back per team
  let restViolationCount = 0;
  let backToBackCount = 0;

  // Get minRest from config (use first class config that has it)
  let globalMinRest = 60; // fallback 60 min
  for (const cls of classes) {
    const cfg = cls.scheduleConfig;
    if (cfg?.minRestBetweenTeamMatchesMinutes) {
      globalMinRest = cfg.minRestBetweenTeamMatchesMinutes;
      break;
    }
  }

  for (const [tId, tSlots] of teamSlots) {
    const sorted = [...tSlots].sort((a, b) => a.startMins - b.startMins);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      // rest = next start - prev end (from slot perspective, no buffer overlap)
      const restMins = b.startMins - a.endMins;
      const name = a.homeTeamId === tId ? a.homeTeamName : a.awayTeamName;

      // Get per-class minRest if available
      let minRest = globalMinRest;
      const classId = a.stageClassId;
      if (classId) {
        const cfg = classConfigMap.get(classId);
        if (cfg?.minRestBetweenTeamMatchesMinutes) {
          minRest = cfg.minRestBetweenTeamMatchesMinutes;
        }
      }

      if (restMins < minRest) {
        restViolationCount++;
        violations.push({
          type: "rest_violation",
          severity: "warning",
          matchIds: [a.matchId, b.matchId],
          teamName: name,
          message: `Команда "${name}": отдых ${restMins} мин между матчами #${a.matchId} и #${b.matchId} < минимума ${minRest} мин`,
        });
      } else {
        // "Back-to-back" soft warning: rest is above the hard minimum but still
        // uncomfortably short. Threshold scales with match duration so short
        // youth matches (U12 = 25 min) don't fire for perfectly normal gaps.
        // Formula: comfortable rest = matchDuration × 3 (≥ 60 min floor).
        // U12 (25 min): 75 min  — 115 min rest → no warning ✓
        // U14 (55 min): 165 min — 115 min rest → warning ✓
        // U18 (90 min): 270 min — 115 min rest → warning ✓
        const matchDurMins = a.endMins - a.startMins;
        const comfortableRest = Math.max(60, matchDurMins * 3);
        if (restMins < comfortableRest) {
          backToBackCount++;
          violations.push({
            type: "back_to_back",
            severity: "warning",
            matchIds: [a.matchId, b.matchId],
            teamName: name,
            message: `Команда "${name}": короткий отдых ${restMins} мин между матчами #${a.matchId} и #${b.matchId}`,
          });
        }
      }
    }
  }

  // B6: unscheduled
  for (const m of unscheduled) {
    violations.push({
      type: "unscheduled",
      severity: "warning",
      matchIds: [m.id],
      message: `Матч #${m.id} не назначен (нет времени или поля)`,
    });
  }

  // ── 4. Field statistics ─────────────────────────────────────────────────────

  const fieldMap = new Map(fields.map(f => [f.id, f]));
  const fieldStats: FieldStats[] = [];

  for (const f of fields) {
    const fSlots = slots.filter(s => s.fieldId === f.id);
    if (fSlots.length === 0) {
      fieldStats.push({
        fieldId: f.id,
        fieldName: f.name,
        stadiumName: f.stadium?.name ?? "—",
        days: [],
        overallUtilizationPct: 0,
      });
      continue;
    }

    // Group by date
    const dayMap = new Map<string, MatchSlot[]>();
    for (const s of fSlots) {
      if (!dayMap.has(s.date)) dayMap.set(s.date, []);
      dayMap.get(s.date)!.push(s);
    }

    const days: FieldDayStats[] = [];
    for (const [date, dSlots] of dayMap) {
      const sorted = [...dSlots].sort((a, b) => a.startMins - b.startMins);
      const usedMinutes = dSlots.reduce((sum, s) => sum + s.durationMins + s.bufferBefore + s.bufferAfter, 0);

      // Find open window from stadium schedule
      const stadId = f.stadiumId;
      const key = stadId ? `${stadId}:${date}` : null;
      const openStart = (key ? stadiumDayOpen.get(key) : null) ?? globalDailyStartMins ?? timeToMins("09:00");
      const openEnd = (key ? stadiumDayClose.get(key) : null) ?? globalDailyEndMins ?? timeToMins("21:00");
      const openMinutes = Math.max(0, openEnd - openStart);

      // Idle gap: sum of gaps between consecutive matches
      let idleGapMinutes = 0;
      for (let i = 0; i < sorted.length - 1; i++) {
        const gap = sorted[i + 1].startMins - sorted[i].endMins;
        if (gap > 0) idleGapMinutes += gap;
      }

      const utilizationPct = openMinutes > 0 ? Math.round((usedMinutes / openMinutes) * 100) : 0;
      days.push({ date, matchCount: dSlots.length, openMinutes, usedMinutes, utilizationPct, idleGapMinutes });
    }

    const totalOpen = days.reduce((s, d) => s + d.openMinutes, 0);
    const totalUsed = days.reduce((s, d) => s + d.usedMinutes, 0);
    const overallUtilizationPct = totalOpen > 0 ? Math.round((totalUsed / totalOpen) * 100) : 0;

    fieldStats.push({
      fieldId: f.id,
      fieldName: f.name,
      stadiumName: f.stadium?.name ?? "—",
      days: days.sort((a, b) => a.date.localeCompare(b.date)),
      overallUtilizationPct,
    });
  }

  // ── 5. Team statistics ──────────────────────────────────────────────────────

  const teamStatsMap = new Map<number, TeamStats>();

  // comfortable rest threshold for "consecutive" detection = 2 × minRest or 120 min, whichever larger
  const comfortableRest = Math.max(120, globalMinRest * 2);

  function getOrCreateTeamStat(tId: number, name: string): TeamStats {
    if (!teamStatsMap.has(tId)) {
      teamStatsMap.set(tId, {
        teamId: tId,
        teamName: name,
        totalScheduled: 0,
        groupMatches: 0,
        playoffMatches: 0,
        matchesPerDay: {},
        homeMatches: 0,
        awayMatches: 0,
        minRestMinutes: null,
        avgRestMinutes: null,
        restViolations: 0,
        backTobacks: 0,
        maxConsecutiveStreak: 0,
        consecutiveInstances: 0,
      });
    }
    return teamStatsMap.get(tId)!;
  }

  for (const s of slots) {
    const isPlayoff = !s.groupId && !!s.roundId;
    if (s.homeTeamId) {
      const ts = getOrCreateTeamStat(s.homeTeamId, s.homeTeamName);
      ts.totalScheduled++;
      ts.homeMatches++;
      ts.matchesPerDay[s.date] = (ts.matchesPerDay[s.date] ?? 0) + 1;
      if (isPlayoff) ts.playoffMatches++; else ts.groupMatches++;
    }
    if (s.awayTeamId) {
      const ts = getOrCreateTeamStat(s.awayTeamId, s.awayTeamName);
      ts.totalScheduled++;
      ts.awayMatches++;
      ts.matchesPerDay[s.date] = (ts.matchesPerDay[s.date] ?? 0) + 1;
      if (isPlayoff) ts.playoffMatches++; else ts.groupMatches++;
    }
  }

  // Rest stats + consecutive streak per team
  for (const [tId, tSlotList] of teamSlots) {
    const sorted = [...tSlotList].sort((a, b) => a.startMins - b.startMins);
    const rests: number[] = [];
    let restViol = 0;
    let b2b = 0;

    const name = sorted[0]?.homeTeamId === tId ? sorted[0].homeTeamName : sorted[0]?.awayTeamName ?? `Team #${tId}`;
    const ts = getOrCreateTeamStat(tId, name);

    let minRest = globalMinRest;
    const firstClassId = sorted[0]?.stageClassId;
    if (firstClassId) {
      const cfg = classConfigMap.get(firstClassId);
      if (cfg?.minRestBetweenTeamMatchesMinutes) minRest = cfg.minRestBetweenTeamMatchesMinutes;
    }

    // Consecutive streak: chain of matches where each gap < comfortableRest
    let currentStreak = 1;
    let maxStreak = 1;
    let consecutiveInstances = 0;

    for (let i = 0; i < sorted.length - 1; i++) {
      const rest = sorted[i + 1].startMins - sorted[i].endMins;
      rests.push(rest);
      if (rest < minRest) restViol++;
      else if (rest < 120) b2b++;

      if (rest < comfortableRest) {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        if (currentStreak >= 2) consecutiveInstances++;
        currentStreak = 1;
      }
    }
    if (currentStreak >= 2) consecutiveInstances++;

    ts.minRestMinutes = rests.length > 0 ? Math.min(...rests) : null;
    ts.avgRestMinutes = rests.length > 0 ? Math.round(rests.reduce((a, b) => a + b, 0) / rests.length) : null;
    ts.restViolations = restViol;
    ts.backTobacks = b2b;
    ts.maxConsecutiveStreak = sorted.length > 1 ? maxStreak : 0;
    ts.consecutiveInstances = consecutiveInstances;
  }

  const teamStats = [...teamStatsMap.values()].sort((a, b) => a.teamName.localeCompare(b.teamName));

  // ── 6. Day load ─────────────────────────────────────────────────────────────

  const dayMatchMap = new Map<string, Set<number>>(); // date → set of fieldIds
  const dayCountMap = new Map<string, number>();
  for (const s of slots) {
    dayCountMap.set(s.date, (dayCountMap.get(s.date) ?? 0) + 1);
    if (!dayMatchMap.has(s.date)) dayMatchMap.set(s.date, new Set());
    dayMatchMap.get(s.date)!.add(s.fieldId);
  }
  const dayLoad: DayLoad[] = [...dayCountMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, matchCount]) => ({
      date,
      matchCount,
      activeFields: dayMatchMap.get(date)?.size ?? 0,
    }));

  // ── 7. Round order check ────────────────────────────────────────────────────

  const roundOrderIssues: string[] = [];

  // Group stage matches should finish before knockout matches start — checked
  // PER DIVISION (classId) to avoid false positives when divisions run on
  // different days (e.g. U12 playoffs on Saturday while U14 groups still run).
  const groupSlots = slots.filter(s => s.groupId && !s.roundId);
  const knockoutSlots = slots.filter(s => !s.groupId && s.roundId);

  const divisionIds = new Set([
    ...groupSlots.map(s => s.stageClassId),
    ...knockoutSlots.map(s => s.stageClassId),
  ]);

  for (const divId of divisionIds) {
    const divGroupSlots = groupSlots.filter(s => s.stageClassId === divId);
    const divKoSlots = knockoutSlots.filter(s => s.stageClassId === divId);
    if (divGroupSlots.length === 0 || divKoSlots.length === 0) continue;
    const lastGroupEnd = Math.max(...divGroupSlots.map(s => s.endMins));
    const firstKoStart = Math.min(...divKoSlots.map(s => s.startMins));
    if (firstKoStart < lastGroupEnd) {
      roundOrderIssues.push("Матчи плей-офф начинаются до окончания всех групповых матчей");
      break; // one message is enough
    }
  }

  // Within group stage: groupRound N must all end before groupRound N+1 starts
  const groupRoundMap = new Map<string, MatchSlot[]>(); // "groupId:round" → slots
  for (const s of groupSlots) {
    if (s.groupRound === null || s.groupId === null) continue;
    const key = `${s.groupId}:${s.groupRound}`;
    if (!groupRoundMap.has(key)) groupRoundMap.set(key, []);
    groupRoundMap.get(key)!.push(s);
  }

  // Check consecutive rounds per group
  const groupIds = new Set(groupSlots.map(s => s.groupId).filter(Boolean) as number[]);
  for (const gId of groupIds) {
    const rounds = [...new Set(groupSlots.filter(s => s.groupId === gId).map(s => s.groupRound).filter(r => r !== null) as number[])].sort((a, b) => a - b);
    for (let i = 0; i < rounds.length - 1; i++) {
      const curSlots = groupRoundMap.get(`${gId}:${rounds[i]}`) ?? [];
      const nextSlots = groupRoundMap.get(`${gId}:${rounds[i + 1]}`) ?? [];
      if (curSlots.length === 0 || nextSlots.length === 0) continue;
      const curEnd = Math.max(...curSlots.map(s => s.endMins));
      const nextStart = Math.min(...nextSlots.map(s => s.startMins));
      if (nextStart < curEnd) {
        roundOrderIssues.push(`Группа #${gId}: тур ${rounds[i + 1]} начинается до окончания тура ${rounds[i]}`);
      }
    }
  }

  const roundOrderOk = roundOrderIssues.length === 0;

  // ── 8. Grade ─────────────────────────────────────────────────────────────────

  const hardViolations = violations.filter(v => v.severity === "error").length;
  const warnings = violations.filter(v => v.severity === "warning" && v.type !== "unscheduled").length;

  let score = 100;
  // Hard violations (field/team overlap, blackout breach) — critical, -25 each.
  score -= hardViolations * 25;
  // Rest rule violations (below configured minimum) — real infraction, -8 each.
  score -= restViolationCount * 8;
  // Back-to-back comfort warnings — soft advisory only. Cap total deduction at 10
  // so that large tournaments with many comfort gaps don't drop to F for no reason.
  score -= Math.min(backToBackCount * 2, 10);
  // Unscheduled matches — serious gap in the schedule, up to -40 total.
  if (totalMatches > 0) score -= (unscheduledCount / totalMatches) * 40;
  score = Math.max(0, score);
  const grade = gradeFromScore(score);

  // ── 9. Build response ────────────────────────────────────────────────────────

  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    overview: {
      totalMatches,
      scheduledMatches: scheduledCount,
      unscheduledMatches: unscheduledCount,
      hardViolations,
      warnings,
      grade,
      gradeScore: Math.round(score),
    },
    violations,
    fieldStats,
    teamStats,
    dayLoad,
    roundOrderOk,
    roundOrderIssues,
  };

  return NextResponse.json(report);
}
