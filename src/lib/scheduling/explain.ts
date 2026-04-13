/**
 * Explain layer — turns structured UnplacedReason entries into human-readable
 * text and actionable hints for the UI. Also provides a "move-conflict" check
 * for drag-drop what-if flows.
 */

import { allHardChecks, type Move } from "./constraints";
import type {
  Assignment,
  PartialSolution,
  Problem,
  UnplacedReason,
} from "./types";
import { emptyPartial } from "./types";
import { commitMove } from "./constraints";

// ═════════════════════ Human text ═════════════════════

/**
 * Returns an i18n key and parameters. The UI passes these through next-intl
 * to render localized messages. Keys are namespaced under `schedule.conflicts`.
 */
export type ExplainedReason = {
  key: string;
  params: Record<string, string | number>;
};

export function explainReason(reason: UnplacedReason): ExplainedReason {
  switch (reason.type) {
    case "no_slot_in_window":
      return { key: "schedule.conflicts.noSlotInWindow", params: {} };
    case "team_no_overlap":
      return {
        key: "schedule.conflicts.teamNoOverlap",
        params: { teamId: reason.teamId, matchId: reason.conflictingMatchId },
      };
    case "field_no_overlap":
      return {
        key: "schedule.conflicts.fieldNoOverlap",
        params: { matchId: reason.conflictingMatchId },
      };
    case "referee_no_overlap":
      return {
        key: "schedule.conflicts.refereeNoOverlap",
        params: { refereeId: reason.refereeId, matchId: reason.conflictingMatchId },
      };
    case "referee_unavailable":
      return { key: "schedule.conflicts.refereeUnavailable", params: { refereeId: reason.refereeId } };
    case "rest_violation":
      return {
        key: "schedule.conflicts.restViolation",
        params: { teamId: reason.teamId, minutes: reason.restNeededMinutes },
      };
    case "team_day_limit":
      return {
        key: "schedule.conflicts.teamDayLimit",
        params: { teamId: reason.teamId, cap: reason.maxPerDay },
      };
    case "blackout":
      return {
        key: "schedule.conflicts.blackout",
        params: { entityKind: reason.entityKind, entityId: reason.entityId, date: reason.date },
      };
    case "stadium_closed":
      return {
        key: "schedule.conflicts.stadiumClosed",
        params: { stadiumId: reason.stadiumId, date: reason.date },
      };
    case "stage_completion_order":
      return {
        key: "schedule.conflicts.stageCompletionOrder",
        params: {
          matchId: reason.blockingMatchId,
          stageId: reason.blockingStageId,
        },
      };
    case "knockout_round_order":
      return {
        key: "schedule.conflicts.knockoutRoundOrder",
        params: {
          matchId: reason.blockingMatchId,
          round: reason.earlierRoundOrder,
        },
      };
    case "group_round_order":
      return {
        key: "schedule.conflicts.groupRoundOrder",
        params: {
          matchId: reason.blockingMatchId,
          groupId: reason.groupId,
          round: reason.earlierGroupRound,
        },
      };
    case "field_stage_affinity":
      return {
        key: "schedule.conflicts.fieldStageAffinity",
        params: { fieldId: reason.fieldId, stageId: reason.stageId },
      };
    case "field_division_affinity":
      return {
        key: "schedule.conflicts.fieldDivisionAffinity",
        params: { fieldId: reason.fieldId, classId: reason.classId },
      };
    case "two_legged_spacing":
      return {
        key: "schedule.conflicts.twoLeggedSpacing",
        params: { peerMatchId: reason.peerMatchId },
      };
  }
}

// ═════════════════════ Hints ═════════════════════

/**
 * Produces actionable hints based on a list of unplaced reasons. Returns i18n
 * keys that describe one-click remediations.
 */
export function suggestHints(reasons: UnplacedReason[]): string[] {
  const hints = new Set<string>();
  for (const r of reasons) {
    switch (r.type) {
      case "no_slot_in_window":
        hints.add("schedule.hints.addFieldOrDay");
        break;
      case "rest_violation":
        hints.add("schedule.hints.reduceRestMinutes");
        break;
      case "team_day_limit":
        hints.add("schedule.hints.increaseMaxPerDay");
        break;
      case "blackout":
        hints.add(
          r.entityKind === "team"
            ? "schedule.hints.reviewTeamBlackout"
            : "schedule.hints.reviewRefereeBlackout",
        );
        break;
      case "stadium_closed":
        hints.add("schedule.hints.reviewStadiumHours");
        break;
      case "stage_completion_order":
        hints.add("schedule.hints.extendHorizonForPlayoff");
        break;
      case "knockout_round_order":
        hints.add("schedule.hints.extendHorizonForPlayoff");
        break;
      case "group_round_order":
        hints.add("schedule.hints.allowParallelGroupRounds");
        break;
      case "referee_unavailable":
      case "referee_no_overlap":
        hints.add("schedule.hints.addReferee");
        break;
      case "field_stage_affinity":
        hints.add("schedule.hints.relaxFieldStageAffinity");
        break;
    }
  }
  return Array.from(hints);
}

// ═════════════════════ Move-conflict (drag-drop what-if) ═════════════════════

/**
 * Given an existing solution and a proposed single-match move, returns the
 * list of hard-constraint violations that would occur. The UI uses this to
 * show live red outlines while dragging.
 */
export function checkMove(
  problem: Problem,
  currentAssignments: Assignment[],
  move: { matchId: number; slotId: string; refereeAssignments?: Array<{ refereeId: number; role: "main" | "assistant1" | "assistant2" | "fourth" }> },
): { ok: true } | { ok: false; reason: UnplacedReason } {
  const match = problem.matchTemplates.find((m) => m.id === move.matchId);
  if (!match) return { ok: false, reason: { type: "no_slot_in_window" } };
  const slot = problem.slots.find((s) => s.id === move.slotId);
  if (!slot) return { ok: false, reason: { type: "no_slot_in_window" } };

  // Build a partial solution with all OTHER assignments and then test the move.
  const partial: PartialSolution = emptyPartial();
  for (const a of currentAssignments) {
    if (a.matchId === move.matchId) continue;
    const otherMatch = problem.matchTemplates.find((m) => m.id === a.matchId);
    const otherSlot = problem.slots.find((s) => s.id === a.slotId);
    if (!otherMatch || !otherSlot) continue;
    commitMove(partial, {
      match: otherMatch,
      slot: otherSlot,
      refereeAssignments: a.refereeAssignments,
    });
  }

  const testMove: Move = {
    match,
    slot,
    refereeAssignments:
      move.refereeAssignments ??
      currentAssignments.find((a) => a.matchId === move.matchId)?.refereeAssignments ??
      [],
  };
  return allHardChecks(problem, partial, testMove);
}
