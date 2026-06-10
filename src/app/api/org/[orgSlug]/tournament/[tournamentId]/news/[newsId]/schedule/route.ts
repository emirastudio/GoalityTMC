import { NextRequest, NextResponse } from "next/server";
import { requireGameAdmin } from "@/lib/game-auth";
import { db } from "@/db";
import { tournamentNews } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string; newsId: string };

// POST /api/org/[orgSlug]/tournament/[tournamentId]/news/[newsId]/schedule
// Body: { publishAt: ISO date string }
//
// Sets status → "scheduled" with publishAt in the future. The
// scheduled-news poller in worker/notifications.ts flips it to
// "published" and enqueues followers when publishAt is reached.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (ctx instanceof NextResponse) return ctx;

  const nId = parseInt(p.newsId);
  if (Number.isNaN(nId)) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const publishAtRaw = (body && typeof body === "object" ? (body as Record<string, unknown>).publishAt : null);
  if (typeof publishAtRaw !== "string" || !publishAtRaw) {
    return NextResponse.json({ error: "publishAt required" }, { status: 400 });
  }
  const publishAt = new Date(publishAtRaw);
  if (Number.isNaN(publishAt.getTime())) {
    return NextResponse.json({ error: "Invalid publishAt" }, { status: 400 });
  }
  if (publishAt.getTime() < Date.now() + 30_000) {
    return NextResponse.json(
      { error: "publishAt must be at least 30 seconds in the future" },
      { status: 400 },
    );
  }

  const [post] = await db
    .select()
    .from(tournamentNews)
    .where(and(eq(tournamentNews.id, nId), eq(tournamentNews.tournamentId, ctx.tournament.id)))
    .limit(1);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.status === "published") {
    return NextResponse.json({ error: "Already published" }, { status: 409 });
  }
  if (post.status === "archived") {
    return NextResponse.json({ error: "Archived post" }, { status: 409 });
  }

  const [updated] = await db
    .update(tournamentNews)
    .set({ status: "scheduled", publishAt, updatedAt: new Date() })
    .where(eq(tournamentNews.id, nId))
    .returning();

  return NextResponse.json({ post: updated });
}
