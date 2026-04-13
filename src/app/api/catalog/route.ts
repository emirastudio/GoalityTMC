import { NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, organizations, teams, tournamentClasses, tournamentRegistrations } from "@/db/schema";
import { eq, count, and, sql } from "drizzle-orm";

export async function GET() {
  // Get all tournaments with registration open
  const rawTournaments = await db.query.tournaments.findMany({
    where: eq(tournaments.registrationOpen, true),
    orderBy: (t, { asc }) => [asc(t.startDate)],
  });

  // Filter out free-plan tournaments that need an upgrade.
  // For each org, only the oldest active free tournament is eligible; paid plans always eligible.
  const orgOldestFreeId: Record<number, number> = {};
  for (const t of rawTournaments) {
    if ((t.plan as string) !== "free") continue;
    const existing = orgOldestFreeId[t.organizationId];
    if (existing === undefined) {
      orgOldestFreeId[t.organizationId] = t.id;
    } else {
      const existingT = rawTournaments.find(x => x.id === existing)!;
      if (new Date(t.createdAt).getTime() < new Date(existingT.createdAt).getTime()) {
        orgOldestFreeId[t.organizationId] = t.id;
      }
    }
  }
  const allTournaments = rawTournaments.filter(t => {
    if ((t.plan as string) !== "free") return true;
    return t.id === orgOldestFreeId[t.organizationId];
  });

  const enriched = await Promise.all(
    allTournaments.map(async (tournament) => {
      // Get organization
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, tournament.organizationId),
      });

      // Count teams and clubs via tournamentRegistrations
      const [teamCount] = await db
        .select({ value: count() })
        .from(tournamentRegistrations)
        .where(eq(tournamentRegistrations.tournamentId, tournament.id));

      const [clubCount] = await db
        .select({ value: sql<number>`COUNT(DISTINCT ${teams.clubId})` })
        .from(tournamentRegistrations)
        .innerJoin(teams, eq(tournamentRegistrations.teamId, teams.id))
        .where(eq(tournamentRegistrations.tournamentId, tournament.id));

      // Get classes
      const classes = await db.query.tournamentClasses.findMany({
        where: eq(tournamentClasses.tournamentId, tournament.id),
        orderBy: (c, { asc }) => [asc(c.minBirthYear)],
      });

      return {
        id: tournament.id,
        name: tournament.name,
        slug: tournament.slug,
        year: tournament.year,
        description: tournament.description,
        logoUrl: tournament.logoUrl,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        currency: tournament.currency,
        registrationDeadline: tournament.registrationDeadline,
        organization: org
          ? {
              name: org.name,
              slug: org.slug,
              country: org.country,
              city: org.city,
              logo: org.logo,
            }
          : null,
        teamsCount: Number(teamCount?.value ?? 0),
        clubsCount: Number(clubCount?.value ?? 0),
        classes: classes.map((c) => ({
          name: c.name,
          format: c.format,
          minBirthYear: c.minBirthYear,
          maxBirthYear: c.maxBirthYear,
        })),
      };
    })
  );

  return NextResponse.json(enriched);
}
