import { describe, it, expect } from "vitest";
import { solve } from "../solver";
import { buildProblem } from "../problem";
import { makeSnapshot, makeConfig } from "./helpers";

// Regression guard for the "annoying gap" bug: with the team-rest rule OFF the
// solver used to still spread a team's matches via the soft teamRestComfort
// weight (0.8), leaving gaps of ~75 min. buildProblem now zeros that comfort
// weight when rest is relaxed, so matches pack back-to-back.
function worstGapMinutes(cfgOverrides: Record<string, unknown>): number {
  const snap = makeSnapshot({
    numTeams: 7,
    numFields: 2,
    days: ["2026-07-12"],
    configs: [makeConfig({
      fieldIds: [1, 2],
      dailyStartTime: "11:00",
      dailyEndTime: "16:00",
      halvesCount: 1,
      halfDurationMinutes: 20,
      breakBetweenMatchesMinutes: 5,
      maxMatchesPerTeamPerDay: 6,
      ...cfgOverrides,
    })],
  });
  const problem = buildProblem(snap, { seed: 42 });
  const sol = solve(problem, { budgetMs: 6000 });
  const startMs = new Map(
    problem.slots.map((s) => [s.id, Date.parse(s.startUtc as unknown as string)]),
  );
  const byField = new Map<number, number[]>();
  for (const a of sol.assignments) {
    const arr = byField.get(a.fieldId) ?? [];
    arr.push(startMs.get(a.slotId)!);
    byField.set(a.fieldId, arr);
  }
  let worst = 0;
  for (const raw of byField.values()) {
    const s = [...raw].sort((a, b) => a - b);
    for (let i = 1; i < s.length; i++) {
      worst = Math.max(worst, Math.round((s[i] - s[i - 1]) / 60000));
    }
  }
  return worst;
}

describe("schedule gap — rest rule off packs tight", () => {
  it("rest OFF: matches pack back-to-back (no large gap)", () => {
    // One slot is 25 min; anything ≤ 30 means no idle slot was left.
    const gap = worstGapMinutes({ enableTeamRestRule: false, minRestBetweenTeamMatchesMinutes: 0 });
    expect(gap).toBeLessThanOrEqual(30);
  });

  it("explicit comfort weight is respected even with rest off", () => {
    // If the organizer explicitly asks for comfort spacing, we keep it.
    const gap = worstGapMinutes({
      enableTeamRestRule: false,
      minRestBetweenTeamMatchesMinutes: 0,
      weights: { teamRestComfort: 1 },
    });
    expect(gap).toBeGreaterThan(30);
  });
});
