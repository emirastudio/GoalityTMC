import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authorizeOrg } from "@/lib/tenant";
import { db } from "@/db";
import { listingTournaments } from "@/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = process.cwd() + "/public/uploads/listing-photos/";
const URL_PREFIX = "/uploads/listing-photos/";
const MAX_PHOTOS = 5;

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function getListing(organizationId: number) {
  const [listing] = await db
    .select({ id: listingTournaments.id, photos: listingTournaments.photos })
    .from(listingTournaments)
    .where(eq(listingTournaments.organizationId, organizationId))
    .limit(1);
  return listing ?? null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const listing = await getListing(organization.id);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const currentPhotos: string[] = JSON.parse(listing.photos ?? "[]");
  if (currentPhotos.length >= MAX_PHOTOS) {
    return NextResponse.json({ error: `Maximum ${MAX_PHOTOS} photos allowed` }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `photo-${orgSlug}-${Date.now()}.${ext}`;

  ensureDir(UPLOAD_DIR);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);

  const photoUrl = URL_PREFIX + filename;
  const updatedPhotos = [...currentPhotos, photoUrl];

  await db
    .update(listingTournaments)
    .set({ photos: JSON.stringify(updatedPhotos), updatedAt: new Date() })
    .where(eq(listingTournaments.organizationId, organization.id));

  return NextResponse.json({ photos: updatedPhotos });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { photoUrl } = body as { photoUrl?: string };

  if (!photoUrl) {
    return NextResponse.json({ error: "photoUrl required" }, { status: 400 });
  }

  const listing = await getListing(organization.id);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const currentPhotos: string[] = JSON.parse(listing.photos ?? "[]");
  const updatedPhotos = currentPhotos.filter((p) => p !== photoUrl);

  // Delete file from disk
  if (photoUrl.startsWith(URL_PREFIX)) {
    const filename = path.basename(photoUrl);
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await db
    .update(listingTournaments)
    .set({ photos: JSON.stringify(updatedPhotos), updatedAt: new Date() })
    .where(eq(listingTournaments.organizationId, organization.id));

  return NextResponse.json({ photos: updatedPhotos });
}
