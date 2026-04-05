import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, tournaments, clubs, teams } from "@/db/schema";
import { eq, and, ilike, or, count } from "drizzle-orm";

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

    /* Search clubs by name or contact email in THIS tournament */
    const results = await db.query.clubs.findMany({
      where: and(
        eq(clubs.tournamentId, tournament.id),
        or(
          ilike(clubs.name, `%${q}%`),
          ilike(clubs.contactEmail, `%${q}%`),
          ilike(clubs.city, `%${q}%`),
        ),
      ),
      limit: 8,
    });

    /* Enrich with team count */
    const enriched = await Promise.all(results.map(async (club) => {
      const [tc] = await db.select({ count: count() }).from(teams)
        .where(and(eq(teams.tournamentId, tournament.id), eq(teams.clubId, club.id)));
      return {
        id: club.id,
        name: club.name,
        city: club.city,
        country: club.country,
        badgeUrl: club.badgeUrl,
        contactName: club.contactName,
        teamCount: Number(tc?.count ?? 0),
      };
    }));

    return NextResponse.json(enriched);
  } catch (e) {
    console.error("Club search error:", e);
    return NextResponse.json([]);
  }
}
