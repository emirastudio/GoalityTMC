import { describe, it, expect } from "vitest";
import { buildDrawPlan } from "../draw-show/engine";
import type { DrawConfig, ScheduleMatchInput } from "../draw-show/types";

function team(id: string, name: string) {
  return { id, name };
}

const MATCHES: ScheduleMatchInput[] = [
  { slotKey: "2026-07-12T10:30:00Z", slotLabel: "10:30", slotSort: 1030, fieldId: 2, fieldName: "Field B", home: team("5", "Eagles"), away: team("6", "Foxes") },
  { slotKey: "2026-07-12T10:00:00Z", slotLabel: "10:00", slotSort: 1000, fieldId: 2, fieldName: "Field B", home: team("3", "Cobras"), away: team("4", "Ducks") },
  { slotKey: "2026-07-12T10:00:00Z", slotLabel: "10:00", slotSort: 1000, fieldId: 1, fieldName: "Field A", home: team("1", "Aces"), away: team("2", "Bulls") },
  { slotKey: "2026-07-12T10:30:00Z", slotLabel: "10:30", slotSort: 1030, fieldId: 1, fieldName: "Field A", home: team("7", "Gulls"), away: team("8", "Hawks") },
];

function plan(matches: ScheduleMatchInput[]) {
  const config: DrawConfig = { mode: "schedule", seedingMode: "random", seed: "t", scheduleMatches: matches };
  return buildDrawPlan([], config);
}

describe("buildSchedulePlan", () => {
  it("groups matches into chronological time slots", () => {
    const r = plan(MATCHES);
    expect(r.scheduleSlots).toHaveLength(2);
    expect(r.scheduleSlots!.map((s) => s.label)).toEqual(["10:00", "10:30"]);
    expect(r.scheduleSlots![0].matches).toHaveLength(2);
    expect(r.scheduleSlots![1].matches).toHaveLength(2);
  });

  it("uses a stable field column order (by name)", () => {
    const r = plan(MATCHES);
    expect(r.scheduleFields!.map((f) => f.name)).toEqual(["Field A", "Field B"]);
    expect(r.scheduleSlots![0].matches.map((m) => m.fieldName)).toEqual(["Field A", "Field B"]);
  });

  it("emits one reveal step per time slot (both fields together)", () => {
    const r = plan(MATCHES);
    expect(r.steps).toHaveLength(2);
    expect(r.steps.every((s) => s.kind === "slot")).toBe(true);
    const first = r.steps[0];
    if (first.kind !== "slot") throw new Error("expected slot step");
    expect(first.slotIndex).toBe(0);
    expect(first.matches.map((m) => m.home.name)).toEqual(["Aces", "Cobras"]);
  });

  it("handles an odd field (bye) — a slot with a single match", () => {
    const odd: ScheduleMatchInput[] = [
      MATCHES[2],
      { slotKey: "2026-07-12T11:00:00Z", slotLabel: "11:00", slotSort: 1100, fieldId: 1, fieldName: "Field A", home: team("1", "Aces"), away: team("3", "Cobras") },
    ];
    const r = plan(odd);
    expect(r.scheduleSlots).toHaveLength(2);
    expect(r.scheduleSlots![0].matches).toHaveLength(1);
  });

  it("throws when there are no scheduled matches", () => {
    expect(() => plan([])).toThrow();
  });
});
