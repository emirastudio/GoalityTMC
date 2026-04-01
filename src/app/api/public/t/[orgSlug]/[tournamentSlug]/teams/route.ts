import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, tournaments, tournamentClasses, clubs, teams } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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

  const allClubs = await db.query.clubs.findMany({
    where: eq(clubs.tournamentId, tournament.id),
    orderBy: (c, { asc }) => [asc(c.name)],
  });

  const allTeams = await db.query.teams.findMany({
    where: and(
      eq(teams.tournamentId, tournament.id),
    ),
    orderBy: (t, { asc }) => [asc(t.regNumber)],
  });

  // Group by class
  const grouped = classes.map((cls) => {
    const classTeams = allTeams
      .filter((t) => t.classId === cls.id)
      .map((team) => {
        const club = allClubs.find((c) => c.id === team.clubId);
        return {
          id: team.id,
          regNumber: team.regNumber,
          name: team.name,
          status: team.status,
          club: club
            ? { name: club.name, badgeUrl: club.badgeUrl, city: club.city, country: club.country }
            : null,
        };
      });

    return {
      id: cls.id,
      name: cls.name,
      format: cls.format,
      teams: classTeams,
    };
  });

  // Teams without a class
  const unclassified = allTeams
    .filter((t) => !t.classId)
    .map((team) => {
      const club = allClubs.find((c) => c.id === team.clubId);
      return {
        id: team.id,
        regNumber: team.regNumber,
        name: team.name,
        status: team.status,
        club: club
          ? { name: club.name, badgeUrl: club.badgeUrl, city: club.city, country: club.country }
          : null,
      };
    });

  return NextResponse.json({ grouped, unclassified });
}
