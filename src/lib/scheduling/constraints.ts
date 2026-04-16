/**
 * Constraint layer — disjunctive hard constraints + weighted soft objectives.
 *
 * A HARD constraint is a boolean: a partial solution either satisfies it or
 * doesn't. Propagation uses these as forward-checking guards when placing a
 * match into a candidate slot. A violation blocks the placement.
 *
 * A SOFT constraint is a scalar: it produces a "penalty" score for a complete
 * (or partial) solution. The solver minimises the weighted sum.
 *
 * All hard constraints here take a (problem, partial, move) triple and return
 * a `CheckResult`. Move = "place matchId at slotId with referees R". The
 * constraint checks whether adding this assignment to the partial violates
 * any rule.
 */

import { DateTime } from "luxon";
import type {
  Assignment,
  Blackout,
  IsoDate,
  MatchTemplate,
  PartialSolution,
  Problem,
  RefereeRole,
  Slot,
  UnplacedReason,
  Weights,
} from "./types";
import { parseLocalTime, toMinuteTs } from "./time";

// ═════════════════════ Types ═════════════════════

export type Move = {
  match: MatchTemplate;
  slot: Slot;
  refereeAssignments: Array<{ refereeId: number; role: RefereeRole }>;
};

export type CheckResult =
  | { ok: true }
  | { ok: false; reason: UnplacedReason };

// ═════════════════════ Hard constraint implementations ═════════════════════

/**
 * Match must fit within the field's day window.
 *
 * The slot pool is generated with `minMatchDurationMinutes` headroom so shorter
 * matches can start later. This constraint verifies the ACTUAL match duration
 * fits before the day closes — blocking longer matches from using late slots
 * that shorter matches could legitimately use.
 *
 * Example: field closes at 18:00; senior match = 55 min, junior = 25 min.
 * Pool generates slots up to 17:35 (60-min safety margin on granularity).
 * Senior cannot use slot at 17:10 (17:10+55=18:05 > 18:00) ← blocked here.
 * Junior can use slot at 17:35 (17:35+25=18:00 = ok) ← allowed.
 */
function checkMatchFitsInWindow(move: Move): CheckResult {
  const startMin = toMinuteTs(move.slot.startUtc);
  const endMin = startMin + move.match.totalDurationMinutes;
  const closeMin = toMinuteTs(move.slot.dayCloseUtc);
  if (endMin > closeMin) {
    return {
      ok: false,
      reason: {
        type: "stadium_closed",
        stadiumId: move.slot.stadiumId ?? -1,
        date: move.slot.localDate,
      },
    };
  }
  return { ok: true };
}

/** Team plays at most one match at a time. */
function checkTeamNoOverlap(partial: PartialSolution, move: Move): CheckResult {
  const match = move.match;
  const startMin = toMinuteTs(move.slot.startUtc);
  const endMin = startMin + match.totalDurationMinutes;

  for (const teamId of [match.homeTeamId, match.awayTeamId]) {
    if (teamId == null) continue;
    const intervals = partial.teamIntervals.get(teamId);
    if (!intervals) continue;
    for (const iv of intervals) {
      if (iv.start < endMin && startMin < iv.end) {
        return {
          ok: false,
          reason: { type: "team_no_overlap", conflictingMatchId: iv.matchId, teamId },
        };
      }
    }
  }
  return { ok: true };
}

/** A field hosts at most one match at a time. */
function checkFieldNoOverlap(partial: PartialSolution, move: Move): CheckResult {
  const startMin = toMinuteTs(move.slot.startUtc);
  const endMin = startMin + move.match.totalDurationMinutes;
  const intervals = partial.fieldIntervals.get(move.slot.fieldId);
  if (!intervals) return { ok: true };
  for (const iv of intervals) {
    if (iv.start < endMin && startMin < iv.end) {
      return {
        ok: false,
        reason: { type: "field_no_overlap", conflictingMatchId: iv.matchId },
      };
    }
  }
  return { ok: true };
}

/** A referee officiates at most one match at a time. */
function checkRefereeNoOverlap(partial: PartialSolution, move: Move): CheckResult {
  if (move.refereeAssignments.length === 0) return { ok: true };
  const startMin = toMinuteTs(move.slot.startUtc);
  const endMin = startMin + move.match.totalDurationMinutes;

  for (const { refereeId } of move.refereeAssignments) {
    const intervals = partial.refereeIntervals.get(refereeId);
    if (!intervals) continue;
    for (const iv of intervals) {
      if (iv.start < endMin && startMin < iv.end) {
        return {
          ok: false,
          reason: {
            type: "referee_no_overlap",
            refereeId,
            conflictingMatchId: iv.matchId,
          },
        };
      }
    }
  }
  return { ok: true };
}

/** Teams must have at least `minRest` minutes between consecutive matches. */
function checkTeamRest(problem: Problem, partial: PartialSolution, move: Move): CheckResult {
  const cfg = problem.classConfigs.find((c) => c.classId === move.match.classId);
  if (!cfg || !cfg.enableTeamRestRule) return { ok: true };
  const minRest = cfg.minRestBetweenTeamMatchesMinutes;
  if (minRest <= 0) return { ok: true };

  const startMin = toMinuteTs(move.slot.startUtc);
  const endMin = startMin + move.match.totalDurationMinutes;

  for (const teamId of [move.match.homeTeamId, move.match.awayTeamId]) {
    if (teamId == null) continue;
    const intervals = partial.teamIntervals.get(teamId);
    if (!intervals) continue;
    for (const iv of intervals) {
      // previous match ends BEFORE this one starts → gap must be ≥ minRest
      if (iv.end <= startMin) {
        if (startMin - iv.end < minRest) {
          return {
            ok: false,
            reason: {
              type: "rest_violation",
              teamId,
              restNeededMinutes: minRest,
            },
          };
        }
      } else if (endMin <= iv.start) {
        if (iv.start - endMin < minRest) {
          return {
            ok: false,
            reason: {
              type: "rest_violation",
              teamId,
              restNeededMinutes: minRest,
            },
          };
        }
      }
    }
  }
  return { ok: true };
}

/** Maximum number of matches a team may play per day. */
function checkTeamMaxPerDay(problem: Problem, partial: PartialSolution, move: Move): CheckResult {
  const cfg = problem.classConfigs.find((c) => c.classId === move.match.classId);
  if (!cfg) return { ok: true };
  const cap = cfg.maxMatchesPerTeamPerDay;
  if (cap <= 0) return { ok: true };

  const date = move.slot.localDate;
  for (const teamId of [move.match.homeTeamId, move.match.awayTeamId]) {
    if (teamId == null) continue;
    const byDay = partial.teamDayCount.get(teamId);
    const count = byDay?.get(date) ?? 0;
    if (count >= cap) {
      return { ok: false, reason: { type: "team_day_limit", teamId, maxPerDay: cap } };
    }
  }
  return { ok: true };
}

/**
 * A team may not play more than `maxConsecutiveMatchesPerTeam` matches in
 * a row without a day break. "Consecutive" = same calendar day without going
 * home. Uses teamDayCount to detect: if a team already has maxConsecutive
 * matches today, reject any more same-day slots.
 * 0 = disabled.
 */
function checkTeamConsecutive(problem: Problem, partial: PartialSolution, move: Move): CheckResult {
  const cfg = problem.classConfigs.find((c) => c.classId === move.match.classId);
  if (!cfg || cfg.maxConsecutiveMatchesPerTeam <= 0) return { ok: true };
  const cap = cfg.maxConsecutiveMatchesPerTeam;
  const date = move.slot.localDate;

  for (const teamId of [move.match.homeTeamId, move.match.awayTeamId]) {
    if (teamId == null) continue;
    const byDay = partial.teamDayCount.get(teamId);
    const count = byDay?.get(date) ?? 0;
    if (count >= cap) {
      return { ok: false, reason: { type: "team_day_limit", teamId, maxPerDay: cap } };
    }
  }
  return { ok: true };
}

/** Team cannot play during a blackout window. */
function checkTeamBlackout(problem: Problem, move: Move): CheckResult {
  const startMin = toMinuteTs(move.slot.startUtc);
  const endMin = startMin + move.match.totalDurationMinutes;
  const date = move.slot.localDate;

  for (const bo of problem.teamBlackouts) {
    if (bo.date !== date) continue;
    const teamId = bo.entityId;
    if (move.match.homeTeamId !== teamId && move.match.awayTeamId !== teamId) continue;
    if (intersectsBlackout(bo, move.slot.startUtc, move.match.totalDurationMinutes, problem.timeZone)) {
      return {
        ok: false,
        reason: {
          type: "blackout",
          entityKind: "team",
          entityId: teamId,
          date,
        },
      };
    }
    void startMin;
    void endMin;
  }
  return { ok: true };
}

/** Referee must have the time window free (explicit blackout or implicit availability). */
function checkRefereeAvailability(problem: Problem, move: Move): CheckResult {
  if (move.refereeAssignments.length === 0) return { ok: true };
  const date = move.slot.localDate;

  for (const { refereeId } of move.refereeAssignments) {
    // Explicit blackout (available-with-holes OR full blackout entry).
    for (const bo of problem.refereeBlackouts) {
      if (bo.entityId !== refereeId) continue;
      if (bo.date !== date) continue;
      if (intersectsBlackout(bo, move.slot.startUtc, move.match.totalDurationMinutes, problem.timeZone)) {
        return { ok: false, reason: { type: "blackout", entityKind: "referee", entityId: refereeId, date } };
      }
    }

    // Positive availability: if rows exist for this referee + date, the slot must
    // fall within at least one of them. If no rows exist at all, we assume the
    // referee is available for the whole tournament.
    const positive = problem.refereeAvailability.filter(
      (a) => a.refereeId === refereeId && a.date === date,
    );
    if (positive.length === 0) continue;

    const matchEndMin = toMinuteTs(move.slot.startUtc) + move.match.totalDurationMinutes;
    const matchStartMin = toMinuteTs(move.slot.startUtc);
    let covered = false;
    for (const w of positive) {
      if (!w.startTime || !w.endTime) {
        covered = true;
        break;
      }
      const wStart = dateTimeToMinuteTs(date, w.startTime, problem.timeZone);
      const wEnd = dateTimeToMinuteTs(date, w.endTime, problem.timeZone);
      if (wStart != null && wEnd != null && matchStartMin >= wStart && matchEndMin <= wEnd) {
        covered = true;
        break;
      }
    }
    if (!covered) {
      return { ok: false, reason: { type: "referee_unavailable", refereeId } };
    }
  }
  return { ok: true };
}

/**
 * Stage completion order: knockout matches in a division may not start until
 * EVERY sibling group/league match in the same classId has ended. Enforced by
 * scanning partial assignments for the latest group/league end time in this
 * division and also forward-checking against unassigned templates (if any
 * group match is not yet placed, we still require the knockout to start after
 * the latest KNOWN group end — propagation catches the rest on commit).
 */
function checkStageCompletionOrder(
  problem: Problem,
  partial: PartialSolution,
  move: Move,
): CheckResult {
  if (move.match.stageKind !== "knockout") return { ok: true };
  const classId = move.match.classId;
  const knockoutStartMin = toMinuteTs(move.slot.startUtc);

  // Look at both placed AND unplaced sibling group/league matches via templates.
  for (const m of problem.matchTemplates) {
    if (m.classId !== classId) continue;
    if (m.stageKind !== "group" && m.stageKind !== "league") continue;
    const a = partial.assignments.get(m.id);
    if (!a) {
      // Unassigned group/league match in same division → knockout is too early.
      // The solver will reorder via sort (stageOrder) anyway, but this keeps
      // the invariant during random LNS repair passes.
      return {
        ok: false,
        reason: {
          type: "stage_completion_order",
          blockingMatchId: m.id,
          blockingStageId: m.stageId,
        },
      };
    }
    const endMin = toMinuteTs(a.scheduledAtUtc) + m.totalDurationMinutes;
    if (endMin > knockoutStartMin) {
      return {
        ok: false,
        reason: {
          type: "stage_completion_order",
          blockingMatchId: m.id,
          blockingStageId: m.stageId,
        },
      };
    }
  }
  return { ok: true };
}

/**
 * Symmetric group-before-knockout guard (LNS safety).
 *
 * `checkStageCompletionOrder` only fires when placing KNOCKOUT matches — it
 * prevents knockout from going before group ends.  But during LNS the engine
 * can destroy a group match and re-place it AFTER an already-committed knockout
 * match (on a different field), which slips through because we never re-check
 * placed knockout matches.
 *
 * This constraint fires when placing a GROUP or LEAGUE match: if any already-
 * placed knockout match in the same division starts before this group match
 * would END, reject the slot.
 */
function checkGroupBeforeKnockout(
  problem: Problem,
  partial: PartialSolution,
  move: Move,
): CheckResult {
  if (move.match.stageKind !== "group" && move.match.stageKind !== "league") return { ok: true };
  const classId = move.match.classId;
  const myEnd = toMinuteTs(move.slot.startUtc) + move.match.totalDurationMinutes;

  for (const m of problem.matchTemplates) {
    if (m.classId !== classId) continue;
    if (m.stageKind !== "knockout") continue;
    const a = partial.assignments.get(m.id);
    if (!a) continue; // knockout not yet placed — fine
    const knockoutStart = toMinuteTs(a.scheduledAtUtc);
    if (knockoutStart < myEnd) {
      return {
        ok: false,
        reason: {
          type: "stage_completion_order",
          blockingMatchId: m.id,
          blockingStageId: m.stageId,
        },
      };
    }
  }
  return { ok: true };
}

/**
 * Knockout round order: round order 1 = final, higher = earlier. A match with
 * roundOrder=k must only start after EVERY match with roundOrder=k+1 in the
 * same stage has ended. I.e. quarter-finals (order=3) must all end before any
 * semi-final (order=2) starts, and both before the final (order=1).
 */
function checkKnockoutRoundOrder(
  problem: Problem,
  partial: PartialSolution,
  move: Move,
): CheckResult {
  if (move.match.stageKind !== "knockout") return { ok: true };
  if (move.match.roundOrder == null) return { ok: true };
  const myOrder = move.match.roundOrder;
  const myStage = move.match.stageId;
  const myStart = toMinuteTs(move.slot.startUtc);
  const myEnd = myStart + move.match.totalDurationMinutes;

  for (const m of problem.matchTemplates) {
    if (m.stageId !== myStage) continue;
    if (m.id === move.match.id) continue;
    if (m.roundOrder == null) continue;
    // Earlier round (higher order) must finish before this one starts.
    if (m.roundOrder > myOrder) {
      const a = partial.assignments.get(m.id);
      if (!a) {
        return {
          ok: false,
          reason: {
            type: "knockout_round_order",
            blockingMatchId: m.id,
            earlierRoundOrder: m.roundOrder,
          },
        };
      }
      const end = toMinuteTs(a.scheduledAtUtc) + m.totalDurationMinutes;
      if (end > myStart) {
        return {
          ok: false,
          reason: {
            type: "knockout_round_order",
            blockingMatchId: m.id,
            earlierRoundOrder: m.roundOrder,
          },
        };
      }
    }
    // Later round (lower order) must not start before this one ends.
    if (m.roundOrder < myOrder) {
      const a = partial.assignments.get(m.id);
      if (!a) continue; // it's not placed yet, it will be checked when placed
      const start = toMinuteTs(a.scheduledAtUtc);
      if (start < myEnd) {
        return {
          ok: false,
          reason: {
            type: "knockout_round_order",
            blockingMatchId: m.id,
            earlierRoundOrder: myOrder,
          },
        };
      }
    }
  }
  return { ok: true };
}

/**
 * Group round order: within a group, all matches of round k must finish before
 * any match of round k+1 starts. If `allowParallelGroupRounds` is true on the
 * division config, this check is SKIPPED (matches overlap freely across rounds
 * as long as team-no-overlap is honoured).
 */
function checkGroupRoundOrder(
  problem: Problem,
  partial: PartialSolution,
  move: Move,
): CheckResult {
  if (move.match.stageKind !== "group") return { ok: true };
  if (move.match.groupId == null || move.match.groupRound == null) return { ok: true };
  const cfg = problem.classConfigs.find((c) => c.classId === move.match.classId);
  if (cfg && cfg.allowParallelGroupRounds) return { ok: true };

  const myGroup = move.match.groupId;
  const myRound = move.match.groupRound;
  const myStart = toMinuteTs(move.slot.startUtc);
  const myEnd = myStart + move.match.totalDurationMinutes;

  for (const m of problem.matchTemplates) {
    if (m.groupId !== myGroup) continue;
    if (m.id === move.match.id) continue;
    if (m.groupRound == null) continue;
    if (m.groupRound < myRound) {
      // An earlier round must finish before this one starts.
      const a = partial.assignments.get(m.id);
      if (!a) {
        return {
          ok: false,
          reason: {
            type: "group_round_order",
            blockingMatchId: m.id,
            groupId: myGroup,
            earlierGroupRound: m.groupRound,
          },
        };
      }
      const end = toMinuteTs(a.scheduledAtUtc) + m.totalDurationMinutes;
      if (end > myStart) {
        return {
          ok: false,
          reason: {
            type: "group_round_order",
            blockingMatchId: m.id,
            groupId: myGroup,
            earlierGroupRound: m.groupRound,
          },
        };
      }
    } else if (m.groupRound > myRound) {
      // A later round must not start before this one ends.
      const a = partial.assignments.get(m.id);
      if (!a) continue;
      const start = toMinuteTs(a.scheduledAtUtc);
      if (start < myEnd) {
        return {
          ok: false,
          reason: {
            type: "group_round_order",
            blockingMatchId: m.id,
            groupId: myGroup,
            earlierGroupRound: myRound,
          },
        };
      }
    }
  }
  return { ok: true };
}

/**
 * Division field whitelist: if a division declares `allowedFieldIds`, a match
 * belonging to that division may ONLY be placed on those fields.
 *
 * This is how "Ajax Stadium → U12 only, Infonet/Levadia → U14 only" is enforced.
 * When the admin assigns fieldIds per division in the planner config, the solver
 * will refuse to place any match on a field outside that division's whitelist.
 */
function checkFieldDivisionAffinity(problem: Problem, move: Move): CheckResult {
  const cfg = problem.classConfigs.find((c) => c.classId === move.match.classId);
  if (!cfg || cfg.allowedFieldIds.length === 0) return { ok: true };
  if (!cfg.allowedFieldIds.includes(move.slot.fieldId)) {
    return {
      ok: false,
      reason: {
        type: "field_division_affinity",
        fieldId: move.slot.fieldId,
        classId: move.match.classId,
      },
    };
  }
  return { ok: true };
}

/** Strict mode: a field may only host matches from its allowed stages. */
function checkFieldStageAffinity(problem: Problem, move: Move): CheckResult {
  const cfg = problem.classConfigs.find((c) => c.classId === move.match.classId);
  if (!cfg || cfg.groupFieldAffinity !== "strict") return { ok: true };
  const allowed = cfg.fieldStageIds[String(move.slot.fieldId)];
  if (!allowed || allowed.length === 0) return { ok: true }; // empty = all allowed
  if (!allowed.includes(move.match.stageId)) {
    return {
      ok: false,
      reason: {
        type: "field_stage_affinity",
        fieldId: move.slot.fieldId,
        stageId: move.match.stageId,
      },
    };
  }
  return { ok: true };
}

// ═════════════════════ Public API: allHardChecks ═════════════════════

/**
 * Runs every hard constraint in sequence. Returns the first failure or `{ok}`.
 * Order matters only for UX — we run cheap checks first (field/team overlap)
 * before expensive ones (blackout date parsing).
 */
export function allHardChecks(
  problem: Problem,
  partial: PartialSolution,
  move: Move,
): CheckResult {
  const checks: Array<() => CheckResult> = [
    () => checkFieldDivisionAffinity(problem, move), // ← fastest reject: wrong division's field
    () => checkMatchFitsInWindow(move),              // slot dayClose vs match duration
    () => checkFieldNoOverlap(partial, move),
    () => checkTeamNoOverlap(partial, move),
    () => checkTeamMaxPerDay(problem, partial, move),
    () => checkTeamConsecutive(problem, partial, move),
    () => checkTeamRest(problem, partial, move),
    () => checkRefereeNoOverlap(partial, move),
    () => checkStageCompletionOrder(problem, partial, move),
    () => checkGroupBeforeKnockout(problem, partial, move),
    () => checkKnockoutRoundOrder(problem, partial, move),
    () => checkGroupRoundOrder(problem, partial, move),
    () => checkFieldStageAffinity(problem, move),
    () => checkTeamBlackout(problem, move),
    () => checkRefereeAvailability(problem, move),
  ];
  for (const c of checks) {
    const r = c();
    if (!r.ok) return r;
  }
  return { ok: true };
}

// ═════════════════════ Commit a move into the partial ═════════════════════

/**
 * Mutates the PartialSolution to record the assignment. Fast — no validation.
 * Caller MUST run `allHardChecks` first.
 */
export function commitMove(partial: PartialSolution, move: Move): Assignment {
  const startMin = toMinuteTs(move.slot.startUtc);
  const endMin = startMin + move.match.totalDurationMinutes;
  const matchId = move.match.id;

  const assignment: Assignment = {
    matchId,
    slotId: move.slot.id,
    fieldId: move.slot.fieldId,
    scheduledAtUtc: move.slot.startUtc,
    localDate: move.slot.localDate,
    localStart: move.slot.localStart,
    refereeAssignments: move.refereeAssignments.slice(),
  };
  partial.assignments.set(matchId, assignment);

  // field intervals
  pushInterval(partial.fieldIntervals, move.slot.fieldId, { start: startMin, end: endMin, matchId });

  // team intervals
  for (const teamId of [move.match.homeTeamId, move.match.awayTeamId]) {
    if (teamId == null) continue;
    pushInterval(partial.teamIntervals, teamId, { start: startMin, end: endMin, matchId });
    // team day count
    const date = move.slot.localDate;
    let byDay = partial.teamDayCount.get(teamId);
    if (!byDay) {
      byDay = new Map();
      partial.teamDayCount.set(teamId, byDay);
    }
    byDay.set(date, (byDay.get(date) ?? 0) + 1);
  }

  // referee intervals
  for (const { refereeId } of move.refereeAssignments) {
    pushInterval(partial.refereeIntervals, refereeId, { start: startMin, end: endMin, matchId });
  }

  return assignment;
}

/**
 * Reverses a previously committed move. Used by LNS destroy-and-repair.
 * Requires the original MatchTemplate + Slot so team/referee intervals and
 * day counts are reversed correctly (can't reliably derive local date from
 * UTC alone due to DST).
 */
export function uncommitMove(
  partial: PartialSolution,
  match: MatchTemplate,
  slot: Slot,
): void {
  const matchId = match.id;
  if (!partial.assignments.has(matchId)) return;
  const assignment = partial.assignments.get(matchId)!;
  partial.assignments.delete(matchId);

  dropInterval(partial.fieldIntervals, slot.fieldId, matchId);

  for (const teamId of [match.homeTeamId, match.awayTeamId]) {
    if (teamId == null) continue;
    dropInterval(partial.teamIntervals, teamId, matchId);
    const byDay = partial.teamDayCount.get(teamId);
    if (byDay) {
      const cur = byDay.get(slot.localDate) ?? 0;
      if (cur > 0) byDay.set(slot.localDate, cur - 1);
    }
  }

  for (const { refereeId } of assignment.refereeAssignments) {
    dropInterval(partial.refereeIntervals, refereeId, matchId);
  }
}

function pushInterval(
  map: Map<number, Array<{ start: number; end: number; matchId: number }>>,
  key: number,
  iv: { start: number; end: number; matchId: number },
): void {
  let list = map.get(key);
  if (!list) {
    list = [];
    map.set(key, list);
  }
  // Insertion sorted by start for faster subsequent overlap checks.
  let i = list.length;
  while (i > 0 && list[i - 1].start > iv.start) i--;
  list.splice(i, 0, iv);
}

function dropInterval(
  map: Map<number, Array<{ start: number; end: number; matchId: number }>>,
  key: number,
  matchId: number,
): void {
  const list = map.get(key);
  if (!list) return;
  const idx = list.findIndex((iv) => iv.matchId === matchId);
  if (idx !== -1) list.splice(idx, 1);
}

// ═════════════════════ Blackout helpers ═════════════════════

function intersectsBlackout(
  bo: Blackout,
  startUtc: string,
  durationMinutes: number,
  zone: string,
): boolean {
  const startMin = toMinuteTs(startUtc);
  const endMin = startMin + durationMinutes;
  if (!bo.startTime || !bo.endTime) return true; // whole day blackout
  const boStart = dateTimeToMinuteTs(bo.date, bo.startTime, zone);
  const boEnd = dateTimeToMinuteTs(bo.date, bo.endTime, zone);
  if (boStart == null || boEnd == null) return false;
  return boStart < endMin && startMin < boEnd;
}

function dateTimeToMinuteTs(date: IsoDate, time: string, zone: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const dt = DateTime.fromISO(`${date}T${time}`, { zone });
  if (!dt.isValid) return null;
  return Math.round(dt.toMillis() / 60000);
}

// ═════════════════════ Soft constraints (scoring) ═════════════════════

/**
 * Computes the soft score for a full solution. Returns a map of
 * constraint-id → penalty so the UI can surface "this run is 70% good on
 * fairness, bad on field utilization".
 */
export function scoreSoft(
  problem: Problem,
  assignments: Assignment[],
): { softScore: number; byConstraint: Record<string, number> } {
  const by: Record<string, number> = {};
  const w = problem.weights;

  by["fieldUtilization"] = w.fieldUtilization * scoreFieldUtilization(problem, assignments);
  by["teamRestComfort"] = w.teamRestComfort * scoreTeamRestComfort(problem, assignments);
  by["homeAwayBalance"] = w.homeAwayBalance * scoreHomeAwayBalance(assignments, problem.matchTemplates);
  by["primetimeForBigMatches"] = w.primetimeForBigMatches * scorePrimetime(problem, assignments);
  by["groupFieldAffinity"] = w.groupFieldAffinity * scoreGroupFieldAffinity(problem, assignments);
  by["refereeWorkloadBalance"] = w.refereeWorkloadBalance * scoreRefereeBalance(assignments);
  by["dayLoadBalance"] = w.dayLoadBalance * scoreDayLoadBalance(problem, assignments);
  by["divisionFieldBalance"] = w.divisionFieldBalance * scoreDivisionFieldBalance(problem, assignments);
  // Compactness: strongly penalise late starts — pushes all matches as early as possible,
  // eliminating gaps (idle field hours) without being a hard constraint.
  by["compactness"] = 1.2 * scoreCompactness(problem, assignments);

  let total = 0;
  for (const k of Object.keys(by)) total += by[k];
  return { softScore: total, byConstraint: by };
}

function scoreFieldUtilization(problem: Problem, assignments: Assignment[]): number {
  // Penalty = empty slot minutes. Lower is better.
  const used = new Set(assignments.map((a) => a.slotId));
  return problem.slots.length - used.size;
}

function scoreTeamRestComfort(problem: Problem, assignments: Assignment[]): number {
  // Penalty grows when team match gaps are smaller than the comfortable rest
  // (2× the minimum). Encourages spreading out matches.
  const byTeam = new Map<number, number[]>();
  for (const a of assignments) {
    const match = problem.matchTemplates.find((m) => m.id === a.matchId);
    if (!match) continue;
    const ts = toMinuteTs(a.scheduledAtUtc);
    for (const tid of [match.homeTeamId, match.awayTeamId]) {
      if (tid == null) continue;
      let arr = byTeam.get(tid);
      if (!arr) {
        arr = [];
        byTeam.set(tid, arr);
      }
      arr.push(ts);
    }
  }
  let penalty = 0;
  for (const arr of byTeam.values()) {
    arr.sort((a, b) => a - b);
    for (let i = 1; i < arr.length; i++) {
      const gap = arr[i] - arr[i - 1];
      const comfortable = 240; // 4 hours comfort goal
      if (gap < comfortable) penalty += comfortable - gap;
    }
  }
  return penalty;
}

function scoreHomeAwayBalance(assignments: Assignment[], matchTemplates: MatchTemplate[]): number {
  // Penalty = sum of |homeCount - awayCount| per team
  const homeCount = new Map<number, number>();
  const awayCount = new Map<number, number>();
  const matchById = new Map(matchTemplates.map(m => [m.id, m]));

  for (const a of assignments) {
    const match = matchById.get(a.matchId);
    if (!match) continue;
    if (match.homeTeamId != null) {
      homeCount.set(match.homeTeamId, (homeCount.get(match.homeTeamId) ?? 0) + 1);
    }
    if (match.awayTeamId != null) {
      awayCount.set(match.awayTeamId, (awayCount.get(match.awayTeamId) ?? 0) + 1);
    }
  }

  const allTeams = new Set([...homeCount.keys(), ...awayCount.keys()]);
  let penalty = 0;
  for (const teamId of allTeams) {
    const h = homeCount.get(teamId) ?? 0;
    const aw = awayCount.get(teamId) ?? 0;
    penalty += Math.abs(h - aw);
  }
  return penalty;
}

function scorePrimetime(problem: Problem, assignments: Assignment[]): number {
  // Reward only the "big" knockout matches — final (roundOrder=1) and
  // semi-finals (roundOrder=2) — for being in the 17:00–20:00 window.
  // Earlier rounds (QF and below) are free to sit anywhere.
  let penalty = 0;
  for (const a of assignments) {
    const match = problem.matchTemplates.find((m) => m.id === a.matchId);
    if (!match || match.stageKind !== "knockout") continue;
    if (match.roundOrder == null || match.roundOrder > 2) continue;
    const slot = problem.slots.find((s) => s.id === a.slotId);
    if (!slot) continue;
    const minutes = parseLocalTime(slot.localStart);
    const primeStart = 17 * 60;
    const primeEnd = 20 * 60;
    if (minutes < primeStart) penalty += primeStart - minutes;
    else if (minutes > primeEnd) penalty += minutes - primeEnd;
  }
  return penalty;
}

function scoreGroupFieldAffinity(problem: Problem, assignments: Assignment[]): number {
  // Penalty = number of distinct fields a group's matches occupy, beyond 1.
  const byGroup = new Map<number, Set<number>>();
  for (const a of assignments) {
    const match = problem.matchTemplates.find((m) => m.id === a.matchId);
    if (!match || match.groupId == null) continue;
    let s = byGroup.get(match.groupId);
    if (!s) {
      s = new Set();
      byGroup.set(match.groupId, s);
    }
    s.add(a.fieldId);
  }
  let penalty = 0;
  for (const s of byGroup.values()) penalty += Math.max(0, s.size - 1);
  return penalty;
}

function scoreRefereeBalance(assignments: Assignment[]): number {
  // Standard deviation of referee match counts.
  const counts = new Map<number, number>();
  for (const a of assignments) {
    for (const r of a.refereeAssignments) {
      counts.set(r.refereeId, (counts.get(r.refereeId) ?? 0) + 1);
    }
  }
  if (counts.size === 0) return 0;
  const arr = Array.from(counts.values());
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + (b - mean) * (b - mean), 0) / arr.length;
  return Math.sqrt(variance);
}

function scoreDayLoadBalance(problem: Problem, assignments: Assignment[]): number {
  // Penalty for uneven matches-per-day.
  const byDay = new Map<IsoDate, number>();
  for (const a of assignments) {
    const slot = problem.slots.find((s) => s.id === a.slotId);
    if (!slot) continue;
    byDay.set(slot.localDate, (byDay.get(slot.localDate) ?? 0) + 1);
  }
  if (byDay.size === 0) return 0;
  const arr = Array.from(byDay.values());
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + (b - mean) * (b - mean), 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Division field balance — penalty when one division monopolises a field.
 *
 * For each field we compute what fraction of its assigned matches belong to each
 * division. The "fair share" would be 1/numActiveDivisions per division per field.
 * We allow up to 1.5× fair share without penalty ("tolerance band"). Any excess
 * is penalised proportionally to the number of matches involved, so a big
 * imbalance on a busy field costs more than the same relative imbalance on an
 * idle field.
 *
 * Example: 4 divisions, 3 fields, fair share = 25% per division per field.
 * Tolerance = 37.5%. If U18 occupies 70% of Field 1 (32 of 46 matches):
 *   excess = 70% - 37.5% = 32.5%,  penalty += 0.325 × 46 ≈ 15.
 *
 * Setting weight=0 (default) disables this entirely — single-division
 * tournaments should never pay this cost.
 */
function scoreDivisionFieldBalance(problem: Problem, assignments: Assignment[]): number {
  if (assignments.length === 0) return 0;

  const matchById = new Map(problem.matchTemplates.map((m) => [m.id, m]));

  // Count matches per (classId, fieldId) and per fieldId total.
  const divField = new Map<string, number>(); // `${classId}:${fieldId}` → count
  const byField = new Map<number, number>();  // fieldId → total

  for (const a of assignments) {
    const match = matchById.get(a.matchId);
    if (!match) continue;
    const key = `${match.classId}:${a.fieldId}`;
    divField.set(key, (divField.get(key) ?? 0) + 1);
    byField.set(a.fieldId, (byField.get(a.fieldId) ?? 0) + 1);
  }

  // Number of active divisions (those with at least one placed match).
  const activeDivisions = new Set(
    assignments.map((a) => matchById.get(a.matchId)?.classId).filter((c) => c != null),
  ).size;
  if (activeDivisions <= 1) return 0; // no balancing needed for a single division

  const fairShare = 1 / activeDivisions;
  const maxAllowed = fairShare * 1.5; // tolerance: 50% above fair share is ok

  let penalty = 0;
  for (const [key, count] of divField) {
    const fieldId = Number(key.split(":")[1]);
    const total = byField.get(fieldId) ?? 1;
    const share = count / total;
    if (share > maxAllowed) {
      // Scale penalty by field size so a busy field's imbalance costs more.
      penalty += (share - maxAllowed) * total;
    }
  }

  return penalty;
}

function scoreCompactness(problem: Problem, assignments: Assignment[]): number {
  // Penalty = average minutesFromDayOpen across all assigned slots.
  // Lower is better — this pushes matches to the start of each field's day,
  // eliminating idle gaps between sessions.
  if (assignments.length === 0) return 0;
  const slotById = new Map(problem.slots.map((s) => [s.id, s]));
  let total = 0;
  let count = 0;
  for (const a of assignments) {
    const slot = slotById.get(a.slotId);
    if (!slot) continue;
    total += slot.minutesFromDayOpen;
    count++;
  }
  return count > 0 ? total / count : 0;
}

// ═════════════════════ Weights helpers ═════════════════════

export function mergeWeights(base: Weights, override?: Partial<Weights>): Weights {
  if (!override) return base;
  return { ...base, ...override };
}
