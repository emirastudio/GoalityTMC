import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, tournaments, tournamentClasses, clubs, teams } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentSlug: string }> }
) {
  const { orgSlug, tournamentSlug } = await params;
  const { searchParams } = new URL(req.url);
  const classIdParam = searchParams.get("classId");

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

  const teamsWhere = classIdParam
    ? and(eq(teams.tournamentId, tournament.id), eq(teams.classId, parseInt(classIdParam)))
    : eq(teams.tournamentId, tournament.id);

  const allTeams = await db.query.teams.findMany({
    where: teamsWhere,
    orderBy: (t, { asc }) => [asc(t.regNumber)],
  });

  // If filtering by specific class, return flat list directly
  if (classIdParam) {
    const flat = allTeams.map((team) => {
      const club = allClubs.find((c) => c.id === team.clubId);
      return {
        id: team.id,
        regNumber: team.regNumber,
        name: team.name,
        status: team.status,
        classId: team.classId,
        club: club
          ? { name: club.name, badgeUrl: club.badgeUrl, city: club.city, country: club.country }
          : null,
      };
    });
    return NextResponse.json({ grouped: [], unclassified: flat });
  }

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
