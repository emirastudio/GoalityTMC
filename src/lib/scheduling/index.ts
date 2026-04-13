/**
 * Scheduling engine — public API.
 *
 * Consumers (API routes, tests) should import ONLY from this module.
 * Internal files are free to refactor.
 */

// Types
export type {
  Assignment,
  Blackout,
  IsoDate,
  IsoInstant,
  LocalTime,
  Lock,
  MatchTemplate,
  PartialSolution,
  Problem,
  Referee,
  RefereeRole,
  ResultSummary,
  Slot,
  Solution,
  StageKind,
  Team,
  TimeZone,
  Unplaced,
  UnplacedReason,
  Weights,
} from "./types";
export { DEFAULT_WEIGHTS, summarize } from "./types";

// Time
export {
  addMinutesUtc,
  buildSlotPool,
  enumerateDays,
  formatLocalTime,
  localToUtc,
  minutesBetween,
  parseLocalTime,
  resolveFieldHours,
  startOfDayUtc,
  toMinuteTs,
  utcToLocal,
} from "./time";
export type { FieldOpeningHour, SlotPoolInput } from "./time";

// Fixtures
export {
  generateDoubleElim,
  generateFixturesByKind,
  generateGroupsToPlayoff,
  generateLeaguePhase,
  generateRoundRobin,
  generateSingleElim,
  generateSwiss,
} from "./fixtures";
export type {
  BracketMatch,
  GroupsToPlayoffInput,
  GroupsToPlayoffOutput,
  Pairing,
} from "./fixtures";

// Constraints
export { allHardChecks, commitMove, scoreSoft, uncommitMove } from "./constraints";
export type { CheckResult, Move } from "./constraints";

// Solver
export { DEFAULT_SOLVE_OPTIONS, solve } from "./solver";
export type { SolveOptions } from "./solver";

// Problem builder
export { buildProblem, canonicalJson, hashProblem } from "./problem";
export type {
  BuildProblemOptions,
  DbMatch,
  DbSnapshot,
  DbTeam,
  DivisionScheduleConfig,
} from "./problem";

// Explain
export { checkMove, explainReason, suggestHints } from "./explain";
export type { ExplainedReason } from "./explain";

// Export
export { buildDaySheetCsv, buildIcs } from "./export";
export type { CsvInput, IcsInput } from "./export";

// RNG (exposed for tests)
export { createRng, seedFromString } from "./rng";
export type { Rng } from "./rng";
