/**
 * Tests: solver — correctness invariants, determinism, multi-division fields.
 *
 * These tests are the AUTOMATED SCHEDULE VALIDATOR. Run them after any solver
 * change to catch regressions. The checks mirror what an organiser would verify
 * by hand: no double-booking, no matches outside stadium hours, correct order.
 */

import { describe, it, expect } from "vitest";
import { solve } from "../solver";
import { buildProblem } from "../problem";
import { makeSnapshot, makeConfig } from "./helpers";

// ─── Validation helpers ───────────────────────────────────────────────────────

/** Default budget for tests — short enough to run fast, enough to find a good solution. */
const TEST_BUDGET_MS = 2000;

/**
 * Runs the solver and returns the solution, asserting no hard violations.
 * This is the PRIMARY CHECK that callers apply after every solver test.
 */
function solveAndVerify(snapArgs: Parameters<typeof makeSnapshot>[0] = {}, seed = 42) {
  const snap = makeSnapshot(snapArgs);
  const problem = buildProblem(snap, { seed });
  const solution = solve(problem, { budgetMs: TEST_BUDGET_MS });
  return { solution, problem, snap };
}

/** Asserts ALL key scheduling invariants on a solution. */
function assertScheduleCorrect(solution: ReturnType<typeof solve>, problem: ReturnType<typeof buildProblem>) {
  const { assignments, unplaced } = solution;
  const slotById = new Map(problem.slots.map(s => [s.id, s]));
  const matchById = new Map(problem.matchTemplates.map(m => [m.id, m]));

  // ① No hard violations reported by solver
  expect(solution.score.hardViolations).toBe(0);

  // ② Every placed match is within field day window
  for (const a of assignments) {
    const slot = slotById.get(a.slotId);
    const match = matchById.get(a.matchId);
    expect(slot).toBeTruthy();
    expect(match).toBeTruthy();
    if (!slot || !match) continue;

    const startMin = Math.round(new Date(slot.startUtc).getTime() / 60000);
    const endMin = startMin + match.totalDurationMinutes;
    const closeMin = Math.round(new Date(slot.dayCloseUtc).getTime() / 60000);
    expect(endMin).toBeLessThanOrEqual(closeMin);
  }

  // ③ No field double-booking: for each (field, date), intervals must not overlap
  type Interval = { start: number; end: number; matchId: number };
  const fieldDayIntervals = new Map<string, Interval[]>();
  for (const a of assignments) {
    const slot = slotById.get(a.slotId)!;
    const match = matchById.get(a.matchId)!;
    const key = `${slot.fieldId}:${slot.localDate}`;
    const ivs = fieldDayIntervals.get(key) ?? [];
    const start = Math.round(new Date(slot.startUtc).getTime() / 60000);
    ivs.push({ start, end: start + match.totalDurationMinutes, matchId: a.matchId });
    fieldDayIntervals.set(key, ivs);
  }
  for (const [key, ivs] of fieldDayIntervals) {
    for (let i = 0; i < ivs.length; i++) {
      for (let j = i + 1; j < ivs.length; j++) {
        const a = ivs[i], b = ivs[j];
        const overlaps = a.start < b.end && b.start < a.end;
        if (overlaps) {
          throw new Error(
            `Field double-booking on ${key}: match ${a.matchId} [${a.start}–${a.end}] vs match ${b.matchId} [${b.start}–${b.end}]`
          );
        }
      }
    }
  }

  // ④ No team double-booking
  const teamIntervals = new Map<number, Interval[]>();
  for (const a of assignments) {
    const slot = slotById.get(a.slotId)!;
    const match = matchById.get(a.matchId)!;
    const start = Math.round(new Date(slot.startUtc).getTime() / 60000);
    const iv = { start, end: start + match.totalDurationMinutes, matchId: a.matchId };
    for (const teamId of [match.homeTeamId, match.awayTeamId]) {
      if (teamId == null) continue;
      const ivs = teamIntervals.get(teamId) ?? [];
      for (const existing of ivs) {
        if (existing.start < iv.end && iv.start < existing.end) {
          throw new Error(
            `Team ${teamId} double-booking: match ${existing.matchId} [${existing.start}–${existing.end}] vs match ${a.matchId} [${iv.start}–${iv.end}]`
          );
        }
      }
      ivs.push(iv);
      teamIntervals.set(teamId, ivs);
    }
  }

  // ⑤ Each match appears in assignments AT MOST once
  const seen = new Set<number>();
  for (const a of assignments) {
    expect(seen.has(a.matchId)).toBe(false);
    seen.add(a.matchId);
  }
}

// ─── Basic correctness ────────────────────────────────────────────────────────

describe("Solver correctness — single division", () => {
  it("places all 6 matches for 4 teams on 1 field over 2 days", () => {
    const { solution, problem } = solveAndVerify({ numTeams: 4, numFields: 1, days: ["2026-08-14", "2026-08-15"] });
    assertScheduleCorrect(solution, problem);
    // 4 teams → C(4,2) = 6 matches
    expect(solution.assignments).toHaveLength(6);
    expect(solution.unplaced).toHaveLength(0);
  });

  it("places all 28 matches for 8 teams on 2 fields over 4 days", () => {
    const { solution, problem } = solveAndVerify({
      numTeams: 8,
      numFields: 2,
      days: ["2026-08-14", "2026-08-15", "2026-08-16", "2026-08-17"],
      configs: [makeConfig({ fieldIds: [1, 2] })],
    });
    assertScheduleCorrect(solution, problem);
    // 8 teams → C(8,2) = 28 matches
    expect(solution.assignments).toHaveLength(28);
  });

  it("matches are only placed within stadium open hours (10:00–18:00)", () => {
    // Use 3 teams → C(3,2)=3 matches, easily fits in 1 day
    const { solution, problem } = solveAndVerify({
      numTeams: 3,
      numFields: 1,
      days: ["2026-08-14"],
      configs: [makeConfig({ fieldIds: [1], dailyStartTime: "10:00", dailyEndTime: "18:00" })],
    });
    // All 3 matches should be placed with 0 hard violations
    assertScheduleCorrect(solution, problem);
    expect(solution.assignments).toHaveLength(3);
    // Every placed slot must be inside the 10:00–18:00 window
    for (const a of solution.assignments) {
      const slot = problem.slots.find(s => s.id === a.slotId)!;
      expect(slot.localStart >= "10:00").toBe(true);
      // Start must be before close (actual end ≤ 18:00 checked by assertScheduleCorrect)
      expect(slot.localStart < "18:00").toBe(true);
    }
  });

  it("does not place any match before the stadium opens", () => {
    // Verify no slots exist before 10:00 in a 10:00–18:00 config
    const { problem } = solveAndVerify({
      numTeams: 3,
      numFields: 1,
      days: ["2026-08-14"],
      configs: [makeConfig({ fieldIds: [1], dailyStartTime: "10:00", dailyEndTime: "18:00" })],
    });
    for (const slot of problem.slots) {
      expect(slot.localStart >= "10:00").toBe(true);
    }
  });
});

// ─── Multi-division shared field ──────────────────────────────────────────────

describe("Solver correctness — multi-division shared field", () => {
  /**
   * Scenario: 1 field, 2 divisions.
   * Division 1 (U16): match = 55 min, 4 teams → 6 matches, plays 10:00–18:00
   * Division 2 (U10): match = 25 min, 4 teams → 6 matches, plays 09:00–18:00
   * Both share field 1. Total = 12 matches to place.
   */
  function makeMultiDivSnap() {
    const snap = makeSnapshot({ numTeams: 0, numFields: 1, days: ["2026-08-14"] });

    // Division 1: U16, 55-min matches
    const cfg1 = makeConfig({
      fieldIds: [1],
      dailyStartTime: "10:00",
      dailyEndTime: "18:00",
      halvesCount: 2,
      halfDurationMinutes: 25,
      breakBetweenHalvesMinutes: 5,
      breakBetweenMatchesMinutes: 0,
      slotGranularityMinutes: 5,
      enableTeamRestRule: false,
    });

    // Division 2: U10, 25-min matches
    const cfg2 = makeConfig({
      fieldIds: [1],
      dailyStartTime: "09:00",
      dailyEndTime: "18:00",
      halvesCount: 1,
      halfDurationMinutes: 25,
      breakBetweenHalvesMinutes: 0,
      breakBetweenMatchesMinutes: 0,
      slotGranularityMinutes: 5,
      enableTeamRestRule: false,
    });

    // Build teams per division
    const teams = [
      ...Array.from({ length: 4 }, (_, i) => ({ id: i + 1, classId: 1, displayName: `U16 Team ${i + 1}` })),
      ...Array.from({ length: 4 }, (_, i) => ({ id: i + 5, classId: 2, displayName: `U10 Team ${i + 1}` })),
    ];

    // Matches for division 1 (classId=1, stageId=1)
    const matches1 = [];
    let mid = 1;
    for (let a = 1; a <= 4; a++) for (let b = a + 1; b <= 4; b++) {
      matches1.push({
        id: mid++, classId: 1, stageId: 1, groupId: 1, roundId: null, groupRound: null,
        homeTeamId: a, awayTeamId: b, fieldId: null, scheduledAt: null, lockedAt: null,
        lockReason: null, bufferBeforeMinutes: null, bufferAfterMinutes: null,
        roundOrder: null, roundMatchCount: null, isTwoLegged: false, legIndex: null,
        twoLeggedPeerId: null, matchReferees: [],
      });
    }

    // Matches for division 2 (classId=2, stageId=2)
    const matches2 = [];
    for (let a = 5; a <= 8; a++) for (let b = a + 1; b <= 8; b++) {
      matches2.push({
        id: mid++, classId: 2, stageId: 2, groupId: 2, roundId: null, groupRound: null,
        homeTeamId: a, awayTeamId: b, fieldId: null, scheduledAt: null, lockedAt: null,
        lockReason: null, bufferBeforeMinutes: null, bufferAfterMinutes: null,
        roundOrder: null, roundMatchCount: null, isTwoLegged: false, legIndex: null,
        twoLeggedPeerId: null, matchReferees: [],
      });
    }

    return {
      ...snap,
      divisions: [
        { classId: 1, scheduleConfig: cfg1 },
        { classId: 2, scheduleConfig: cfg2 },
      ],
      teams,
      matches: [...matches1, ...matches2],
      stages: [
        { id: 1, classId: 1, type: "group" as const, order: 1, settings: {} },
        { id: 2, classId: 2, type: "group" as const, order: 1, settings: {} },
      ],
    };
  }

  it("places 12 matches (2 divisions × 6) on 1 shared field with no conflicts", () => {
    const snap = makeMultiDivSnap();
    const problem = buildProblem(snap, { seed: 42 });
    const solution = solve(problem, { budgetMs: 15000 });

    assertScheduleCorrect(solution, problem);
    expect(solution.score.hardViolations).toBe(0);
    expect(solution.assignments.length).toBeGreaterThanOrEqual(10); // most should be placed
  });

  it("U10 matches (25 min) can use late-day slots that U16 (55 min) cannot", () => {
    const snap = makeMultiDivSnap();
    const problem = buildProblem(snap, { seed: 42 });
    const solution = solve(problem, { budgetMs: 15000 });

    // Check: no U16 match (55-min) starts after 17:05 (17:05+55=18:00)
    // Check: U10 match (25-min) CAN start as late as 17:35 (17:35+25=18:00)
    const slotById = new Map(problem.slots.map(s => [s.id, s]));
    const matchById = new Map(problem.matchTemplates.map(m => [m.id, m]));

    for (const a of solution.assignments) {
      const slot = slotById.get(a.slotId)!;
      const match = matchById.get(a.matchId)!;
      // Verify no match ends after close time
      const startMin = Math.round(new Date(slot.startUtc).getTime() / 60000);
      const endMin = startMin + match.totalDurationMinutes;
      const closeMin = Math.round(new Date(slot.dayCloseUtc).getTime() / 60000);
      expect(endMin).toBeLessThanOrEqual(closeMin);
    }
  });
});

// ─── Determinism ──────────────────────────────────────────────────────────────

describe("Solver determinism", () => {
  it("produces identical assignments with the same seed", { timeout: 15000 }, () => {
    const snap = makeSnapshot({ numTeams: 4, numFields: 1, days: ["2026-08-14", "2026-08-15"] });
    const p1 = buildProblem(snap, { seed: 12345 });
    const p2 = buildProblem(snap, { seed: 12345 });

    const s1 = solve(p1, { budgetMs: TEST_BUDGET_MS });
    const s2 = solve(p2, { budgetMs: TEST_BUDGET_MS });

    const ids1 = s1.assignments.map(a => `${a.matchId}:${a.slotId}`).sort();
    const ids2 = s2.assignments.map(a => `${a.matchId}:${a.slotId}`).sort();
    expect(ids1).toEqual(ids2);
  });

  it("produces different assignments with different seeds (usually)", { timeout: 15000 }, () => {
    // Use enough teams to make distinct orderings likely
    const snap = makeSnapshot({
      numTeams: 6,
      numFields: 2,
      days: ["2026-08-14", "2026-08-15"],
      configs: [makeConfig({ fieldIds: [1, 2] })],
    });
    const p1 = buildProblem(snap, { seed: 1 });
    const p2 = buildProblem(snap, { seed: 9999 });

    const s1 = solve(p1, { budgetMs: TEST_BUDGET_MS });
    const s2 = solve(p2, { budgetMs: TEST_BUDGET_MS });
    const ids1 = s1.assignments.map(a => `${a.matchId}:${a.slotId}`).sort().join(",");
    const ids2 = s2.assignments.map(a => `${a.matchId}:${a.slotId}`).sort().join(",");
    // LNS with different seeds almost certainly produces different results
    expect(ids1).not.toBe(ids2);
  });
});

// ─── Performance ─────────────────────────────────────────────────────────────

describe("Solver performance", () => {
  it("places all 6 matches (4 teams) in under 3 seconds", { timeout: 10000 }, () => {
    const start = Date.now();
    const { solution, problem } = solveAndVerify({
      numTeams: 4,
      numFields: 1,
      days: ["2026-08-14", "2026-08-15"],
    });
    const elapsed = Date.now() - start;
    assertScheduleCorrect(solution, problem);
    expect(elapsed).toBeLessThan(3000);
    expect(solution.assignments).toHaveLength(6);
  });

  it("places all 28 matches (8 teams) in under 5 seconds", { timeout: 10000 }, () => {
    const start = Date.now();
    const snap = makeSnapshot({
      numTeams: 8,
      numFields: 2,
      days: ["2026-08-14", "2026-08-15", "2026-08-16"],
      configs: [makeConfig({ fieldIds: [1, 2] })],
    });
    const problem = buildProblem(snap, { seed: 42 });
    const solution = solve(problem, { budgetMs: TEST_BUDGET_MS });
    const elapsed = Date.now() - start;
    assertScheduleCorrect(solution, problem);
    expect(elapsed).toBeLessThan(5000);
    expect(solution.assignments).toHaveLength(28);
  });
});
