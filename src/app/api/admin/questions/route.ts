import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, teams, clubs, teamQuestions, tournamentRegistrations } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const urlTournamentId = req.nextUrl.searchParams.get("tournamentId");
  let tournament;
  if (urlTournamentId) {
    tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, parseInt(urlTournamentId)),
    });
  } else {
    tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.registrationOpen, true),
    });
  }
  if (!tournament) {
    return NextResponse.json({ error: "No active tournament" }, { status: 404 });
  }

  const questions = await db
    .select({
      id: teamQuestions.id,
      registrationId: teamQuestions.registrationId,
      subject: teamQuestions.subject,
      body: teamQuestions.body,
      sentAt: teamQuestions.sentAt,
      replyBody: teamQuestions.replyBody,
      repliedAt: teamQuestions.repliedAt,
      isRead: teamQuestions.isRead,
      teamId: tournamentRegistrations.teamId,
      teamName: teams.name,
      clubName: clubs.name,
    })
    .from(teamQuestions)
    .leftJoin(tournamentRegistrations, eq(tournamentRegistrations.id, teamQuestions.registrationId))
    .leftJoin(teams, eq(teams.id, tournamentRegistrations.teamId))
    .leftJoin(clubs, eq(clubs.id, teams.clubId))
    .where(eq(teamQuestions.tournamentId, tournament.id))
    .orderBy(desc(teamQuestions.sentAt));

  return NextResponse.json(questions);
}
