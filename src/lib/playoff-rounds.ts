/**
 * Playoff round ordering — convention-agnostic.
 *
 * Historically two opposite `matchRounds.order` conventions ended up in the
 * live DB (confirmed by prod data):
 *   • Convention A — order 1 = the FINAL   (older group→playoff stages)
 *   • Convention B — order 1 = the FIRST round played (format-builder stages)
 *
 * Rather than migrate live bracket data (risky — 3rd-place siblings, custom
 * multi-bracket rounds, anomalies), we normalise on READ: every consumer asks
 * this module for the canonical play sequence (first-played round → final) and
 * never trusts the raw `order` direction.
 *
 * Detection is per-stage via the Final round:
 *   - Final's order == min(order) → Convention A → play order is DESC(order)
 *   - Final's order == max(order) → Convention B → play order is ASC(order)
 * The 3rd-place round is a sibling of the Final (played alongside it), not a
 * progression round, so it is excluded from detection and from the sequence.
 */

export type RoundLike = {
  id: number;
  order: number;
  shortName?: string | null;
  matchCount: number;
  hasThirdPlace?: boolean;
};

/** True if this round is the 3rd-place match (sibling of the final, not a real bracket round). */
export function isThirdPlaceRound(r: Pick<RoundLike, "shortName">): boolean {
  return (r.shortName ?? "").toUpperCase() === "3P";
}

/** True if this round is the Final. */
export function isFinalRound(r: Pick<RoundLike, "shortName">): boolean {
  return (r.shortName ?? "").toUpperCase() === "F";
}

/**
 * Returns the stage's real bracket rounds ordered first-played → final,
 * regardless of which `order` convention the data was stored with. The
 * 3rd-place round is dropped (call `thirdPlaceRound` for it separately).
 */
export function playOrderedRounds<T extends RoundLike>(rounds: T[]): T[] {
  const bracket = rounds.filter((r) => !isThirdPlaceRound(r));
  if (bracket.length <= 1) return [...bracket];

  const orders = bracket.map((r) => r.order);
  const minOrder = Math.min(...orders);
  const maxOrder = Math.max(...orders);

  // Prefer the explicit Final marker; fall back to matchCount (final has the
  // fewest matches) if no 'F' round is labelled.
  const final = bracket.find(isFinalRound)
    ?? [...bracket].sort((a, b) => a.matchCount - b.matchCount)[0];

  // Convention A (order 1 = final) → play order is DESC.
  // Convention B (order 1 = first) → play order is ASC.
  // Tie-break (single round or ambiguous): treat highest order = final (B).
  const conventionA = final.order === minOrder && minOrder !== maxOrder;

  return [...bracket].sort((a, b) =>
    conventionA ? b.order - a.order : a.order - b.order,
  );
}

/** The first round teams actually play (R32/R16/QF/…), convention-agnostic. */
export function firstPlayRound<T extends RoundLike>(rounds: T[]): T | null {
  const seq = playOrderedRounds(rounds);
  return seq[0] ?? null;
}

/**
 * The round that `round` feeds its winners into (one step closer to the final),
 * or null if `round` is the final (no next round). Convention-agnostic.
 */
export function nextPlayRound<T extends RoundLike>(rounds: T[], roundId: number): T | null {
  const seq = playOrderedRounds(rounds);
  const idx = seq.findIndex((r) => r.id === roundId);
  if (idx === -1) return null;
  return seq[idx + 1] ?? null;
}

/** The 3rd-place round of the stage, if any. */
export function thirdPlaceRound<T extends RoundLike>(rounds: T[]): T | null {
  return rounds.find(isThirdPlaceRound) ?? null;
}
