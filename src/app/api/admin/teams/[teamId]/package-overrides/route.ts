import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamPackageItemOverrides, packageItems, services, tournamentRegistrations } from "@/db/schema";
import { requireTournamentAdmin, isError } from "@/lib/api-auth";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;

  const { teamId } = await params;
  const urlTournamentId = req.nextUrl.searchParams.get("tournamentId");
  const teamIdNum = Number(teamId);

  // Resolve registrationId from teamId
  const reg = urlTournamentId
    ? await db.query.tournamentRegistrations.findFirst({
        where: and(
          eq(tournamentRegistrations.teamId, teamIdNum),
          eq(tournamentRegistrations.tournamentId, Number(urlTournamentId))
        ),
      })
    : await db.query.tournamentRegistrations.findFirst({
        where: eq(tournamentRegistrations.teamId, teamIdNum),
      });

  if (!reg) return NextResponse.json([]);

  const overrides = await db
    .select({
      id: teamPackageItemOverrides.id,
      registrationId: teamPackageItemOverrides.registrationId,
      packageItemId: teamPackageItemOverrides.packageItemId,
      customPrice: teamPackageItemOverrides.customPrice,
      customQuantity: teamPackageItemOverrides.customQuantity,
      isDisabled: teamPackageItemOverrides.isDisabled,
      reason: teamPackageItemOverrides.reason,
      createdAt: teamPackageItemOverrides.createdAt,
      itemDetails: packageItems.details,
      itemPricingMode: packageItems.pricingMode,
      itemPrice: packageItems.price,
      serviceName: services.name,
      serviceIcon: services.icon,
    })
    .from(teamPackageItemOverrides)
    .leftJoin(packageItems, eq(packageItems.id, teamPackageItemOverrides.packageItemId))
    .leftJoin(services, eq(services.id, packageItems.serviceId))
    .where(eq(teamPackageItemOverrides.registrationId, reg.id));

  return NextResponse.json(overrides);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;

  const { teamId } = await params;
  const teamIdNum = Number(teamId);
  const body = await req.json();

  if (body.customPrice !== undefined && body.customPrice !== null) {
    body.customPrice = String(body.customPrice);
  }

  // Resolve registrationId
  const urlTournamentId = req.nextUrl.searchParams.get("tournamentId") ?? body.tournamentId;
  const reg = urlTournamentId
    ? await db.query.tournamentRegistrations.findFirst({
        where: and(
          eq(tournamentRegistrations.teamId, teamIdNum),
          eq(tournamentRegistrations.tournamentId, Number(urlTournamentId))
        ),
      })
    : await db.query.tournamentRegistrations.findFirst({
        where: eq(tournamentRegistrations.teamId, teamIdNum),
      });

  if (!reg) return NextResponse.json({ error: "Registration not found" }, { status: 404 });

  const [created] = await db
    .insert(teamPackageItemOverrides)
    .values({
      registrationId: reg.id,
      packageItemId: body.packageItemId,
      customPrice: body.customPrice ?? null,
      customQuantity: body.customQuantity ?? null,
      isDisabled: body.isDisabled ?? false,
      reason: body.reason ?? null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (body.customPrice !== undefined && body.customPrice !== null) {
    body.customPrice = String(body.customPrice);
  }

  const { id, ...fields } = body;
  const [updated] = await db
    .update(teamPackageItemOverrides)
    .set(fields)
    .where(eq(teamPackageItemOverrides.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const [deleted] = await db
    .delete(teamPackageItemOverrides)
    .where(eq(teamPackageItemOverrides.id, id))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
