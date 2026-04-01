import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accommodationOptions } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.checkIn !== undefined) updates.checkIn = body.checkIn ? new Date(body.checkIn) : null;
  if (body.checkOut !== undefined) updates.checkOut = body.checkOut ? new Date(body.checkOut) : null;
  if (body.pricePerPlayer !== undefined) updates.pricePerPlayer = String(body.pricePerPlayer);
  if (body.pricePerStaff !== undefined) updates.pricePerStaff = String(body.pricePerStaff);
  if (body.pricePerAccompanying !== undefined) updates.pricePerAccompanying = String(body.pricePerAccompanying);
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
  if (body.isActive !== undefined) updates.isActive = body.isActive;

  const [updated] = await db
    .update(accommodationOptions)
    .set(updates)
    .where(eq(accommodationOptions.id, parseInt(id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [deleted] = await db
    .delete(accommodationOptions)
    .where(eq(accommodationOptions.id, parseInt(id)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
