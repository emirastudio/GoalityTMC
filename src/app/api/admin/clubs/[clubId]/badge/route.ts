import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubs } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// POST /api/admin/clubs/[clubId]/badge — upload club badge (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { clubId } = await params;
  const cid = parseInt(clubId);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowed = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "png";
  const filename = `club-${cid}-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "badges");

  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  const badgeUrl = `/uploads/badges/${filename}`;
  await db.update(clubs).set({ badgeUrl }).where(eq(clubs.id, cid));

  return NextResponse.json({ badgeUrl });
}
