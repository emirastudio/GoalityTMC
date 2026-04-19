import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, tournaments, tournamentClasses, clubs, teams, tournamentRegistrations } from "@/db/schema";
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

  // Load registrations for this tournament (with team and club data via joins)
  const regsWhere = classIdParam
    ? and(
        eq(tournamentRegistrations.tournamentId, tournament.id),
        eq(tournamentRegistrations.classId, parseInt(classIdParam))
      )
    : eq(tournamentRegistrations.tournamentId, tournament.id);

  const allRegs = await db.query.tournamentRegistrations.findMany({
    where: regsWhere,
    orderBy: (r, { asc }) => [asc(r.regNumber)],
    with: {
      team: true,
    },
  });

  // Collect unique clubIds and load clubs
  const clubIds = [...new Set(allRegs.map((r) => r.team?.clubId).filter(Boolean) as number[])];
  const allClubs = clubIds.length > 0
    ? await db.query.clubs.findMany({
        where: (c, { inArray }) => inArray(c.id, clubIds),
        orderBy: (c, { asc }) => [asc(c.name)],
      })
    : [];

  // If filtering by specific class, return flat list directly
  if (classIdParam) {
    const flat = allRegs.map((reg) => {
      const club = allClubs.find((c) => c.id === reg.team?.clubId);
      return {
        id: reg.team?.id ?? reg.teamId,
        regNumber: reg.regNumber,
        name: reg.team?.name ?? reg.displayName ?? "",
        status: reg.status,
        classId: reg.classId,
        club: club
          ? { name: club.name, badgeUrl: club.badgeUrl, city: club.city, country: club.country }
          : null,
      };
    });
    return NextResponse.json({ grouped: [], unclassified: flat });
  }

  // Group by class
  const grouped = classes.map((cls) => {
    const classTeams = allRegs
      .filter((r) => r.classId === cls.id)
      .map((reg) => {
        const club = allClubs.find((c) => c.id === reg.team?.clubId);
        return {
          id: reg.team?.id ?? reg.teamId,
          regNumber: reg.regNumber,
          name: reg.team?.name ?? reg.displayName ?? "",
          status: reg.status,
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

  // Registrations without a class
  const unclassified = allRegs
    .filter((r) => !r.classId)
    .map((reg) => {
      const club = allClubs.find((c) => c.id === reg.team?.clubId);
      return {
        id: reg.team?.id ?? reg.teamId,
        regNumber: reg.regNumber,
        name: reg.team?.name ?? reg.displayName ?? "",
        status: reg.status,
        club: club
          ? { name: club.name, badgeUrl: club.badgeUrl, city: club.city, country: club.country }
          : null,
      };
    });

  return NextResponse.json({ grouped, unclassified });
}
