import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubs, teams } from "@/db/schema";
import { sql, eq, or, ilike } from "drizzle-orm";

/**
 * Search clubs for the public registration page.
 *
 * Query is split into whitespace-separated tokens. A club matches if AT LEAST
 * ONE token appears (case-insensitive substring) in name OR city OR country.
 * Results are ordered by how many tokens matched (most matches first), then
 * alphabetically. This gives forgiving matching: a typo in one word
 * ("FCI Levd") still surfaces the club because the other word ("FCI") matches.
 *
 * Examples:
 *   "FCI Levadia"   → matches "FCI Levadia" (both words hit), top result.
 *   "FCI Levd"      → "FCI" matches, "Levd" doesn't → still surfaced.
 *   "Tallinn"       → matches all clubs in Tallinn by city.
 *   "Estonia kalev" → matches Estonian clubs with 'kalev' in name.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const tokens = q.split(/\s+/).filter(t => t.length >= 2).slice(0, 6);
  if (tokens.length === 0) return NextResponse.json([]);

  // OR across (name | city | country) for each token, joined by OR overall.
  const tokenConditions = tokens.map(tok =>
    or(
      ilike(clubs.name, `%${tok}%`),
      ilike(clubs.city, `%${tok}%`),
      ilike(clubs.country, `%${tok}%`),
    )
  );

  // Relevance score: how many tokens matched (any of name/city/country).
  // Each matched token adds 1 point; full-string match on name adds bonus 10.
  const tokenScores = tokens.map(tok => sql`(CASE WHEN
    ${clubs.name} ILIKE ${`%${tok}%`}
    OR ${clubs.city} ILIKE ${`%${tok}%`}
    OR ${clubs.country} ILIKE ${`%${tok}%`}
  THEN 1 ELSE 0 END)`);
  const relevanceExpr = sql.join(
    [
      sql`(CASE WHEN ${clubs.name} ILIKE ${`%${q}%`} THEN 10 ELSE 0 END)`,
      ...tokenScores,
    ],
    sql` + `,
  );

  const results = await db
    .select({
      id: clubs.id,
      name: clubs.name,
      country: clubs.country,
      city: clubs.city,
      badgeUrl: clubs.badgeUrl,
      isVerified: clubs.isVerified,
      teamCount: sql<number>`count(${teams.id})::int`,
      score: sql<number>`(${relevanceExpr})::int`,
    })
    .from(clubs)
    .leftJoin(teams, eq(teams.clubId, clubs.id))
    .where(or(...tokenConditions.filter(Boolean).map(c => c!)))
    .groupBy(clubs.id)
    .orderBy(sql`score DESC`, clubs.name)
    .limit(8);

  // Don't return the score field — internal ranking only.
  return NextResponse.json(results.map(({ score: _score, ...rest }) => rest));
}
