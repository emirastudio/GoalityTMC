/**
 * Scheduling engine — domain model.
 *
 * This module is pure TypeScript. No DB, no Next.js, no side effects.
 * Everything the solver needs lives in the `Problem` object; everything it
 * produces lives in the `Solution` object. Keep it this way — it's how we can
 * later swap the LNS engine for OR-Tools CP-SAT without touching the API/UI.
 */

// ═════════════════════ Core primitives ═════════════════════

/** ISO date string "YYYY-MM-DD". */
export type IsoDate = string;
/** "HH:MM" local-time string. */
export type LocalTime = string;
/** ISO 8601 UTC instant, e.g. "2026-08-14T06:00:00.000Z". */
export type IsoInstant = string;
/** IANA timezone, e.g. "Europe/Tallinn". */
export type TimeZone = string;

// ═════════════════════ Stage types ═════════════════════

export type StageKind = "group" | "league" | "knockout" | "swiss" | "double_elim";

export type RefereeRole = "main" | "assistant1" | "assistant2" | "fourth";

// ═════════════════════ Slot pool ═════════════════════

/**
 * A discrete field × time slot produced by `buildSlotPool`.
 * Each slot represents one possible match START time on one field.
 * Slots are chosen by the solver, durations are applied per match template.
 */
export type Slot = {
  /** Stable `${fieldId}:${startUtc}` identifier. */
  id: string;
  fieldId: number;
  stadiumId: number | null;
  /** Instant in UTC when the slot opens. */
  startUtc: IsoInstant;
  /**
   * When the field CLOSES this day (UTC). Used by `checkMatchFitsInWindow`
   * to verify that slot.startUtc + match.totalDurationMinutes ≤ dayCloseUtc,
   * independently of how the slot pool was sized. This allows shorter matches
   * (e.g. 25-min junior games) to start later in the day than the pool's
   * conservative `latestStartUtc` which was sized for the longest match type.
   */
  dayCloseUtc: IsoInstant;
  /** The latest instant a match starting at this slot may still fit
   *  (= dayCloseUtc − maxMatchDuration used at pool build time). Kept for
   *  backward compat but the engine uses `dayCloseUtc` for actual fit checks. */
  latestStartUtc: IsoInstant;
  /** Local date in tournament zone — used for per-day counts. */
  localDate: IsoDate;
  /** Local HH:MM — used for primetime soft constraint. */
  localStart: LocalTime;
  /** Minutes between this slot start and field open time that day. */
  minutesFromDayOpen: number;
};

// ═════════════════════ Match templates ═════════════════════

/**
 * A match the solver must place. `id` matches the row in the `matches` table.
 * Teams may be null for playoff placeholders — in that case the solver still
 * places the slot but no team-no-overlap constraint can fire.
 */
export type MatchTemplate = {
  id: number;
  classId: number;
  stageId: number;
  stageKind: StageKind;
  /** Stage ordering — groups must finish before playoff starts. */
  stageOrder: number;
  groupId: number | null;
  roundId: number | null;
  /** Round number within group stage (1..N tours). */
  groupRound: number | null;
  /** Round order within playoff (1 = final, higher = earlier). */
  roundOrder: number | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  /** Pure play time (halves × halfDuration + break between halves). */
  playDurationMinutes: number;
  /** Buffer before match (warmup). */
  bufferBeforeMinutes: number;
  /** Buffer after match (cleanup + break to next match). */
  bufferAfterMinutes: number;
  /** Total footprint = buffer_before + playDuration + buffer_after. */
  totalDurationMinutes: number;
  /** Two-legged knockout: if second leg, leg1's matchId goes here. */
  twoLeggedPeerId: number | null;
  legIndex: 1 | 2 | null;
  /** Soft preferences. */
  preferredStadiumId?: number;
  preferredFieldIds?: number[];
  /** Referee requirements. */
  requiredMainReferees: number;
  requiredAssistantReferees: number;
};

// ═════════════════════ Teams & referees & blackouts ═════════════════════

export type Team = {
  id: number;
  /** Display name used for the explainer UI. */
  displayName: string;
  classId: number;
  /** Optional home city for travel soft constraint. */
  homeCity?: string;
};

export type Referee = {
  id: number;
  firstName: string;
  lastName: string;
  level: string | null;
  /** Roles this referee can take. Defaults to ["main","assistant1","assistant2","fourth"]. */
  eligibleRoles: RefereeRole[];
};

export type Blackout = {
  /** "team" or "referee" — the entity that cannot play during the window. */
  entityKind: "team" | "referee";
  entityId: number;
  date: IsoDate;
  /** null = full day. */
  startTime: LocalTime | null;
  endTime: LocalTime | null;
  reason?: string;
};

/** An entry in `referee_availability` where the referee IS available. */
export type AvailabilityWindow = {
  refereeId: number;
  date: IsoDate;
  startTime: LocalTime | null;
  endTime: LocalTime | null;
};

// ═════════════════════ Locks ═════════════════════

/**
 * A pre-committed, untouchable match. The solver sees these as fixed
 * assignments that consume capacity but are never moved.
 */
export type Lock = {
  matchId: number;
  slotId: string;
  fieldId: number;
  scheduledAtUtc: IsoInstant;
  refereeAssignments: Array<{ refereeId: number; role: RefereeRole }>;
  reason: string | null;
};

// ═════════════════════ Weights & constraints ═════════════════════

export type Weights = {
  fieldUtilization: number;
  teamRestComfort: number;
  homeAwayBalance: number;
  primetimeForBigMatches: number;
  groupFieldAffinity: number;
  refereeWorkloadBalance: number;
  travelMinimization: number;
  dayLoadBalance: number;
  /**
   * Penalty when one division monopolises a disproportionate share of a field.
   * Useful for tournaments with 5+ divisions on shared fields: pushes the solver
   * to spread each division's matches across fields rather than concentrating
   * the big divisions on the best/central field all day.
   * 0 = disabled (default for single-division tournaments).
   * 0.4–0.8 = recommended for 4+ divisions on ≥3 fields.
   */
  divisionFieldBalance: number;
};

export const DEFAULT_WEIGHTS: Weights = {
  fieldUtilization: 0.5,
  teamRestComfort: 0.8,
  homeAwayBalance: 0.3,
  primetimeForBigMatches: 0.2,
  groupFieldAffinity: 0.6,
  refereeWorkloadBalance: 0.5,
  travelMinimization: 0.2,
  dayLoadBalance: 0.3,
  divisionFieldBalance: 0.0, // off by default; kicks in when > 1 division present
};

// ═════════════════════ Problem ═════════════════════

export type Problem = {
  /** Context — for logging & DB writes only; engine never reads the DB. */
  tournamentId: number;
  organizationId: number;
  /** null = whole tournament, integer = single division. */
  classId: number | null;
  timeZone: TimeZone;
  horizon: { start: IsoDate; end: IsoDate; days: IsoDate[] };

  slots: Slot[];
  matchTemplates: MatchTemplate[];
  teams: Team[];
  referees: Referee[];
  teamBlackouts: Blackout[];
  refereeAvailability: AvailabilityWindow[];
  refereeBlackouts: Blackout[];
  locks: Lock[];

  /** Division-level config for rest / day-count / field-stage affinity. */
  classConfigs: Array<{
    classId: number;
    maxMatchesPerTeamPerDay: number;
    minRestBetweenTeamMatchesMinutes: number;
    maxRestBetweenTeamMatchesMinutes: number;  // soft upper bound, 0 = disabled
    maxConsecutiveMatchesPerTeam: number;       // hard max consecutive, 0 = disabled
    enableTeamRestRule: boolean;
    allowParallelGroupRounds: boolean;
    groupFieldAffinity: "strict" | "preferred" | "none";
    fieldStageIds: Record<string, number[]>;
    /** Hard whitelist of field IDs this division may use. Empty = all fields allowed. */
    allowedFieldIds: number[];
  }>;

  weights: Weights;
  /** RNG seed. Same problem + same seed = identical solution. */
  seed: number;
};

// ═════════════════════ Assignments & solution ═════════════════════

export type Assignment = {
  matchId: number;
  slotId: string;
  fieldId: number;
  scheduledAtUtc: IsoInstant;
  /** Local date (YYYY-MM-DD) in tournament timezone — populated by solver, used for display-safe DB storage. */
  localDate?: IsoDate;
  /** Local HH:MM in tournament timezone — populated by solver, used for display-safe DB storage. */
  localStart?: LocalTime;
  refereeAssignments: Array<{ refereeId: number; role: RefereeRole }>;
};

/** Structured reason a match could not be placed. Used for explainers. */
export type UnplacedReason =
  | { type: "no_slot_in_window" }
  | { type: "team_no_overlap"; conflictingMatchId: number; teamId: number }
  | { type: "field_no_overlap"; conflictingMatchId: number }
  | { type: "referee_no_overlap"; refereeId: number; conflictingMatchId: number }
  | { type: "referee_unavailable"; refereeId: number }
  | { type: "rest_violation"; teamId: number; restNeededMinutes: number }
  | { type: "team_day_limit"; teamId: number; maxPerDay: number }
  | { type: "blackout"; entityKind: "team" | "referee"; entityId: number; date: IsoDate }
  | { type: "stadium_closed"; stadiumId: number; date: IsoDate }
  | { type: "stage_completion_order"; blockingMatchId: number; blockingStageId: number }
  | { type: "knockout_round_order"; blockingMatchId: number; earlierRoundOrder: number }
  | { type: "group_round_order"; blockingMatchId: number; groupId: number; earlierGroupRound: number }
  | { type: "field_stage_affinity"; fieldId: number; stageId: number }
  | { type: "field_division_affinity"; fieldId: number; classId: number }
  | { type: "two_legged_spacing"; peerMatchId: number };

export type Unplaced = { matchId: number; reasons: UnplacedReason[] };

export type Solution = {
  assignments: Assignment[];
  unplaced: Unplaced[];
  score: {
    hardViolations: number;
    softScore: number;
    byConstraint: Record<string, number>;
  };
  diagnostics: {
    elapsedMs: number;
    iterations: number;
    bestFoundAt: number;
    seed: number;
  };
};

/** Lightweight view for list UIs. Never exposes the full Problem. */
export type ResultSummary = {
  totalMatches: number;
  assignedMatches: number;
  unplacedCount: number;
  hardViolations: number;
  softScore: number;
  elapsedMs: number;
  seed: number;
};

export function summarize(sol: Solution, totalMatches: number): ResultSummary {
  return {
    totalMatches,
    assignedMatches: sol.assignments.length,
    unplacedCount: sol.unplaced.length,
    hardViolations: sol.score.hardViolations,
    softScore: sol.score.softScore,
    elapsedMs: sol.diagnostics.elapsedMs,
    seed: sol.diagnostics.seed,
  };
}

// ═════════════════════ Partial solution (for propagation) ═════════════════════

/**
 * Mutable bookkeeping structure used during the solve. Indexed for fast
 * constraint checks. Only the solver touches this; it's never persisted.
 */
export type PartialSolution = {
  assignments: Map<number /* matchId */, Assignment>;
  /** For each team, sorted list of (start, end) intervals currently scheduled. */
  teamIntervals: Map<number, Array<{ start: number; end: number; matchId: number }>>;
  /** For each field, sorted list of (start, end) intervals. */
  fieldIntervals: Map<number, Array<{ start: number; end: number; matchId: number }>>;
  /** For each referee, sorted list of (start, end) intervals. */
  refereeIntervals: Map<number, Array<{ start: number; end: number; matchId: number }>>;
  /** teamDayCount[teamId][date] = number of matches on that day. */
  teamDayCount: Map<number, Map<IsoDate, number>>;
};

export function emptyPartial(): PartialSolution {
  return {
    assignments: new Map(),
    teamIntervals: new Map(),
    fieldIntervals: new Map(),
    refereeIntervals: new Map(),
    teamDayCount: new Map(),
  };
}
