/**
 * Tests: knockout draw → bracket layout (pairs + bye placements).
 * The layout must stay consistent with playoff-progress.ts's winner routing
 * (round-1 match i → round-2 slot i).
 */

import { describe, it, expect } from "vitest";
import { buildDrawLayout, bracketSizeFor } from "../playoff-draw";

const ids = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("bracketSizeFor", () => {
  it("rounds up to the next power of two", () => {
    expect(bracketSizeFor(2)).toBe(2);
    expect(bracketSizeFor(5)).toBe(8);
    expect(bracketSizeFor(8)).toBe(8);
    expect(bracketSizeFor(9)).toBe(16);
    expect(bracketSizeFor(16)).toBe(16);
    expect(bracketSizeFor(17)).toBe(32);
  });
});

describe("buildDrawLayout — integrity across every team count", () => {
  for (let n = 2; n <= 32; n++) {
    it(`N=${n}: every team placed exactly once, byes in distinct valid round-2 slots`, () => {
      const L = buildDrawLayout(ids(n));
      const B = bracketSizeFor(n);

      // counts
      expect(L.bracketSize).toBe(B);
      expect(L.byeCount).toBe(B - n);
      expect(L.roundOneMatchCount).toBe(n - B / 2);
      expect(2 * L.roundOneMatchCount + L.byeCount).toBe(n);

      // every team used exactly once
      const used = [...L.pairs.flat(), ...L.byes.map((b) => b.teamId)];
      expect(used.length).toBe(n);
      expect(new Set(used).size).toBe(n);

      // bye slots are distinct, valid, and don't collide with round-1 winner slots (0..R-1)
      const byeSlots = L.byes.map((b) => b.roundTwoMatchIndex * 2 + (b.side === "home" ? 0 : 1));
      expect(new Set(byeSlots).size).toBe(byeSlots.length);
      for (const s of byeSlots) {
        expect(s).toBeGreaterThanOrEqual(L.roundOneMatchCount);
        expect(s).toBeLessThan(B / 2);
      }
    });
  }
});

describe("buildDrawLayout — concrete cases", () => {
  it("perfect bracket (N=8): 4 pairs, no byes", () => {
    const L = buildDrawLayout(ids(8));
    expect(L.byeCount).toBe(0);
    expect(L.pairs).toEqual([[1, 2], [3, 4], [5, 6], [7, 8]]);
    expect(L.byes).toEqual([]);
  });

  it("N=6: 2 first-round pairs, 2 byes into round-2 match 1", () => {
    const L = buildDrawLayout(ids(6));
    expect(L.pairs).toEqual([[1, 2], [3, 4]]);
    expect(L.byes).toEqual([
      { teamId: 5, roundTwoMatchIndex: 1, side: "home" },
      { teamId: 6, roundTwoMatchIndex: 1, side: "away" },
    ]);
  });

  it("N=5: 1 first-round pair, 3 byes filling the remaining round-2 slots", () => {
    const L = buildDrawLayout(ids(5));
    expect(L.pairs).toEqual([[1, 2]]);
    expect(L.byes).toEqual([
      { teamId: 3, roundTwoMatchIndex: 0, side: "away" },
      { teamId: 4, roundTwoMatchIndex: 1, side: "home" },
      { teamId: 5, roundTwoMatchIndex: 1, side: "away" },
    ]);
  });

  it("preserves draw order in the pairings", () => {
    const L = buildDrawLayout([10, 20, 30, 40]);
    expect(L.pairs).toEqual([[10, 20], [30, 40]]);
  });
});

describe("buildDrawLayout — validation", () => {
  it("rejects fewer than 2 teams", () => {
    expect(() => buildDrawLayout([1])).toThrow();
  });
  it("rejects duplicate teams", () => {
    expect(() => buildDrawLayout([1, 2, 2, 3])).toThrow();
  });
});
