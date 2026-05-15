import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubs, teams, tournamentRegistrations, tournaments, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const club = await db.query.clubs.findFirst({ where: eq(clubs.slug, slug) });
  if (!club) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // All confirmed teams of this club with their tournaments
  const clubTeams = await db.query.teams.findMany({
    where: eq(teams.clubId, club.id),
  });

  const teamIds = clubTeams.map(t => t.id);

  // Get confirmed registrations with tournament info
  const registrations = teamIds.length > 0
    ? await db
        .select({
          teamId: tournamentRegistrations.teamId,
          teamName: teams.name,
          tournamentId: tournaments.id,
          tournamentName: tournaments.name,
          tournamentSlug: tournaments.slug,
          tournamentYear: tournaments.year,
          orgSlug: organizations.slug,
          status: tournamentRegistrations.status,
        })
        .from(tournamentRegistrations)
        .innerJoin(teams, eq(tournamentRegistrations.teamId, teams.id))
        .innerJoin(tournaments, eq(tournamentRegistrations.tournamentId, tournaments.id))
        .innerJoin(organizations, eq(tournaments.organizationId, organizations.id))
        .where(
          and(
            eq(tournamentRegistrations.status, "confirmed"),
          )
        )
        .then(rows => rows.filter(r => teamIds.includes(r.teamId)))
    : [];

  return NextResponse.json({
    id: club.id,
    name: club.name,
    slug: club.slug,
    city: club.city,
    country: club.country,
    badgeUrl: club.badgeUrl,
    website: club.website,
    instagram: club.instagram,
    facebook: club.facebook,
    isVerified: club.isVerified,
    registrations,
  });
}
