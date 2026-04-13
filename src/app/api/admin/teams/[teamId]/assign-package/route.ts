import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { packageAssignments, tournamentRegistrations } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq, and } from "drizzle-orm";

type RouteContext = { params: Promise<{ teamId: string }> };

async function getRegistrationId(teamIdNum: number, body: Record<string, unknown>, req: NextRequest): Promise<number | null> {
  // Direct registrationId takes priority
  if (body.registrationId) return Number(body.registrationId);
  const registrationIdParam = req.nextUrl.searchParams.get("registrationId");
  if (registrationIdParam) return Number(registrationIdParam);

  const tournamentId = ((body.tournamentId as number | undefined) ?? Number(req.nextUrl.searchParams.get("tournamentId"))) || null;
  if (tournamentId) {
    const reg = await db.query.tournamentRegistrations.findFirst({
      where: and(eq(tournamentRegistrations.teamId, teamIdNum), eq(tournamentRegistrations.tournamentId, tournamentId)),
    });
    return reg?.id ?? null;
  }

  // Fallback: latest registration for this team
  const latest = await db.query.tournamentRegistrations.findFirst({
    where: eq(tournamentRegistrations.teamId, teamIdNum),
    orderBy: (r, { desc }) => [desc(r.id)],
  });
  return latest?.id ?? null;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { teamId } = await context.params;
  const teamIdNum = Number(teamId);
  const body = await req.json();

  if (!body.packageId) {
    return NextResponse.json({ error: "packageId is required" }, { status: 400 });
  }

  const registrationId = await getRegistrationId(teamIdNum, body, req);
  if (!registrationId) {
    return NextResponse.json({ error: "No registration found for this team" }, { status: 404 });
  }

  // Upsert: check if assignment already exists for this registration
  const existing = await db.query.packageAssignments.findFirst({
    where: eq(packageAssignments.registrationId, registrationId),
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
      registrationId,
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

  const registrationId = await getRegistrationId(teamIdNum, body, req);
  if (!registrationId) {
    return NextResponse.json({ error: "No registration found for this team" }, { status: 404 });
  }

  const existing = await db.query.packageAssignments.findFirst({
    where: eq(packageAssignments.registrationId, registrationId),
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

export async function DELETE(req: NextRequest, context: RouteContext) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { teamId } = await context.params;
  const teamIdNum = Number(teamId);

  const registrationId = await getRegistrationId(teamIdNum, {}, req);
  if (!registrationId) {
    return NextResponse.json({ error: "No registration found for this team" }, { status: 404 });
  }

  const [deleted] = await db
    .delete(packageAssignments)
    .where(eq(packageAssignments.registrationId, registrationId))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "No package assignment found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
