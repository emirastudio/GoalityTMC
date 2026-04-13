import { NextResponse } from "next/server";
import { db } from "@/db";
import { clubs, clubUsers, teams, tournamentRegistrations } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq, sql, desc, count } from "drizzle-orm";

export async function GET() {
  const session = await requireAdmin();
  if (isError(session)) return session;
  if (!session.isSuper) {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }

  // All clubs with team count and registration count
  const rows = await db
    .select({
      id: clubs.id,
      name: clubs.name,
      country: clubs.country,
      city: clubs.city,
      contactName: clubs.contactName,
      contactEmail: clubs.contactEmail,
      contactPhone: clubs.contactPhone,
      isVerified: clubs.isVerified,
      onboardingComplete: clubs.onboardingComplete,
      createdAt: clubs.createdAt,
      teamCount: sql<number>`COUNT(DISTINCT ${teams.id})`,
      regCount: sql<number>`COUNT(DISTINCT ${tournamentRegistrations.id})`,
    })
    .from(clubs)
    .leftJoin(teams, eq(teams.clubId, clubs.id))
    .leftJoin(tournamentRegistrations, eq(tournamentRegistrations.teamId, teams.id))
    .groupBy(
      clubs.id, clubs.name, clubs.country, clubs.city,
      clubs.contactName, clubs.contactEmail, clubs.contactPhone,
      clubs.isVerified, clubs.onboardingComplete, clubs.createdAt,
    )
    .orderBy(desc(clubs.createdAt));

  // Fetch club users (emails) grouped by clubId
  const users = await db
    .select({ clubId: clubUsers.clubId, email: clubUsers.email, name: clubUsers.name, accessLevel: clubUsers.accessLevel })
    .from(clubUsers);

  const usersByClub: Record<number, typeof users> = {};
  for (const u of users) {
    if (!usersByClub[u.clubId]) usersByClub[u.clubId] = [];
    usersByClub[u.clubId].push(u);
  }

  const result = rows.map((c) => ({
    ...c,
    teamCount: Number(c.teamCount),
    regCount: Number(c.regCount),
    users: usersByClub[c.id] ?? [],
  }));

  return NextResponse.json({ clubs: result });
}
