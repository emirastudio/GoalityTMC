import { describe, it, expect } from "vitest";
import { computeSetupSteps, type SetupState } from "../setup-steps";

const base: SetupState = {
  confirmedTeams: 0,
  totalMatches: 0,
  matchesWithTeams: 0,
  scheduledMatches: 0,
  published: false,
};

const statusOf = (state: SetupState, key: string) =>
  computeSetupSteps(state).steps.find((s) => s.key === key)!.status;

describe("computeSetupSteps", () => {
  it("starts on teams when nothing is set up", () => {
    const p = computeSetupSteps(base);
    expect(p.currentKey).toBe("teams");
    expect(p.allDone).toBe(false);
    expect(statusOf(base, "teams")).toBe("current");
    expect(statusOf(base, "draw")).toBe("todo");
  });

  it("moves to draw once ≥2 teams are confirmed (but matches are TBD)", () => {
    const s = { ...base, confirmedTeams: 7, totalMatches: 21, matchesWithTeams: 0 };
    const p = computeSetupSteps(s);
    expect(p.currentKey).toBe("draw");
    expect(statusOf(s, "teams")).toBe("done");
    expect(statusOf(s, "draw")).toBe("current");
  });

  it("moves to schedule once the draw is applied (all matches have teams)", () => {
    const s = { ...base, confirmedTeams: 7, totalMatches: 21, matchesWithTeams: 21, scheduledMatches: 0 };
    const p = computeSetupSteps(s);
    expect(p.currentKey).toBe("schedule");
    expect(statusOf(s, "draw")).toBe("done");
  });

  it("does not mark draw done while some matches are still TBD", () => {
    const s = { ...base, confirmedTeams: 7, totalMatches: 21, matchesWithTeams: 16 };
    expect(statusOf(s, "draw")).toBe("current");
  });

  it("moves to publish once every match is scheduled", () => {
    const s = { ...base, confirmedTeams: 7, totalMatches: 21, matchesWithTeams: 21, scheduledMatches: 21 };
    const p = computeSetupSteps(s);
    expect(p.currentKey).toBe("publish");
    expect(statusOf(s, "schedule")).toBe("done");
  });

  it("partial scheduling keeps schedule as the current step", () => {
    const s = { ...base, confirmedTeams: 7, totalMatches: 21, matchesWithTeams: 21, scheduledMatches: 16 };
    expect(computeSetupSteps(s).currentKey).toBe("schedule");
  });

  it("is all done when published", () => {
    const s = { ...base, confirmedTeams: 7, totalMatches: 21, matchesWithTeams: 21, scheduledMatches: 21, published: true };
    const p = computeSetupSteps(s);
    expect(p.currentKey).toBeNull();
    expect(p.allDone).toBe(true);
    expect(p.steps.every((x) => x.status === "done")).toBe(true);
  });

  it("draw cannot be done with zero matches (format not built)", () => {
    const s = { ...base, confirmedTeams: 7, totalMatches: 0 };
    expect(statusOf(s, "draw")).toBe("current");
  });
});
