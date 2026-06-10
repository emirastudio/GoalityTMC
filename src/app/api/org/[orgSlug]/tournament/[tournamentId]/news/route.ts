import { NextRequest, NextResponse } from "next/server";
import { requireGameAdmin } from "@/lib/game-auth";
import { db } from "@/db";
import { tournamentNews, tournamentFollowers } from "@/db/schema";
import { eq, desc, count, and } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string };

// GET /api/org/[orgSlug]/tournament/[tournamentId]/news?status=<filter>
//
// Admin list of all news posts for the tournament. Optional ?status
// filter (draft|scheduled|published|archived). Includes follower count
// at top level (one fast aggregate) so the UI can render "will be sent
// to N clubs" hint without a second fetch.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (ctx instanceof NextResponse) return ctx;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const where = status
    ? and(eq(tournamentNews.tournamentId, ctx.tournament.id), eq(tournamentNews.status, status))
    : eq(tournamentNews.tournamentId, ctx.tournament.id);

  const posts = await db
    .select({
      id: tournamentNews.id,
      subject: tournamentNews.subject,
      bodyMarkdown: tournamentNews.bodyMarkdown,
      coverUrl: tournamentNews.coverUrl,
      ctaLabel: tournamentNews.ctaLabel,
      ctaUrl: tournamentNews.ctaUrl,
      status: tournamentNews.status,
      publishAt: tournamentNews.publishAt,
      publishedAt: tournamentNews.publishedAt,
      createdAt: tournamentNews.createdAt,
      updatedAt: tournamentNews.updatedAt,
    })
    .from(tournamentNews)
    .where(where)
    .orderBy(desc(tournamentNews.id));

  const [{ followerCount }] = await db
    .select({ followerCount: count() })
    .from(tournamentFollowers)
    .where(eq(tournamentFollowers.tournamentId, ctx.tournament.id));

  return NextResponse.json({ posts, followerCount: Number(followerCount) });
}

// POST /api/org/[orgSlug]/tournament/[tournamentId]/news
//
// Create a draft news post. Publish + schedule happen via dedicated
// sub-routes — keeps state transitions audit-friendly.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { subject, bodyMarkdown, coverUrl, ctaLabel, ctaUrl } = body as Record<
    string,
    unknown
  >;
  if (typeof subject !== "string" || !subject.trim()) {
    return NextResponse.json({ error: "Subject required" }, { status: 400 });
  }
  if (typeof bodyMarkdown !== "string" || !bodyMarkdown.trim()) {
    return NextResponse.json({ error: "Body required" }, { status: 400 });
  }
  if (subject.length > 280) {
    return NextResponse.json({ error: "Subject too long (max 280)" }, { status: 400 });
  }
  if (bodyMarkdown.length > 20_000) {
    return NextResponse.json({ error: "Body too long (max 20,000)" }, { status: 400 });
  }

  // Optional fields — empty strings normalised to null.
  const normalised = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t === "" ? null : t;
  };

  const [post] = await db
    .insert(tournamentNews)
    .values({
      tournamentId: ctx.tournament.id,
      authorId: ctx.session.userId,
      subject: subject.trim(),
      bodyMarkdown: bodyMarkdown.trim(),
      coverUrl: normalised(coverUrl),
      ctaLabel: normalised(ctaLabel),
      ctaUrl: normalised(ctaUrl),
      status: "draft",
    })
    .returning();

  return NextResponse.json({ post }, { status: 201 });
}
