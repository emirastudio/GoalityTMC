import { NextRequest, NextResponse } from "next/server";
import { requireGameAdmin } from "@/lib/game-auth";
import { db } from "@/db";
import { tournamentNews } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { publishNewsPost } from "@/worker/notifications";

type Params = { orgSlug: string; tournamentId: string; newsId: string };

// POST /api/org/[orgSlug]/tournament/[tournamentId]/news/[newsId]/publish
//
// Promotes status → "published", clears publishAt, sets publishedAt,
// and enqueues one notificationQueue row per follower.
//
// Reuses publishNewsPost() from the worker so the scheduled publisher
// and the "Publish now" button take exactly the same code path.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (ctx instanceof NextResponse) return ctx;

  const nId = parseInt(p.newsId);
  if (Number.isNaN(nId)) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  // Ownership check (post must belong to ctx.tournament).
  const [post] = await db
    .select()
    .from(tournamentNews)
    .where(and(eq(tournamentNews.id, nId), eq(tournamentNews.tournamentId, ctx.tournament.id)))
    .limit(1);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.status === "archived") {
    return NextResponse.json(
      { error: "Cannot publish archived post" },
      { status: 409 },
    );
  }
  if (post.status === "published") {
    return NextResponse.json(
      { error: "Already published" },
      { status: 409 },
    );
  }

  try {
    const result = await publishNewsPost(nId);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Publish failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
