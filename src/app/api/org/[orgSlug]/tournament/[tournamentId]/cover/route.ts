import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

// POST /api/org/[orgSlug]/tournament/[tournamentId]/cover — upload cover image
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgSlug, tournamentId } = await params;
  const tid = parseInt(tournamentId);

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tournament = await db.query.tournaments.findFirst({
    where: and(eq(tournaments.id, tid), eq(tournaments.organizationId, org.id)),
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  // Remove old cover if exists
  if (tournament.coverUrl) {
    const oldPath = path.join(process.cwd(), "public", tournament.coverUrl);
    await unlink(oldPath).catch(() => {});
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `cover-${tid}-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "covers");

  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  const coverUrl = `/uploads/covers/${filename}`;
  await db.update(tournaments).set({ coverUrl }).where(eq(tournaments.id, tid));

  return NextResponse.json({ coverUrl });
}

// DELETE — remove cover
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgSlug, tournamentId } = await params;
  const tid = parseInt(tournamentId);

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tournament = await db.query.tournaments.findFirst({
    where: and(eq(tournaments.id, tid), eq(tournaments.organizationId, org.id)),
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (tournament.coverUrl) {
    const oldPath = path.join(process.cwd(), "public", tournament.coverUrl);
    await unlink(oldPath).catch(() => {});
    await db.update(tournaments).set({ coverUrl: null }).where(eq(tournaments.id, tid));
  }

  return NextResponse.json({ ok: true });
}
