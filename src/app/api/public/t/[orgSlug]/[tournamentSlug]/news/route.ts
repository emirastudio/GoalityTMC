import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, tournaments, tournamentNews } from "@/db/schema";
import { eq, and, desc, lt } from "drizzle-orm";

// GET /api/public/t/[orgSlug]/[tournamentSlug]/news?cursor=<id>&limit=20
//
// Public list of published news posts for a tournament. Cursor-paginated
// by post id (newest first). Cover, body, CTA returned so /news/page.tsx
// can render full feed without N+1 fetches.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentSlug: string }> },
) {
  const { orgSlug, tournamentSlug } = await params;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tournament = await db.query.tournaments.findFirst({
    where: and(
      eq(tournaments.organizationId, org.id),
      eq(tournaments.slug, tournamentSlug),
    ),
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "20");
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 20, 1), 50);
  const cursorRaw = url.searchParams.get("cursor");
  const cursor = cursorRaw ? parseInt(cursorRaw) : null;

  const where = cursor
    ? and(
        eq(tournamentNews.tournamentId, tournament.id),
        eq(tournamentNews.status, "published"),
        lt(tournamentNews.id, cursor),
      )
    : and(
        eq(tournamentNews.tournamentId, tournament.id),
        eq(tournamentNews.status, "published"),
      );

  const posts = await db
    .select({
      id: tournamentNews.id,
      subject: tournamentNews.subject,
      bodyMarkdown: tournamentNews.bodyMarkdown,
      coverUrl: tournamentNews.coverUrl,
      ctaLabel: tournamentNews.ctaLabel,
      ctaUrl: tournamentNews.ctaUrl,
      publishedAt: tournamentNews.publishedAt,
    })
    .from(tournamentNews)
    .where(where)
    .orderBy(desc(tournamentNews.id))
    .limit(limit + 1);

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ items, nextCursor });
}
