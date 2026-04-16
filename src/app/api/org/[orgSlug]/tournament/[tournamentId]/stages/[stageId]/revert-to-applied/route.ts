import { NextRequest, NextResponse } from "next/server";
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
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { recalculateGroupStandings } from "@/lib/standings-calculator";

type Params = {
  orgSlug: string;
  tournamentId: string;
  stageId: string;
};

/**
 * POST /api/.../stages/[stageId]/revert-to-applied
 *
 * Reconstructs group_teams and standings from the matches table for the
 * given stage. This is the "undo my last Auto-draw" button: once the
 * admin has applied a draw (matches have homeTeamId/awayTeamId), the
 * matches become the source of truth. Any subsequent Auto-draw or Clear
 * can be rolled back by reading those matches and rebuilding the
 * assignments.
 *
 * Implementation mirrors scripts/recover-group-teams.ts but as a
 * user-facing endpoint: scoped to a single stage, returns a per-group
 * report for the UI to display as a toast.
 *
 * Pre-conditions:
 *   - At least one match in the stage must have teams assigned
 *     (otherwise there's no "applied draw" to revert to).
 *
 * Not idempotent in the trivial sense: running twice is safe (second run
 * reports zero changes), but the operation does mutate DB rows.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const stageId = parseInt(p.stageId);
  if (!Number.isFinite(stageId)) {
    return NextResponse.json({ error: "bad stageId" }, { status: 400 });
  }

  // Scope the stage to this tournament — prevents cross-tenant access.
  const stage = await db.query.tournamentStages.findFirst({
    where: and(
      eq(tournamentStages.id, stageId),
      eq(tournamentStages.tournamentId, ctx.tournament.id),
    ),
  });
  if (!stage) {
    return NextResponse.json({ error: "stage not found" }, { status: 404 });
  }

  // Same publish lock: revert also mutates state (rebuilds standings),
  // which should not happen while the schedule is public.
  const tournamentRow = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, ctx.tournament.id),
    columns: { schedulePublishedAt: true },
  });
  if (tournamentRow?.schedulePublishedAt) {
    return NextResponse.json(
      {
        error: "tournament_published",
        publishedAt: tournamentRow.schedulePublishedAt.toISOString(),
        hint: "Unpublish the schedule before reverting the draw.",
      },
      { status: 423 },
    );
  }

  const groups = await db
    .select({ id: stageGroups.id, name: stageGroups.name })
    .from(stageGroups)
    .where(eq(stageGroups.stageId, stageId))
    .orderBy(stageGroups.order);

  type GroupChange = {
    groupId: number;
    groupName: string;
    before: number[];
    after: number[];
    changed: boolean;
  };
  const changes: GroupChange[] = [];

  for (const group of groups) {
    // Current assignment — may be corrupted if Auto-draw ran post-apply.
    const currentRows = await db
      .select({ teamId: groupTeams.teamId })
      .from(groupTeams)
      .where(eq(groupTeams.groupId, group.id))
      .orderBy(groupTeams.seedNumber);
    const before = currentRows.map((r) => r.teamId);

    // Source of truth: teams seen in matches tied to this group.
    const matchRows = await db
      .select({
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
      })
      .from(matches)
      .where(
        and(
          eq(matches.groupId, group.id),
          isNull(matches.deletedAt),
        ),
      );

    const seen = new Set<number>();
    for (const m of matchRows) {
      if (m.homeTeamId != null) seen.add(m.homeTeamId);
      if (m.awayTeamId != null) seen.add(m.awayTeamId);
    }
    const after = [...seen].sort((a, b) => a - b);

    const beforeSet = new Set(before);
    const afterSet = new Set(after);
    const changed =
      before.length !== after.length ||
      [...beforeSet].some((id) => !afterSet.has(id));

    if (changed) {
      await db.delete(groupTeams).where(eq(groupTeams.groupId, group.id));
      if (after.length > 0) {
        await db.insert(groupTeams).values(
          after.map((teamId, i) => ({
            groupId: group.id,
            teamId,
            seedNumber: i + 1,
          })),
        );
      }
      await db.delete(standings).where(eq(standings.groupId, group.id));
      await recalculateGroupStandings(group.id);
    }

    changes.push({
      groupId: group.id,
      groupName: group.name,
      before,
      after,
      changed,
    });
  }

  const appliedExists = changes.some((c) => c.after.length > 0);
  if (!appliedExists) {
    // No teams in any match — nothing to revert to. This is the "you
    // never clicked Apply Draw" edge case; the UI should not have
    // exposed the revert button here, but we defend anyway.
    return NextResponse.json(
      {
        error: "no_applied_draw",
        hint: "This stage has no applied draw to revert to.",
      },
      { status: 400 },
    );
  }

  const groupsChanged = changes.filter((c) => c.changed).length;
  return NextResponse.json({
    ok: true,
    groupsChanged,
    groupsTotal: changes.length,
    changes,
  });
}
