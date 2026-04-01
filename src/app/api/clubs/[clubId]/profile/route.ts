import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubs, clubUsers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

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
    contactName: club.contactName,
    contactEmail: club.contactEmail,
    contactPhone: club.contactPhone,
  });
}

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

  // Ensure the session belongs to this club
  if (session.clubId !== cid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { contactName, contactEmail, contactPhone } = await req.json();

  // Update club
  const [updatedClub] = await db
    .update(clubs)
    .set({
      ...(contactName !== undefined && { contactName }),
      ...(contactEmail !== undefined && { contactEmail }),
      ...(contactPhone !== undefined && { contactPhone }),
      updatedAt: new Date(),
    })
    .where(eq(clubs.id, cid))
    .returning();

  // Also update the club user's name/email if provided
  if (contactName !== undefined || contactEmail !== undefined) {
    await db
      .update(clubUsers)
      .set({
        ...(contactName !== undefined && { name: contactName }),
        ...(contactEmail !== undefined && { email: contactEmail }),
      })
      .where(eq(clubUsers.clubId, cid));
  }

  return NextResponse.json(updatedClub);
}
