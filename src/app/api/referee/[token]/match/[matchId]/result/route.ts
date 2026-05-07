import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentReferees, matchReferees, matches } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

type Params = { token: string; matchId: string };

/**
 * PATCH /api/referee/[token]/match/[matchId]/result
 * Public — no traditional auth. Authenticated by access token.
 * Referee must be assigned to the match.
 * Body: { homeScore: number, awayScore: number }
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
  const { homeScore, awayScore } = body as {
    homeScore?: number;
    awayScore?: number;
  };

  if (homeScore === undefined && awayScore === undefined) {
    return NextResponse.json(
      { error: "homeScore or awayScore required" },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (homeScore !== undefined) updates.homeScore = homeScore;
  if (awayScore !== undefined) updates.awayScore = awayScore;

  await db.update(matches).set(updates).where(eq(matches.id, matchId));

  return NextResponse.json({ ok: true });
}
