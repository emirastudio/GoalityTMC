/**
 * Test helpers — build minimal Problem/DbSnapshot fixtures.
 * No DB, no network, no Next.js.
 */

import type { DbSnapshot, DivisionScheduleConfig } from "../problem";
import type { MatchTemplate, Problem, Slot, Team } from "../types";
import { DEFAULT_WEIGHTS, emptyPartial } from "../types";
import { buildProblem } from "../problem";
import { buildSlotPool, resolveFieldHours } from "../time";

// ─── Tiny builders ───────────────────────────────────────────────────────────

export function makeField(id: number, stadiumId = 1) {
  return { id, stadiumId, name: `Field ${id}` };
}

export function makeStadium(id: number) {
  return { id, name: `Stadium ${id}` };
}

/** Create a minimal DivisionScheduleConfig for testing. */
export function makeConfig(overrides: Partial<DivisionScheduleConfig> = {}): DivisionScheduleConfig {
  return {
    fieldIds: [1],
    dailyStartTime: "09:00",
    dailyEndTime: "18:00",
    halvesCount: 2,
    halfDurationMinutes: 25,
    breakBetweenHalvesMinutes: 10,
    breakBetweenMatchesMinutes: 5,
    maxMatchesPerTeamPerDay: 3,
    minRestBetweenTeamMatchesMinutes: 30,
    enableTeamRestRule: true,
    slotGranularityMinutes: 5,
    ...overrides,
  };
}

/** Build a DbSnapshot for a simple single-division tournament. */
export function makeSnapshot(overrides: {
  numTeams?: number;
  numFields?: number;
  days?: string[];
  configs?: DivisionScheduleConfig[];
  matches?: DbSnapshot["matches"];
  stadiumHours?: DbSnapshot["stadiumHours"];
} = {}): DbSnapshot {
  const numTeams = overrides.numTeams ?? 4;
  const numFields = overrides.numFields ?? 1;
  const days = overrides.days ?? ["2026-08-14", "2026-08-15"];
  const configs = overrides.configs ?? [makeConfig({ fieldIds: Array.from({ length: numFields }, (_, i) => i + 1) })];

  const teams: DbSnapshot["teams"] = Array.from({ length: numTeams }, (_, i) => ({
    id: i + 1,
    classId: 1,
    displayName: `Team ${i + 1}`,
  }));

  const fields = Array.from({ length: numFields }, (_, i) => makeField(i + 1));
  const stadiums = [makeStadium(1)];

  // Round-robin: each pair plays once
  const matches: DbSnapshot["matches"] = [];
  let matchId = 1;
  for (let a = 1; a <= numTeams; a++) {
    for (let b = a + 1; b <= numTeams; b++) {
      matches.push({
        id: matchId++,
        classId: 1,
        stageId: 1,
        groupId: 1,
        roundId: null,
        groupRound: null,
        homeTeamId: a,
        awayTeamId: b,
        fieldId: null,
        scheduledAt: null,
        lockedAt: null,
        lockReason: null,
        bufferBeforeMinutes: null,
        bufferAfterMinutes: null,
        roundOrder: null,
        roundMatchCount: null,
        isTwoLegged: false,
        legIndex: null,
        twoLeggedPeerId: null,
        matchReferees: [],
      });
    }
  }

  const providedMatches = overrides.matches;
  const finalMatches = providedMatches ?? matches;

  return {
    tournamentId: 99,
    organizationId: 1,
    classId: null,
    timeZone: "Europe/Tallinn",
    horizon: { start: days[0], end: days[days.length - 1] },
    divisions: configs.map((cfg, i) => ({ classId: i + 1, scheduleConfig: cfg })),
    stadiums,
    fields,
    stadiumHours: overrides.stadiumHours ?? [],
    matches: finalMatches,
    teams,
    stages: [{ id: 1, classId: 1, type: "group" as const, order: 1, settings: {} }],
    referees: [],
    refereeAvailability: [],
    teamBlackouts: [],
  };
}

/** Build a simple slot pool for unit tests. */
export function makeSlots(opts: {
  fieldId?: number;
  date?: string;
  startTime?: string;
  endTime?: string;
  granularity?: number;
  minDuration?: number;
  maxDuration?: number;
  zone?: string;
}): Slot[] {
  const {
    fieldId = 1,
    date = "2026-08-14",
    startTime = "09:00",
    endTime = "18:00",
    granularity = 5,
    minDuration = 60,
    maxDuration = 60,
    zone = "Europe/Tallinn",
  } = opts;

  return buildSlotPool({
    zone,
    granularityMinutes: granularity,
    fieldHours: [{ fieldId, stadiumId: 1, date, startTime, endTime }],
    minMatchDurationMinutes: minDuration,
    maxMatchDurationMinutes: maxDuration,
  });
}

/** Build a full Problem for solver tests. */
export function makeProblem(snapOverrides: Parameters<typeof makeSnapshot>[0] = {}, seed = 42): Problem {
  const snap = makeSnapshot(snapOverrides);
  return buildProblem(snap, { seed });
}
