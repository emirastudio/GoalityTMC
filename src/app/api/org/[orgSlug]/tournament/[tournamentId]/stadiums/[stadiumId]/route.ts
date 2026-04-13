import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentStadiums, tournamentFields } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, and, asc } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string; stadiumId: string };

// PATCH /api/org/.../stadiums/[stadiumId] — update stadium
export async function PATCH(req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const stadiumId = parseInt(p.stadiumId);
  const body = await req.json();
  const { name, address, contactName, contactPhone, mapsUrl, wazeUrl, notes } = body;

  const updateData: Record<string, string | null> = {};
  if (name !== undefined) updateData.name = name?.trim() || null;
  if (address !== undefined) updateData.address = address?.trim() || null;
  if (contactName !== undefined) updateData.contactName = contactName?.trim() || null;
  if (contactPhone !== undefined) updateData.contactPhone = contactPhone?.trim() || null;
  if (mapsUrl !== undefined) updateData.mapsUrl = mapsUrl?.trim() || null;
  if (wazeUrl !== undefined) updateData.wazeUrl = wazeUrl?.trim() || null;
  if (notes !== undefined) updateData.notes = notes?.trim() || null;

  if (updateData.name === null) {
    return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
  }

  const [updated] = await db
    .update(tournamentStadiums)
    .set(updateData)
    .where(and(
      eq(tournamentStadiums.id, stadiumId),
      eq(tournamentStadiums.tournamentId, ctx.tournament.id)
    ))
    .returning();

  if (!updated) return NextResponse.json({ error: "Stadium not found" }, { status: 404 });
  return NextResponse.json(updated);
}

// DELETE /api/org/.../stadiums/[stadiumId] — delete stadium (fields become standalone)
export async function DELETE(req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const stadiumId = parseInt(p.stadiumId);

  const [deleted] = await db
    .delete(tournamentStadiums)
    .where(and(
      eq(tournamentStadiums.id, stadiumId),
      eq(tournamentStadiums.tournamentId, ctx.tournament.id)
    ))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Stadium not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// POST /api/org/.../stadiums/[stadiumId]/fields — add a field to this stadium
// Handled separately below via nested route pattern
export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const stadiumId = parseInt(p.stadiumId);

  // Verify stadium belongs to this tournament
  const stadium = await db.query.tournamentStadiums.findFirst({
    where: and(
      eq(tournamentStadiums.id, stadiumId),
      eq(tournamentStadiums.tournamentId, ctx.tournament.id)
    ),
  });
  if (!stadium) return NextResponse.json({ error: "Stadium not found" }, { status: 404 });

  const body = await req.json();
  const { name, notes } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Get current max sortOrder for this stadium's fields
  const existingFields = await db.query.tournamentFields.findMany({
    where: and(
      eq(tournamentFields.stadiumId, stadiumId),
      eq(tournamentFields.tournamentId, ctx.tournament.id)
    ),
    orderBy: [asc(tournamentFields.sortOrder)],
  });
  const nextOrder = existingFields.length > 0
    ? Math.max(...existingFields.map(f => f.sortOrder)) + 1
    : 0;

  const [field] = await db
    .insert(tournamentFields)
    .values({
      tournamentId: ctx.tournament.id,
      stadiumId,
      name: name.trim(),
      notes: notes?.trim() || null,
      sortOrder: nextOrder,
    })
    .returning();

  return NextResponse.json(field, { status: 201 });
}
