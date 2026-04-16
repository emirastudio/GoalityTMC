import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { matches, tournamentStages, tournaments } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";

type Params = {
  orgSlug: string;
  tournamentId: string;
  stageId: string;
};

/**
 * GET /api/.../stages/[stageId]/lock-state
 *
 * Reports whether the draw for this stage is "committed" and therefore
 * dangerous to modify. The UI uses this to gate Auto-draw / Clear /
 * drag-drop behind an Unlock confirmation.
 *
 * Definitions:
 *   - `committed`: at least one match in the stage already has teams
 *     assigned (homeTeamId OR awayTeamId). Set by apply-draw. Once true,
 *     blindly running Auto-draw would desync group_teams from the match
 *     record and corrupt the tournament.
 *   - `hasScores`: at least one match in the stage has a score recorded
 *     (homeScore OR awayScore). If true, any re-draw is catastrophic —
 *     scores stay on their match rows but start describing the wrong
 *     teams. Requires stricter confirmation.
 *
 * Counts are included so the UI can say things like "3 of 12 matches
 * have scores" in the confirmation modal.
 */
export async function GET(
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

  // Verify stage belongs to this tournament before leaking any counts.
  const stage = await db.query.tournamentStages.findFirst({
    where: and(
      eq(tournamentStages.id, stageId),
      eq(tournamentStages.tournamentId, ctx.tournament.id),
    ),
  });
  if (!stage) {
    return NextResponse.json({ error: "stage not found" }, { status: 404 });
  }

  // Tournament-level publish lock. Once the schedule is published the
  // tournament is effectively live (public pages + clubs see the bracket)
  // and NO draw edits are allowed until the organizer explicitly
  // unpublishes.
  const tournamentRow = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, ctx.tournament.id),
    columns: { schedulePublishedAt: true },
  });
  const publishedAt = tournamentRow?.schedulePublishedAt ?? null;

  // Single roundtrip: aggregate counts via a CASE/SUM so we don't make
  // three separate SELECT COUNT queries.
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      withTeams: sql<number>`sum(case when (${matches.homeTeamId} is not null or ${matches.awayTeamId} is not null) then 1 else 0 end)::int`,
      withScores: sql<number>`sum(case when (${matches.homeScore} is not null or ${matches.awayScore} is not null) then 1 else 0 end)::int`,
    })
    .from(matches)
    .where(
      and(
        eq(matches.tournamentId, ctx.tournament.id),
        eq(matches.stageId, stageId),
        isNull(matches.deletedAt),
      ),
    );

  const total = row?.total ?? 0;
  const withTeams = row?.withTeams ?? 0;
  const withScores = row?.withScores ?? 0;

  return NextResponse.json({
    // Hardest lock: tournament has been published. Overrides everything
    // else — even clicks on Revert must be bounced back to the publish
    // screen so the user consciously goes back to edit mode.
    tournamentPublished: publishedAt !== null,
    publishedAt: publishedAt ? publishedAt.toISOString() : null,
    // Softer locks derived from the state of matches in this stage.
    committed: withTeams > 0,
    hasScores: withScores > 0,
    matchesTotal: total,
    matchesWithTeams: withTeams,
    matchesWithScores: withScores,
  });
}
