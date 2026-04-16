/**
 * Draw Show — pure engine.
 *
 * Takes a list of teams + a config, returns:
 *   1. the final layout (groups or pairs), and
 *   2. an ordered list of `DrawStep`s that the presentation layer animates.
 *
 * Everything is driven by the seeded RNG from src/lib/scheduling/rng.ts —
 * identical input always produces identical output. This is load-bearing for
 * the standalone flow (share-link reproduces the exact same show) and for
 * audits in the embedded flow.
 *
 * No React, no DOM, no I/O. Pure function.
 */

import { createRng, seedFromString } from "@/lib/scheduling/rng";
import { generateRoundRobin } from "@/lib/scheduling/fixtures";
import type {
  DrawConfig,
  DrawInputTeam,
  DrawResult,
  DrawStep,
} from "./types";

/**
 * Entry point. Validates input, dispatches on `config.mode`, returns a
 * `DrawResult` ready for the stage.
 *
 * Throws on invalid input (e.g. pots mode with no pot numbers) — callers
 * should surface these as validation errors in the UI, not runtime crashes.
 */
export function buildDrawPlan(
  teams: DrawInputTeam[],
  config: DrawConfig,
): DrawResult {
  if (teams.length < 2) {
    throw new Error("Draw requires at least 2 teams");
  }

  const rng = createRng(seedFromString(config.seed));

  switch (config.mode) {
    case "groups":
      return buildGroupsPlan(teams, config, rng);
    case "playoff":
      return buildPlayoffPlan(teams, config, rng);
    case "league":
      return buildLeaguePlan(teams, config, rng);
    case "groups-playoff":
      // Deferred — engine is shaped for it but the UI flow isn't in v1.
      throw new Error(
        'Draw mode "groups-playoff" is not supported in this version',
      );
    default: {
      const _exhaustive: never = config.mode;
      throw new Error(`Unknown draw mode: ${_exhaustive}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  League (round-robin)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Builds the full round-robin schedule and emits one DrawStep per match.
 *
 * Reveal order is round-by-round, and within a round we shuffle match
 * order so the first pair announced isn't always the same. The
 * underlying Berger algorithm lives in src/lib/scheduling/fixtures.ts —
 * reusing it keeps the league engine consistent with the real
 * tournament scheduler.
 */
function buildLeaguePlan(
  teams: DrawInputTeam[],
  config: DrawConfig,
  rng: ReturnType<typeof createRng>,
): DrawResult {
  if (teams.length < 2) {
    throw new Error("League needs at least 2 teams");
  }

  // Shuffle team order once so identical input with identical seed still
  // produces a varied-looking first round. Berger is deterministic on
  // input order, so the shuffle is what gives the show its freshness.
  const shuffled = rng.shuffle([...teams]);

  // Berger expects numeric ids — we hand out 0..N-1 and map back by index.
  const numericIds = shuffled.map((_, i) => i);
  const pairings = generateRoundRobin(numericIds, false);
  // Drop BYEs (odd-team count produces null entries) — they're not matches.
  const realPairings = pairings.filter(
    (p) => p.homeTeamId != null && p.awayTeamId != null,
  );

  // Group by round, then shuffle inside each round for reveal variety.
  const byRound = new Map<number, typeof realPairings>();
  for (const p of realPairings) {
    const arr = byRound.get(p.round) ?? [];
    arr.push(p);
    byRound.set(p.round, arr);
  }

  const rounds: { home: DrawInputTeam; away: DrawInputTeam }[][] = [];
  const steps: DrawStep[] = [];
  let stepIdx = 0;
  const sortedRoundKeys = [...byRound.keys()].sort((a, b) => a - b);

  for (const r of sortedRoundKeys) {
    const inRound = rng.shuffle([...byRound.get(r)!]);
    const roundMatches: { home: DrawInputTeam; away: DrawInputTeam }[] = [];
    inRound.forEach((p, i) => {
      const home = shuffled[p.homeTeamId as number];
      const away = shuffled[p.awayTeamId as number];
      roundMatches.push({ home, away });
      steps.push({
        kind: "league-match",
        index: stepIdx++,
        round: r,
        matchInRound: i,
        home,
        away,
      });
    });
    rounds.push(roundMatches);
  }

  return {
    config,
    seed: config.seed,
    leagueRounds: rounds,
    steps,
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  Groups
// ─────────────────────────────────────────────────────────────────────────

function buildGroupsPlan(
  teams: DrawInputTeam[],
  config: DrawConfig,
  rng: ReturnType<typeof createRng>,
): DrawResult {
  const groupCount = config.groupCount;
  if (!groupCount || groupCount < 2) {
    throw new Error("groupCount must be >= 2 for mode=groups");
  }

  // Branch A: caller already decided the layout (embedded flow — organizer
  // placed teams into groups on the Schedule page). Preserve it and only
  // compute reveal order.
  if (config.preAssignedGroups && config.preAssignedGroups.length > 0) {
    return revealPreAssignedGroups(teams, config, rng);
  }

  // Branch B: compute distribution from scratch (standalone flow).
  return distributeIntoGroups(teams, config, rng, groupCount);
}

/**
 * Takes a pre-built `groupTeamIds[g] = [teamId, ...]` layout and produces a
 * reveal sequence. The layout itself is preserved byte-for-byte; only the
 * ORDER of appearance is randomized (so the audience watches teams pop out
 * of the urn in random order even though the final standings match what was
 * already configured).
 *
 * Reveal policy:
 *  - "random": uniformly random across all filled slots
 *  - "pots":   reveal by pot number (all pot-1 teams first, in random
 *              inter-pot order), mimicking UEFA televised draws
 */
function revealPreAssignedGroups(
  teams: DrawInputTeam[],
  config: DrawConfig,
  rng: ReturnType<typeof createRng>,
): DrawResult {
  const byId = indexById(teams);
  const pre = config.preAssignedGroups!;
  const groups: DrawInputTeam[][] = pre.map((ids) =>
    ids.map((id) => requireTeam(byId, id)),
  );

  // Flatten into (team, groupIndex, slotIndex) tuples.
  type Slot = { team: DrawInputTeam; groupIndex: number; slotIndex: number };
  const slots: Slot[] = [];
  pre.forEach((ids, gi) => {
    ids.forEach((id, si) => {
      slots.push({ team: requireTeam(byId, id), groupIndex: gi, slotIndex: si });
    });
  });

  const order =
    config.seedingMode === "pots"
      ? sortByPotThenShuffle(slots, rng, (s) => s.team.pot ?? 0)
      : rng.shuffle([...slots]);

  const steps: DrawStep[] = order.map((s, i) => ({
    kind: "place-group",
    index: i,
    team: s.team,
    groupIndex: s.groupIndex,
    slotIndex: s.slotIndex,
    pot: s.team.pot ?? undefined,
  }));

  return { config, seed: config.seed, groups, steps };
}

/**
 * Standalone distribution: takes N teams and spreads them into `groupCount`
 * groups as evenly as possible (remainder teams go into the lowest-indexed
 * groups).
 *
 * - "random": shuffle once, then deal out round-robin. Produces a balanced
 *   sizes and a fair distribution.
 * - "pots": take one team from each pot per group, in a circular rotation.
 *   Requires that every team has a `pot` value (throws otherwise).
 */
function distributeIntoGroups(
  teams: DrawInputTeam[],
  config: DrawConfig,
  rng: ReturnType<typeof createRng>,
  groupCount: number,
): DrawResult {
  const groups: DrawInputTeam[][] = Array.from({ length: groupCount }, () => []);
  const steps: DrawStep[] = [];

  if (config.seedingMode === "pots") {
    const byPot = groupByPot(teams);
    // One team from each pot per group, in rotation: pot1-grA, pot1-grB,
    // ..., pot1-grN, pot2-grA, pot2-grB, ...
    const potKeys = [...byPot.keys()].sort((a, b) => a - b);
    let stepIdx = 0;
    for (const pot of potKeys) {
      const pool = rng.shuffle([...byPot.get(pot)!]);
      // Deal one team per group until pool is exhausted. If pool is smaller
      // than groupCount, some groups get skipped this pot. If larger, extras
      // wrap to the next group (but callers should design pots to match).
      for (let i = 0; i < pool.length; i++) {
        const gi = i % groupCount;
        const slotIdx = groups[gi].length;
        groups[gi].push(pool[i]);
        steps.push({
          kind: "place-group",
          index: stepIdx++,
          team: pool[i],
          groupIndex: gi,
          slotIndex: slotIdx,
          pot,
        });
      }
    }
  } else {
    // Random: shuffle all teams once, deal out round-robin so sizes differ
    // by at most 1.
    const shuffled = rng.shuffle([...teams]);
    shuffled.forEach((team, i) => {
      const gi = i % groupCount;
      const slotIdx = groups[gi].length;
      groups[gi].push(team);
      steps.push({
        kind: "place-group",
        index: i,
        team,
        groupIndex: gi,
        slotIndex: slotIdx,
      });
    });
  }

  return { config, seed: config.seed, groups, steps };
}

// ─────────────────────────────────────────────────────────────────────────
//  Playoff
// ─────────────────────────────────────────────────────────────────────────

function buildPlayoffPlan(
  teams: DrawInputTeam[],
  config: DrawConfig,
  rng: ReturnType<typeof createRng>,
): DrawResult {
  if (teams.length % 2 !== 0) {
    throw new Error("Playoff mode requires an even number of teams");
  }

  // Branch A: caller already has the pairs (embedded flow with manual
  // bracket). Reveal in random order, pair by pair.
  if (config.preAssignedPairs && config.preAssignedPairs.length > 0) {
    const byId = indexById(teams);
    const pairs: [DrawInputTeam, DrawInputTeam][] = config.preAssignedPairs.map(
      ([homeId, awayId]) =>
        [requireTeam(byId, homeId), requireTeam(byId, awayId)] as [
          DrawInputTeam,
          DrawInputTeam,
        ],
    );

    // Shuffle the ORDER OF PAIR REVEAL (pairs themselves stay intact).
    const pairIndices = rng.shuffle(pairs.map((_, i) => i));
    const steps: DrawStep[] = [];
    let stepIdx = 0;
    for (const pi of pairIndices) {
      const [home, away] = pairs[pi];
      steps.push({
        kind: "pair",
        index: stepIdx++,
        team: home,
        pairIndex: pi,
        side: "home",
      });
      steps.push({
        kind: "pair",
        index: stepIdx++,
        team: away,
        pairIndex: pi,
        side: "away",
      });
    }
    return { config, seed: config.seed, pairs, steps };
  }

  // Branch B: shuffle teams and pair adjacent indices. Simple, fair, gives
  // the "names pop out two at a time" effect.
  const shuffled = rng.shuffle([...teams]);
  const pairs: [DrawInputTeam, DrawInputTeam][] = [];
  const steps: DrawStep[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    const home = shuffled[i];
    const away = shuffled[i + 1];
    const pairIdx = pairs.length;
    pairs.push([home, away]);
    steps.push({
      kind: "pair",
      index: steps.length,
      team: home,
      pairIndex: pairIdx,
      side: "home",
    });
    steps.push({
      kind: "pair",
      index: steps.length,
      team: away,
      pairIndex: pairIdx,
      side: "away",
    });
  }

  return { config, seed: config.seed, pairs, steps };
}

// ─────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────

function indexById(teams: DrawInputTeam[]): Map<string, DrawInputTeam> {
  const map = new Map<string, DrawInputTeam>();
  for (const t of teams) map.set(t.id, t);
  return map;
}

function requireTeam(
  byId: Map<string, DrawInputTeam>,
  id: string,
): DrawInputTeam {
  const t = byId.get(id);
  if (!t) throw new Error(`Team not found in input: ${id}`);
  return t;
}

function groupByPot(teams: DrawInputTeam[]): Map<number, DrawInputTeam[]> {
  const map = new Map<number, DrawInputTeam[]>();
  for (const t of teams) {
    if (t.pot == null) {
      throw new Error(
        `Team "${t.name}" has no pot — set pot numbers on every team when using seedingMode="pots"`,
      );
    }
    const arr = map.get(t.pot) ?? [];
    arr.push(t);
    map.set(t.pot, arr);
  }
  return map;
}

/**
 * Shuffle within each bucket, then concatenate in ascending bucket order.
 * This is the "UEFA pot draw" ordering: all pot-1 teams revealed first
 * (within-pot order random), then all pot-2, etc.
 */
function sortByPotThenShuffle<T>(
  items: T[],
  rng: ReturnType<typeof createRng>,
  getPot: (item: T) => number,
): T[] {
  const byBucket = new Map<number, T[]>();
  for (const item of items) {
    const k = getPot(item);
    const arr = byBucket.get(k) ?? [];
    arr.push(item);
    byBucket.set(k, arr);
  }
  const keys = [...byBucket.keys()].sort((a, b) => a - b);
  const out: T[] = [];
  for (const k of keys) {
    out.push(...rng.shuffle(byBucket.get(k)!));
  }
  return out;
}
