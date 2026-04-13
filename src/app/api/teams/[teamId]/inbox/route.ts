import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inboxMessages, teamMessageReads, messageRecipients, teams, tournamentRegistrations } from "@/db/schema";
import { eq, and, desc, or, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

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

  // Load registration
  const registration = await db.query.tournamentRegistrations.findFirst({
    where: session.tournamentId
      ? and(eq(tournamentRegistrations.teamId, tid), eq(tournamentRegistrations.tournamentId, session.tournamentId))
      : eq(tournamentRegistrations.teamId, tid),
    orderBy: (r, { desc }) => [desc(r.id)],
  });
  if (!registration) {
    return NextResponse.json({ error: "No registration found" }, { status: 404 });
  }

  // Get all messages for this tournament that are either sendToAll or have this registration as recipient
  const messages = await db
    .select({
      id: inboxMessages.id,
      subject: inboxMessages.subject,
      body: inboxMessages.body,
      sentAt: inboxMessages.sentAt,
      sendToAll: inboxMessages.sendToAll,
    })
    .from(inboxMessages)
    .where(
      and(
        eq(inboxMessages.tournamentId, registration.tournamentId),
        or(
          eq(inboxMessages.sendToAll, true),
          sql`EXISTS (
            SELECT 1 FROM ${messageRecipients}
            WHERE ${messageRecipients.messageId} = ${inboxMessages.id}
            AND ${messageRecipients.registrationId} = ${registration.id}
          )`
        )
      )
    )
    .orderBy(desc(inboxMessages.sentAt));

  // Get read status for this registration
  const reads = await db.query.teamMessageReads.findMany({
    where: eq(teamMessageReads.registrationId, registration.id),
  });
  const readMap = new Set(reads.map((r) => r.messageId));

  const result = messages.map((msg) => ({
    id: msg.id,
    subject: msg.subject,
    body: msg.body,
    sentAt: msg.sentAt?.toISOString() ?? null,
    isRead: readMap.has(msg.id),
  }));

  return NextResponse.json(result);
}

// Mark message as read
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
  if (!team || team.clubId !== session.clubId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Load registration
  const registration = await db.query.tournamentRegistrations.findFirst({
    where: session.tournamentId
      ? and(eq(tournamentRegistrations.teamId, tid), eq(tournamentRegistrations.tournamentId, session.tournamentId))
      : eq(tournamentRegistrations.teamId, tid),
    orderBy: (r, { desc }) => [desc(r.id)],
  });
  if (!registration) {
    return NextResponse.json({ error: "No registration found" }, { status: 404 });
  }

  const { messageId } = await req.json();

  await db
    .insert(teamMessageReads)
    .values({
      messageId,
      registrationId: registration.id,
    })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true });
}
