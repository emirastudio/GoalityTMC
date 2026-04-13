import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// GET — return full club data for the onboarding form
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId } = await params;
  const cid = parseInt(clubId);

  if (session.clubId !== cid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const club = await db.query.clubs.findFirst({ where: eq(clubs.id, cid) });
  if (!club) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: club.id,
    name: club.name,
    country: club.country,
    city: club.city,
    badgeUrl: club.badgeUrl,
    contactName: club.contactName,
    contactEmail: club.contactEmail,
    contactPhone: club.contactPhone,
    website: club.website,
    instagram: club.instagram,
    facebook: club.facebook,
    onboardingComplete: club.onboardingComplete,
  });
}

// PATCH — save onboarding data
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId } = await params;
  const cid = parseInt(clubId);

  if (session.clubId !== cid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();

  const name = formData.get("name") as string;
  const country = formData.get("country") as string;
  const city = formData.get("city") as string;
  const contactName = formData.get("contactName") as string;
  const contactEmail = formData.get("contactEmail") as string;
  const contactPhone = formData.get("contactPhone") as string;
  const website = formData.get("website") as string;
  const instagram = formData.get("instagram") as string;
  const facebook = formData.get("facebook") as string;
  const logoFile = formData.get("logo") as File | null;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Club name is required" }, { status: 400 });
  }

  // Handle logo upload
  let badgeUrl: string | undefined;
  if (logoFile && logoFile.size > 0) {
    const allowed = ["image/png", "image/jpeg", "image/gif", "image/webp"];
    if (allowed.includes(logoFile.type) && logoFile.size <= 10 * 1024 * 1024) {
      const ext = logoFile.name.split(".").pop() ?? "png";
      const filename = `club-${cid}-${Date.now()}.${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads", "badges");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(
        path.join(uploadDir, filename),
        Buffer.from(await logoFile.arrayBuffer())
      );
      badgeUrl = `/uploads/badges/${filename}`;
    }
  }

  // Update club record
  await db
    .update(clubs)
    .set({
      name: name.trim(),
      country: country || null,
      city: city || null,
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      website: website || null,
      instagram: instagram || null,
      facebook: facebook || null,
      ...(badgeUrl !== undefined && { badgeUrl }),
      onboardingComplete: true,
      updatedAt: new Date(),
    })
    .where(eq(clubs.id, cid));

  return NextResponse.json({ ok: true });
}
