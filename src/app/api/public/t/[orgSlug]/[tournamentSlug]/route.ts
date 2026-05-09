import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, tournaments, tournamentClasses, teams, tournamentRegistrations } from "@/db/schema";
import { eq, and, count, sql } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentSlug: string }> }
) {
  const { orgSlug, tournamentSlug } = await params;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tournament = await db.query.tournaments.findFirst({
    where: and(
      eq(tournaments.organizationId, org.id),
      eq(tournaments.slug, tournamentSlug)
    ),
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const classes = await db.query.tournamentClasses.findMany({
    where: eq(tournamentClasses.tournamentId, tournament.id),
    orderBy: (c, { asc }) => [asc(c.minBirthYear)],
  });

  // Count only CONFIRMED registrations — same rule as the public
  // teams list. Pending/rejected/cancelled rows stay invisible.
  const confirmedFilter = and(
    eq(tournamentRegistrations.tournamentId, tournament.id),
    eq(tournamentRegistrations.status, "confirmed"),
  );
  const [clubCount] = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${teams.clubId})` })
    .from(tournamentRegistrations)
    .innerJoin(teams, eq(tournamentRegistrations.teamId, teams.id))
    .where(confirmedFilter);

  const [teamCount] = await db
    .select({ count: count() })
    .from(tournamentRegistrations)
    .where(confirmedFilter);

  // Per-class team counts (also confirmed-only)
  const classesWithCounts = await Promise.all(
    classes.map(async (cls) => {
      const [tc] = await db
        .select({ count: count() })
        .from(tournamentRegistrations)
        .where(and(
          eq(tournamentRegistrations.tournamentId, tournament.id),
          eq(tournamentRegistrations.classId, cls.id),
          eq(tournamentRegistrations.status, "confirmed"),
        ));
      return {
        id: cls.id,
        name: cls.name,
        format: cls.format,
        minBirthYear: cls.minBirthYear,
        maxBirthYear: cls.maxBirthYear,
        maxPlayers: cls.maxPlayers,
        teamCount: Number(tc?.count ?? 0),
      };
    })
  );

  const days =
    tournament.startDate && tournament.endDate
      ? Math.ceil(
          (new Date(tournament.endDate).getTime() - new Date(tournament.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      : null;

  return NextResponse.json({
    org: {
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      brandColor: org.brandColor ?? "#272D2D",
      city: org.city,
      country: org.country,
      contactEmail: org.contactEmail,
      website: org.website,
    },
    tournament: {
      id: tournament.id,
      name: tournament.name,
      slug: tournament.slug,
      year: tournament.year,
      description: tournament.description,
      logoUrl: tournament.logoUrl,
      registrationOpen: tournament.registrationOpen,
      registrationDeadline: tournament.registrationDeadline,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      currency: tournament.currency,
    },
    classes: classesWithCounts,
    stats: {
      clubCount: Number(clubCount?.count ?? 0),
      teamCount: Number(teamCount?.count ?? 0),
      classCount: classes.length,
      days,
    },
  });
}
