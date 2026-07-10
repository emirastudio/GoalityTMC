/**
 * Knockout draw → bracket layout.
 *
 * Turns an ordered list of teams (already shuffled by the draw) into the
 * concrete bracket assignment the DB expects:
 *   • round-1 pairs (the matches actually played first), and
 *   • bye placements (teams that skip round 1, going straight into a
 *     round-2 slot).
 *
 * The mapping is chosen to match how winners already propagate in
 * playoff-progress.ts: round-1 match `i` feeds round-2 slot `i`
 * (match floor(i/2), side i%2). Byes therefore occupy the round-2 slots
 * *after* the ones fed by round-1 winners, i.e. slots R..(B/2 − 1).
 *
 * Pure, deterministic, no I/O — unit-tested against every team count.
 */

export type BracketSlotSide = "home" | "away";

export type ByePlacement = {
  teamId: number;
  /** 0-based round-2 match index. */
  roundTwoMatchIndex: number;
  /** Which slot of that match the bye team takes. */
  side: BracketSlotSide;
};

export type DrawLayout = {
  /** Bracket size (next power of two ≥ team count). */
  bracketSize: number;
  /** How many teams get a bye into round 2. */
  byeCount: number;
  /** Number of matches actually played in round 1. */
  roundOneMatchCount: number;
  /** Round-1 pairings, in match order: pairs[i] = [homeTeamId, awayTeamId]. */
  pairs: Array<[number, number]>;
  /** Teams that skip round 1, with their exact round-2 destination. */
  byes: ByePlacement[];
};

export function bracketSizeFor(teamCount: number): number {
  return Math.pow(2, Math.ceil(Math.log2(Math.max(2, teamCount))));
}

/**
 * @param teamIds teams in the order the draw revealed them (already shuffled).
 *                Must be ≥ 2 and contain no duplicates (caller validates).
 */
export function buildDrawLayout(teamIds: number[]): DrawLayout {
  const n = teamIds.length;
  if (n < 2) throw new Error("A knockout draw needs at least 2 teams");
  if (new Set(teamIds).size !== n) throw new Error("Duplicate team in draw");

  const bracketSize = bracketSizeFor(n);
  const byeCount = bracketSize - n;
  const roundOneMatchCount = n - bracketSize / 2; // = (n - byeCount) / 2

  const playing = teamIds.slice(0, 2 * roundOneMatchCount);
  const byeTeams = teamIds.slice(2 * roundOneMatchCount);

  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < roundOneMatchCount; i++) {
    pairs.push([playing[2 * i], playing[2 * i + 1]]);
  }

  // Byes fill round-2 slots R, R+1, … (the slots not fed by round-1 winners).
  const byes: ByePlacement[] = byeTeams.map((teamId, k) => {
    const slot = roundOneMatchCount + k; // linear round-2 slot index
    return {
      teamId,
      roundTwoMatchIndex: Math.floor(slot / 2),
      side: slot % 2 === 0 ? "home" : "away",
    };
  });

  return { bracketSize, byeCount, roundOneMatchCount, pairs, byes };
}
