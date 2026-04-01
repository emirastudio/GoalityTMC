import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamPackageItemOverrides, packageItems, services } from "@/db/schema";
import { requireTournamentAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;

  const { teamId } = await params;

  const overrides = await db
    .select({
      id: teamPackageItemOverrides.id,
      teamId: teamPackageItemOverrides.teamId,
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
    .where(eq(teamPackageItemOverrides.teamId, Number(teamId)));

  return NextResponse.json(overrides);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;

  const { teamId } = await params;
  const body = await req.json();

  if (body.customPrice !== undefined && body.customPrice !== null) {
    body.customPrice = String(body.customPrice);
  }

  const [created] = await db
    .insert(teamPackageItemOverrides)
    .values({
      teamId: Number(teamId),
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
