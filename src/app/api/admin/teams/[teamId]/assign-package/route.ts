import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { packageAssignments } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { teamId } = await context.params;
  const teamIdNum = Number(teamId);
  const body = await req.json();

  if (!body.packageId) {
    return NextResponse.json({ error: "packageId is required" }, { status: 400 });
  }

  // Upsert: check if assignment already exists for this team
  const existing = await db.query.packageAssignments.findFirst({
    where: eq(packageAssignments.teamId, teamIdNum),
  });

  if (existing) {
    const [updated] = await db
      .update(packageAssignments)
      .set({
        packageId: body.packageId,
        assignedAt: new Date(),
        assignedBy: session.userId,
      })
      .where(eq(packageAssignments.id, existing.id))
      .returning();

    return NextResponse.json(updated);
  }

  const [created] = await db
    .insert(packageAssignments)
    .values({
      teamId: teamIdNum,
      packageId: body.packageId,
      assignedBy: session.userId,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { teamId } = await context.params;
  const teamIdNum = Number(teamId);
  const body = await req.json();

  const existing = await db.query.packageAssignments.findFirst({
    where: eq(packageAssignments.teamId, teamIdNum),
  });

  if (!existing) {
    return NextResponse.json({ error: "No package assigned to this team" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (body.isPublished !== undefined) updates.isPublished = body.isPublished;
  if (body.freePlayersCount !== undefined) updates.freePlayersCount = Number(body.freePlayersCount);
  if (body.freeStaffCount !== undefined) updates.freeStaffCount = Number(body.freeStaffCount);
  if (body.freeAccompanyingCount !== undefined) updates.freeAccompanyingCount = Number(body.freeAccompanyingCount);
  if ("mealsCountOverride" in body) {
    const v = body.mealsCountOverride;
    updates.mealsCountOverride = (v === null || v === "" || v === -1) ? null : (parseInt(String(v)) || null);
  }

  const [updated] = await db
    .update(packageAssignments)
    .set(updates)
    .where(eq(packageAssignments.id, existing.id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { teamId } = await context.params;
  const teamIdNum = Number(teamId);

  const [deleted] = await db
    .delete(packageAssignments)
    .where(eq(packageAssignments.teamId, teamIdNum))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "No package assignment found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
