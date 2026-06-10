import { NextRequest, NextResponse } from "next/server";
import { requireGameAdmin } from "@/lib/game-auth";
import { db } from "@/db";
import { tournamentNews } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { unlink } from "fs/promises";
import path from "path";

type Params = { orgSlug: string; tournamentId: string; newsId: string };

// GET — single post for admin (any status, full body).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (ctx instanceof NextResponse) return ctx;

  const nId = parseInt(p.newsId);
  if (Number.isNaN(nId)) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const [post] = await db
    .select()
    .from(tournamentNews)
    .where(and(eq(tournamentNews.id, nId), eq(tournamentNews.tournamentId, ctx.tournament.id)))
    .limit(1);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ post });
}

// PATCH — edit. Post-publish editing is restricted to cover/CTA
// (subject + body are frozen once readers have it in their inbox).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (ctx instanceof NextResponse) return ctx;

  const nId = parseInt(p.newsId);
  if (Number.isNaN(nId)) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const [post] = await db
    .select()
    .from(tournamentNews)
    .where(and(eq(tournamentNews.id, nId), eq(tournamentNews.tournamentId, ctx.tournament.id)))
    .limit(1);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { subject, bodyMarkdown, coverUrl, ctaLabel, ctaUrl, publishAt } = body as Record<
    string,
    unknown
  >;

  const normalised = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t === "" ? null : t;
  };

  const updates: Partial<typeof tournamentNews.$inferInsert> = { updatedAt: new Date() };

  if (post.status === "published") {
    // Locked text after publish.
    if (typeof coverUrl !== "undefined") updates.coverUrl = normalised(coverUrl);
    if (typeof ctaLabel !== "undefined") updates.ctaLabel = normalised(ctaLabel);
    if (typeof ctaUrl !== "undefined") updates.ctaUrl = normalised(ctaUrl);
  } else {
    if (typeof subject === "string") {
      if (!subject.trim()) {
        return NextResponse.json({ error: "Subject required" }, { status: 400 });
      }
      if (subject.length > 280) {
        return NextResponse.json({ error: "Subject too long" }, { status: 400 });
      }
      updates.subject = subject.trim();
    }
    if (typeof bodyMarkdown === "string") {
      if (!bodyMarkdown.trim()) {
        return NextResponse.json({ error: "Body required" }, { status: 400 });
      }
      if (bodyMarkdown.length > 20_000) {
        return NextResponse.json({ error: "Body too long" }, { status: 400 });
      }
      updates.bodyMarkdown = bodyMarkdown.trim();
    }
    if (typeof coverUrl !== "undefined") updates.coverUrl = normalised(coverUrl);
    if (typeof ctaLabel !== "undefined") updates.ctaLabel = normalised(ctaLabel);
    if (typeof ctaUrl !== "undefined") updates.ctaUrl = normalised(ctaUrl);
    if (typeof publishAt !== "undefined") {
      if (publishAt === null || publishAt === "") {
        updates.publishAt = null;
        // Cancelling a schedule? Demote back to draft.
        if (post.status === "scheduled") updates.status = "draft";
      } else if (typeof publishAt === "string") {
        const d = new Date(publishAt);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ error: "Invalid publishAt" }, { status: 400 });
        }
        updates.publishAt = d;
      }
    }
  }

  const [updated] = await db
    .update(tournamentNews)
    .set(updates)
    .where(eq(tournamentNews.id, nId))
    .returning();

  return NextResponse.json({ post: updated });
}

// DELETE — soft archive. Preserves unread badges + reads for clubs.
// Archived posts are no longer public (status filter blocks them).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (ctx instanceof NextResponse) return ctx;

  const nId = parseInt(p.newsId);
  if (Number.isNaN(nId)) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const [post] = await db
    .select()
    .from(tournamentNews)
    .where(and(eq(tournamentNews.id, nId), eq(tournamentNews.tournamentId, ctx.tournament.id)))
    .limit(1);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // For drafts, hard delete (no email went out, no public URL existed)
  // — also unlink the cover file to avoid orphans.
  if (post.status === "draft") {
    if (post.coverUrl) {
      const fsPath = path.join(process.cwd(), "public", post.coverUrl);
      await unlink(fsPath).catch(() => {});
    }
    await db.delete(tournamentNews).where(eq(tournamentNews.id, nId));
    return NextResponse.json({ ok: true, action: "deleted" });
  }

  await db
    .update(tournamentNews)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(tournamentNews.id, nId));
  return NextResponse.json({ ok: true, action: "archived" });
}
