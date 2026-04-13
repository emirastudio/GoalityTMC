/**
 * Smoke test for stage / group-round / knockout-round ordering.
 *
 * Builds a miniature Problem from scratch — no DB, no fixtures layer — runs
 * solve(), and asserts:
 *   1. Every knockout match starts AFTER every group match in the same class.
 *   2. Within a group: round 1 ends before round 2 starts, etc.
 *      (only when allowParallelGroupRounds=false)
 *   3. Within a knockout: QF all end before any SF starts; SF all end before
 *      the final starts.
 *
 * Run: npx tsx scripts/test-round-ordering.ts
 */

import { solve } from "@/lib/scheduling/solver";
import { DEFAULT_WEIGHTS } from "@/lib/scheduling/types";
import type {
  MatchTemplate,
  Problem,
  Slot,
  Team,
} from "@/lib/scheduling/types";
import { DateTime } from "luxon";

let failures = 0;
function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error(`  FAIL: ${msg}`);
    failures++;
  } else {
    console.log(`  ok:   ${msg}`);
  }
}
function section(name: string) {
  console.log(`\n== ${name} ==`);
}

// ────────────────────────────────────────────────────────────────────────
// Build a synthetic Problem
// ────────────────────────────────────────────────────────────────────────

const tz = "Europe/Tallinn";
const days = ["2026-08-12", "2026-08-13", "2026-08-14", "2026-08-15"];
const fieldIds = [1, 2];

function buildSlots(): Slot[] {
  // 09:00–20:00, every 60 min, two fields, four days → lots of capacity.
  const slots: Slot[] = [];
  for (const date of days) {
    for (let h = 9; h < 20; h++) {
      for (const fId of fieldIds) {
        const startLocal = DateTime.fromISO(
          `${date}T${String(h).padStart(2, "0")}:00`,
          { zone: tz },
        );
        const start = startLocal.toUTC().toISO()!;
        const latestStart = startLocal
          .plus({ hours: 1 })
          .toUTC()
          .toISO()!;
        slots.push({
          id: `${fId}:${start}`,
          fieldId: fId,
          stadiumId: 1,
          startUtc: start,
          dayCloseUtc: latestStart, // field closes at latestStart in this test script
          latestStartUtc: latestStart,
          localDate: date,
          localStart: `${String(h).padStart(2, "0")}:00`,
          minutesFromDayOpen: (h - 9) * 60,
        });
      }
    }
  }
  return slots;
}

// 8 teams in 2 groups, single RR per group (6 matches each = 12 total),
// then QF(4) → SF(2) → F(1) knockout = 7 more matches. 19 total.

const teams: Team[] = [];
for (let i = 1; i <= 8; i++) {
  teams.push({ id: i, displayName: `Team ${i}`, classId: 1 });
}

let nextMatchId = 1;
const matchTemplates: MatchTemplate[] = [];

// Group A (teams 1-4), round-robin, 6 matches across 3 rounds of 2.
const groupAPairings: Array<[number, number, number]> = [
  [1, 2, 1], [3, 4, 1],
  [1, 3, 2], [2, 4, 2],
  [1, 4, 3], [2, 3, 3],
];
for (const [h, a, r] of groupAPairings) {
  matchTemplates.push({
    id: nextMatchId++,
    classId: 1,
    stageId: 10,
    stageKind: "group",
    stageOrder: 1,
    groupId: 100,
    roundId: null,
    groupRound: r,
    roundOrder: null,
    homeTeamId: h,
    awayTeamId: a,
    playDurationMinutes: 45,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    totalDurationMinutes: 45,
    twoLeggedPeerId: null,
    legIndex: null,
    requiredMainReferees: 0,
    requiredAssistantReferees: 0,
  });
}

// Group B (teams 5-8)
const groupBPairings: Array<[number, number, number]> = [
  [5, 6, 1], [7, 8, 1],
  [5, 7, 2], [6, 8, 2],
  [5, 8, 3], [6, 7, 3],
];
for (const [h, a, r] of groupBPairings) {
  matchTemplates.push({
    id: nextMatchId++,
    classId: 1,
    stageId: 10,
    stageKind: "group",
    stageOrder: 1,
    groupId: 200,
    roundId: null,
    groupRound: r,
    roundOrder: null,
    homeTeamId: h,
    awayTeamId: a,
    playDurationMinutes: 45,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    totalDurationMinutes: 45,
    twoLeggedPeerId: null,
    legIndex: null,
    requiredMainReferees: 0,
    requiredAssistantReferees: 0,
  });
}

// Knockout: 4 QF (roundOrder=3), 2 SF (roundOrder=2), 1 F (roundOrder=1)
// All with null teams (bracket shells, no team-no-overlap to worry about).
function addKnockout(roundOrder: number, count: number) {
  for (let i = 0; i < count; i++) {
    matchTemplates.push({
      id: nextMatchId++,
      classId: 1,
      stageId: 20,
      stageKind: "knockout",
      stageOrder: 2,
      groupId: null,
      roundId: null,
      groupRound: null,
      roundOrder,
      homeTeamId: null,
      awayTeamId: null,
      playDurationMinutes: 45,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      totalDurationMinutes: 45,
      twoLeggedPeerId: null,
      legIndex: null,
      requiredMainReferees: 0,
      requiredAssistantReferees: 0,
    });
  }
}
addKnockout(3, 4); // QFs
addKnockout(2, 2); // SFs
addKnockout(1, 1); // Final

const problem: Problem = {
  tournamentId: 999,
  organizationId: 1,
  classId: 1,
  timeZone: tz,
  horizon: { start: days[0], end: days[days.length - 1], days },
  slots: buildSlots(),
  matchTemplates,
  teams,
  referees: [],
  teamBlackouts: [],
  refereeAvailability: [],
  refereeBlackouts: [],
  locks: [],
  classConfigs: [
    {
      classId: 1,
      maxMatchesPerTeamPerDay: 3,
      minRestBetweenTeamMatchesMinutes: 30,
      maxRestBetweenTeamMatchesMinutes: 0,
      maxConsecutiveMatchesPerTeam: 0,
      enableTeamRestRule: true,
      allowParallelGroupRounds: false, // STRICT group round ordering
      groupFieldAffinity: "none",
      fieldStageIds: {},
      allowedFieldIds: [],
    },
  ],
  weights: DEFAULT_WEIGHTS,
  seed: 12345,
};

// ────────────────────────────────────────────────────────────────────────
// Solve
// ────────────────────────────────────────────────────────────────────────

section("Solve synthetic 8-team tournament");
const solution = solve(problem, { budgetMs: 4000 });
console.log(
  `  placed=${solution.assignments.length}/${matchTemplates.length} hard=${solution.score.hardViolations} elapsedMs=${solution.diagnostics.elapsedMs}`,
);

assert(
  solution.assignments.length === matchTemplates.length,
  "all matches placed",
);
assert(solution.score.hardViolations === 0, "zero hard violations");

// ────────────────────────────────────────────────────────────────────────
// Check 1: stage order — every group match ends before any knockout starts
// ────────────────────────────────────────────────────────────────────────

section("Stage completion order");
const byId = new Map(matchTemplates.map((m) => [m.id, m]));
const toTs = (iso: string) => DateTime.fromISO(iso).toMillis();

const groupEnds: number[] = [];
const koStarts: number[] = [];
for (const a of solution.assignments) {
  const m = byId.get(a.matchId)!;
  const start = toTs(a.scheduledAtUtc);
  const end = start + m.totalDurationMinutes * 60_000;
  if (m.stageKind === "group") groupEnds.push(end);
  if (m.stageKind === "knockout") koStarts.push(start);
}
const latestGroupEnd = Math.max(...groupEnds);
const earliestKoStart = Math.min(...koStarts);
console.log(
  `  latest group end = ${new Date(latestGroupEnd).toISOString()}`,
);
console.log(
  `  earliest ko start = ${new Date(earliestKoStart).toISOString()}`,
);
assert(
  earliestKoStart >= latestGroupEnd,
  "every knockout match starts after every group match ends",
);

// ────────────────────────────────────────────────────────────────────────
// Check 2: group round ordering (strict mode)
// ────────────────────────────────────────────────────────────────────────

section("Group round order");
for (const gId of [100, 200]) {
  const byRound = new Map<number, { end: number; start: number }[]>();
  for (const a of solution.assignments) {
    const m = byId.get(a.matchId)!;
    if (m.groupId !== gId || m.groupRound == null) continue;
    const start = toTs(a.scheduledAtUtc);
    const end = start + m.totalDurationMinutes * 60_000;
    let arr = byRound.get(m.groupRound);
    if (!arr) {
      arr = [];
      byRound.set(m.groupRound, arr);
    }
    arr.push({ start, end });
  }
  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  for (let i = 0; i < rounds.length - 1; i++) {
    const r = rounds[i];
    const rNext = rounds[i + 1];
    const maxEnd = Math.max(...byRound.get(r)!.map((x) => x.end));
    const minStart = Math.min(...byRound.get(rNext)!.map((x) => x.start));
    assert(
      minStart >= maxEnd,
      `group ${gId}: round ${r} ends before round ${rNext} starts`,
    );
  }
}

// ────────────────────────────────────────────────────────────────────────
// Check 3: knockout round ordering (QF → SF → F)
// ────────────────────────────────────────────────────────────────────────

section("Knockout round order");
const koByRoundOrder = new Map<number, { start: number; end: number }[]>();
for (const a of solution.assignments) {
  const m = byId.get(a.matchId)!;
  if (m.stageKind !== "knockout" || m.roundOrder == null) continue;
  const start = toTs(a.scheduledAtUtc);
  const end = start + m.totalDurationMinutes * 60_000;
  let arr = koByRoundOrder.get(m.roundOrder);
  if (!arr) {
    arr = [];
    koByRoundOrder.set(m.roundOrder, arr);
  }
  arr.push({ start, end });
}
// roundOrder 3 (QF) must all end before roundOrder 2 (SF) starts, etc.
const roundOrdersDesc = [...koByRoundOrder.keys()].sort((a, b) => b - a);
for (let i = 0; i < roundOrdersDesc.length - 1; i++) {
  const earlier = roundOrdersDesc[i]; // higher order = earlier round
  const later = roundOrdersDesc[i + 1];
  const earlierEnd = Math.max(
    ...koByRoundOrder.get(earlier)!.map((x) => x.end),
  );
  const laterStart = Math.min(
    ...koByRoundOrder.get(later)!.map((x) => x.start),
  );
  assert(
    laterStart >= earlierEnd,
    `round ${earlier} ends before round ${later} starts`,
  );
}

// ────────────────────────────────────────────────────────────────────────
// Results
// ────────────────────────────────────────────────────────────────────────

section("Summary");
if (failures > 0) {
  console.error(`\n${failures} FAILED`);
  process.exit(1);
}
console.log("\nALL TESTS PASSED");
