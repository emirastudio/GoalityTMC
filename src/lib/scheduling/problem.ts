/**
 * Problem builder — pure function from a plain DB snapshot to a `Problem`.
 *
 * This is the ONLY boundary where scheduling v2 interacts with DB-shaped data.
 * The solver never imports Drizzle or a DB client; instead the API route reads
 * everything under a REPEATABLE READ transaction and hands this function a
 * plain object. Same snapshot + same seed = same Solution.
 */

import { createHash } from "node:crypto";
import { buildSlotPool, enumerateDays, localToUtc, resolveFieldHours } from "./time";
import {
  DEFAULT_WEIGHTS,
  type Blackout,
  type IsoDate,
  type LocalTime,
  type MatchTemplate,
  type Problem,
  type Referee,
  type RefereeRole,
  type Slot,
  type Team,
  type TimeZone,
  type Weights,
} from "./types";

// ═════════════════════ Snapshot shape ═════════════════════
// Match the DB columns 1:1 so the API route can feed query results directly.

export type DbSnapshot = {
  tournamentId: number;
  organizationId: number;
  classId: number | null;
  timeZone: TimeZone;

  /** Inclusive date range. */
  horizon: { start: IsoDate; end: IsoDate };

  /** All division configs within scope (one per class). */
  divisions: Array<{
    classId: number;
    /** Full JSONB blob from tournament_classes.schedule_config. */
    scheduleConfig: DivisionScheduleConfig;
  }>;

  stadiums: Array<{ id: number; name: string }>;
  fields: Array<{ id: number; stadiumId: number | null; name: string }>;
  stadiumHours: Array<{
    stadiumId: number;
    date: IsoDate;
    startTime: LocalTime | null;
    endTime: LocalTime | null;
  }>;

  /** Every match in scope. Already-scheduled matches without `lockedAt`
   * remain candidates — the solver treats them as unassigned unless locked. */
  matches: Array<DbMatch>;
  teams: Array<DbTeam>;
  stages: Array<{
    id: number;
    classId: number;
    type: "group" | "league" | "knockout" | "swiss" | "double_elim";
    order: number;
    settings: {
      matchDurationMinutes?: number;
      halvesCount?: 1 | 2;
      halfDurationMinutes?: number;
      breakBetweenHalvesMinutes?: number;
    };
  }>;
  referees: Array<{
    id: number;
    firstName: string;
    lastName: string;
    level: string | null;
  }>;
  refereeAvailability: Array<{
    refereeId: number;
    date: IsoDate;
    startTime: LocalTime | null;
    endTime: LocalTime | null;
    isBlackout: boolean;
  }>;
  teamBlackouts: Array<{
    teamId: number;
    date: IsoDate;
    startTime: LocalTime | null;
    endTime: LocalTime | null;
    reason: string | null;
  }>;
};

export type DbMatch = {
  id: number;
  classId: number;
  stageId: number;
  groupId: number | null;
  roundId: number | null;
  groupRound: number | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  fieldId: number | null;
  scheduledAt: Date | null;
  lockedAt: Date | null;
  lockReason: string | null;
  bufferBeforeMinutes: number | null;
  bufferAfterMinutes: number | null;
  roundOrder: number | null;
  roundMatchCount: number | null;
  isTwoLegged: boolean;
  legIndex: 1 | 2 | null;
  twoLeggedPeerId: number | null;
  matchReferees: Array<{ refereeId: number; role: RefereeRole }>;
};

export type DbTeam = {
  id: number;
  classId: number;
  displayName: string;
  homeCity?: string;
};

export type DivisionScheduleConfig = {
  fieldIds?: number[];
  dailyStartTime?: LocalTime;
  dailyEndTime?: LocalTime;
  halvesCount?: 1 | 2;
  halfDurationMinutes?: number;
  breakBetweenHalvesMinutes?: number;
  breakBetweenMatchesMinutes?: number;
  maxMatchesPerTeamPerDay?: number;
  minRestBetweenTeamMatchesMinutes?: number;
  maxRestBetweenTeamMatchesMinutes?: number;  // NEW
  maxConsecutiveMatchesPerTeam?: number;      // NEW
  enableTeamRestRule?: boolean;
  daySchedule?: Array<{ date: IsoDate; startTime: LocalTime; endTime: LocalTime }>;
  fieldDaySchedule?: Array<{
    fieldId: number;
    date: IsoDate;
    startTime: LocalTime | null;
    endTime: LocalTime | null;
  }>;
  stadiumDaySchedule?: Array<{
    stadiumId: number;
    date: IsoDate;
    startTime: LocalTime | null;
    endTime: LocalTime | null;
  }>;
  fieldStageIds?: Record<string, number[]>;
  matchDurationMinutes?: number;

  weights?: Partial<Weights>;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  allowParallelGroupRounds?: boolean;
  groupFieldAffinity?: "strict" | "preferred" | "none";
  slotGranularityMinutes?: number;
};

// ═════════════════════ Build options ═════════════════════

export type BuildProblemOptions = {
  /** User-supplied weight overrides applied on top of division config. */
  weights?: Partial<Weights>;
  /** User-supplied seed for RNG. Defaults to deterministic hash of the input. */
  seed?: number;
};

// ═════════════════════ Main builder ═════════════════════

export function buildProblem(snap: DbSnapshot, opts: BuildProblemOptions = {}): Problem {
  const days = enumerateDays(snap.horizon.start, snap.horizon.end, snap.timeZone);

  // Merge weights: defaults < division config < options
  let weights: Weights = { ...DEFAULT_WEIGHTS };
  for (const div of snap.divisions) {
    if (div.scheduleConfig.weights) {
      weights = { ...weights, ...div.scheduleConfig.weights };
    }
  }
  if (opts.weights) weights = { ...weights, ...opts.weights };

  // Build match templates — compute duration per-match via its division + stage
  const stageById = new Map(snap.stages.map((s) => [s.id, s]));
  const divById = new Map(snap.divisions.map((d) => [d.classId, d.scheduleConfig]));

  // All matches are schedulable — both group TBD slots and knockout shells.
  // Admins pre-assign time+field to playoff rounds before teams are known
  // (slot-mode scheduling: schedule built on format capacity, teams fill in later).
  const schedulableMatches = snap.matches;

  // Fallback: if scheduling-db didn't compute a roundOrder (e.g. match has no roundId),
  // derive a best-effort value from roundMatchCount.
  // Solver convention: 1 = Finals level (latest), higher = earlier round.
  //   matchCount=1 → 1 (Final/3rd-place)
  //   matchCount=2 → 2 (Semi-final)
  //   matchCount=4 → 3 (Quarter-final)
  //   matchCount=8 → 4 (Round of 16)
  //   matchCount=16→ 5 (Round of 32)
  // Note: when two rounds share matchCount the ordering is ambiguous — DB-computed
  // roundOrder (from scheduling-db.ts) is always preferred.
  function inferRoundOrder(m: DbSnapshot["matches"][0]): number | null {
    if (m.roundOrder !== null) return m.roundOrder;
    if (m.roundMatchCount == null || m.roundMatchCount <= 0) return null;
    const depth = Math.max(0, Math.round(Math.log2(m.roundMatchCount)));
    return depth + 1; // matchCount=1→1, 2→2, 4→3, 8→4, 16→5
  }

  const matchTemplates: MatchTemplate[] = schedulableMatches.map((m) => {
    const div = divById.get(m.classId);
    const stage = stageById.get(m.stageId);
    const duration = computeMatchDuration(div, stage);
    const bufBefore = m.bufferBeforeMinutes ?? div?.bufferBeforeMinutes ?? 0;
    const bufAfter =
      m.bufferAfterMinutes ??
      div?.bufferAfterMinutes ??
      div?.breakBetweenMatchesMinutes ??
      0;
    return {
      id: m.id,
      classId: m.classId,
      stageId: m.stageId,
      stageKind: stage?.type ?? "group",
      stageOrder: stage?.order ?? 0,
      groupId: m.groupId,
      roundId: m.roundId,
      groupRound: m.groupRound,
      roundOrder: inferRoundOrder(m),
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      playDurationMinutes: duration,
      bufferBeforeMinutes: bufBefore,
      bufferAfterMinutes: bufAfter,
      totalDurationMinutes: duration + bufBefore + bufAfter,
      twoLeggedPeerId: m.twoLeggedPeerId,
      legIndex: m.legIndex,
      preferredFieldIds: undefined,
      requiredMainReferees: 1,
      requiredAssistantReferees: 0,
    };
  });

  // Determine match duration bounds for slot pool sizing.
  // max: ensures the pool's latestStartUtc backward-compat field is correct.
  // min: the pool generates slots up to (close - min) so shorter-division matches
  //      get access to late-day slots that longer matches can't use.
  const maxMatchDuration = matchTemplates.reduce(
    (max, m) => Math.max(max, m.totalDurationMinutes),
    60,
  );
  const minMatchDuration = matchTemplates.reduce(
    (min, m) => Math.min(min, m.totalDurationMinutes),
    maxMatchDuration,
  );

  // Build field opening hours.
  // Global fallback = first division's daily window (backward-compat).
  // Per-field override = derived from whichever division lists this field in
  // its scheduleConfig.fieldIds — allows e.g. Division A on fields 1-3 to
  // start at 09:00 while Division B on fields 4-6 starts at 10:00, and both
  // can have different match durations without interfering.
  const firstDiv = snap.divisions[0]?.scheduleConfig;
  const dailyStart = firstDiv?.dailyStartTime ?? "09:00";
  const dailyEnd = firstDiv?.dailyEndTime ?? "21:00";

  // Build fieldId → division time window map (only divisions that explicitly
  // declare fieldIds get per-field defaults; others fall back to global).
  const fieldDivisionDefault = new Map<number, { startTime: LocalTime; endTime: LocalTime }>();
  for (const div of snap.divisions) {
    const cfg = div.scheduleConfig;
    if (cfg.fieldIds && cfg.fieldIds.length > 0 && (cfg.dailyStartTime || cfg.dailyEndTime)) {
      for (const fieldId of cfg.fieldIds) {
        fieldDivisionDefault.set(fieldId, {
          startTime: cfg.dailyStartTime ?? dailyStart,
          endTime: cfg.dailyEndTime ?? dailyEnd,
        });
      }
    }
  }

  const fieldHours = resolveFieldHours({
    fields: snap.fields,
    days,
    divisionDefault: { startTime: dailyStart, endTime: dailyEnd },
    fieldDivisionDefault: fieldDivisionDefault.size > 0 ? fieldDivisionDefault : undefined,
    daySchedule: snap.divisions.flatMap((d) => d.scheduleConfig.daySchedule ?? []),
    stadiumDaySchedule: snap.stadiumHours.map((s) => ({
      stadiumId: s.stadiumId,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
    })),
    fieldDaySchedule: snap.divisions.flatMap((d) => d.scheduleConfig.fieldDaySchedule ?? []),
  });

  // Granularity: use the minimum across all divisions (so the finest-grained
  // division drives the slot resolution — coarser ones naturally align to it).
  const granularity = snap.divisions.reduce(
    (min, d) => Math.min(min, d.scheduleConfig.slotGranularityMinutes ?? 5),
    5,
  );

  const slots: Slot[] = buildSlotPool({
    zone: snap.timeZone,
    granularityMinutes: granularity,
    fieldHours,
    minMatchDurationMinutes: minMatchDuration,
    maxMatchDurationMinutes: maxMatchDuration,
  });

  // Teams
  const teams: Team[] = snap.teams.map((t) => ({
    id: t.id,
    displayName: t.displayName,
    classId: t.classId,
    homeCity: t.homeCity,
  }));

  // Referees with default role eligibility
  const referees: Referee[] = snap.referees.map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    level: r.level,
    eligibleRoles: ["main", "assistant1", "assistant2", "fourth"],
  }));

  // Blackouts: split team + referee
  const teamBlackouts: Blackout[] = snap.teamBlackouts.map((b) => ({
    entityKind: "team",
    entityId: b.teamId,
    date: b.date,
    startTime: b.startTime,
    endTime: b.endTime,
    reason: b.reason ?? undefined,
  }));
  const refereeBlackouts: Blackout[] = snap.refereeAvailability
    .filter((a) => a.isBlackout)
    .map((a) => ({
      entityKind: "referee",
      entityId: a.refereeId,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
    }));
  const refereeAvailability = snap.refereeAvailability
    .filter((a) => !a.isBlackout)
    .map((a) => ({
      refereeId: a.refereeId,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
    }));

  // Locks: matches with locked_at set become fixed assignments.
  // scheduledAt is stored as LOCAL time (no UTC offset) by applyScheduleSolution,
  // so we treat the stored ISO string as local and convert to real UTC for the slotId.
  const locks = snap.matches
    .filter((m) => m.lockedAt != null && m.scheduledAt != null && m.fieldId != null)
    .map((m) => {
      const storedIso = (m.scheduledAt as Date).toISOString(); // "YYYY-MM-DDTHH:MM:00.000Z"
      const localDate = storedIso.slice(0, 10);                 // "YYYY-MM-DD"
      const localTime = storedIso.slice(11, 16);                // "HH:MM"
      // Convert local → real UTC so slotId matches the slot pool (which uses real UTC)
      const realUtc = localToUtc(localDate, localTime, snap.timeZone) ?? storedIso;
      return {
        matchId: m.id,
        slotId: `${m.fieldId}:${realUtc}`,
        fieldId: m.fieldId!,
        scheduledAtUtc: realUtc,
        refereeAssignments: m.matchReferees,
        reason: m.lockReason,
      };
    });

  // Division configs for constraint lookup
  const classConfigs = snap.divisions.map((d) => {
    const cfg = d.scheduleConfig;
    return {
      classId: d.classId,
      maxMatchesPerTeamPerDay: cfg.maxMatchesPerTeamPerDay ?? 3,
      minRestBetweenTeamMatchesMinutes: cfg.minRestBetweenTeamMatchesMinutes ?? 60,
      maxRestBetweenTeamMatchesMinutes: cfg.maxRestBetweenTeamMatchesMinutes ?? 0,   // NEW
      maxConsecutiveMatchesPerTeam: cfg.maxConsecutiveMatchesPerTeam ?? 0,           // NEW
      enableTeamRestRule: cfg.enableTeamRestRule ?? true,
      allowParallelGroupRounds: cfg.allowParallelGroupRounds ?? true,
      groupFieldAffinity: cfg.groupFieldAffinity ?? ("preferred" as const),
      fieldStageIds: cfg.fieldStageIds ?? {},
      allowedFieldIds: cfg.fieldIds ?? [],
    };
  });

  // Stage/round ordering is enforced by dedicated hard constraints
  // (checkStageCompletionOrder, checkKnockoutRoundOrder, checkGroupRoundOrder),
  // not by a date cutoff — the solver decides WHERE in the horizon playoff
  // falls naturally because knockout matches cannot start before all sibling
  // group/league matches end.

  const problem: Problem = {
    tournamentId: snap.tournamentId,
    organizationId: snap.organizationId,
    classId: snap.classId,
    timeZone: snap.timeZone,
    horizon: { start: snap.horizon.start, end: snap.horizon.end, days },
    slots,
    matchTemplates,
    teams,
    referees,
    teamBlackouts,
    refereeAvailability,
    refereeBlackouts,
    locks,
    classConfigs,
    weights,
    seed: opts.seed ?? seedFromSnapshot(snap),
  };

  return problem;
}

// ═════════════════════ Duration computation ═════════════════════

function computeMatchDuration(
  div: DivisionScheduleConfig | undefined,
  stage: DbSnapshot["stages"][number] | undefined,
): number {
  // Division-level override wins (used by legacy adapters to inject
  // body.matchDurationMinutes from /auto-schedule or /schedule-all UI).
  if (div?.matchDurationMinutes) return div.matchDurationMinutes;
  if (stage?.settings.matchDurationMinutes) return stage.settings.matchDurationMinutes;

  const halves = div?.halvesCount ?? 2;
  const half = div?.halfDurationMinutes ?? 25;
  const halfBreak = div?.breakBetweenHalvesMinutes ?? 5;
  if (halves === 1) return half;
  return halves * half + (halves - 1) * halfBreak;
}

// ═════════════════════ Hashing ═════════════════════

/**
 * Canonical JSON: keys sorted recursively. Produces a stable input-hash so the
 * idempotency check can detect identical Problem inputs.
 */
export function canonicalJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJson).join(",") + "]";
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + canonicalJson((obj as Record<string, unknown>)[k]))
      .join(",") +
    "}"
  );
}

export function hashProblem(problem: Problem): string {
  const canonical = canonicalJson({
    tournamentId: problem.tournamentId,
    classId: problem.classId,
    horizon: problem.horizon,
    slots: problem.slots.map((s) => s.id),
    matches: problem.matchTemplates.map((m) => ({
      id: m.id,
      stageKind: m.stageKind,
      home: m.homeTeamId,
      away: m.awayTeamId,
      duration: m.totalDurationMinutes,
      lock: problem.locks.some((l) => l.matchId === m.id),
    })),
    referees: problem.referees.map((r) => r.id),
    teamBlackouts: problem.teamBlackouts,
    refereeBlackouts: problem.refereeBlackouts,
    refereeAvailability: problem.refereeAvailability,
    weights: problem.weights,
    classConfigs: problem.classConfigs,
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 24);
}

function seedFromSnapshot(snap: DbSnapshot): number {
  const s = `${snap.tournamentId}:${snap.classId ?? "all"}:${snap.matches.length}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
