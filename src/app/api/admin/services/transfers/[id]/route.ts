import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transferOptions } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  // Multilang fields — все 4 локали проходят через PATCH одинаково.
  for (const f of ["name", "nameRu", "nameEt", "nameEs",
                   "description", "descriptionRu", "descriptionEt", "descriptionEs"]) {
    if (body[f] !== undefined) updates[f] = body[f];
  }
  if (body.pricePerPerson !== undefined) updates.pricePerPerson = String(body.pricePerPerson);
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
  if (body.isActive !== undefined) updates.isActive = body.isActive;

  const [updated] = await db
    .update(transferOptions)
    .set(updates)
    .where(eq(transferOptions.id, parseInt(id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { id } = await params;

  const [deleted] = await db
    .delete(transferOptions)
    .where(eq(transferOptions.id, parseInt(id)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
