/**
 * Seeded deterministic RNG — identical seed always produces identical sequence.
 * Algorithm: mulberry32 (fast, good distribution, 32-bit state).
 *
 * Used by the solver so that re-running the same Problem with the same seed
 * produces the same Solution byte-for-byte. This is critical for:
 *   - idempotent apply operations
 *   - reproducible bug reports
 *   - "undo" via re-applying a previous run's inputs
 */

export type Rng = {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Returns an integer in [min, max). */
  int(min: number, max: number): number;
  /** Returns one random element of arr (or undefined if empty). */
  pick<T>(arr: readonly T[]): T | undefined;
  /** In-place Fisher-Yates shuffle; returns the same array. */
  shuffle<T>(arr: T[]): T[];
};

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(min, max) {
      return Math.floor(next() * (max - min)) + min;
    },
    pick<T>(arr: readonly T[]): T | undefined {
      if (arr.length === 0) return undefined;
      return arr[Math.floor(next() * arr.length)];
    },
    shuffle<T>(arr: T[]): T[] {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  };
}

/**
 * Derives a 32-bit seed from an arbitrary string (e.g. the input hash).
 * Same string → same seed, deterministically.
 */
export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
