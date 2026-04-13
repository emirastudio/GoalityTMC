/**
 * DB glue for scheduling v2 — reads the DB and produces a `DbSnapshot` that
 * can be handed to `buildProblem`. This is the ONLY place that imports both
 * Drizzle and the scheduling engine.
 *
 * Reads happen in a REPEATABLE READ transaction so a concurrent write during
 * snapshot construction can't produce an inconsistent view.
 */

import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  matchReferees,
  matches,
  organizations,
  refereeAvailability,
  teamBlackouts,
  teams,
  tournamentClasses,
  tournamentFields,
  tournamentReferees,
  tournamentRegistrations,
  tournamentStadiums,
  tournamentStadiumSchedule,
  tournamentStages,
  tournaments,
  matchRounds as matchRoundsTable,
} from "@/db/schema";
import {
  buildProblem,
  solve,
  type DbMatch,
  type DbSnapshot,
  type DbTeam,
  type DivisionScheduleConfig,
  type Problem,
  type Solution,
} from "@/lib/scheduling";

export type LoadSnapshotInput = {
  tournamentId: number;
  /** null = entire tournament, number = single division only. */
  classId: number | null;
};

/**
 * Reads a self-consistent view of the tournament's scheduling-relevant state.
 * Note: uses a regular transaction; postgres.js with drizzle-orm doesn't
 * expose a dedicated REPEATABLE READ helper but the snapshot semantics of
 * Postgres default READ COMMITTED are sufficient for our snapshot-then-solve
 * pattern (we never read live state during solve).
 */
export async function loadSchedulingSnapshot(input: LoadSnapshotInput): Promise<DbSnapshot> {
  const [tournamentRow] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, input.tournamentId));
  if (!tournamentRow) throw new Error(`Tournament ${input.tournamentId} not found`);

  const [orgRow] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, tournamentRow.organizationId));
  if (!orgRow) throw new Error(`Organization ${tournamentRow.organizationId} not found`);

  const timeZone = orgRow.timezone;

  // Divisions in scope
  const classRows =
    input.classId != null
      ? await db
          .select()
          .from(tournamentClasses)
          .where(
            and(eq(tournamentClasses.tournamentId, input.tournamentId), eq(tournamentClasses.id, input.classId)),
          )
      : await db
          .select()
          .from(tournamentClasses)
          .where(eq(tournamentClasses.tournamentId, input.tournamentId));

  const divisions = classRows.map((c) => ({
    classId: c.id,
    scheduleConfig: (c.scheduleConfig ?? {}) as DivisionScheduleConfig,
  }));

  // Stadiums + fields
  const stadiumRows = await db
    .select()
    .from(tournamentStadiums)
    .where(eq(tournamentStadiums.tournamentId, input.tournamentId));

  const fieldRows = await db
    .select()
    .from(tournamentFields)
    .where(eq(tournamentFields.tournamentId, input.tournamentId));

  const stadiumHours = await db
    .select()
    .from(tournamentStadiumSchedule)
    .where(eq(tournamentStadiumSchedule.tournamentId, input.tournamentId));

  // Stages in scope
  const stageRows =
    input.classId != null
      ? await db
          .select()
          .from(tournamentStages)
          .where(
            and(eq(tournamentStages.tournamentId, input.tournamentId), eq(tournamentStages.classId, input.classId)),
          )
      : await db
          .select()
          .from(tournamentStages)
          .where(eq(tournamentStages.tournamentId, input.tournamentId));

  // Rounds (for round-order/match-count lookups)
  const stageIds = stageRows.map((s) => s.id);
  const rounds =
    stageIds.length > 0
      ? await db.select().from(matchRoundsTable).where(inArray(matchRoundsTable.stageId, stageIds))
      : [];

  // Matches in scope: all non-deleted matches of this tournament, filtered by class
  const classIds = classRows.map((c) => c.id);
  const matchWhere =
    input.classId != null
      ? and(
          eq(matches.tournamentId, input.tournamentId),
          inArray(matches.stageId, stageIds),
          isNull(matches.deletedAt),
        )
      : and(eq(matches.tournamentId, input.tournamentId), isNull(matches.deletedAt));

  const matchRows = await db.select().from(matches).where(matchWhere);

  // Match referees
  const matchIds = matchRows.map((m) => m.id);
  const refLinks =
    matchIds.length > 0
      ? await db.select().from(matchReferees).where(inArray(matchReferees.matchId, matchIds))
      : [];

  // Build a stageId → classId map
  const stageToClass = new Map(stageRows.map((s) => [s.id, s.classId ?? 0]));

  // ── Compute solver roundOrder for each round ─────────────────────────────────
  //
  // DB convention: round.order is ASCENDING (1 = first/earliest round, highest = Final).
  // Solver convention: roundOrder is DESCENDING (1 = Final/latest, highest = earliest round).
  // Constraint: "earlier round (higher solverOrder) must finish before later round starts."
  //
  // Normalisation:
  //   1. For each stage, sort rounds by round.order ascending (earliest first).
  //   2. Assign solverOrder = N - position  (N = number of non-finals rounds + 1)
  //   3. ALL rounds with matchCount === 1 (Final, 3rd-place) get solverOrder = 1,
  //      so they are treated as the same level (concurrent, both after SF finishes).
  //
  // Example – Playoffs stage (R32, R16, QF, SF, F, 3P):
  //   R32(order=1)→6, R16→5, QF→4, SF→3, F(mc=1)→1, 3P(mc=1)→1
  const roundSolverOrder = new Map<number, number>(); // roundId → solverOrder

  // Group rounds by stageId
  const roundsByStage = new Map<number, typeof rounds>();
  for (const r of rounds) {
    if (!roundsByStage.has(r.stageId)) roundsByStage.set(r.stageId, []);
    roundsByStage.get(r.stageId)!.push(r);
  }
  for (const [, stageRounds] of roundsByStage) {
    // Sort by DB order ascending so position reflects chronological bracket order
    const sorted = [...stageRounds].sort((a, b) => a.order - b.order);
    const n = sorted.length;
    for (let i = 0; i < n; i++) {
      const r = sorted[i];
      if (r.matchCount === 1) {
        // All "Finals-level" rounds (Final, 3rd-place, etc.) share solverOrder 1.
        // This lets them be scheduled concurrently (both after SF).
        roundSolverOrder.set(r.id, 1);
      } else {
        // Invert position: position 0 (earliest) → highest solverOrder (placed first).
        roundSolverOrder.set(r.id, n - i);
      }
    }
  }

  const dbMatches: DbMatch[] = matchRows.map((m) => {
    const round = rounds.find((r) => r.id === m.roundId);
    const matchRefs = refLinks
      .filter((l) => l.matchId === m.id)
      .map((l) => ({ refereeId: l.refereeId, role: l.role as DbMatch["matchReferees"][number]["role"] }));

    return {
      id: m.id,
      classId: stageToClass.get(m.stageId) ?? 0,
      stageId: m.stageId,
      groupId: m.groupId,
      roundId: m.roundId,
      groupRound: m.groupRound,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      fieldId: m.fieldId,
      scheduledAt: m.scheduledAt,
      lockedAt: m.lockedAt,
      lockReason: m.lockReason,
      bufferBeforeMinutes: m.bufferBeforeMinutes,
      bufferAfterMinutes: m.bufferAfterMinutes,
      roundOrder: m.roundId != null ? (roundSolverOrder.get(m.roundId) ?? null) : null,
      roundMatchCount: round?.matchCount ?? null,
      isTwoLegged: round?.isTwoLegged ?? false,
      legIndex: null,
      twoLeggedPeerId: null,
      matchReferees: matchRefs,
    };
  });

  // Teams in scope — derived from registrations in these divisions
  let dbTeams: DbTeam[] = [];
  if (classIds.length > 0) {
    const regRows = await db
      .select({
        teamId: tournamentRegistrations.teamId,
        classId: tournamentRegistrations.classId,
        displayName: tournamentRegistrations.displayName,
        baseTeamName: teams.name,
      })
      .from(tournamentRegistrations)
      .leftJoin(teams, eq(teams.id, tournamentRegistrations.teamId))
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, input.tournamentId),
          inArray(tournamentRegistrations.classId, classIds),
        ),
      );
    dbTeams = regRows.map((r) => ({
      id: r.teamId,
      classId: r.classId ?? 0,
      displayName: r.displayName ?? r.baseTeamName ?? `Team ${r.teamId}`,
    }));
  }

  // Referees
  const refereeRows = await db
    .select()
    .from(tournamentReferees)
    .where(and(eq(tournamentReferees.tournamentId, input.tournamentId), isNull(tournamentReferees.deletedAt)));

  const refIds = refereeRows.map((r) => r.id);
  const availabilityRows =
    refIds.length > 0
      ? await db.select().from(refereeAvailability).where(inArray(refereeAvailability.refereeId, refIds))
      : [];

  const blackoutRows = await db
    .select()
    .from(teamBlackouts)
    .where(eq(teamBlackouts.tournamentId, input.tournamentId));

  // Horizon = tournament start/end or earliest/latest scheduled match
  const tStart = tournamentRow.startDate
    ? formatDate(tournamentRow.startDate)
    : fallbackMinDate(matchRows);
  const tEnd = tournamentRow.endDate
    ? formatDate(tournamentRow.endDate)
    : fallbackMaxDate(matchRows);

  const snapshot: DbSnapshot = {
    tournamentId: input.tournamentId,
    organizationId: orgRow.id,
    classId: input.classId,
    timeZone,
    horizon: { start: tStart, end: tEnd },
    divisions,
    stadiums: stadiumRows.map((s) => ({ id: s.id, name: s.name })),
    fields: fieldRows.map((f) => ({ id: f.id, stadiumId: f.stadiumId, name: f.name })),
    stadiumHours: stadiumHours.map((s) => ({
      stadiumId: s.stadiumId,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
    })),
    matches: dbMatches,
    teams: dbTeams,
    stages: stageRows.map((s) => ({
      id: s.id,
      classId: s.classId ?? 0,
      type: s.type as DbSnapshot["stages"][number]["type"],
      order: s.order,
      settings: (s.settings ?? {}) as DbSnapshot["stages"][number]["settings"],
    })),
    referees: refereeRows.map((r) => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      level: r.level ?? null,
    })),
    refereeAvailability: availabilityRows.map((a) => ({
      refereeId: a.refereeId,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      isBlackout: a.isBlackout,
    })),
    teamBlackouts: blackoutRows.map((b) => ({
      teamId: b.teamId,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      reason: b.reason,
    })),
  };

  return snapshot;
}

// ═════════════════════ Helpers ═════════════════════

function formatDate(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function fallbackMinDate(rows: { scheduledAt: Date | null }[]): string {
  const dates = rows
    .map((r) => r.scheduledAt)
    .filter((d): d is Date => d != null)
    .sort((a, b) => a.getTime() - b.getTime());
  if (dates.length === 0) return new Date().toISOString().slice(0, 10);
  return dates[0].toISOString().slice(0, 10);
}

function fallbackMaxDate(rows: { scheduledAt: Date | null }[]): string {
  const dates = rows
    .map((r) => r.scheduledAt)
    .filter((d): d is Date => d != null)
    .sort((a, b) => b.getTime() - a.getTime());
  if (dates.length === 0) {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }
  return dates[0].toISOString().slice(0, 10);
}

// ═════════════════════ Apply solution transactionally ═════════════════════

export type ApplySolutionInput = {
  tournamentId: number;
  organizationId: number;
  assignments: Array<{
    matchId: number;
    fieldId: number;
    scheduledAtUtc: string;
    /** When provided, the DB is written with local time (display-safe). */
    localDate?: string;
    localStart?: string;
    refereeAssignments: Array<{ refereeId: number; role: string }>;
  }>;
};

/**
 * Writes a solution into the matches + match_referees tables atomically.
 * Returns the list of match IDs that actually changed (for notification fan-out).
 */
export async function applyScheduleSolution(input: ApplySolutionInput): Promise<{ affectedMatchIds: number[] }> {
  const affectedMatchIds: number[] = [];

  await db.transaction(async (tx) => {
    const matchIds = input.assignments.map((a) => a.matchId);
    if (matchIds.length === 0) return;

    // Load current state for diff
    const current = await tx
      .select()
      .from(matches)
      .where(and(eq(matches.tournamentId, input.tournamentId), inArray(matches.id, matchIds)));
    const currentById = new Map(current.map((m) => [m.id, m]));

    for (const a of input.assignments) {
      const cur = currentById.get(a.matchId);
      if (!cur) continue;
      // Skip locked matches — apply never touches them.
      if (cur.lockedAt) continue;

      // Store LOCAL time (not UTC) so the planner grid can display it correctly
      // without timezone conversion. The planner extracts HH:MM directly from
      // the stored timestamp string, which works correctly when local time is stored.
      // When localDate/localStart are provided by the solver, use them.
      // Otherwise fall back to parsing UTC (legacy manual-patch paths).
      const storedIso = a.localDate && a.localStart
        ? `${a.localDate}T${a.localStart}:00`
        : a.scheduledAtUtc;
      const newScheduledAt = new Date(storedIso);
      const changed =
        !cur.scheduledAt ||
        cur.scheduledAt.getTime() !== newScheduledAt.getTime() ||
        cur.fieldId !== a.fieldId;

      await tx
        .update(matches)
        .set({
          scheduledAt: newScheduledAt,
          fieldId: a.fieldId,
          version: (cur.version ?? 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(matches.id, a.matchId));

      await tx.delete(matchReferees).where(eq(matchReferees.matchId, a.matchId));
      if (a.refereeAssignments.length > 0) {
        await tx.insert(matchReferees).values(
          a.refereeAssignments.map((r) => ({
            matchId: a.matchId,
            refereeId: r.refereeId,
            role: r.role,
          })),
        );
      }

      if (changed) affectedMatchIds.push(a.matchId);
    }
  });

  return { affectedMatchIds };
}

// ═════════════════════ Query helpers for API routes ═════════════════════

export async function clearSchedule(input: {
  tournamentId: number;
  classId?: number;
  stageId?: number;
  groupId?: number;
}): Promise<{ cleared: number }> {
  const conditions = [
    eq(matches.tournamentId, input.tournamentId),
    isNull(matches.lockedAt), // never clear locked matches
  ];
  if (input.stageId) conditions.push(eq(matches.stageId, input.stageId));
  if (input.groupId) conditions.push(eq(matches.groupId, input.groupId));
  // classId filter requires a join against stages — use a subquery
  if (input.classId != null) {
    const stagesInClass = await db
      .select({ id: tournamentStages.id })
      .from(tournamentStages)
      .where(
        and(
          eq(tournamentStages.tournamentId, input.tournamentId),
          eq(tournamentStages.classId, input.classId),
        ),
      );
    const stageIds = stagesInClass.map((s) => s.id);
    if (stageIds.length === 0) return { cleared: 0 };
    conditions.push(inArray(matches.stageId, stageIds));
  }

  const result = await db
    .update(matches)
    .set({ scheduledAt: null, fieldId: null, updatedAt: new Date() })
    .where(and(...conditions));

  // drizzle's update doesn't return count universally; do a count query after.
  return { cleared: (result as unknown as { count?: number }).count ?? 0 };
}

// ═════════════════════════════════════════════════════════════════════════
// LEGACY ADAPTERS — thin wrappers over the new LNS engine that preserve the
// old REST contracts of /matches/auto-schedule, /schedule-all, /matches/clear.
// They exist so the existing UI code in schedule-page.tsx and planner-page.tsx
// keeps working unchanged while the OLD greedy solver is fully gone.
// ═════════════════════════════════════════════════════════════════════════

export type LegacyDayWindow = {
  date: string;           // "YYYY-MM-DD"
  startTime: string;      // "HH:MM"
  endTime: string;
};

export type LegacyAutoScheduleBody = {
  stageId: number;
  groupId?: number;
  fieldIds: number[];
  days: LegacyDayWindow[];
  groupFieldMap?: Record<number, number[]>;
  fieldTimeOverrides?: Record<number, { startTime: string; endTime: string }>;
  matchDurationMinutes: number;
  breakBetweenMatchesMinutes?: number;
  maxMatchesPerTeamPerDay?: number;
  overwriteScheduled?: boolean;
};

export type LegacyScheduleAllDivision = {
  classId: number;
  fieldIds: number[];
  days: LegacyDayWindow[];
  matchDurationMinutes: number;
  breakBetweenMatchesMinutes: number;
  maxMatchesPerTeamPerDay: number;
  minRestBetweenTeamMatchesMinutes: number;
  overwriteScheduled?: boolean;
  fieldDaySchedule?: Array<{
    fieldId: number;
    date: string;
    startTime: string | null;
    endTime: string | null;
  }>;
  fieldStageIds?: Record<string, number[]>;
};

export type LegacySolveResult = {
  updated: number;
  unassigned: number;
  totalSlots: number;
  message: string;
  schedule: Array<{ matchId: number; fieldId: number; scheduledAt: string }>;
};

/**
 * Legacy adapter: solve scheduling for a single stage (possibly single group).
 * Used by /matches/auto-schedule. Builds an in-memory Problem overriding the
 * division config with body values, runs LNS, applies the result.
 */
export async function legacyAutoSchedule(input: {
  tournamentId: number;
  organizationId: number;
  body: LegacyAutoScheduleBody;
}): Promise<LegacySolveResult> {
  const { tournamentId, organizationId, body } = input;

  // 1. Find stage → classId
  const [stage] = await db
    .select()
    .from(tournamentStages)
    .where(
      and(
        eq(tournamentStages.id, body.stageId),
        eq(tournamentStages.tournamentId, tournamentId),
      ),
    );
  if (!stage) throw new Error("Stage not found");
  const classId = stage.classId ?? null;

  // 2. Load FULL tournament snapshot (all classes) so the solver knows about
  //    already-scheduled matches from OTHER divisions that share the same
  //    fields. Without this, two divisions on the same field produce overlaps.
  const snapshot = await loadSchedulingSnapshot({ tournamentId, classId: null });

  // 2b. Override the snapshot horizon with the body's days[] extent so the
  //     slot pool only considers dates the UI explicitly requested. Without
  //     this, horizon defaults to the whole tournament date range (which may
  //     span days outside the division's own schedule), and the solver would
  //     produce slots on days the admin never intended.
  if (body.days.length > 0) {
    const sortedDates = body.days.map((d) => d.date).sort();
    snapshot.horizon = {
      start: sortedDates[0],
      end: sortedDates[sortedDates.length - 1],
    };
  }

  // 3. Inject body config into the target division's scheduleConfig.
  const targetDiv = snapshot.divisions.find((d) => d.classId === classId);
  if (targetDiv) {
    const cfg = { ...targetDiv.scheduleConfig } as DivisionScheduleConfig;
    cfg.fieldIds = body.fieldIds;
    cfg.maxMatchesPerTeamPerDay = body.maxMatchesPerTeamPerDay ?? cfg.maxMatchesPerTeamPerDay ?? 3;
    cfg.breakBetweenMatchesMinutes =
      body.breakBetweenMatchesMinutes ?? cfg.breakBetweenMatchesMinutes ?? 10;
    cfg.matchDurationMinutes = body.matchDurationMinutes;
    // Derive daySchedule from body.days
    cfg.daySchedule = body.days.map((d) => ({
      date: d.date,
      startTime: d.startTime,
      endTime: d.endTime,
    }));
    // Derive fieldDaySchedule from fieldTimeOverrides
    if (body.fieldTimeOverrides && Object.keys(body.fieldTimeOverrides).length > 0) {
      const fieldOverrides: DivisionScheduleConfig["fieldDaySchedule"] = [];
      for (const day of body.days) {
        for (const [fidStr, ov] of Object.entries(body.fieldTimeOverrides)) {
          fieldOverrides.push({
            fieldId: Number(fidStr),
            date: day.date,
            startTime: ov.startTime,
            endTime: ov.endTime,
          });
        }
      }
      cfg.fieldDaySchedule = fieldOverrides;
    }
    targetDiv.scheduleConfig = cfg;
  }

  // 4. Mutate snapshot.matches:
  //    - Target stage (+ groupId) matches become the solver's input.
  //    - If overwriteScheduled=false, already-scheduled target matches become locks.
  //    - Matches in OTHER stages with scheduledAt become locks (respect existing slots).
  const beforeIds = new Set(snapshot.matches.map((m) => m.id));
  snapshot.matches = snapshot.matches.map((m) => {
    const isTarget =
      m.stageId === body.stageId &&
      (body.groupId == null || m.groupId === body.groupId);

    if (isTarget) {
      if (body.overwriteScheduled) {
        // Wipe existing slot so solver places it freshly.
        return { ...m, scheduledAt: null, fieldId: null, lockedAt: null };
      }
      // Keep existing scheduled matches as locks (not to be moved).
      return m;
    }

    // Non-target stage: if already has a slot, convert to lock so solver respects it.
    if (m.scheduledAt && m.fieldId && !m.lockedAt) {
      return { ...m, lockedAt: new Date(0) as Date, lockReason: "legacy-sibling-stage" };
    }
    // Non-target unscheduled matches → exclude from problem entirely.
    return m;
  });

  // Exclude non-target, non-locked, unscheduled matches from the Problem.
  snapshot.matches = snapshot.matches.filter((m) => {
    const isTarget =
      m.stageId === body.stageId &&
      (body.groupId == null || m.groupId === body.groupId);
    if (isTarget) return true;
    return m.lockedAt != null; // keep locked siblings
  });

  void beforeIds;

  // 5. Build Problem + solve + apply
  const problem: Problem = buildProblem(snapshot);
  const solution: Solution = solve(problem, { budgetMs: 8000 });

  // Only apply target assignments (siblings are locks, won't move anyway)
  await applyScheduleSolution({
    tournamentId,
    organizationId,
    assignments: solution.assignments
      .filter((a) => {
        const m = snapshot.matches.find((mm) => mm.id === a.matchId);
        if (!m) return false;
        return (
          m.stageId === body.stageId &&
          (body.groupId == null || m.groupId === body.groupId)
        );
      })
      .map((a) => ({
        matchId: a.matchId,
        fieldId: a.fieldId,
        scheduledAtUtc: a.scheduledAtUtc,
        localDate: a.localDate,
        localStart: a.localStart,
        refereeAssignments: a.refereeAssignments,
      })),
  });

  // 6. Build legacy-shaped response
  const targetIds = new Set(
    snapshot.matches
      .filter((m) => m.stageId === body.stageId && (body.groupId == null || m.groupId === body.groupId))
      .map((m) => m.id),
  );
  const schedule = solution.assignments
    .filter((a) => targetIds.has(a.matchId))
    .map((a) => ({
      matchId: a.matchId,
      fieldId: a.fieldId,
      scheduledAt: a.scheduledAtUtc,
    }));

  const unassignedCount = solution.unplaced.filter((u) => targetIds.has(u.matchId)).length;

  return {
    updated: schedule.length,
    unassigned: unassignedCount,
    totalSlots: problem.slots.length,
    message:
      unassignedCount > 0
        ? `${unassignedCount} matches could not be scheduled — not enough slots or team conflict.`
        : `All ${schedule.length} matches scheduled successfully.`,
    schedule,
  };
}

/**
 * Legacy adapter: solve scheduling for many divisions at once.
 * Used by /schedule-all. Loops per division, calls legacyAutoSchedule-equivalent
 * per class. Returns an aggregated legacy response.
 */
export async function legacyScheduleAll(input: {
  tournamentId: number;
  organizationId: number;
  divisions: LegacyScheduleAllDivision[];
}): Promise<{ updated: number; unassigned: number; message: string }> {
  let totalUpdated = 0;
  let totalUnassigned = 0;
  const messages: string[] = [];

  for (const div of input.divisions) {
    // 1. Load FULL tournament snapshot (all classes) so the solver sees
    //    already-scheduled matches from OTHER divisions on the same fields.
    //    Without this, each division schedules in isolation and produces
    //    field conflicts when two divisions share fields.
    const snapshot = await loadSchedulingSnapshot({
      tournamentId: input.tournamentId,
      classId: null, // ← all classes: cross-division field locks applied below
    });

    // 1b. Narrow horizon to the division's own day range (body.days).
    //     Prevents the solver from producing slots outside the division's
    //     own schedule when tournament dates span a wider range.
    if (div.days.length > 0) {
      const sortedDates = div.days.map((d) => d.date).sort();
      snapshot.horizon = {
        start: sortedDates[0],
        end: sortedDates[sortedDates.length - 1],
      };
    }

    // 2. Override the target division's scheduleConfig with body values
    const targetDiv = snapshot.divisions.find((d) => d.classId === div.classId);
    if (targetDiv) {
      const cfg = { ...targetDiv.scheduleConfig } as DivisionScheduleConfig;
      cfg.fieldIds = div.fieldIds;
      cfg.matchDurationMinutes = div.matchDurationMinutes;
      cfg.breakBetweenMatchesMinutes = div.breakBetweenMatchesMinutes;
      cfg.maxMatchesPerTeamPerDay = div.maxMatchesPerTeamPerDay;
      cfg.minRestBetweenTeamMatchesMinutes = div.minRestBetweenTeamMatchesMinutes;
      cfg.daySchedule = div.days.map((d) => ({
        date: d.date,
        startTime: d.startTime,
        endTime: d.endTime,
      }));
      if (div.fieldDaySchedule) cfg.fieldDaySchedule = div.fieldDaySchedule;
      if (div.fieldStageIds) cfg.fieldStageIds = div.fieldStageIds;
      targetDiv.scheduleConfig = cfg;
    }

    // 3. Partition matches:
    //    - Target class matches: solve normally (wipe if overwriteScheduled).
    //    - Non-target class matches with scheduledAt: convert to field locks so
    //      the solver's checkFieldNoOverlap blocks double-booking those slots.
    //    - Non-target class matches without scheduledAt: exclude entirely.
    snapshot.matches = snapshot.matches.map((m) => {
      const isTarget = m.classId === div.classId;
      if (isTarget) {
        if (div.overwriteScheduled) {
          return { ...m, scheduledAt: m.lockedAt ? m.scheduledAt : null, fieldId: m.lockedAt ? m.fieldId : null };
        }
        return m;
      }
      // Non-target: if already scheduled on a field, keep as a virtual lock.
      if (m.scheduledAt && m.fieldId && !m.lockedAt) {
        return { ...m, lockedAt: new Date(0) as Date, lockReason: "cross-division-field-lock" };
      }
      return m;
    });

    // Remove non-target unscheduled matches from the Problem entirely
    // (locks are kept; unscheduled non-target matches are irrelevant).
    snapshot.matches = snapshot.matches.filter(
      (m) => m.classId === div.classId || m.lockedAt != null,
    );

    // 4. Build Problem → solve
    const problem = buildProblem(snapshot);
    const solution = solve(problem, { budgetMs: 10000 });

    // 5. Apply only the target division's assignments (locks never moved anyway)
    await applyScheduleSolution({
      tournamentId: input.tournamentId,
      organizationId: input.organizationId,
      assignments: solution.assignments
        .filter((a) => {
          const m = snapshot.matches.find((mm) => mm.id === a.matchId);
          return m?.classId === div.classId;
        })
        .map((a) => ({
          matchId: a.matchId,
          fieldId: a.fieldId,
          scheduledAtUtc: a.scheduledAtUtc,
          localDate: a.localDate,
          localStart: a.localStart,
          refereeAssignments: a.refereeAssignments,
        })),
    });

    const placed = solution.assignments.filter((a) => {
      const m = snapshot.matches.find((mm) => mm.id === a.matchId);
      return m?.classId === div.classId;
    }).length;
    const unplaced = solution.unplaced.filter((u) => {
      const m = snapshot.matches.find((mm) => mm.id === u.matchId);
      return m?.classId === div.classId;
    }).length;
    totalUpdated += placed;
    totalUnassigned += unplaced;
    if (unplaced > 0) {
      messages.push(`Division ${div.classId}: ${unplaced} unplaced`);
    }
  }

  return {
    updated: totalUpdated,
    unassigned: totalUnassigned,
    message:
      totalUnassigned > 0
        ? messages.join("; ")
        : `All ${totalUpdated} matches placed successfully.`,
  };
}
