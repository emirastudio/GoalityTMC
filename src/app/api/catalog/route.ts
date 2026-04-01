import { NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, organizations, teams, clubs, tournamentClasses } from "@/db/schema";
import { eq, count, and } from "drizzle-orm";

export async function GET() {
  // Get all tournaments with registration open, grouped by organization
  const allTournaments = await db.query.tournaments.findMany({
    where: eq(tournaments.registrationOpen, true),
    orderBy: (t, { asc }) => [asc(t.startDate)],
  });

  const enriched = await Promise.all(
    allTournaments.map(async (tournament) => {
      // Get organization
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, tournament.organizationId),
      });

      // Count teams and clubs
      const [teamCount] = await db
        .select({ value: count() })
        .from(teams)
        .where(eq(teams.tournamentId, tournament.id));

      const [clubCount] = await db
        .select({ value: count() })
        .from(clubs)
        .where(eq(clubs.tournamentId, tournament.id));

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
