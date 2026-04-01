import { NextResponse } from "next/server";
import { db } from "@/db";
import { clubs, teams, clubUsers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { sendDeletionRequest } from "@/lib/email";

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await db.query.clubs.findFirst({
    where: eq(clubs.id, session.clubId),
  });

  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  const clubTeams = await db
    .select({ name: teams.name })
    .from(teams)
    .where(eq(teams.clubId, session.clubId));

  const user = await db.query.clubUsers.findFirst({
    where: eq(clubUsers.id, session.userId),
  });

  await sendDeletionRequest({
    clubName: club.name,
    contactName: club.contactName ?? user?.name ?? "Unknown",
    contactEmail: club.contactEmail ?? user?.email ?? "Unknown",
    teamNames: clubTeams.map((t) => t.name ?? "Unnamed team"),
  });

  return NextResponse.json({ ok: true });
}
