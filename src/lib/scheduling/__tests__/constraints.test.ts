/**
 * Tests: hard constraints — window fit, no-overlap, rest, ordering.
 */

import { describe, it, expect } from "vitest";
import { allHardChecks, commitMove, type Move } from "../constraints";
import { emptyPartial, DEFAULT_WEIGHTS } from "../types";
import { makeSlots, makeProblem, makeConfig, makeSnapshot } from "./helpers";
import type { MatchTemplate, PartialSolution, Slot } from "../types";
import { toMinuteTs } from "../time";
import { buildProblem } from "../problem";

// ─── Minimal move builder ─────────────────────────────────────────────────────

function makeMatch(id: number, home: number | null, away: number | null, duration = 60, classId = 1, stageId = 1): MatchTemplate {
  return {
    id,
    classId,
    stageId,
    stageKind: "group",
    stageOrder: 1,
    groupId: 1,
    roundId: null,
    groupRound: null,
    roundOrder: null,
    homeTeamId: home,
    awayTeamId: away,
    playDurationMinutes: duration,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    totalDurationMinutes: duration,
    twoLeggedPeerId: null,
    legIndex: null,
    requiredMainReferees: 0,
    requiredAssistantReferees: 0,
  };
}

function firstSlot(slots: Slot[]): Slot {
  return slots[0]!;
}

function slotAt(slots: Slot[], time: string): Slot {
  const s = slots.find(s => s.localStart === time);
  if (!s) throw new Error(`No slot at ${time}. Available: ${slots.map(s => s.localStart).join(", ")}`);
  return s;
}

// ─── checkMatchFitsInWindow ───────────────────────────────────────────────────

describe("checkMatchFitsInWindow", () => {
  it("allows a match that fits exactly (endTime = closeTime)", () => {
    // 17:00 + 60 min = 18:00 = close → OK
    const slots = makeSlots({ startTime: "09:00", endTime: "18:00", granularity: 60, minDuration: 60, maxDuration: 60 });
    const slot = slotAt(slots, "17:00");
    const match = makeMatch(1, 1, 2, 60);
    const partial = emptyPartial();
    const problem = makeProblem();
    const result = allHardChecks(problem, partial, { match, slot, refereeAssignments: [] });
    expect(result.ok).toBe(true);
  });

  it("blocks a long match that overflows the closing time", () => {
    // Slot pool built with minDuration=25 → generates slots at 17:35 (17:35+25=18:00 ok)
    // But a 60-min match at 17:35 would end at 18:35 → must be blocked
    const slots = makeSlots({ startTime: "09:00", endTime: "18:00", granularity: 5, minDuration: 25, maxDuration: 60 });
    const slot = slotAt(slots, "17:35"); // generated because minDuration=25
    const match = makeMatch(1, 1, 2, 60); // senior: 60 min → 17:35+60=18:35 > 18:00
    const partial = emptyPartial();
    const problem = makeProblem();
    const result = allHardChecks(problem, partial, { match, slot, refereeAssignments: [] });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason.type).toBe("stadium_closed");
  });

  it("allows a short match in a late slot that a long match cannot use", () => {
    // Same slot at 17:35, but a 25-min junior match: 17:35+25=18:00 exactly OK
    const slots = makeSlots({ startTime: "09:00", endTime: "18:00", granularity: 5, minDuration: 25, maxDuration: 60 });
    const slot = slotAt(slots, "17:35");
    const match = makeMatch(1, 1, 2, 25); // junior: 25 min → fits exactly
    const partial = emptyPartial();
    const problem = makeProblem();
    const result = allHardChecks(problem, partial, { match, slot, refereeAssignments: [] });
    expect(result.ok).toBe(true);
  });
});

// ─── checkFieldNoOverlap ─────────────────────────────────────────────────────

describe("checkFieldNoOverlap", () => {
  it("rejects placing two matches in the same field+time slot", () => {
    const slots = makeSlots({ granularity: 60, minDuration: 60, maxDuration: 60 });
    const slot = firstSlot(slots);
    const m1 = makeMatch(1, 1, 2, 60);
    const m2 = makeMatch(2, 3, 4, 60);
    const problem = makeProblem();
    const partial = emptyPartial();

    // Place first match
    commitMove(partial, { match: m1, slot, refereeAssignments: [] });

    // Try to place second match in same slot
    const result = allHardChecks(problem, partial, { match: m2, slot, refereeAssignments: [] });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason.type).toBe("field_no_overlap");
  });

  it("allows matches on the same field in non-overlapping slots", () => {
    const slots = makeSlots({ granularity: 60, minDuration: 60, maxDuration: 60 });
    const slot1 = slotAt(slots, "09:00");
    const slot2 = slotAt(slots, "10:00");
    const m1 = makeMatch(1, 1, 2, 60);
    const m2 = makeMatch(2, 3, 4, 60);
    const problem = makeProblem();
    const partial = emptyPartial();

    commitMove(partial, { match: m1, slot: slot1, refereeAssignments: [] });

    const result = allHardChecks(problem, partial, { match: m2, slot: slot2, refereeAssignments: [] });
    expect(result.ok).toBe(true);
  });

  it("detects partial overlap (match 2 starts before match 1 ends)", () => {
    const slots = makeSlots({ granularity: 30, minDuration: 60, maxDuration: 60 });
    const slot1 = slotAt(slots, "09:00"); // 09:00–10:00
    const slot2 = slotAt(slots, "09:30"); // 09:30–10:30 → overlaps
    const m1 = makeMatch(1, 1, 2, 60);
    const m2 = makeMatch(2, 3, 4, 60);
    const problem = makeProblem();
    const partial = emptyPartial();

    commitMove(partial, { match: m1, slot: slot1, refereeAssignments: [] });

    const result = allHardChecks(problem, partial, { match: m2, slot: slot2, refereeAssignments: [] });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason.type).toBe("field_no_overlap");
  });
});

// ─── checkTeamNoOverlap ──────────────────────────────────────────────────────

describe("checkTeamNoOverlap", () => {
  it("blocks a team playing two matches simultaneously (different fields)", () => {
    // Two fields, same time, same team
    const slots1 = makeSlots({ fieldId: 1, granularity: 60, minDuration: 60, maxDuration: 60 });
    const slots2 = makeSlots({ fieldId: 2, granularity: 60, minDuration: 60, maxDuration: 60 });
    const slot1 = slotAt(slots1, "09:00");
    const slot2 = slotAt(slots2, "09:00");
    const m1 = makeMatch(1, 1, 2, 60); // team 1 plays
    const m2 = makeMatch(2, 1, 3, 60); // team 1 plays again!

    const problem = makeProblem({ numFields: 2 });
    const partial = emptyPartial();
    commitMove(partial, { match: m1, slot: slot1, refereeAssignments: [] });

    const result = allHardChecks(problem, partial, { match: m2, slot: slot2, refereeAssignments: [] });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason.type).toBe("team_no_overlap");
  });

  it("allows same team in back-to-back slots when rest rule is off", () => {
    const problem = makeProblem({
      configs: [makeConfig({ enableTeamRestRule: false, minRestBetweenTeamMatchesMinutes: 0 })],
    });
    const slots = makeProblem().slots; // use problem slots
    const allSlots = makeSlots({ granularity: 60, minDuration: 60, maxDuration: 60 });
    const slot1 = slotAt(allSlots, "09:00");
    const slot2 = slotAt(allSlots, "10:00");
    const m1 = makeMatch(1, 1, 2, 60);
    const m2 = makeMatch(2, 1, 3, 60);
    const partial = emptyPartial();
    commitMove(partial, { match: m1, slot: slot1, refereeAssignments: [] });
    const result = allHardChecks(problem, partial, { match: m2, slot: slot2, refereeAssignments: [] });
    expect(result.ok).toBe(true);
  });
});

// ─── checkTeamRest ───────────────────────────────────────────────────────────

describe("checkTeamRest", () => {
  it("blocks a match that violates minRest", () => {
    const snap = makeSnapshot({
      configs: [makeConfig({ enableTeamRestRule: true, minRestBetweenTeamMatchesMinutes: 60, fieldIds: [1] })],
    });
    const problem = buildProblem(snap, { seed: 1 });
    const allSlots = makeSlots({ granularity: 5, minDuration: 60, maxDuration: 60 });
    const slot1 = slotAt(allSlots, "09:00"); // 09:00–10:00
    const slot2 = slotAt(allSlots, "10:00"); // 10:00–11:00 → gap = 0 min < 60 min minRest
    const m1 = makeMatch(1, 1, 2, 60);
    const m2 = makeMatch(2, 1, 3, 60); // team 1 again

    const partial = emptyPartial();
    commitMove(partial, { match: m1, slot: slot1, refereeAssignments: [] });
    const result = allHardChecks(problem, partial, { match: m2, slot: slot2, refereeAssignments: [] });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason.type).toBe("rest_violation");
  });

  it("allows a match after sufficient rest", () => {
    const snap = makeSnapshot({
      configs: [makeConfig({ enableTeamRestRule: true, minRestBetweenTeamMatchesMinutes: 30, fieldIds: [1] })],
    });
    const problem = buildProblem(snap, { seed: 1 });
    const allSlots = makeSlots({ granularity: 5, minDuration: 60, maxDuration: 60 });
    const slot1 = slotAt(allSlots, "09:00"); // ends 10:00
    const slot2 = slotAt(allSlots, "10:30"); // starts 10:30 → gap = 30 min = minRest → OK
    const m1 = makeMatch(1, 1, 2, 60);
    const m2 = makeMatch(2, 1, 3, 60);

    const partial = emptyPartial();
    commitMove(partial, { match: m1, slot: slot1, refereeAssignments: [] });
    const result = allHardChecks(problem, partial, { match: m2, slot: slot2, refereeAssignments: [] });
    expect(result.ok).toBe(true);
  });
});
