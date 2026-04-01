import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "club") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId } = await params;
  const cid = parseInt(clubId);

  // Verify club belongs to session
  if (session.clubId !== cid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate type
  const allowed = ["image/png", "image/jpeg", "image/gif", "image/webp"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  // Validate size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params;
  const club = await db.query.clubs.findFirst({
    where: eq(clubs.id, parseInt(clubId)),
    columns: { badgeUrl: true },
  });
  return NextResponse.json({ badgeUrl: club?.badgeUrl ?? null });
}
