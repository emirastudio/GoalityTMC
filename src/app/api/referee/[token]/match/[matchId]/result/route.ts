import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentReferees, matchReferees, matches, tournamentStages } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { recalculateGroupStandings } from "@/lib/standings-calculator";
import { maybeAutoAdvanceGroup } from "@/lib/playoff-advance";
import { progressPlayoffWinner } from "@/lib/playoff-progress";
import { emitMatchUpdate } from "@/lib/match-events";

type Params = { token: string; matchId: string };

/**
 * PATCH /api/referee/[token]/match/[matchId]/result
 * Public — authenticated by access token only. Referee must be assigned to the match.
 *
 * Body variants:
 *   { homeScore?, awayScore? }                          — update score (live only)
 *   { status: "live" }                                  — start match
 *   { status: "finished", homeScore?, awayScore? }      — finish match + recalc
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { token, matchId: matchIdStr } = await params;

  // Look up referee by token
  const referee = await db.query.tournamentReferees.findFirst({
    where: and(
      eq(tournamentReferees.accessToken, token),
      isNull(tournamentReferees.deletedAt),
    ),
  });

  if (!referee) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const matchId = parseInt(matchIdStr);
  if (isNaN(matchId)) {
    return NextResponse.json({ error: "Invalid matchId" }, { status: 400 });
  }

  // Verify this referee is assigned to the match
  const assignment = await db.query.matchReferees.findFirst({
    where: and(
      eq(matchReferees.matchId, matchId),
      eq(matchReferees.refereeId, referee.id),
    ),
  });

  if (!assignment) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Verify the match belongs to the same tournament as the referee
  const match = await db.query.matches.findFirst({
    where: and(
      eq(matches.id, matchId),
      eq(matches.tournamentId, referee.tournamentId),
      isNull(matches.deletedAt),
    ),
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { status, homeScore, awayScore } = body as {
    status?: string;
    homeScore?: number;
    awayScore?: number;
  };

  // ── status: "live" — start match ─────────────────────────────────────────
  if (status === "live") {
    const updates: Record<string, unknown> = {
      status: "live",
      updatedAt: new Date(),
    };
    if (!match.startedAt) {
      updates.startedAt = new Date();
    }

    const [updated] = await db
      .update(matches)
      .set(updates)
      .where(eq(matches.id, matchId))
      .returning();

    emitMatchUpdate({
      tournamentId: updated.tournamentId,
      matchId: updated.id,
      groupId: updated.groupId,
      homeTeamId: updated.homeTeamId,
      awayTeamId: updated.awayTeamId,
      homeScore: updated.homeScore,
      awayScore: updated.awayScore,
      status: updated.status,
    });

    return NextResponse.json({ ok: true });
  }

  // ── status: "finished" — finish match + recalc ────────────────────────────
  if (status === "finished") {
    const finalHome = homeScore ?? match.homeScore ?? 0;
    const finalAway = awayScore ?? match.awayScore ?? 0;

    const updates: Record<string, unknown> = {
      status: "finished",
      homeScore: finalHome,
      awayScore: finalAway,
      finishedAt: new Date(),
      updatedAt: new Date(),
    };

    // Determine winner for knockout rounds
    if (match.roundId) {
      if (finalHome !== finalAway) {
        updates.winnerId =
          finalHome > finalAway ? match.homeTeamId : match.awayTeamId;
      }
      updates.resultType = "regular";
    }

    const [updated] = await db
      .update(matches)
      .set(updates)
      .where(eq(matches.id, matchId))
      .returning();

    // SSE broadcast
    emitMatchUpdate({
      tournamentId: updated.tournamentId,
      matchId: updated.id,
      groupId: updated.groupId,
      homeTeamId: updated.homeTeamId,
      awayTeamId: updated.awayTeamId,
      homeScore: updated.homeScore,
      awayScore: updated.awayScore,
      status: updated.status,
    });

    // Recalculate group standings if group match
    if (updated.groupId) {
      const stage = updated.stageId
        ? await db.query.tournamentStages.findFirst({
            where: eq(tournamentStages.id, updated.stageId),
          })
        : null;

      const settings = (stage?.settings ?? {}) as Record<string, number>;
      await recalculateGroupStandings(
        updated.groupId,
        settings.pointsWin ?? 3,
        settings.pointsDraw ?? 1,
        settings.pointsLoss ?? 0,
      );

      if (updated.stageId) {
        await maybeAutoAdvanceGroup(updated.groupId, updated.stageId);
      }
    }

    // Progress playoff winner to next round if knockout
    if (updated.roundId) {
      await progressPlayoffWinner(updated);
    }

    return NextResponse.json({ ok: true });
  }

  // ── Score update (default, no status change) ──────────────────────────────
  if (homeScore === undefined && awayScore === undefined) {
    return NextResponse.json(
      { error: "homeScore or awayScore required" },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (homeScore !== undefined) updates.homeScore = homeScore;
  if (awayScore !== undefined) updates.awayScore = awayScore;

  const [updated] = await db
    .update(matches)
    .set(updates)
    .where(eq(matches.id, matchId))
    .returning();

  emitMatchUpdate({
    tournamentId: updated.tournamentId,
    matchId: updated.id,
    groupId: updated.groupId,
    homeTeamId: updated.homeTeamId,
    awayTeamId: updated.awayTeamId,
    homeScore: updated.homeScore,
    awayScore: updated.awayScore,
    status: updated.status,
  });

  return NextResponse.json({ ok: true });
}
