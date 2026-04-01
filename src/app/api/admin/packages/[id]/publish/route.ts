import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { packageAssignments } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

// POST /api/admin/packages/[id]/publish
// Publish package for all assigned teams (set isPublished = true)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { id } = await params;
  const packageId = parseInt(id);

  const result = await db
    .update(packageAssignments)
    .set({ isPublished: true })
    .where(eq(packageAssignments.packageId, packageId))
    .returning();

  return NextResponse.json({ ok: true, published: result.length });
}

// DELETE /api/admin/packages/[id]/publish
// Unpublish package for all assigned teams
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { id } = await params;
  const packageId = parseInt(id);

  const result = await db
    .update(packageAssignments)
    .set({ isPublished: false })
    .where(eq(packageAssignments.packageId, packageId))
    .returning();

  return NextResponse.json({ ok: true, unpublished: result.length });
}
