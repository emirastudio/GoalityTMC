import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, clubs, teamQuestions } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { sendQuestionConfirmation, sendNewQuestionNotification } from "@/lib/email";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  const tid = parseInt(teamId);

  const team = await db.query.teams.findFirst({ where: eq(teams.id, tid) });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (team.clubId !== session.clubId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const questions = await db
    .select()
    .from(teamQuestions)
    .where(eq(teamQuestions.teamId, tid))
    .orderBy(desc(teamQuestions.sentAt));

  return NextResponse.json(questions);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  const tid = parseInt(teamId);

  const team = await db.query.teams.findFirst({ where: eq(teams.id, tid) });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (team.clubId !== session.clubId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { subject, body } = await req.json();
  if (!subject || !body) {
    return NextResponse.json({ error: "subject and body are required" }, { status: 400 });
  }

  const [created] = await db
    .insert(teamQuestions)
    .values({
      teamId: tid,
      tournamentId: team.tournamentId,
      subject,
      body,
    })
    .returning();

  // Get club info for email
  const club = team.clubId
    ? await db.query.clubs.findFirst({ where: eq(clubs.id, team.clubId) })
    : null;

  // Send confirmation to club contact
  if (club?.contactEmail) {
    await sendQuestionConfirmation({
      to: club.contactEmail,
      toName: club.contactName ?? team.name ?? club.name,
      subject,
      teamName: team.name ?? club.name,
    }).catch(() => {});
  }

  // Notify admin
  await sendNewQuestionNotification({
    teamName: team.name ?? club?.name ?? `Team #${tid}`,
    subject,
    body,
    questionId: created.id,
  }).catch(() => {});

  return NextResponse.json(created, { status: 201 });
}
