import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamServiceOverrides, tournamentRegistrations } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq, and, inArray } from "drizzle-orm";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { teamId } = await context.params;
  const teamIdNum = Number(teamId);
  const urlTournamentId = req.nextUrl.searchParams.get("tournamentId");

  // Get registrationId(s) for this team
  const regs = await db
    .select({ id: tournamentRegistrations.id })
    .from(tournamentRegistrations)
    .where(
      urlTournamentId
        ? and(eq(tournamentRegistrations.teamId, teamIdNum), eq(tournamentRegistrations.tournamentId, Number(urlTournamentId)))
        : eq(tournamentRegistrations.teamId, teamIdNum)
    );
  const regIds = regs.map((r) => r.id);
  if (regIds.length === 0) return NextResponse.json([]);

  const overrides = await db.query.teamServiceOverrides.findMany({
    where: inArray(teamServiceOverrides.registrationId, regIds),
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

  // Resolve registrationId — from direct registrationId, tournamentId, or fallback to latest
  let reg;
  if (body.registrationId) {
    reg = await db.query.tournamentRegistrations.findFirst({
      where: eq(tournamentRegistrations.id, Number(body.registrationId)),
    });
  } else {
    const tournamentId = (body.tournamentId ?? Number(req.nextUrl.searchParams.get("tournamentId"))) || null;
    if (tournamentId) {
      reg = await db.query.tournamentRegistrations.findFirst({
        where: and(eq(tournamentRegistrations.teamId, teamIdNum), eq(tournamentRegistrations.tournamentId, tournamentId)),
      });
    } else {
      // Fallback: latest registration for this team
      reg = await db.query.tournamentRegistrations.findFirst({
        where: eq(tournamentRegistrations.teamId, teamIdNum),
        orderBy: (r, { desc }) => [desc(r.id)],
      });
    }
  }
  if (!reg) {
    return NextResponse.json({ error: "Registration not found for this team" }, { status: 404 });
  }

  // Check if override already exists for this registration + serviceType + serviceId
  const existing = await db.query.teamServiceOverrides.findFirst({
    where: and(
      eq(teamServiceOverrides.registrationId, reg.id),
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
      registrationId: reg.id,
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
