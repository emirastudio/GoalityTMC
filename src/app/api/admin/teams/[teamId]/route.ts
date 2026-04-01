import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { teamId } = await params;
  const tid = parseInt(teamId);

  const [deleted] = await db
    .delete(teams)
    .where(eq(teams.id, tid))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { teamId } = await params;
  const tid = parseInt(teamId);

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.hotelId !== undefined) updates.hotelId = body.hotelId === "" ? null : body.hotelId;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  updates.updatedAt = new Date();

  const [updated] = await db
    .update(teams)
    .set(updates)
    .where(eq(teams.id, tid))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
