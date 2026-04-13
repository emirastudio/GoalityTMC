/**
 * Time layer — timezone-aware date math using Luxon.
 *
 * Every scheduling operation that touches calendar time goes through this
 * module. No `new Date()` calls anywhere else in the engine. All math is
 * done in the tournament's local timezone and converted to UTC only at the
 * boundaries (Problem input → `startUtc`, Solution output → `scheduledAtUtc`).
 *
 * DST invariants:
 *   - Spring-forward: local 02:30 may not exist. `localToUtc` returns null.
 *   - Fall-back:      local 02:30 exists twice. We pick the "first" (pre-shift)
 *                     occurrence — this is Luxon's default and matches organiser
 *                     intuition (their clock rolls back *after* the schedule is
 *                     already printed, so the first occurrence wins).
 */

import { DateTime } from "luxon";
import type { IsoDate, IsoInstant, LocalTime, Slot, TimeZone } from "./types";

// ═════════════════════ Primitives ═════════════════════

/** "HH:MM" → minutes-since-midnight. Throws on invalid. */
export function parseLocalTime(time: LocalTime): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) throw new Error(`Invalid local time: ${time}`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) {
    throw new Error(`Invalid local time: ${time}`);
  }
  return h * 60 + min;
}

/** minutes-since-midnight → "HH:MM". */
export function formatLocalTime(minutes: number): LocalTime {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Local date + local time in a specific zone → UTC instant.
 * Returns null if the local time does not exist on that date (DST gap).
 */
export function localToUtc(
  date: IsoDate,
  time: LocalTime,
  zone: TimeZone,
): IsoInstant | null {
  const dt = DateTime.fromISO(`${date}T${time}`, { zone });
  if (!dt.isValid) return null;
  // On DST spring-forward, Luxon silently advances the invalid time forward.
  // Detect this by converting back and checking equality.
  const roundTrip = dt.toFormat("yyyy-MM-dd'T'HH:mm");
  if (roundTrip !== `${date}T${time}`) return null;
  return dt.toUTC().toISO({ suppressMilliseconds: false })!;
}

/** UTC instant → local date + local time in tournament zone. */
export function utcToLocal(
  instant: IsoInstant,
  zone: TimeZone,
): { date: IsoDate; time: LocalTime } {
  const dt = DateTime.fromISO(instant, { zone: "utc" }).setZone(zone);
  return {
    date: dt.toFormat("yyyy-MM-dd"),
    time: dt.toFormat("HH:mm"),
  };
}

/** Returns an array of ISO dates "YYYY-MM-DD" inclusive of both endpoints. */
export function enumerateDays(start: IsoDate, end: IsoDate, zone: TimeZone): IsoDate[] {
  const days: IsoDate[] = [];
  let cur = DateTime.fromISO(start, { zone });
  const endDt = DateTime.fromISO(end, { zone });
  if (!cur.isValid || !endDt.isValid) return [];
  while (cur <= endDt) {
    days.push(cur.toFormat("yyyy-MM-dd"));
    cur = cur.plus({ days: 1 });
  }
  return days;
}

/** Add minutes to a UTC instant, returning a new UTC instant. */
export function addMinutesUtc(instant: IsoInstant, minutes: number): IsoInstant {
  return DateTime.fromISO(instant, { zone: "utc" })
    .plus({ minutes })
    .toUTC()
    .toISO({ suppressMilliseconds: false })!;
}

/** Returns the UTC instant of (date, 00:00) in the given zone. */
export function startOfDayUtc(date: IsoDate, zone: TimeZone): IsoInstant {
  return DateTime.fromISO(date, { zone }).startOf("day").toUTC().toISO()!;
}

/** Minutes between two UTC instants (b - a). */
export function minutesBetween(a: IsoInstant, b: IsoInstant): number {
  const da = DateTime.fromISO(a, { zone: "utc" }).toMillis();
  const db = DateTime.fromISO(b, { zone: "utc" }).toMillis();
  return Math.round((db - da) / 60000);
}

/** Cheap accessor: UTC instant → integer minutes since 1970 for interval math. */
export function toMinuteTs(instant: IsoInstant): number {
  return Math.round(DateTime.fromISO(instant, { zone: "utc" }).toMillis() / 60000);
}

// ═════════════════════ Slot pool ═════════════════════

export type FieldOpeningHour = {
  fieldId: number;
  stadiumId: number | null;
  date: IsoDate;
  /** Null means the field is closed that day. */
  startTime: LocalTime | null;
  endTime: LocalTime | null;
};

export type SlotPoolInput = {
  zone: TimeZone;
  /** Discretization granularity. Smaller = more slots, slower, better quality. */
  granularityMinutes: number;
  /** Effective open hours per (field, day) after merging stadium + field overrides. */
  fieldHours: FieldOpeningHour[];
  /**
   * Minimum match duration across ALL divisions.
   * Slots are generated up to (closeTime - minMatchDuration) so the shortest
   * match always fits. Longer matches are filtered by `checkMatchFitsInWindow`
   * using the slot's `dayCloseUtc` field.
   *
   * For single-division tournaments this equals the max (same as before).
   * For multi-division tournaments on shared fields this allows shorter
   * divisions to access slots near the end of the day that longer divisions
   * cannot use — without any interference from the pool size.
   */
  minMatchDurationMinutes: number;
  /**
   * Max match duration — used only to compute the backward-compat
   * `latestStartUtc` field. Does not affect how many slots are generated.
   */
  maxMatchDurationMinutes: number;
};

/**
 * Builds the discrete slot pool that the solver picks from.
 *
 * A slot is one (fieldId, startInstant) pair. Each slot represents a feasible
 * match START time. The solver picks slots and then checks whether the chosen
 * match duration still fits before the day's close time via `dayCloseUtc`.
 *
 * Multi-division fields: the pool is generated with `minMatchDurationMinutes`
 * headroom so a short match (e.g. 25 min junior) can start later in the day
 * than the pool would allow if only `maxMatchDurationMinutes` (55 min senior)
 * were used. The per-match fit check in `checkMatchFitsInWindow` enforces the
 * correct bound for each match independently.
 */
export function buildSlotPool(input: SlotPoolInput): Slot[] {
  const out: Slot[] = [];
  for (const fh of input.fieldHours) {
    if (!fh.startTime || !fh.endTime) continue; // field closed that day
    const openMin = parseLocalTime(fh.startTime);
    const closeMin = parseLocalTime(fh.endTime);
    if (closeMin <= openMin) continue; // invalid window, skip

    const dayCloseUtc = localToUtc(fh.date, fh.endTime, input.zone);
    if (!dayCloseUtc) continue; // DST gap — skip whole day for this field

    // The latest POSSIBLE start = closeMin - minMatchDuration (shortest match).
    // This ensures at least one match can start at every generated slot.
    const latestStartMin = closeMin - input.minMatchDurationMinutes;
    if (latestStartMin < openMin) continue; // no match even fits in the window

    // latestStart for the longest match type (backward compat field on Slot).
    const latestStartForMax = Math.max(openMin, closeMin - input.maxMatchDurationMinutes);
    const latestStartForMaxUtc = localToUtc(fh.date, formatLocalTime(latestStartForMax), input.zone);

    for (let m = openMin; m <= latestStartMin; m += input.granularityMinutes) {
      const localStart = formatLocalTime(m);
      const startUtc = localToUtc(fh.date, localStart, input.zone);
      if (!startUtc) continue; // DST gap for this specific time, skip

      out.push({
        id: `${fh.fieldId}:${startUtc}`,
        fieldId: fh.fieldId,
        stadiumId: fh.stadiumId,
        startUtc,
        dayCloseUtc,
        latestStartUtc: latestStartForMaxUtc ?? startUtc,
        localDate: fh.date,
        localStart,
        minutesFromDayOpen: m - openMin,
      });
    }
  }

  // Sort by (date, time, fieldId) for deterministic iteration.
  out.sort((a, b) => {
    if (a.localDate !== b.localDate) return a.localDate < b.localDate ? -1 : 1;
    if (a.localStart !== b.localStart) return a.localStart < b.localStart ? -1 : 1;
    return a.fieldId - b.fieldId;
  });

  return out;
}

// ═════════════════════ Interval helpers ═════════════════════

/**
 * Merges two sources of field opening hours:
 *   1. per-field-per-day overrides (highest priority)
 *   2. per-stadium-per-day opening hours
 *   3. division default dailyStart/End
 *
 * The solver consumes the flattened result as FieldOpeningHour[].
 */
export function resolveFieldHours(input: {
  fields: Array<{ id: number; stadiumId: number | null }>;
  days: IsoDate[];
  divisionDefault: { startTime: LocalTime; endTime: LocalTime };
  /**
   * Per-field default window derived from the division that "owns" this field
   * (via scheduleConfig.fieldIds). Has LOWER priority than daySchedule /
   * stadiumDaySchedule / fieldDaySchedule, but HIGHER than the global
   * divisionDefault. Allows different divisions on different fields to have
   * independent daily start/end times without an explicit per-field override.
   */
  fieldDivisionDefault?: Map<number, { startTime: LocalTime; endTime: LocalTime }>;
  daySchedule?: Array<{ date: IsoDate; startTime: LocalTime; endTime: LocalTime }>;
  stadiumDaySchedule?: Array<{
    stadiumId: number;
    date: IsoDate;
    startTime: LocalTime | null;
    endTime: LocalTime | null;
  }>;
  fieldDaySchedule?: Array<{
    fieldId: number;
    date: IsoDate;
    startTime: LocalTime | null;
    endTime: LocalTime | null;
  }>;
}): FieldOpeningHour[] {
  const result: FieldOpeningHour[] = [];

  // Index overrides
  const dayIdx = new Map<IsoDate, { startTime: LocalTime; endTime: LocalTime }>();
  for (const d of input.daySchedule ?? []) dayIdx.set(d.date, d);

  const stadiumIdx = new Map<
    string,
    { startTime: LocalTime | null; endTime: LocalTime | null }
  >();
  for (const s of input.stadiumDaySchedule ?? []) {
    stadiumIdx.set(`${s.stadiumId}:${s.date}`, { startTime: s.startTime, endTime: s.endTime });
  }

  const fieldIdx = new Map<
    string,
    { startTime: LocalTime | null; endTime: LocalTime | null }
  >();
  for (const f of input.fieldDaySchedule ?? []) {
    fieldIdx.set(`${f.fieldId}:${f.date}`, { startTime: f.startTime, endTime: f.endTime });
  }

  for (const field of input.fields) {
    for (const date of input.days) {
      // Priority (lowest → highest):
      //   1. global divisionDefault
      //   2. fieldDivisionDefault  (per-field based on owning division)
      //   3. daySchedule           (per-date, all fields)
      //   4. stadiumDaySchedule    (per-stadium, per-date)
      //   5. fieldDaySchedule      (per-field, per-date) — highest
      const fieldKey = `${field.id}:${date}`;
      const stadiumKey = field.stadiumId !== null ? `${field.stadiumId}:${date}` : null;

      let startTime: LocalTime | null = input.divisionDefault.startTime;
      let endTime: LocalTime | null = input.divisionDefault.endTime;

      // Per-field division window (different divisions can have different daily times)
      const divDefault = input.fieldDivisionDefault?.get(field.id);
      if (divDefault) {
        startTime = divDefault.startTime;
        endTime = divDefault.endTime;
      }

      const dayOverride = dayIdx.get(date);
      if (dayOverride) {
        startTime = dayOverride.startTime;
        endTime = dayOverride.endTime;
      }

      if (stadiumKey) {
        const stadiumOverride = stadiumIdx.get(stadiumKey);
        if (stadiumOverride) {
          startTime = stadiumOverride.startTime;
          endTime = stadiumOverride.endTime;
        }
      }

      const fieldOverride = fieldIdx.get(fieldKey);
      if (fieldOverride) {
        startTime = fieldOverride.startTime;
        endTime = fieldOverride.endTime;
      }

      result.push({
        fieldId: field.id,
        stadiumId: field.stadiumId,
        date,
        startTime,
        endTime,
      });
    }
  }

  return result;
}
