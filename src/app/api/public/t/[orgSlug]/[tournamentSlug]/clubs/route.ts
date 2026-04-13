import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, tournaments, clubs, teams, tournamentRegistrations } from "@/db/schema";
import { eq, and, ilike, or, count, inArray } from "drizzle-orm";

type Params = { params: Promise<{ orgSlug: string; tournamentSlug: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { orgSlug, tournamentSlug } = await params;
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) return NextResponse.json([]);

  try {
    const org = await db.query.organizations.findFirst({ where: eq(organizations.slug, orgSlug) });
    if (!org) return NextResponse.json([]);

    const tournament = await db.query.tournaments.findFirst({
      where: and(eq(tournaments.organizationId, org.id), eq(tournaments.slug, tournamentSlug)),
    });
    if (!tournament) return NextResponse.json([]);

    // Находим клубы, у которых есть регистрация в этом турнире
    // Шаг 1: команды с регистрацией в турнире
    const regs = await db
      .select({ teamId: tournamentRegistrations.teamId })
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.tournamentId, tournament.id));

    if (regs.length === 0) return NextResponse.json([]);

    const teamIds = regs.map((r) => r.teamId);

    // Шаг 2: clubId из этих команд
    const teamsInTournament = await db
      .select({ clubId: teams.clubId })
      .from(teams)
      .where(inArray(teams.id, teamIds));

    const clubIds = [...new Set(teamsInTournament.map((t) => t.clubId))];
    if (clubIds.length === 0) return NextResponse.json([]);

    // Шаг 3: поиск клубов по query
    const results = await db.query.clubs.findMany({
      where: and(
        inArray(clubs.id, clubIds),
        or(
          ilike(clubs.name, `%${q}%`),
          ilike(clubs.contactEmail, `%${q}%`),
          ilike(clubs.city, `%${q}%`),
        ),
      ),
      limit: 8,
    });

    // Шаг 4: обогащаем количеством команд в этом турнире
    const enriched = await Promise.all(results.map(async (club) => {
      const clubTeams = await db.select({ id: teams.id }).from(teams)
        .where(eq(teams.clubId, club.id));
      const clubTeamIds = clubTeams.map((t) => t.id);

      let teamCount = 0;
      if (clubTeamIds.length > 0) {
        const [tc] = await db.select({ count: count() }).from(tournamentRegistrations)
          .where(and(
            eq(tournamentRegistrations.tournamentId, tournament.id),
            inArray(tournamentRegistrations.teamId, clubTeamIds)
          ));
        teamCount = Number(tc?.count ?? 0);
      }

      return {
        id: club.id,
        name: club.name,
        city: club.city,
        country: club.country,
        badgeUrl: club.badgeUrl,
        contactName: club.contactName,
        isVerified: club.isVerified,
        teamCount,
      };
    }));

    return NextResponse.json(enriched);
  } catch (e) {
    console.error("Club search error:", e);
    return NextResponse.json([]);
  }
}
