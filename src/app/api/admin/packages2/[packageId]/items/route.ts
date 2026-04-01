import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { packageItems, services } from "@/db/schema";
import { requireTournamentAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ packageId: string }> }
) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;

  const { packageId } = await params;

  const items = await db
    .select({
      id: packageItems.id,
      packageId: packageItems.packageId,
      serviceId: packageItems.serviceId,
      serviceName: services.name,
      serviceIcon: services.icon,
      details: packageItems.details,
      detailsRu: packageItems.detailsRu,
      detailsEt: packageItems.detailsEt,
      dateFrom: packageItems.dateFrom,
      dateTo: packageItems.dateTo,
      imageUrl: packageItems.imageUrl,
      note: packageItems.note,
      noteRu: packageItems.noteRu,
      noteEt: packageItems.noteEt,
      pricingMode: packageItems.pricingMode,
      price: packageItems.price,
      days: packageItems.days,
      quantity: packageItems.quantity,
      sortOrder: packageItems.sortOrder,
      createdAt: packageItems.createdAt,
    })
    .from(packageItems)
    .leftJoin(services, eq(services.id, packageItems.serviceId))
    .where(eq(packageItems.packageId, Number(packageId)))
    .orderBy(packageItems.sortOrder);

  return NextResponse.json(items);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ packageId: string }> }
) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;

  const { packageId } = await params;
  const body = await req.json();

  const [created] = await db
    .insert(packageItems)
    .values({
      packageId: Number(packageId),
      serviceId: body.serviceId,
      details: body.details,
      detailsRu: body.detailsRu,
      detailsEt: body.detailsEt,
      dateFrom: body.dateFrom ?? null,
      dateTo: body.dateTo ?? null,
      imageUrl: body.imageUrl ?? null,
      note: body.note ?? null,
      noteRu: body.noteRu ?? null,
      noteEt: body.noteEt ?? null,
      pricingMode: body.pricingMode,
      price: String(body.price),
      days: body.days,
      quantity: body.quantity,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;

  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { id, ...fields } = body;

  if (fields.price !== undefined) {
    fields.price = String(fields.price);
  }

  const [updated] = await db
    .update(packageItems)
    .set(fields)
    .where(eq(packageItems.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(packageItems)
    .where(eq(packageItems.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
