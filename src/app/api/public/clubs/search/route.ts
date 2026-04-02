import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubs, teams } from "@/db/schema";
import { ilike, sql, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const results = await db
    .select({
      id: clubs.id,
      name: clubs.name,
      country: clubs.country,
      city: clubs.city,
      badgeUrl: clubs.badgeUrl,
      tournamentId: clubs.tournamentId,
      teamCount: sql<number>`count(${teams.id})::int`,
    })
    .from(clubs)
    .leftJoin(teams, eq(teams.clubId, clubs.id))
    .where(ilike(clubs.name, `%${q}%`))
    .groupBy(clubs.id)
    .orderBy(clubs.name)
    .limit(8);

  return NextResponse.json(results);
}
