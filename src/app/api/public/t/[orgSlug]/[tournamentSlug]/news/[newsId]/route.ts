import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, tournaments, tournamentNews, adminUsers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/public/t/[orgSlug]/[tournamentSlug]/news/[newsId]
//
// Single published news post + author display name.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentSlug: string; newsId: string }> },
) {
  const { orgSlug, tournamentSlug, newsId } = await params;
  const nId = parseInt(newsId);
  if (Number.isNaN(nId)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

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

  const [post] = await db
    .select({
      id: tournamentNews.id,
      tournamentId: tournamentNews.tournamentId,
      subject: tournamentNews.subject,
      bodyMarkdown: tournamentNews.bodyMarkdown,
      coverUrl: tournamentNews.coverUrl,
      ctaLabel: tournamentNews.ctaLabel,
      ctaUrl: tournamentNews.ctaUrl,
      status: tournamentNews.status,
      publishedAt: tournamentNews.publishedAt,
      authorName: adminUsers.name,
    })
    .from(tournamentNews)
    .leftJoin(adminUsers, eq(tournamentNews.authorId, adminUsers.id))
    .where(eq(tournamentNews.id, nId))
    .limit(1);

  if (!post || post.tournamentId !== tournament.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Drafts/scheduled/archived are not public.
  if (post.status !== "published") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ post });
}
