import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authorizeOrg } from "@/lib/tenant";
import { db } from "@/db";
import { listingTournaments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = process.cwd() + "/public/uploads/listing-card-images/";
const URL_PREFIX = "/uploads/listing-card-images/";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; listingId: string }> }
) {
  const { orgSlug, listingId } = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `card-${orgSlug}-${listingId}-${Date.now()}.${ext}`;

  ensureDir(UPLOAD_DIR);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  const cardImageUrl = URL_PREFIX + filename;

  const [existing] = await db.select({ cardImageUrl: listingTournaments.cardImageUrl })
    .from(listingTournaments)
    .where(and(eq(listingTournaments.id, Number(listingId)), eq(listingTournaments.organizationId, organization.id)))
    .limit(1);

  if (existing?.cardImageUrl) {
    const oldFile = path.join(UPLOAD_DIR, path.basename(existing.cardImageUrl));
    if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
  }

  await db.update(listingTournaments)
    .set({ cardImageUrl, updatedAt: new Date() })
    .where(and(eq(listingTournaments.id, Number(listingId)), eq(listingTournaments.organizationId, organization.id)));

  return NextResponse.json({ cardImageUrl });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; listingId: string }> }
) {
  const { orgSlug, listingId } = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [existing] = await db.select({ cardImageUrl: listingTournaments.cardImageUrl })
    .from(listingTournaments)
    .where(and(eq(listingTournaments.id, Number(listingId)), eq(listingTournaments.organizationId, organization.id)))
    .limit(1);

  if (existing?.cardImageUrl) {
    const oldFile = path.join(UPLOAD_DIR, path.basename(existing.cardImageUrl));
    if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
  }

  await db.update(listingTournaments)
    .set({ cardImageUrl: null, updatedAt: new Date() })
    .where(and(eq(listingTournaments.id, Number(listingId)), eq(listingTournaments.organizationId, organization.id)));

  return NextResponse.json({ ok: true });
}
