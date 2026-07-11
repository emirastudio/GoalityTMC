/**
 * Setup wizard step logic — turns a division's raw state into the guided
 * "Команды → Жеребьёвка → Расписание → Публикация" progression. Pure, so the
 * component stays dumb and this stays unit-testable.
 *
 * The rule is strictly linear: a step is `current` only when every earlier
 * step is `done`. Everything after the current step is `todo`. This gives the
 * organizer exactly one obvious next action at any time.
 */

export type SetupStepKey = "teams" | "draw" | "schedule" | "publish";

export type SetupStepStatus = "done" | "current" | "todo";

export type SetupState = {
  /** Confirmed (accepted) teams in the division. */
  confirmedTeams: number;
  /** Total match shells created by the format (0 = format not built yet). */
  totalMatches: number;
  /** Matches that have both teams assigned (draw applied). */
  matchesWithTeams: number;
  /** Matches with a real time slot. */
  scheduledMatches: number;
  /** Schedule published to the public site. */
  published: boolean;
};

export type SetupStep = { key: SetupStepKey; status: SetupStepStatus };

export type SetupPlan = {
  steps: SetupStep[];
  /** The one step the organizer should act on now, or null when all done. */
  currentKey: SetupStepKey | null;
  /** True once every step is done. */
  allDone: boolean;
};

const ORDER: SetupStepKey[] = ["teams", "draw", "schedule", "publish"];

/** Is a given step's own goal satisfied, ignoring order? */
function isStepDone(key: SetupStepKey, s: SetupState): boolean {
  switch (key) {
    case "teams":
      return s.confirmedTeams >= 2;
    case "draw":
      // Every created match has real teams (no TBD left). Needs matches to exist.
      return s.totalMatches > 0 && s.matchesWithTeams >= s.totalMatches;
    case "schedule":
      return s.totalMatches > 0 && s.scheduledMatches >= s.totalMatches;
    case "publish":
      return s.published;
  }
}

export function computeSetupSteps(state: SetupState): SetupPlan {
  const done: Record<SetupStepKey, boolean> = {
    teams: isStepDone("teams", state),
    draw: isStepDone("draw", state),
    schedule: isStepDone("schedule", state),
    publish: isStepDone("publish", state),
  };

  // Current = first step in order that isn't done. Steps before it are `done`,
  // the rest are `todo`.
  const currentKey = ORDER.find((k) => !done[k]) ?? null;

  const steps: SetupStep[] = ORDER.map((key) => {
    if (done[key]) return { key, status: "done" as const };
    return { key, status: key === currentKey ? "current" : "todo" };
  });

  return { steps, currentKey, allDone: currentKey === null };
}
