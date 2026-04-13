import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubs, inboxMessages, teams, tournamentRegistrations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { clubId, requesterName, requesterEmail, role } = await req.json();

    if (!clubId || !requesterEmail || !requesterName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const club = await db.query.clubs.findFirst({ where: eq(clubs.id, clubId) });
    if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

    // Find latest tournament for this club via registrations
    const latestReg = await db
      .select({ tournamentId: tournamentRegistrations.tournamentId })
      .from(tournamentRegistrations)
      .innerJoin(teams, eq(teams.id, tournamentRegistrations.teamId))
      .where(eq(teams.clubId, club.id))
      .orderBy(desc(tournamentRegistrations.id))
      .limit(1);
    const tournamentId = latestReg[0]?.tournamentId ?? null;

    /* Create inbox message to tournament (visible to org admin in messages) */
    await db.insert(inboxMessages).values({
      tournamentId,
      subject: `Запрос на вступление в клуб "${club.name}"`,
      body: `${requesterName} (${requesterEmail}) хочет вступить в клуб "${club.name}" в роли: ${role}.\n\nПожалуйста, свяжитесь с заявителем для подтверждения доступа.`,
      sentAt: new Date(),
      sentBy: 0, // system message
      sendToAll: false,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Join request error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
