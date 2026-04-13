import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentFields } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, and } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string; fieldId: string };

// PATCH /api/org/.../fields/[fieldId] — rename a field
export async function PATCH(req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const fieldId = parseInt(p.fieldId);
  const { name, notes } = await req.json();

  const updateData: Record<string, string | null> = {};
  if (name !== undefined) updateData.name = name?.trim() || null;
  if (notes !== undefined) updateData.notes = notes?.trim() || null;

  if (updateData.name === null) {
    return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
  }

  const [updated] = await db
    .update(tournamentFields)
    .set(updateData)
    .where(and(
      eq(tournamentFields.id, fieldId),
      eq(tournamentFields.tournamentId, ctx.tournament.id)
    ))
    .returning();

  if (!updated) return NextResponse.json({ error: "Field not found" }, { status: 404 });
  return NextResponse.json(updated);
}

// DELETE /api/org/.../fields/[fieldId] — delete a field (matches lose field reference)
export async function DELETE(req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const fieldId = parseInt(p.fieldId);

  const [deleted] = await db
    .delete(tournamentFields)
    .where(and(
      eq(tournamentFields.id, fieldId),
      eq(tournamentFields.tournamentId, ctx.tournament.id)
    ))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Field not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
