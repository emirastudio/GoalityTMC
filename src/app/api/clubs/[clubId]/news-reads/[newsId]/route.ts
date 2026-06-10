import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentNews, tournamentNewsReads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// POST /api/clubs/[clubId]/news-reads/[newsId]
//
// Upsert read marker. Idempotent (UNIQUE conflict → no-op).
// Called from the single-post page when a logged-in club opens it.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string; newsId: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId, newsId } = await params;
  const cId = parseInt(clubId);
  const nId = parseInt(newsId);
  if (Number.isNaN(cId) || Number.isNaN(nId)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (cId !== session.clubId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // News post must exist + be published (no marking drafts as read).
  const [news] = await db
    .select({ id: tournamentNews.id, status: tournamentNews.status })
    .from(tournamentNews)
    .where(eq(tournamentNews.id, nId))
    .limit(1);
  if (!news || news.status !== "published") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .insert(tournamentNewsReads)
    .values({ newsId: nId, clubId: cId })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true });
}
