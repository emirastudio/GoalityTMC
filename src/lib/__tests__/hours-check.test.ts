import { describe, it, expect } from "vitest";
import {
  checkMatchWithinHours,
  findHoursViolations,
  type HoursWindow,
} from "../scheduling/hours-check";

const W: HoursWindow = { start: "11:00", end: "15:00" };

describe("checkMatchWithinHours", () => {
  it("flags a match starting before the window opens", () => {
    // 10:00 UTC, 40-min match, window 11:00–15:00
    expect(checkMatchWithinHours("2026-07-12T10:00:00Z", 40, W)).toBe("before_open");
  });

  it("allows a match fully inside the window", () => {
    expect(checkMatchWithinHours("2026-07-12T11:00:00Z", 40, W)).toBeNull();
    expect(checkMatchWithinHours("2026-07-12T14:20:00Z", 40, W)).toBeNull();
  });

  it("flags a match that ends after the window closes", () => {
    // 14:40 + 40 = 15:20 > 15:00
    expect(checkMatchWithinHours("2026-07-12T14:40:00Z", 40, W)).toBe("after_close");
  });

  it("treats an explicitly closed day as a violation", () => {
    expect(checkMatchWithinHours("2026-07-12T12:00:00Z", 40, null)).toBe("closed");
  });

  it("does not flag when there is no configured window", () => {
    expect(checkMatchWithinHours("2026-07-12T09:00:00Z", 40, undefined)).toBeNull();
  });

  it("does not flag unscheduled matches", () => {
    expect(checkMatchWithinHours(null, 40, W)).toBeNull();
  });

  it("skips a degenerate window (end <= start)", () => {
    expect(checkMatchWithinHours("2026-07-12T09:00:00Z", 40, { start: "15:00", end: "11:00" })).toBeNull();
  });
});

describe("findHoursViolations", () => {
  const windowFor = (stadiumId: number, date: string) =>
    stadiumId === 1 && date === "2026-07-12" ? W : undefined;

  it("returns only violating matches, keyed by id", () => {
    const matches = [
      { id: 10, scheduledAt: "2026-07-12T10:00:00Z", stadiumId: 1 }, // before open
      { id: 11, scheduledAt: "2026-07-12T12:00:00Z", stadiumId: 1 }, // ok
      { id: 12, scheduledAt: "2026-07-12T14:50:00Z", stadiumId: 1 }, // ends 15:30 → after close
      { id: 13, scheduledAt: "2026-07-12T08:00:00Z", stadiumId: 2 }, // no config → skip
      { id: 14, scheduledAt: "2026-07-12T08:00:00Z", stadiumId: null }, // no stadium → skip
      { id: 15, scheduledAt: null, stadiumId: 1 }, // unscheduled → skip
    ];
    const v = findHoursViolations(matches, windowFor, 40);
    expect([...v.keys()].sort((a, b) => a - b)).toEqual([10, 12]);
    expect(v.get(10)).toBe("before_open");
    expect(v.get(12)).toBe("after_close");
  });

  it("uses the match's own UTC calendar day to pick the window", () => {
    // Same stadium, different day with no config → not flagged.
    const matches = [{ id: 20, scheduledAt: "2026-07-13T09:00:00Z", stadiumId: 1 }];
    expect(findHoursViolations(matches, windowFor, 40).size).toBe(0);
  });
});
