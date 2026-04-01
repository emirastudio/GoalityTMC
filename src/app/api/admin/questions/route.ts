import { NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, teams, clubs, teamQuestions } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.registrationOpen, true),
  });
  if (!tournament) {
    return NextResponse.json({ error: "No active tournament" }, { status: 404 });
  }

  const questions = await db
    .select({
      id: teamQuestions.id,
      teamId: teamQuestions.teamId,
      subject: teamQuestions.subject,
      body: teamQuestions.body,
      sentAt: teamQuestions.sentAt,
      replyBody: teamQuestions.replyBody,
      repliedAt: teamQuestions.repliedAt,
      isRead: teamQuestions.isRead,
      teamName: teams.name,
      clubName: clubs.name,
    })
    .from(teamQuestions)
    .leftJoin(teams, eq(teams.id, teamQuestions.teamId))
    .leftJoin(clubs, eq(clubs.id, teams.clubId))
    .where(eq(teamQuestions.tournamentId, tournament.id))
    .orderBy(desc(teamQuestions.sentAt));

  return NextResponse.json(questions);
}
