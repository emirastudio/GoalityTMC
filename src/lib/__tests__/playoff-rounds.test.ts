/**
 * Tests: playoff round ordering — convention-agnostic normalisation.
 *
 * Fixtures below are the ACTUAL match_rounds rows pulled from production
 * (read-only), covering both stored `order` conventions that exist in the
 * live DB:
 *   • Convention A — order 1 = Final   (older group→playoff stages)
 *   • Convention B — order 1 = first round (format-builder stages)
 * The helper must produce the same canonical play sequence for both.
 */

import { describe, it, expect } from "vitest";
import {
  playOrderedRounds,
  firstPlayRound,
  nextPlayRound,
  thirdPlaceRound,
  type RoundLike,
} from "../playoff-rounds";

// [shortName, order, matchCount] → RoundLike[]
function mk(rows: [string, number, number][]): RoundLike[] {
  return rows.map((r, i) => ({ id: i + 1, shortName: r[0], order: r[1], matchCount: r[2] }));
}

// Real production stages (verified via prod query).
const FIXTURES: Record<string, { rows: [string, number, number][]; convention: "A" | "B"; playSeq: string[] }> = {
  // Convention A — order 1 = Final
  "stage 11 (Champions Playoff, A)": {
    rows: [["F", 1, 1], ["SF5-8", 2, 2], ["SF1-4", 3, 2], ["QF", 4, 4]],
    convention: "A",
    playSeq: ["QF", "SF1-4", "SF5-8", "F"],
  },
  "stage 17 (Playoffs, A, dup order)": {
    rows: [["F", 1, 1], ["SF1-4", 2, 2], ["SF5-8", 2, 2]],
    convention: "A",
    playSeq: ["SF1-4", "SF5-8", "F"], // both SF at order 2 → stable order preserved, F last
  },
  // Convention B — order 1 = first round
  "stage 118 (Playoffs, B, +3P)": {
    rows: [["QF", 1, 4], ["SF", 2, 2], ["F", 3, 1], ["3P", 4, 1]],
    convention: "B",
    playSeq: ["QF", "SF", "F"],
  },
  "stage 115 (Playoffs, B, R32+3P)": {
    rows: [["R32", 1, 8], ["R16", 2, 8], ["QF", 3, 4], ["SF", 4, 2], ["F", 5, 1], ["3P", 6, 1]],
    convention: "B",
    playSeq: ["R32", "R16", "QF", "SF", "F"],
  },
  "stage 116 (B-Playoffs, B)": {
    rows: [["R16", 1, 2], ["QF", 2, 4], ["SF", 3, 2], ["F", 4, 1]],
    convention: "B",
    playSeq: ["R16", "QF", "SF", "F"],
  },
};

describe("playOrderedRounds — canonical first→final sequence", () => {
  for (const [name, fx] of Object.entries(FIXTURES)) {
    it(`${name}: produces the expected play sequence`, () => {
      const seq = playOrderedRounds(mk(fx.rows)).map((r) => r.shortName);
      expect(seq).toEqual(fx.playSeq);
    });

    it(`${name}: Final is always last, 3rd-place excluded`, () => {
      const seq = playOrderedRounds(mk(fx.rows));
      expect(seq[seq.length - 1].shortName?.toUpperCase()).toBe("F");
      expect(seq.some((r) => r.shortName?.toUpperCase() === "3P")).toBe(false);
    });
  }
});

describe("firstPlayRound", () => {
  it("returns the earliest round teams actually play (not the final)", () => {
    expect(firstPlayRound(mk(FIXTURES["stage 118 (Playoffs, B, +3P)"].rows))?.shortName).toBe("QF");
    expect(firstPlayRound(mk(FIXTURES["stage 115 (Playoffs, B, R32+3P)"].rows))?.shortName).toBe("R32");
    expect(firstPlayRound(mk(FIXTURES["stage 11 (Champions Playoff, A)"].rows))?.shortName).toBe("QF");
  });

  it("returns the sole round for a single-round stage", () => {
    expect(firstPlayRound(mk([["F", 1, 1]]))?.shortName).toBe("F");
  });
});

describe("nextPlayRound — winner progression target", () => {
  it("standard bracket advances toward the final (Convention B)", () => {
    const rounds = mk(FIXTURES["stage 115 (Playoffs, B, R32+3P)"].rows);
    const byShort = (s: string) => rounds.find((r) => r.shortName === s)!;
    expect(nextPlayRound(rounds, byShort("R32").id)?.shortName).toBe("R16");
    expect(nextPlayRound(rounds, byShort("R16").id)?.shortName).toBe("QF");
    expect(nextPlayRound(rounds, byShort("QF").id)?.shortName).toBe("SF");
    expect(nextPlayRound(rounds, byShort("SF").id)?.shortName).toBe("F");
    expect(nextPlayRound(rounds, byShort("F").id)).toBeNull(); // final has no next
  });

  it("identical target for the equivalent Convention-A stage (no regression)", () => {
    const rounds = mk(FIXTURES["stage 11 (Champions Playoff, A)"].rows);
    const byShort = (s: string) => rounds.find((r) => r.shortName === s)!;
    expect(nextPlayRound(rounds, byShort("QF").id)?.shortName).toBe("SF1-4");
    expect(nextPlayRound(rounds, byShort("SF1-4").id)?.shortName).toBe("SF5-8");
    expect(nextPlayRound(rounds, byShort("SF5-8").id)?.shortName).toBe("F");
    expect(nextPlayRound(rounds, byShort("F").id)).toBeNull();
  });

  it("returns null for an unknown round id", () => {
    expect(nextPlayRound(mk([["QF", 1, 4], ["F", 2, 1]]), 9999)).toBeNull();
  });
});

describe("thirdPlaceRound", () => {
  it("finds the 3P round when present", () => {
    expect(thirdPlaceRound(mk(FIXTURES["stage 118 (Playoffs, B, +3P)"].rows))?.shortName).toBe("3P");
  });
  it("returns null when there is no 3rd-place match", () => {
    expect(thirdPlaceRound(mk(FIXTURES["stage 116 (B-Playoffs, B)"].rows))).toBeNull();
  });
});

describe("edge cases", () => {
  it("empty input → empty sequence", () => {
    expect(playOrderedRounds([])).toEqual([]);
  });
  it("single round → itself", () => {
    expect(playOrderedRounds(mk([["F", 1, 1]])).map((r) => r.shortName)).toEqual(["F"]);
  });
});
