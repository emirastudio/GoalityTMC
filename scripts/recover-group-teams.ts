/**
 * recover-group-teams — emergency reconstruction of group_teams and
 * standings from the matches table.
 *
 * Background: the tournament admin's Auto-draw button (schedule-page.tsx)
 * issues `mode: "replace"` writes that wipe group_teams AND standings for
 * each group, then refills them with a new random team distribution. If
 * this is clicked AFTER apply-draw and AFTER matches already have results,
 * the matches table is not modified (good) but group_teams and standings
 * are gone (bad).
 *
 * This script rebuilds them from matches:
 *   • For each group in the given stage, read every non-deleted match.
 *   • Collect the set of teamIds seen as home/away in those matches.
 *   • Rewrite group_teams for that group with those teams.
 *   • Recompute standings via the existing calculator.
 *
 * Usage (from the project root, in the server environment):
 *
 *   Dry-run (prints what would change, writes nothing):
 *     pnpm tsx scripts/recover-group-teams.ts --tournament 17 --stage 99
 *
 *   Apply for real:
 *     pnpm tsx scripts/recover-group-teams.ts --tournament 17 --stage 99 --apply
 *
 * The --stage argument is optional: omit it to scan every stage in the
 * tournament where group_teams looks corrupted (teams in group_teams don't
 * match the teams that actually played in the group's matches).
 */

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  groupTeams,
  matches,
  stageGroups,
  standings,
  tournamentStages,
  tournaments,
} from "@/db/schema";
import { recalculateGroupStandings } from "@/lib/standings-calculator";

type GroupReport = {
  groupId: number;
  groupName: string;
  currentTeamIds: number[];
  matchesTeamIds: number[];
  toDelete: number[];
  toInsert: number[];
  matchesWithScores: number;
  needsRepair: boolean;
};

async function collectStageGroups(stageId: number): Promise<
  { id: number; name: string; order: number }[]
> {
  return db
    .select({
      id: stageGroups.id,
      name: stageGroups.name,
      order: stageGroups.order,
    })
    .from(stageGroups)
    .where(eq(stageGroups.stageId, stageId))
    .orderBy(stageGroups.order);
}

async function collectStagesForTournament(tournamentId: number): Promise<
  { id: number; name: string }[]
> {
  return db
    .select({ id: tournamentStages.id, name: tournamentStages.name })
    .from(tournamentStages)
    .where(eq(tournamentStages.tournamentId, tournamentId));
}

async function analyzeGroup(group: {
  id: number;
  name: string;
}): Promise<GroupReport> {
  // Current (corrupted?) team assignments.
  const currentRows = await db
    .select({ teamId: groupTeams.teamId, seedNumber: groupTeams.seedNumber })
    .from(groupTeams)
    .where(eq(groupTeams.groupId, group.id))
    .orderBy(groupTeams.seedNumber);
  const currentTeamIds = currentRows.map((r) => r.teamId);

  // Source of truth: who actually played in this group's matches.
  const matchRows = await db
    .select({
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
    })
    .from(matches)
    .where(
      and(
        eq(matches.groupId, group.id),
        isNull(matches.deletedAt),
      ),
    );

  const seenIds = new Set<number>();
  let withScores = 0;
  for (const m of matchRows) {
    if (m.homeTeamId != null) seenIds.add(m.homeTeamId);
    if (m.awayTeamId != null) seenIds.add(m.awayTeamId);
    if (m.homeScore != null || m.awayScore != null) withScores++;
  }
  const matchesTeamIds = [...seenIds].sort((a, b) => a - b);

  const currentSet = new Set(currentTeamIds);
  const toDelete = currentTeamIds.filter((id) => !seenIds.has(id));
  const toInsert = matchesTeamIds.filter((id) => !currentSet.has(id));

  return {
    groupId: group.id,
    groupName: group.name,
    currentTeamIds,
    matchesTeamIds,
    toDelete,
    toInsert,
    matchesWithScores: withScores,
    needsRepair: toDelete.length > 0 || toInsert.length > 0,
  };
}

async function repairGroup(report: GroupReport): Promise<void> {
  // Overwrite group_teams for this group with the team set that actually
  // played. We preserve ordering by teamId (there's no other signal we can
  // trust — seed ordering was lost in the wipe).
  await db.delete(groupTeams).where(eq(groupTeams.groupId, report.groupId));
  if (report.matchesTeamIds.length > 0) {
    await db.insert(groupTeams).values(
      report.matchesTeamIds.map((teamId, i) => ({
        groupId: report.groupId,
        teamId,
        seedNumber: i + 1,
      })),
    );
  }

  // Wipe and rebuild standings (the existing calculator handles H2H,
  // tiebreakers, positions).
  await db.delete(standings).where(eq(standings.groupId, report.groupId));
  await recalculateGroupStandings(report.groupId);
}

function formatReport(reports: GroupReport[]): string {
  const lines: string[] = [];
  for (const r of reports) {
    const status = r.needsRepair ? "REPAIR" : "ok";
    lines.push(
      `  [${status}] group #${r.groupId} "${r.groupName}"  ` +
        `matches teams=[${r.matchesTeamIds.join(",") || "none"}]  ` +
        `current teams=[${r.currentTeamIds.join(",") || "none"}]  ` +
        `scores=${r.matchesWithScores}`,
    );
    if (r.toDelete.length) lines.push(`    -- remove: ${r.toDelete.join(",")}`);
    if (r.toInsert.length) lines.push(`    ++ insert: ${r.toInsert.join(",")}`);
  }
  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const tournamentArg = argValue(args, "--tournament");
  const stageArg = argValue(args, "--stage");

  if (!tournamentArg) {
    console.error(
      "Missing --tournament <id>. Find the id in the admin URL: tournament/<ID>/schedule",
    );
    process.exit(1);
  }
  const tournamentId = Number(tournamentArg);
  if (!Number.isInteger(tournamentId)) {
    console.error("--tournament must be an integer");
    process.exit(1);
  }

  // Sanity check: tournament exists.
  const tournament = await db
    .select({ id: tournaments.id, name: tournaments.name })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  if (tournament.length === 0) {
    console.error(`Tournament #${tournamentId} not found.`);
    process.exit(1);
  }
  console.log(
    `Tournament: #${tournament[0].id} "${tournament[0].name}"  (apply=${apply ? "YES" : "no — dry run"})`,
  );

  // Which stages to inspect.
  const stages: { id: number; name: string }[] = stageArg
    ? [{ id: Number(stageArg), name: `stage#${stageArg}` }]
    : await collectStagesForTournament(tournamentId);

  let totalNeedingRepair = 0;
  for (const stage of stages) {
    const groups = await collectStageGroups(stage.id);
    if (groups.length === 0) continue;

    console.log(`\nStage #${stage.id} "${stage.name}"  (${groups.length} groups)`);
    const reports: GroupReport[] = [];
    for (const g of groups) reports.push(await analyzeGroup(g));
    console.log(formatReport(reports));

    const needRepair = reports.filter((r) => r.needsRepair);
    totalNeedingRepair += needRepair.length;

    if (apply && needRepair.length > 0) {
      console.log(`  applying repairs to ${needRepair.length} group(s)...`);
      for (const r of needRepair) {
        await repairGroup(r);
        console.log(`    ✓ group #${r.groupId} repaired`);
      }
    }
  }

  console.log(
    `\nSummary: ${totalNeedingRepair} group(s) needed repair.  ` +
      (apply
        ? "Changes were applied."
        : "Dry run — no changes written. Add --apply to commit."),
  );
  process.exit(0);
}

function argValue(args: string[], key: string): string | undefined {
  const idx = args.indexOf(key);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
