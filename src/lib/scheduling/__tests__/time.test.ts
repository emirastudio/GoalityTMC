/**
 * Tests: time layer — slot pool, DST safety, multi-division field sizing.
 */

import { describe, it, expect } from "vitest";
import { buildSlotPool, localToUtc, formatLocalTime, parseLocalTime, resolveFieldHours } from "../time";
import { makeSlots } from "./helpers";

// ─── parseLocalTime / formatLocalTime ────────────────────────────────────────

describe("parseLocalTime", () => {
  it("converts HH:MM to minutes", () => {
    expect(parseLocalTime("09:00")).toBe(540);
    expect(parseLocalTime("18:00")).toBe(1080);
    expect(parseLocalTime("00:00")).toBe(0);
    expect(parseLocalTime("23:59")).toBe(1439);
  });

  it("throws on invalid input", () => {
    expect(() => parseLocalTime("25:00")).toThrow();
    expect(() => parseLocalTime("12:60")).toThrow();
    expect(() => parseLocalTime("abc")).toThrow();
  });
});

describe("formatLocalTime", () => {
  it("rounds trip with parseLocalTime", () => {
    for (const t of ["09:00", "10:30", "17:55", "00:05"]) {
      expect(formatLocalTime(parseLocalTime(t))).toBe(t);
    }
  });
});

// ─── localToUtc ──────────────────────────────────────────────────────────────

describe("localToUtc", () => {
  it("returns null for a DST gap (spring-forward in Europe/Tallinn)", () => {
    // 2026-03-29: clocks jump from 03:00 → 04:00 in Europe/Tallinn
    const result = localToUtc("2026-03-29", "03:30", "Europe/Tallinn");
    expect(result).toBeNull();
  });

  it("converts a normal time correctly", () => {
    // Europe/Tallinn is UTC+3 in summer
    const result = localToUtc("2026-08-14", "09:00", "Europe/Tallinn");
    expect(result).toBe("2026-08-14T06:00:00.000Z");
  });

  it("handles midnight boundary", () => {
    const result = localToUtc("2026-08-14", "00:00", "Europe/Tallinn");
    expect(result).toBeTruthy();
    expect(result).toBe("2026-08-13T21:00:00.000Z");
  });
});

// ─── buildSlotPool — basic ────────────────────────────────────────────────────

describe("buildSlotPool — basic", () => {
  it("generates slots from open to latestStart inclusive", () => {
    // Field open 09:00–18:00, match = 60 min, granularity = 60 min
    // Expected slots: 09:00, 10:00, ..., 17:00 (last slot: 17:00 + 60 = 18:00)
    const slots = makeSlots({ startTime: "09:00", endTime: "18:00", granularity: 60, minDuration: 60, maxDuration: 60 });
    const times = slots.map(s => s.localStart);
    expect(times).toContain("09:00");
    expect(times).toContain("17:00");
    expect(times).not.toContain("17:30");
    expect(times).not.toContain("18:00");
  });

  it("returns empty array when window too narrow", () => {
    // Only 30 minutes available for a 60-min match
    const slots = makeSlots({ startTime: "09:00", endTime: "09:30", minDuration: 60, maxDuration: 60 });
    expect(slots).toHaveLength(0);
  });

  it("includes stadiumId and fieldId on every slot", () => {
    const slots = makeSlots({ fieldId: 7 });
    for (const s of slots) {
      expect(s.fieldId).toBe(7);
      expect(s.stadiumId).toBe(1);
    }
  });

  it("sorts by (date, time, fieldId)", () => {
    const zone = "Europe/Tallinn";
    const slots = buildSlotPool({
      zone,
      granularityMinutes: 60,
      minMatchDurationMinutes: 60,
      maxMatchDurationMinutes: 60,
      fieldHours: [
        { fieldId: 2, stadiumId: 1, date: "2026-08-14", startTime: "09:00", endTime: "18:00" },
        { fieldId: 1, stadiumId: 1, date: "2026-08-14", startTime: "09:00", endTime: "18:00" },
      ],
    });
    // Same time → fieldId ascending
    const nineOclock = slots.filter(s => s.localStart === "09:00");
    expect(nineOclock[0].fieldId).toBe(1);
    expect(nineOclock[1].fieldId).toBe(2);
  });

  it("skips DST-gap slots on spring-forward day", () => {
    // Europe/Tallinn spring-forward 2026-03-29: 03:00 doesn't exist
    const slots = buildSlotPool({
      zone: "Europe/Tallinn",
      granularityMinutes: 30,
      minMatchDurationMinutes: 30,
      maxMatchDurationMinutes: 30,
      fieldHours: [{ fieldId: 1, stadiumId: 1, date: "2026-03-29", startTime: "02:00", endTime: "05:00" }],
    });
    const times = slots.map(s => s.localStart);
    expect(times).not.toContain("03:00");
    expect(times).not.toContain("03:30");
    // Slots before the gap should still be present
    expect(times).toContain("02:00");
    expect(times).toContain("02:30");
  });
});

// ─── buildSlotPool — multi-division shared field ──────────────────────────────

describe("buildSlotPool — multi-division shared field (minDuration < maxDuration)", () => {
  /**
   * Scenario: Field closes at 18:00. Senior matches = 55 min. Junior = 25 min.
   * With minDuration=25, slots should extend up to 17:35 (17:35+25=18:00).
   * Senior cannot start at 17:10+ because 17:10+55 > 18:00 → blocked by
   * checkMatchFitsInWindow in the solver, NOT by the slot pool.
   */
  it("generates late-day slots accessible to shorter matches", () => {
    const slots = makeSlots({
      startTime: "09:00",
      endTime: "18:00",
      granularity: 5,
      minDuration: 25, // junior
      maxDuration: 55, // senior
    });

    // 17:35 should exist (17:35 + 25 = 18:00 exactly)
    const late = slots.filter(s => s.localStart >= "17:05");
    expect(late.length).toBeGreaterThan(0);
    expect(late.some(s => s.localStart === "17:35")).toBe(true);

    // dayCloseUtc is set and corresponds to 18:00 local
    const slot1735 = slots.find(s => s.localStart === "17:35");
    expect(slot1735?.dayCloseUtc).toBeTruthy();
    // 18:00 Tallinn summer = UTC+3 → 15:00 UTC
    expect(slot1735?.dayCloseUtc).toContain("T15:00:00");
  });

  it("does NOT generate slot at exactly closing time", () => {
    const slots = makeSlots({
      startTime: "09:00",
      endTime: "18:00",
      granularity: 5,
      minDuration: 5,   // smallest possible
      maxDuration: 60,
    });
    const atClose = slots.filter(s => s.localStart === "18:00");
    expect(atClose).toHaveLength(0);
  });
});

// ─── resolveFieldHours ────────────────────────────────────────────────────────

describe("resolveFieldHours", () => {
  it("respects priority: fieldDaySchedule > stadiumDaySchedule > fieldDivisionDefault > divisionDefault", () => {
    const fields = [{ id: 1, stadiumId: 10 }, { id: 2, stadiumId: 10 }];
    const days = ["2026-08-14"];

    const result = resolveFieldHours({
      fields,
      days,
      divisionDefault: { startTime: "09:00", endTime: "18:00" },
      fieldDivisionDefault: new Map([
        [1, { startTime: "10:00", endTime: "17:00" }],
      ]),
      stadiumDaySchedule: [
        { stadiumId: 10, date: "2026-08-14", startTime: "11:00", endTime: "19:00" },
      ],
      fieldDaySchedule: [
        { fieldId: 1, date: "2026-08-14", startTime: "12:00", endTime: "20:00" },
      ],
    });

    const field1 = result.find(r => r.fieldId === 1)!;
    const field2 = result.find(r => r.fieldId === 2)!;

    // Field 1: has explicit fieldDaySchedule override → 12:00–20:00
    expect(field1.startTime).toBe("12:00");
    expect(field1.endTime).toBe("20:00");

    // Field 2: has stadiumDaySchedule override → 11:00–19:00
    expect(field2.startTime).toBe("11:00");
    expect(field2.endTime).toBe("19:00");
  });

  it("marks field as closed (null) when fieldDaySchedule has null times", () => {
    const result = resolveFieldHours({
      fields: [{ id: 1, stadiumId: null }],
      days: ["2026-08-14"],
      divisionDefault: { startTime: "09:00", endTime: "18:00" },
      fieldDaySchedule: [{ fieldId: 1, date: "2026-08-14", startTime: null, endTime: null }],
    });
    const fh = result.find(r => r.fieldId === 1)!;
    expect(fh.startTime).toBeNull();
    expect(fh.endTime).toBeNull();
  });
});
