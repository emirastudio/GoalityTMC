/**
 * Export layer — converts Assignments into portable formats:
 *   - iCalendar (RFC 5545) for team/referee calendar subscriptions
 *   - CSV day-sheet for stadium hand-off
 *
 * Uses the `ics` npm package for iCal emission (battle-tested, ~5KB gzipped).
 */

import { createEvents, type EventAttributes } from "ics";
import { DateTime } from "luxon";
import type { Assignment, MatchTemplate, Slot, Team, TimeZone } from "./types";

// ═════════════════════ ICS ═════════════════════

export type IcsInput = {
  calendarName: string;
  assignments: Assignment[];
  matches: MatchTemplate[];
  slots: Slot[];
  teams: Team[];
  /** For titling — "Match #12: FC A vs FC B". */
  tournamentName: string;
  timeZone: TimeZone;
  /** Optional filter — include only matches where predicate returns true. */
  filter?: (m: MatchTemplate) => boolean;
};

export function buildIcs(input: IcsInput): { ics: string } | { error: string } {
  const matchById = new Map(input.matches.map((m) => [m.id, m]));
  const slotById = new Map(input.slots.map((s) => [s.id, s]));
  const teamById = new Map(input.teams.map((t) => [t.id, t]));

  const events: EventAttributes[] = [];

  for (const a of input.assignments) {
    const match = matchById.get(a.matchId);
    if (!match) continue;
    if (input.filter && !input.filter(match)) continue;
    const slot = slotById.get(a.slotId);
    if (!slot) continue;

    const start = DateTime.fromISO(a.scheduledAtUtc, { zone: "utc" });
    if (!start.isValid) continue;
    const durationMin = match.totalDurationMinutes;

    const home = match.homeTeamId != null ? teamById.get(match.homeTeamId)?.displayName ?? "TBD" : "TBD";
    const away = match.awayTeamId != null ? teamById.get(match.awayTeamId)?.displayName ?? "TBD" : "TBD";

    events.push({
      uid: `match-${match.id}@goality`,
      title: `${home} vs ${away}`,
      description: `${input.tournamentName}`,
      start: [start.year, start.month, start.day, start.hour, start.minute],
      startInputType: "utc",
      duration: { minutes: durationMin },
      location: `Field ${slot.fieldId}`,
      calName: input.calendarName,
      productId: "goality/scheduling-v2",
      status: "CONFIRMED",
    });
  }

  const { error, value } = createEvents(events);
  if (error) return { error: error.message };
  return { ics: value ?? "" };
}

// ═════════════════════ CSV day-sheet ═════════════════════

export type CsvInput = {
  assignments: Assignment[];
  matches: MatchTemplate[];
  slots: Slot[];
  teams: Team[];
  /** Optional filter to a single stadium / date. */
  stadiumId?: number;
  date?: string;
};

export function buildDaySheetCsv(input: CsvInput): string {
  const matchById = new Map(input.matches.map((m) => [m.id, m]));
  const slotById = new Map(input.slots.map((s) => [s.id, s]));
  const teamById = new Map(input.teams.map((t) => [t.id, t]));

  const rows: string[][] = [["Date", "Local Time", "Field", "Home", "Away", "Match ID"]];

  const filtered = input.assignments
    .map((a) => ({ a, slot: slotById.get(a.slotId), match: matchById.get(a.matchId) }))
    .filter((r) => r.slot && r.match)
    .filter((r) =>
      input.stadiumId != null ? r.slot!.stadiumId === input.stadiumId : true,
    )
    .filter((r) => (input.date ? r.slot!.localDate === input.date : true))
    .sort((a, b) =>
      a.slot!.localDate === b.slot!.localDate
        ? a.slot!.localStart.localeCompare(b.slot!.localStart)
        : a.slot!.localDate.localeCompare(b.slot!.localDate),
    );

  for (const r of filtered) {
    const home =
      r.match!.homeTeamId != null ? teamById.get(r.match!.homeTeamId)?.displayName ?? "TBD" : "TBD";
    const away =
      r.match!.awayTeamId != null ? teamById.get(r.match!.awayTeamId)?.displayName ?? "TBD" : "TBD";
    rows.push([
      r.slot!.localDate,
      r.slot!.localStart,
      String(r.slot!.fieldId),
      home,
      away,
      String(r.match!.id),
    ]);
  }

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function csvEscape(s: string): string {
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
