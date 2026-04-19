import { NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, organizations, teams, tournamentClasses, tournamentRegistrations } from "@/db/schema";
import { eq, count, and, sql } from "drizzle-orm";

export async function GET() {
  // Catalog is open to ALL tournaments with registration open, regardless of plan.
  // Free tournaments get the same exposure as paid ones — this is a deliberate
  // product decision (free is a growth channel, not a gated feature).
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
