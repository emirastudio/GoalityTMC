/**
 * Fixtures layer — generates match pairings for every supported format.
 *
 * Fixtures produce *structure* (who plays whom, in which stage/round/group)
 * without any time or field assignment. The solver then places each fixture
 * into a slot.
 *
 * Supported in v1:
 *   - round-robin (single/double leg)   — groups & leagues
 *   - single-elimination                 — playoff bracket with seeds + BYEs
 *   - groups-to-playoff                  — composite via qualification rules
 *
 * Stubbed (throws):
 *   - swiss          — Dutch pairing is complex; revisit in v2
 *   - double-elim    — upper/lower brackets; revisit in v2
 */

import { createRng, seedFromString } from "./rng";
import type { StageKind } from "./types";

// ═════════════════════ Round-robin (Berger tables) ═════════════════════

export type Pairing = {
  round: number;          // 1..N tour number
  homeTeamId: number | null;  // null = BYE for odd team counts
  awayTeamId: number | null;
};

/**
 * Circle method (a.k.a. Berger polygon) — produces a valid round-robin.
 * For N teams where N is even: (N-1) rounds, N/2 matches per round.
 * For N odd: we insert a "ghost" BYE, producing N rounds with one team idle each.
 *
 * @param teamIds in stable seed order
 * @param doubleLeg if true, generate home+away (2*(N-1) rounds)
 */
export function generateRoundRobin(teamIds: number[], doubleLeg = false): Pairing[] {
  const n = teamIds.length;
  if (n < 2) return [];

  // Pad with a ghost for odd counts. Ghost is represented as null.
  const teams: Array<number | null> = teamIds.slice();
  if (n % 2 === 1) teams.push(null);

  const size = teams.length;
  const rounds = size - 1;
  const half = size / 2;

  const pairings: Pairing[] = [];
  // Rotating array: keep teams[0] fixed, rotate the rest.
  const rotating = teams.slice(1);

  for (let r = 0; r < rounds; r++) {
    // Slot 0: fixed team vs rotating[rounds-r-1]? Actually the circle method
    // pairs teams[0] with rotating[0], then (rotating[size-2] vs rotating[1]), etc.
    const ring: Array<number | null> = [teams[0], ...rotating];

    for (let i = 0; i < half; i++) {
      const a = ring[i];
      const b = ring[size - 1 - i];
      // Alternate home/away based on round parity for fairness.
      const swap = r % 2 === 1 && i !== 0;
      const home = swap ? b : a;
      const away = swap ? a : b;
      pairings.push({ round: r + 1, homeTeamId: home, awayTeamId: away });
    }

    // Rotate (rightward) — pop end, unshift to front.
    rotating.unshift(rotating.pop()!);
  }

  if (doubleLeg) {
    const firstLegCount = pairings.length;
    const secondLeg: Pairing[] = [];
    for (const p of pairings) {
      secondLeg.push({
        round: p.round + rounds,
        homeTeamId: p.awayTeamId,
        awayTeamId: p.homeTeamId,
      });
    }
    pairings.push(...secondLeg);
    // Sanity: double-leg has 2*(N-1) rounds for even N
    void firstLegCount;
  }

  return pairings;
}

// ═════════════════════ Single elimination bracket ═════════════════════

export type BracketMatch = {
  /** Global order: 1 = final, higher = earlier. */
  roundOrder: number;
  /** Position within round, left-to-right, 1-indexed. */
  slot: number;
  homeTeamId: number | null;
  awayTeamId: number | null;
  /** If this is a 3rd place match. */
  isThirdPlace: boolean;
};

/**
 * Classic seeded single-elim bracket.
 *
 * @param seedOrderTeamIds  teams in seed order (1=top seed, last=worst). BYEs
 *                          are automatically inserted to round the field to the
 *                          next power of two.
 * @param hasThirdPlace     if true, also produce a 3rd place playoff
 */
export function generateSingleElim(
  seedOrderTeamIds: number[],
  hasThirdPlace = false,
): BracketMatch[] {
  const n = seedOrderTeamIds.length;
  if (n < 2) return [];

  // Round up to next power of two. Inject nulls (BYEs) for missing seeds.
  let bracketSize = 2;
  while (bracketSize < n) bracketSize *= 2;
  const padded: Array<number | null> = seedOrderTeamIds.slice();
  while (padded.length < bracketSize) padded.push(null);

  // Standard bracket seeding: 1 plays bracketSize, 2 plays bracketSize-1, etc.
  // Ensures top seeds meet as late as possible.
  const order = buildSeedOrder(bracketSize);

  const firstRoundMatches: BracketMatch[] = [];
  const firstRoundOrder = Math.log2(bracketSize); // e.g. 8 teams → 3, then final=1
  for (let i = 0; i < bracketSize / 2; i++) {
    const aSeedIdx = order[2 * i] - 1;     // 0-indexed
    const bSeedIdx = order[2 * i + 1] - 1;
    firstRoundMatches.push({
      roundOrder: firstRoundOrder,
      slot: i + 1,
      homeTeamId: padded[aSeedIdx] ?? null,
      awayTeamId: padded[bSeedIdx] ?? null,
      isThirdPlace: false,
    });
  }

  const all: BracketMatch[] = [...firstRoundMatches];
  // Generate empty subsequent rounds (teams filled in after results).
  let currentMatches = bracketSize / 2;
  for (let round = firstRoundOrder - 1; round >= 1; round--) {
    currentMatches = currentMatches / 2;
    for (let i = 0; i < currentMatches; i++) {
      all.push({
        roundOrder: round,
        slot: i + 1,
        homeTeamId: null,
        awayTeamId: null,
        isThirdPlace: false,
      });
    }
  }

  if (hasThirdPlace) {
    all.push({
      roundOrder: 1,
      slot: 2,
      homeTeamId: null,
      awayTeamId: null,
      isThirdPlace: true,
    });
  }

  return all;
}

/**
 * Returns the first-round seed order for a power-of-two bracket.
 * For 8: [1,8,4,5,2,7,3,6]  — top-half 1v8 & 4v5, bottom-half 2v7 & 3v6.
 * Ensures seeds 1 and 2 can only meet in the final.
 */
function buildSeedOrder(size: number): number[] {
  if (size === 2) return [1, 2];
  const prev = buildSeedOrder(size / 2);
  const out: number[] = [];
  for (const s of prev) {
    out.push(s);
    out.push(size + 1 - s);
  }
  return out;
}

// ═════════════════════ Groups → playoff composite ═════════════════════

export type GroupsToPlayoffInput = {
  groups: Array<{ groupId: number; teamIds: number[] }>;
  doubleLegGroupStage: boolean;
  /** Number of teams that advance from each group (e.g. 2 for top-2). */
  qualifyPerGroup: number;
  /** If true, generate a 3rd-place playoff match. */
  hasThirdPlace: boolean;
};

export type GroupsToPlayoffOutput = {
  groupPairings: Array<{ groupId: number; pairings: Pairing[] }>;
  bracketMatches: BracketMatch[];
  qualifyingTeamCount: number;
};

/**
 * Produces round-robin fixtures per group PLUS an empty bracket sized to fit
 * the qualifying teams. Bracket teams remain null until group results are
 * finalised; the `stageSlots` table records the "Winner of Group A" labels.
 */
export function generateGroupsToPlayoff(
  input: GroupsToPlayoffInput,
): GroupsToPlayoffOutput {
  const groupPairings = input.groups.map((g) => ({
    groupId: g.groupId,
    pairings: generateRoundRobin(g.teamIds, input.doubleLegGroupStage),
  }));

  const qualifyingTeamCount = input.groups.length * input.qualifyPerGroup;
  // Seed array is entirely placeholder (null) — teams resolved post-group stage.
  const bracketMatches = generateSingleElim(
    new Array(qualifyingTeamCount).fill(0).map((_, i) => -(i + 1)), // dummy IDs
    input.hasThirdPlace,
  ).map((m) => ({
    ...m,
    homeTeamId: null,
    awayTeamId: null,
  }));

  return { groupPairings, bracketMatches, qualifyingTeamCount };
}

// ═════════════════════ League phase (UCL-style Swiss) ═════════════════════

/**
 * UCL-style league phase generator (a simplified Swiss system).
 *
 * Generates a pre-seeded league phase where N teams play K matches each
 * (for the UEFA Champions League: N=36, K=8, so 144 matches total).
 *
 * Algorithm:
 *   1. Generate a full round-robin via the circle method.
 *   2. Take the first `matchesPerTeam` rounds of that round-robin.
 *   3. For an even team count: each of those rounds has N/2 matches and each
 *      team appears exactly once, so after K rounds every team has played K
 *      matches and no pair is repeated. This is exactly what we need.
 *   4. Optionally shuffle the seed order deterministically to avoid always
 *      pairing the same seed indexes together across identical inputs
 *      (keeps determinism via `seed`).
 *
 * Limitations (documented for v2 follow-up):
 *   - This is NOT true Swiss — there is no pairing by current points/rating
 *     (we have no rating at generation time). It IS deterministic, valid,
 *     round-balanced, and duplicate-free.
 *   - Odd N: a ghost team is inserted; teams paired with the ghost get a BYE
 *     on that round and therefore end with `matchesPerTeam - 1` real games.
 *     Caller is expected to use even N for strict K-per-team balance.
 *   - `matchesPerTeam` is clamped to `[1, N-1]`.
 *   - No constraint for "teams from the same club/country" — real UCL uses it
 *     but we don't have club/country metadata on teams yet.
 */
export function generateLeaguePhase(
  teamIds: number[],
  matchesPerTeam = 8,
  seed?: number,
): Pairing[] {
  const n = teamIds.length;
  if (n < 2) return [];
  const k = Math.max(1, Math.min(matchesPerTeam, n - 1));

  // When the caller supplies no explicit seed, we want the output to depend
  // ONLY on the set of team ids (not on their input order). So we canonicalise
  // to a sorted order both for seed derivation and for the pre-shuffle base.
  // With an explicit seed, the caller opted into controlling determinism, and
  // we still start from the sorted order so equal team-sets give equal
  // starting points regardless of input order.
  const sorted = teamIds.slice().sort((a, b) => a - b);
  const effectiveSeed = seed ?? seedFromString(`league:${sorted.join(",")}`);
  const rng = createRng(effectiveSeed);
  const shuffled = rng.shuffle(sorted.slice());

  // Generate the full Berger round-robin and keep only the first K rounds.
  const full = generateRoundRobin(shuffled, /* doubleLeg */ false);

  // Round-robin rounds are 1..(n-1) for even n or 1..n for odd n (with a ghost).
  // We filter by round <= k. The BYE entries (home=null or away=null) are
  // produced only for odd n and are already included; we drop them so the
  // solver doesn't receive phantom matches.
  return full.filter((p) => p.round <= k && p.homeTeamId != null && p.awayTeamId != null);
}

// ═════════════════════ Stubs ═════════════════════

export function generateSwiss(): never {
  throw new Error(
    "True Swiss pairing (by current points/ratings) is not supported in " +
      "scheduling v2. Use `generateLeaguePhase` for a UCL-style pre-seeded " +
      "league phase, or `generateRoundRobin` for a full round-robin.",
  );
}

export function generateDoubleElim(): never {
  throw new Error(
    "Double-elimination format is not supported in scheduling v1. " +
      "Use single-elim or groups-to-playoff instead.",
  );
}

// ═════════════════════ Dispatcher ═════════════════════

/** Tiny convenience wrapper for callers that only have a stage kind + teams. */
export function generateFixturesByKind(
  kind: StageKind,
  input: {
    teamIds?: number[];
    doubleLeg?: boolean;
    groups?: Array<{ groupId: number; teamIds: number[] }>;
    qualifyPerGroup?: number;
    hasThirdPlace?: boolean;
    /** Only used for `league` kind. Matches played per team. Default 8 (UCL). */
    matchesPerTeam?: number;
    /** Optional explicit seed for `league` kind. */
    seed?: number;
  },
):
  | { kind: "round-robin"; pairings: Pairing[] }
  | { kind: "league-phase"; pairings: Pairing[] }
  | { kind: "single-elim"; bracket: BracketMatch[] }
  | { kind: "groups-to-playoff"; result: GroupsToPlayoffOutput } {
  switch (kind) {
    case "group": {
      if (!input.teamIds) {
        throw new Error("round-robin requires teamIds");
      }
      return {
        kind: "round-robin",
        pairings: generateRoundRobin(input.teamIds, input.doubleLeg ?? false),
      };
    }
    case "league": {
      if (!input.teamIds) {
        throw new Error("league phase requires teamIds");
      }
      const defaultK = Math.min(8, input.teamIds.length - 1);
      return {
        kind: "league-phase",
        pairings: generateLeaguePhase(
          input.teamIds,
          input.matchesPerTeam ?? defaultK,
          input.seed,
        ),
      };
    }
    case "knockout": {
      if (!input.teamIds) {
        throw new Error("single-elim requires teamIds (seeded)");
      }
      return {
        kind: "single-elim",
        bracket: generateSingleElim(input.teamIds, input.hasThirdPlace ?? false),
      };
    }
    case "swiss":
      return generateSwiss();
    case "double_elim":
      return generateDoubleElim();
  }
}
