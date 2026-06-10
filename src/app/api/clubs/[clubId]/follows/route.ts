import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  tournamentFollowers,
  tournamentNews,
  tournamentNewsReads,
  tournaments,
  organizations,
} from "@/db/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET /api/clubs/[clubId]/follows
//
// List of all tournaments the club follows, with unread-news count
// (published posts the club hasn't opened yet). Powers the
// /club/subscriptions page.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId } = await params;
  const cId = parseInt(clubId);
  if (Number.isNaN(cId)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (cId !== session.clubId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Pull follows + tournament + org metadata in one shot.
  const rows = await db
    .select({
      followId: tournamentFollowers.id,
      followedAt: tournamentFollowers.createdAt,
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      tournamentSlug: tournaments.slug,
      tournamentYear: tournaments.year,
      tournamentLogoUrl: tournaments.logoUrl,
      tournamentCardImageUrl: tournaments.cardImageUrl,
      tournamentCoverUrl: tournaments.coverUrl,
      tournamentStartDate: tournaments.startDate,
      tournamentEndDate: tournaments.endDate,
      tournamentCity: tournaments.city,
      tournamentCountry: tournaments.country,
      orgSlug: organizations.slug,
      orgName: organizations.name,
    })
    .from(tournamentFollowers)
    .innerJoin(tournaments, eq(tournamentFollowers.tournamentId, tournaments.id))
    .innerJoin(organizations, eq(tournaments.organizationId, organizations.id))
    .where(eq(tournamentFollowers.clubId, cId))
    .orderBy(desc(tournamentFollowers.createdAt));

  // For each follow, compute unread published posts: count(news) − count(reads).
  // Subqueries per-row is fine for V1 follow counts (~tens). At larger
  // scale we'd join with aggregates.
  const result = await Promise.all(
    rows.map(async (r) => {
      const [{ unread }] = await db
        .select({
          unread: sql<number>`
            COUNT(*)::int FILTER (
              WHERE NOT EXISTS (
                SELECT 1 FROM ${tournamentNewsReads}
                WHERE ${tournamentNewsReads.newsId} = ${tournamentNews.id}
                  AND ${tournamentNewsReads.clubId} = ${cId}
              )
            )
          `,
        })
        .from(tournamentNews)
        .where(
          and(
            eq(tournamentNews.tournamentId, r.tournamentId),
            eq(tournamentNews.status, "published"),
          ),
        );

      const [{ total }] = await db
        .select({ total: count() })
        .from(tournamentNews)
        .where(
          and(
            eq(tournamentNews.tournamentId, r.tournamentId),
            eq(tournamentNews.status, "published"),
          ),
        );

      return {
        ...r,
        unreadCount: Number(unread ?? 0),
        publishedCount: Number(total ?? 0),
      };
    }),
  );

  return NextResponse.json({ follows: result });
}
