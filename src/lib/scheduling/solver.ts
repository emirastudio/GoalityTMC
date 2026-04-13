/**
 * Solver — Large Neighborhood Search (LNS) with constraint propagation.
 *
 * Pipeline:
 *   1. Greedy seed: most-constrained-first assignment with forward checking.
 *   2. LNS loop:    destroy 15-30% of assignments, repair greedily, accept if
 *                   (hard↓) or (hard= and soft↓).
 *   3. SA polish:   short simulated annealing with 2-swap moves for final
 *                   quality on plateaued solutions.
 *
 * Determinism: every random choice flows through the seeded RNG. Same Problem
 * with the same seed produces the same Solution byte-for-byte.
 */

import {
  allHardChecks,
  commitMove,
  mergeWeights,
  scoreSoft,
  uncommitMove,
  type Move,
} from "./constraints";
import { createRng, type Rng, seedFromString } from "./rng";
import type {
  Assignment,
  MatchTemplate,
  PartialSolution,
  Problem,
  RefereeRole,
  Slot,
  Solution,
  Unplaced,
} from "./types";
import { DEFAULT_WEIGHTS, emptyPartial } from "./types";

// ═════════════════════ Options ═════════════════════

export type SolveOptions = {
  /** Total wall-clock budget in milliseconds. Soft-capped internally. */
  budgetMs: number;
  /** Max LNS iterations regardless of time (safety net). */
  maxIterations: number;
  /** Fraction of assignments to destroy per iteration. */
  destroyRatio: number;
};

export const DEFAULT_SOLVE_OPTIONS: SolveOptions = {
  budgetMs: 8000,
  maxIterations: 2000,
  destroyRatio: 0.2,
};

// ═════════════════════ Public entry point ═════════════════════

export function solve(problem: Problem, opts?: Partial<SolveOptions>): Solution {
  const options = { ...DEFAULT_SOLVE_OPTIONS, ...opts };
  const weights = mergeWeights(DEFAULT_WEIGHTS, problem.weights);
  const problemWithWeights: Problem = { ...problem, weights };
  const rng = createRng(problem.seed || seedFromString("default"));
  const startedAt = Date.now();

  // 1. seed
  const partial = emptyPartial();
  applyLocks(problemWithWeights, partial);
  const { unplaced: seedUnplaced } = greedySeed(problemWithWeights, partial, rng);

  // 2. LNS
  const lnsResult = lns(problemWithWeights, partial, seedUnplaced, options, rng, startedAt);

  // 3. SA polish on best solution if budget permits
  const remainingBudget = options.budgetMs - (Date.now() - startedAt);
  if (remainingBudget > 500 && lnsResult.hardViolations === 0) {
    saPolish(problemWithWeights, partial, rng, Math.min(remainingBudget, 1500));
  }

  // 4. Finalise
  const assignments = Array.from(partial.assignments.values());
  const unplaced: Unplaced[] = lnsResult.unplaced;
  const softResult = scoreSoft(problemWithWeights, assignments);

  return {
    assignments,
    unplaced,
    score: {
      hardViolations: lnsResult.hardViolations,
      softScore: softResult.softScore,
      byConstraint: softResult.byConstraint,
    },
    diagnostics: {
      elapsedMs: Date.now() - startedAt,
      iterations: lnsResult.iterations,
      bestFoundAt: lnsResult.bestFoundAt,
      seed: problem.seed,
    },
  };
}

// ═════════════════════ Locks ═════════════════════

function applyLocks(problem: Problem, partial: PartialSolution): void {
  for (const lock of problem.locks) {
    const match = problem.matchTemplates.find((m) => m.id === lock.matchId);
    if (!match) continue;
    const slot = problem.slots.find((s) => s.id === lock.slotId);
    if (!slot) continue;

    // Locks are trusted — no hard check. Record assignment directly.
    const move: Move = {
      match,
      slot,
      refereeAssignments: lock.refereeAssignments,
    };
    commitMove(partial, move);
  }
}

// ═════════════════════ Greedy seed ═════════════════════

/**
 * Most-constrained-first greedy with forward checking.
 * For each unplaced match (sorted by "fewest feasible slots first"), try all
 * slots in heuristic order and pick the first that passes all hard checks.
 */
function greedySeed(
  problem: Problem,
  partial: PartialSolution,
  rng: Rng,
): { unplaced: Unplaced[] } {
  const placedIds = new Set(partial.assignments.keys());
  const remaining = problem.matchTemplates.filter((m) => !placedIds.has(m.id));

  // Sort order enforces the tournament's LOGICAL timeline:
  //   1. Stage order (group/league first, then knockout) — so we never place
  //      a TBD bracket match into a slot before the group matches land.
  //   2. Within a group stage: earlier groupRound first. Round 1 all placed
  //      before round 2, etc., so checkGroupRoundOrder has somewhere to land.
  //   3. Within a knockout stage: EARLIER rounds first (higher roundOrder
  //      number). Quarter-finals (order=3) before semi-finals (order=2)
  //      before final (order=1). Matches commit into early slots in the
  //      knockout window first, leaving late slots free for the final.
  //   4. Two-legged matches before same-round single-leg (legacy, no-op since
  //      we said "no two-legged for now", but keeps the code forward-compat).
  //   5. Deterministic id tiebreaker.
  remaining.sort((a, b) => {
    const aIsKO = a.stageKind === "knockout";
    const bIsKO = b.stageKind === "knockout";

    // Non-knockout (group/league) always before any knockout, regardless of
    // stageOrder. The stage completion order constraint enforces this at runtime
    // for the solver; here we just make the greedy seed respect it.
    if (aIsKO !== bIsKO) return aIsKO ? 1 : -1;

    if (!aIsKO) {
      // Both non-knockout: earlier stage first, then earlier group round.
      if (a.stageOrder !== b.stageOrder) return a.stageOrder - b.stageOrder;
      const ar = a.groupRound ?? 999;
      const br = b.groupRound ?? 999;
      if (ar !== br) return ar - br;
    } else {
      // Both knockout: sort by roundOrder descending across ALL knockout stages
      // (QF=3 before SF=2 before Final=1), interleaving multiple playoff brackets
      // so they share available slots fairly. checkKnockoutRoundOrder enforces
      // the per-stage sequential constraint at placement time.
      const ar = a.roundOrder ?? 0;
      const br = b.roundOrder ?? 0;
      if (ar !== br) return br - ar; // larger first = earlier round first
      // Tiebreaker within same roundOrder: earlier stageOrder first.
      if (a.stageOrder !== b.stageOrder) return a.stageOrder - b.stageOrder;
    }

    const aTwo = a.twoLeggedPeerId != null ? 0 : 1;
    const bTwo = b.twoLeggedPeerId != null ? 0 : 1;
    if (aTwo !== bTwo) return aTwo - bTwo;
    return a.id - b.id;
  });

  const unplaced: Unplaced[] = [];
  for (const match of remaining) {
    const placed = tryPlace(problem, partial, match, rng);
    if (!placed.ok) {
      unplaced.push({ matchId: match.id, reasons: placed.reasons });
    }
  }
  return { unplaced };
}

function tryPlace(
  problem: Problem,
  partial: PartialSolution,
  match: MatchTemplate,
  rng: Rng,
): { ok: true } | { ok: false; reasons: Unplaced["reasons"] } {
  const candidateSlots = orderSlotsForMatch(problem, partial, match, rng);
  const reasons: Unplaced["reasons"] = [];
  let reasonSeen = 0;

  for (const slot of candidateSlots) {
    const refereeAssignments = pickReferees(problem, partial, match, slot);
    const move: Move = { match, slot, refereeAssignments };
    const check = allHardChecks(problem, partial, move);
    if (check.ok) {
      commitMove(partial, move);
      return { ok: true };
    }
    // Keep the first 3 distinct reasons for the explainer.
    if (reasonSeen < 3) {
      reasons.push(check.reason);
      reasonSeen++;
    }
  }

  if (reasons.length === 0) reasons.push({ type: "no_slot_in_window" });
  return { ok: false, reasons };
}

/**
 * Orders slots by heuristic desirability for the given match.
 *
 * Goal: fill slots SEQUENTIALLY — pack each field column top-to-bottom before
 * moving to the next field. This produces a clean, readable grid in the planner
 * (no diagonal scatter, no morning/afternoon gaps).
 *
 * Sort keys (asc):
 *   1. Preferred field flag  — admin-pinned field wins
 *   2. Local date            — fill day 1 before day 2
 *   3. Field load on day     — fill the least-used field first (pack columns)
 *   4. Local start time      — fill morning before afternoon within a field
 *   5. Field id              — deterministic tiebreaker
 *
 * No jitter: the greedy seed is fully deterministic. The LNS destroy-and-repair
 * loop explores neighbourhood moves on top of this clean initial placement.
 */
function orderSlotsForMatch(
  problem: Problem,
  partial: PartialSolution,
  match: MatchTemplate,
  rng: Rng,
): Slot[] {
  // Build field load map: "YYYY-MM-DD:fieldId" → count of matches placed so far.
  // We fill the LEAST loaded field first so matches pack column-by-column.
  const fieldLoad = new Map<string, number>();
  const slotById = new Map<string, Slot>();
  for (const s of problem.slots) slotById.set(s.id, s);
  for (const a of partial.assignments.values()) {
    const s = slotById.get(a.slotId);
    if (!s) continue;
    const fKey = `${s.localDate}:${s.fieldId}`;
    fieldLoad.set(fKey, (fieldLoad.get(fKey) ?? 0) + 1);
  }

  const pref = new Set(match.preferredFieldIds ?? []);
  const candidates = problem.slots.slice();

  candidates.sort((a, b) => {
    // Preferred field first
    const aPref = pref.has(a.fieldId) ? 0 : 1;
    const bPref = pref.has(b.fieldId) ? 0 : 1;
    if (aPref !== bPref) return aPref - bPref;
    // Earlier date first — keeps round-ordering tight for multi-round stages
    if (a.localDate !== b.localDate) return a.localDate < b.localDate ? -1 : 1;
    // Field load: prefer least-used field (pack columns sequentially)
    const aFl = fieldLoad.get(`${a.localDate}:${a.fieldId}`) ?? 0;
    const bFl = fieldLoad.get(`${b.localDate}:${b.fieldId}`) ?? 0;
    if (aFl !== bFl) return aFl - bFl;
    // Within the same field (tied load), fill earliest slot first
    if (a.localStart !== b.localStart) return a.localStart < b.localStart ? -1 : 1;
    // Deterministic tiebreaker: field id
    return a.fieldId - b.fieldId;
  });

  // Fully deterministic — no jitter. rng parameter kept for API compatibility.
  void rng;

  return candidates;
}

/**
 * Picks referees for a match. Simplest strategy: pick the least-loaded
 * eligible referees first. If insufficient referees exist, we assign what we
 * can and let the referee-availability constraint surface any issues.
 */
function pickReferees(
  problem: Problem,
  partial: PartialSolution,
  match: MatchTemplate,
  slot: Slot,
): Array<{ refereeId: number; role: RefereeRole }> {
  if (problem.referees.length === 0) return [];
  const needed: Array<RefereeRole> = [];
  for (let i = 0; i < match.requiredMainReferees; i++) needed.push("main");
  for (let i = 0; i < match.requiredAssistantReferees; i++) {
    needed.push(i === 0 ? "assistant1" : i === 1 ? "assistant2" : "fourth");
  }

  const out: Array<{ refereeId: number; role: RefereeRole }> = [];
  const used = new Set<number>();

  for (const role of needed) {
    const eligible = problem.referees
      .filter((r) => r.eligibleRoles.includes(role) && !used.has(r.id))
      .map((r) => ({ r, load: partial.refereeIntervals.get(r.id)?.length ?? 0 }));
    if (eligible.length === 0) break;
    eligible.sort((a, b) => a.load - b.load);
    const chosen = eligible[0].r;
    out.push({ refereeId: chosen.id, role });
    used.add(chosen.id);
  }

  return out;
  void slot; // reserved for future travel-distance heuristics
}

// ═════════════════════ Large Neighborhood Search ═════════════════════

type LnsResult = {
  hardViolations: number;
  iterations: number;
  bestFoundAt: number;
  unplaced: Unplaced[];
};

function lns(
  problem: Problem,
  partial: PartialSolution,
  seedUnplaced: Unplaced[],
  options: SolveOptions,
  rng: Rng,
  startedAt: number,
): LnsResult {
  let bestAssignmentCount = partial.assignments.size;
  let bestSoftScore = scoreSoft(problem, Array.from(partial.assignments.values())).softScore;
  let bestSnapshot = snapshotPartialDeep(partial);
  let bestUnplaced: Unplaced[] = seedUnplaced;
  let bestFoundAt = Date.now() - startedAt;
  let iter = 0;
  let plateauIterations = 0; // iterations since last improvement
  const totalMatches = problem.matchTemplates.length;
  const earlyExitPlateau = 400;

  while (iter < options.maxIterations) {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= options.budgetMs) break;

    // Early exit: if all matches placed AND plateau stable for N iterations,
    // we're done. Shaves 6+ seconds off easy problems.
    if (
      bestAssignmentCount === totalMatches &&
      plateauIterations >= earlyExitPlateau
    ) {
      break;
    }

    iter++;

    // Destroy: pick ratio × current assignments to remove.
    const assigned = Array.from(partial.assignments.values());
    if (assigned.length === 0) break;
    const destroyCount = Math.max(1, Math.floor(assigned.length * options.destroyRatio));
    const shuffled = assigned.slice();
    rng.shuffle(shuffled);
    const toRemove = shuffled.slice(0, destroyCount);

    for (const a of toRemove) {
      const match = problem.matchTemplates.find((m) => m.id === a.matchId);
      if (!match) continue;
      const slot = problem.slots.find((s) => s.id === a.slotId);
      if (!slot) continue;
      if (isLocked(problem, match.id)) continue;
      uncommitMove(partial, match, slot);
    }

    // Repair
    const repairResult = greedySeed(problem, partial, rng);

    const newCount = partial.assignments.size;
    const newSoft = scoreSoft(problem, Array.from(partial.assignments.values())).softScore;

    const better =
      newCount > bestAssignmentCount ||
      (newCount === bestAssignmentCount && newSoft < bestSoftScore);
    if (better) {
      bestAssignmentCount = newCount;
      bestSoftScore = newSoft;
      bestSnapshot = snapshotPartialDeep(partial);
      bestUnplaced = repairResult.unplaced;
      bestFoundAt = Date.now() - startedAt;
      plateauIterations = 0;
    } else {
      restorePartialDeep(partial, bestSnapshot);
      plateauIterations++;
    }
  }

  // Restore the best found.
  restorePartialDeep(partial, bestSnapshot);

  const hardViolations = totalMatches - partial.assignments.size;

  return { hardViolations, iterations: iter, bestFoundAt, unplaced: bestUnplaced };
}

function isLocked(problem: Problem, matchId: number): boolean {
  return problem.locks.some((l) => l.matchId === matchId);
}

// ═════════════════════ SA polish ═════════════════════

function saPolish(problem: Problem, partial: PartialSolution, rng: Rng, budgetMs: number): void {
  const start = Date.now();
  const T0 = 1;
  const TN = 0.01;
  let iter = 0;
  const maxIter = 500;
  let currentScore = scoreSoft(problem, Array.from(partial.assignments.values())).softScore;

  while (iter < maxIter) {
    if (Date.now() - start >= budgetMs) break;
    const t = T0 * Math.pow(TN / T0, iter / maxIter);
    iter++;

    // 2-swap: pick two assignments, swap their slots if both stay feasible.
    const assignments = Array.from(partial.assignments.values());
    if (assignments.length < 2) break;
    const a = rng.pick(assignments)!;
    const b = rng.pick(assignments)!;
    if (a.matchId === b.matchId) continue;
    if (isLocked(problem, a.matchId) || isLocked(problem, b.matchId)) continue;

    const matchA = problem.matchTemplates.find((m) => m.id === a.matchId);
    const matchB = problem.matchTemplates.find((m) => m.id === b.matchId);
    const slotA = problem.slots.find((s) => s.id === a.slotId);
    const slotB = problem.slots.find((s) => s.id === b.slotId);
    if (!matchA || !matchB || !slotA || !slotB) continue;

    // Remove both, try to place swapped, rollback if infeasible.
    uncommitMove(partial, matchA, slotA);
    uncommitMove(partial, matchB, slotB);

    const moveA: Move = { match: matchA, slot: slotB, refereeAssignments: a.refereeAssignments };
    const moveB: Move = { match: matchB, slot: slotA, refereeAssignments: b.refereeAssignments };

    const checkA = allHardChecks(problem, partial, moveA);
    if (!checkA.ok) {
      commitMove(partial, { match: matchA, slot: slotA, refereeAssignments: a.refereeAssignments });
      commitMove(partial, { match: matchB, slot: slotB, refereeAssignments: b.refereeAssignments });
      continue;
    }
    commitMove(partial, moveA);
    const checkB = allHardChecks(problem, partial, moveB);
    if (!checkB.ok) {
      uncommitMove(partial, matchA, slotB);
      commitMove(partial, { match: matchA, slot: slotA, refereeAssignments: a.refereeAssignments });
      commitMove(partial, { match: matchB, slot: slotB, refereeAssignments: b.refereeAssignments });
      continue;
    }
    commitMove(partial, moveB);

    const newScore = scoreSoft(problem, Array.from(partial.assignments.values())).softScore;
    const delta = newScore - currentScore;
    if (delta < 0 || rng.next() < Math.exp(-delta / t)) {
      currentScore = newScore;
    } else {
      // Revert swap
      uncommitMove(partial, matchA, slotB);
      uncommitMove(partial, matchB, slotA);
      commitMove(partial, { match: matchA, slot: slotA, refereeAssignments: a.refereeAssignments });
      commitMove(partial, { match: matchB, slot: slotB, refereeAssignments: b.refereeAssignments });
    }
  }
}

// ═════════════════════ Snapshot / restore ═════════════════════
// LNS needs to roll back a partial solution that didn't improve. We store a
// deep copy of every bookkeeping map. This is O(matches) per snapshot, which
// is cheap compared to the constraint checks the restored solution avoids.

type PartialSolutionSnapshot = {
  assignments: Map<number, Assignment>;
  teamIntervals: Map<number, Array<{ start: number; end: number; matchId: number }>>;
  fieldIntervals: Map<number, Array<{ start: number; end: number; matchId: number }>>;
  refereeIntervals: Map<number, Array<{ start: number; end: number; matchId: number }>>;
  teamDayCount: Map<number, Map<string, number>>;
};

function snapshotPartialDeep(partial: PartialSolution): PartialSolutionSnapshot {
  return {
    assignments: new Map(
      Array.from(partial.assignments.entries()).map(([k, v]) => [
        k,
        { ...v, refereeAssignments: v.refereeAssignments.slice() },
      ]),
    ),
    teamIntervals: deepCopyIntervalMap(partial.teamIntervals),
    fieldIntervals: deepCopyIntervalMap(partial.fieldIntervals),
    refereeIntervals: deepCopyIntervalMap(partial.refereeIntervals),
    teamDayCount: deepCopyDayCount(partial.teamDayCount),
  };
}

function restorePartialDeep(partial: PartialSolution, snap: PartialSolutionSnapshot): void {
  // Mutate the existing Maps in-place so that outer references are preserved.
  partial.assignments.clear();
  for (const [k, v] of snap.assignments) {
    partial.assignments.set(k, { ...v, refereeAssignments: v.refereeAssignments.slice() });
  }
  partial.teamIntervals.clear();
  for (const [k, list] of snap.teamIntervals) partial.teamIntervals.set(k, list.map((iv) => ({ ...iv })));
  partial.fieldIntervals.clear();
  for (const [k, list] of snap.fieldIntervals) partial.fieldIntervals.set(k, list.map((iv) => ({ ...iv })));
  partial.refereeIntervals.clear();
  for (const [k, list] of snap.refereeIntervals) partial.refereeIntervals.set(k, list.map((iv) => ({ ...iv })));
  partial.teamDayCount.clear();
  for (const [k, inner] of snap.teamDayCount) partial.teamDayCount.set(k, new Map(inner));
}

function deepCopyIntervalMap(
  map: Map<number, Array<{ start: number; end: number; matchId: number }>>,
): Map<number, Array<{ start: number; end: number; matchId: number }>> {
  const out = new Map<number, Array<{ start: number; end: number; matchId: number }>>();
  for (const [k, list] of map) out.set(k, list.map((iv) => ({ ...iv })));
  return out;
}

function deepCopyDayCount(
  map: Map<number, Map<string, number>>,
): Map<number, Map<string, number>> {
  const out = new Map<number, Map<string, number>>();
  for (const [k, inner] of map) out.set(k, new Map(inner));
  return out;
}
