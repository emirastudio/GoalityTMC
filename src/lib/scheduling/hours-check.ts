/**
 * Hours check — does a scheduled match fall within its field's configured
 * open hours? Used by the read-only schedule view to flag matches that sit
 * outside the stadium's working window (e.g. a 10:00 kick-off when the
 * stadium was set to 11:00–15:00), which is the signal that a schedule is
 * stale and needs re-generating in the planner.
 *
 * Time model: match `scheduledAt` and the configured "HH:MM" windows are
 * compared in the SAME wall clock the schedule view renders in (UTC on the
 * production server). We only compare minutes-of-day, so a same-day window
 * is all that's needed — the date is used solely to pick the right window.
 *
 * Pure, no I/O — safe to unit test and reuse anywhere.
 */

/** A configured open window for a stadium on a given day, "HH:MM" strings. */
export type HoursWindow = { start: string; end: string };

export type HoursViolation = "before_open" | "after_close" | "closed";

/** Minutes-of-day from an "HH:MM" string, or null if unparseable. */
function hhmmToMinutes(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Minutes-of-day for an ISO instant, read in UTC (the schedule view's tz). */
function isoUtcMinutes(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/**
 * Check one match against its window.
 *
 * `window` semantics:
 *   - `undefined` → no hours configured for this stadium/day; nothing to
 *     enforce, returns `null` (not a violation).
 *   - `null` → the stadium is explicitly CLOSED that day → `"closed"`.
 *   - `{start,end}` → the match must start no earlier than `start` and END
 *     (start + duration) no later than `end`.
 *
 * Returns the violation kind, or `null` when the match is within hours (or
 * cannot be judged).
 */
export function checkMatchWithinHours(
  scheduledAtIso: string | null | undefined,
  durationMin: number,
  window: HoursWindow | null | undefined,
): HoursViolation | null {
  if (!scheduledAtIso) return null; // unscheduled — nothing to check
  if (window === undefined) return null; // no config — don't flag
  if (window === null) return "closed";

  const start = isoUtcMinutes(scheduledAtIso);
  const open = hhmmToMinutes(window.start);
  const close = hhmmToMinutes(window.end);
  if (start == null || open == null || close == null) return null; // can't judge
  if (close <= open) return null; // degenerate window — skip

  if (start < open) return "before_open";
  if (start + Math.max(0, durationMin) > close) return "after_close";
  return null;
}
