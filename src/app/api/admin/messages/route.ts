import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  tournaments,
  teams,
  clubs,
  inboxMessages,
  teamMessageReads,
  messageRecipients,
  teamQuestions,
  tournamentRegistrations,
} from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq, sql, desc, inArray, count } from "drizzle-orm";
import { sendMessageNotification } from "@/lib/email";

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

  // Count total teams for this tournament (via registrations)
  const [totalTeamsRow] = await db
    .select({ value: sql<number>`COUNT(*)` })
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.tournamentId, tournament.id));
  const totalTeams = Number(totalTeamsRow.value);

  // Get unread questions count
  const [unreadQuestionsRow] = await db
    .select({ value: count() })
    .from(teamQuestions)
    .where(eq(teamQuestions.tournamentId, tournament.id));
  const questionsCount = Number(unreadQuestionsRow.value);

  // Get messages with read counts
  const messages = await db
    .select({
      id: inboxMessages.id,
      subject: inboxMessages.subject,
      body: inboxMessages.body,
      sentAt: inboxMessages.sentAt,
      sentBy: inboxMessages.sentBy,
      sendToAll: inboxMessages.sendToAll,
      readCount: sql<number>`(
        SELECT COUNT(DISTINCT ${teamMessageReads.registrationId})
        FROM ${teamMessageReads}
        WHERE ${teamMessageReads.messageId} = ${inboxMessages.id}
      )`.as("read_count"),
    })
    .from(inboxMessages)
    .where(eq(inboxMessages.tournamentId, tournament.id))
    .orderBy(desc(inboxMessages.sentAt));

  // For non-sendToAll messages, get recipient team names
  const messagesWithRecipients = await Promise.all(
    messages.map(async (msg) => {
      if (msg.sendToAll) {
        return { ...msg, readCount: Number(msg.readCount), recipientTeams: null };
      }
      const recipients = await db
        .select({ registrationId: messageRecipients.registrationId, teamId: tournamentRegistrations.teamId, teamName: teams.name })
        .from(messageRecipients)
        .leftJoin(tournamentRegistrations, eq(tournamentRegistrations.id, messageRecipients.registrationId))
        .leftJoin(teams, eq(teams.id, tournamentRegistrations.teamId))
        .where(eq(messageRecipients.messageId, msg.id));
      return {
        ...msg,
        readCount: Number(msg.readCount),
        recipientTeams: recipients.map((r) => ({ id: r.teamId, name: r.teamName ?? "" })),
      };
    })
  );

  // Get all teams for the compose form (via registrations)
  const allTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      classId: tournamentRegistrations.classId,
    })
    .from(tournamentRegistrations)
    .innerJoin(teams, eq(tournamentRegistrations.teamId, teams.id))
    .where(eq(tournamentRegistrations.tournamentId, tournament.id))
    .orderBy(teams.name);

  return NextResponse.json({
    totalTeams,
    questionsCount,
    messages: messagesWithRecipients,
    allTeams,
  });
}

export async function POST(req: NextRequest) {
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

  const { subject, body, sendToAll: sendAll, teamIds } = await req.json();

  if (!subject || !body) {
    return NextResponse.json({ error: "subject and body are required" }, { status: 400 });
  }

  const isSendToAll = sendAll !== false;

  const [created] = await db
    .insert(inboxMessages)
    .values({
      tournamentId: tournament.id,
      subject,
      body,
      sentBy: session.userId,
      sendToAll: isSendToAll,
    })
    .returning();

  // If targeting specific teams, create recipient records (teamIds → registrationIds)
  if (!isSendToAll && Array.isArray(teamIds) && teamIds.length > 0) {
    const regsForTeams = await db
      .select({ id: tournamentRegistrations.id, teamId: tournamentRegistrations.teamId })
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.tournamentId, tournament.id));
    const teamToRegMap = new Map(regsForTeams.map((r) => [r.teamId, r.id]));
    const recipientValues = (teamIds as number[])
      .map((tid) => ({ messageId: created.id, registrationId: teamToRegMap.get(tid) }))
      .filter((v): v is { messageId: number; registrationId: number } => v.registrationId !== undefined);
    if (recipientValues.length > 0) {
      await db.insert(messageRecipients).values(recipientValues);
    }
  }

  // Send email notifications — fetch teams with their club's contact email
  const targetTeamIds = isSendToAll
    ? (
        await db
          .select({ id: tournamentRegistrations.teamId })
          .from(tournamentRegistrations)
          .where(eq(tournamentRegistrations.tournamentId, tournament.id))
      ).map((t) => t.id)
    : (Array.isArray(teamIds) ? teamIds : []);

  if (targetTeamIds.length > 0) {
    const teamsWithClubs = await db
      .select({
        teamId: teams.id,
        teamName: teams.name,
        contactEmail: clubs.contactEmail,
        contactName: clubs.contactName,
        clubName: clubs.name,
      })
      .from(teams)
      .leftJoin(clubs, eq(clubs.id, teams.clubId))
      .where(inArray(teams.id, targetTeamIds));

    for (const t of teamsWithClubs) {
      if (t.contactEmail) {
        await sendMessageNotification({
          to: t.contactEmail,
          toName: t.contactName ?? t.teamName ?? t.clubName ?? "Team",
          subject,
          body,
          teamName: t.teamName ?? t.clubName ?? "Team",
        }).catch(() => {});
      }
    }
  }

  return NextResponse.json(created, { status: 201 });
}
