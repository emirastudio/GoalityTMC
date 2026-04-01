import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamPackageItemOverrides, packageItems, services } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await requireAdmin();
  if (isError(session)) return session;

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
      // Joined item details
      itemDetails: packageItems.details,
      itemPricingMode: packageItems.pricingMode,
      itemPrice: packageItems.price,
      serviceName: services.name,
      serviceIcon: services.icon,
    })
    .from(teamPackageItemOverrides)
    .leftJoin(
      packageItems,
      eq(packageItems.id, teamPackageItemOverrides.packageItemId)
    )
    .leftJoin(services, eq(services.id, packageItems.serviceId))
    .where(eq(teamPackageItemOverrides.teamId, Number(teamId)));

  return NextResponse.json(overrides);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { teamId } = await params;
  const body = await req.json();

  if (body.customPrice !== undefined) {
    body.customPrice = String(body.customPrice);
  }

  const [created] = await db
    .insert(teamPackageItemOverrides)
    .values({
      teamId: Number(teamId),
      packageItemId: body.packageItemId,
      customPrice: body.customPrice,
      customQuantity: body.customQuantity,
      isDisabled: body.isDisabled,
      reason: body.reason,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(teamPackageItemOverrides)
    .where(eq(teamPackageItemOverrides.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
