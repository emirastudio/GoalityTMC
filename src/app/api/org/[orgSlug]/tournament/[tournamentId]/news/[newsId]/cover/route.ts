import { NextRequest, NextResponse } from "next/server";
import { requireGameAdmin } from "@/lib/game-auth";
import { db } from "@/db";
import { tournamentNews } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

type Params = { orgSlug: string; tournamentId: string; newsId: string };

// POST /api/org/.../news/[newsId]/cover — upload cover image.
//
// Mirrors src/app/api/org/[orgSlug]/tournament/[tournamentId]/cover/route.ts:
// same allowlist + 20MB cap + cleanup of previous file. Stored in
// public/uploads/news/.
//
// TODO (post-V1): resize via sharp/imagemagick to 1200x630 q82 ≤500KB
// so OG previews on shared posts pass WhatsApp's ~600KB cap. Until
// then, large uploads remain unresized — same constraint as
// tournament cover/cardImage.
export async function POST(
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

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
  }

  // Remove old cover if present.
  if (post.coverUrl) {
    const oldPath = path.join(process.cwd(), "public", post.coverUrl);
    await unlink(oldPath).catch(() => {});
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `news-${nId}-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "news");
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  const coverUrl = `/uploads/news/${filename}`;
  await db
    .update(tournamentNews)
    .set({ coverUrl, updatedAt: new Date() })
    .where(eq(tournamentNews.id, nId));

  return NextResponse.json({ coverUrl });
}

// DELETE — remove cover (no body).
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

  if (post.coverUrl) {
    const fsPath = path.join(process.cwd(), "public", post.coverUrl);
    await unlink(fsPath).catch(() => {});
    await db
      .update(tournamentNews)
      .set({ coverUrl: null, updatedAt: new Date() })
      .where(eq(tournamentNews.id, nId));
  }

  return NextResponse.json({ ok: true });
}
