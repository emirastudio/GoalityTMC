import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamServiceOverrides } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq, and } from "drizzle-orm";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { teamId } = await context.params;
  const teamIdNum = Number(teamId);

  const overrides = await db.query.teamServiceOverrides.findMany({
    where: eq(teamServiceOverrides.teamId, teamIdNum),
  });

  return NextResponse.json(overrides);
}

export async function POST(req: NextRequest, context: RouteContext) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { teamId } = await context.params;
  const teamIdNum = Number(teamId);
  const body = await req.json();

  if (!body.serviceType || !body.serviceId) {
    return NextResponse.json(
      { error: "serviceType and serviceId are required" },
      { status: 400 }
    );
  }

  // Check if override already exists for this team + serviceType + serviceId
  const existing = await db.query.teamServiceOverrides.findFirst({
    where: and(
      eq(teamServiceOverrides.teamId, teamIdNum),
      eq(teamServiceOverrides.serviceType, body.serviceType),
      eq(teamServiceOverrides.serviceId, body.serviceId)
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(teamServiceOverrides)
      .set({
        customPrice: body.customPrice !== undefined ? String(body.customPrice) : existing.customPrice,
        isDisabled: body.isDisabled !== undefined ? body.isDisabled : existing.isDisabled,
        reason: body.reason !== undefined ? body.reason : existing.reason,
      })
      .where(eq(teamServiceOverrides.id, existing.id))
      .returning();

    return NextResponse.json(updated);
  }

  const [created] = await db
    .insert(teamServiceOverrides)
    .values({
      teamId: teamIdNum,
      serviceType: body.serviceType,
      serviceId: body.serviceId,
      customPrice: body.customPrice !== undefined ? String(body.customPrice) : null,
      isDisabled: body.isDisabled ?? false,
      reason: body.reason,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { searchParams } = new URL(req.url);
  let id = Number(searchParams.get("id"));

  if (!id) {
    const body = await req.json().catch(() => ({}));
    id = body.id;
  }

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(teamServiceOverrides)
    .where(eq(teamServiceOverrides.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
