import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, tournamentProducts, teams, teamPriceOverrides, tournamentRegistrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// Get orders + available products for a team
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  const tid = parseInt(teamId);

  const team = await db.query.teams.findFirst({
    where: eq(teams.id, tid),
  });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  if (team.clubId !== session.clubId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Load registration
  const registration = await db.query.tournamentRegistrations.findFirst({
    where: session.tournamentId
      ? and(eq(tournamentRegistrations.teamId, tid), eq(tournamentRegistrations.tournamentId, session.tournamentId))
      : eq(tournamentRegistrations.teamId, tid),
    orderBy: (r, { desc }) => [desc(r.id)],
  });
  if (!registration) {
    return NextResponse.json({ error: "No registration found" }, { status: 404 });
  }

  // Get all products for the tournament
  const products = await db.query.tournamentProducts.findMany({
    where: eq(tournamentProducts.tournamentId, registration.tournamentId),
    orderBy: (p, { asc }) => [asc(p.sortOrder)],
  });

  // Get custom price overrides for this registration
  const overrides = await db.query.teamPriceOverrides.findMany({
    where: eq(teamPriceOverrides.registrationId, registration.id),
  });
  const overrideMap = new Map(overrides.map((o) => [o.productId, o.customPrice]));

  // Get existing orders
  const existingOrders = await db.query.orders.findMany({
    where: eq(orders.registrationId, registration.id),
  });
  const orderMap = new Map(existingOrders.map((o) => [o.productId, o]));

  // Merge: products + effective price + current order quantity
  const result = products.map((p) => {
    const customPrice = overrideMap.get(p.id);
    const effectivePrice = customPrice ?? p.price;
    const order = orderMap.get(p.id);
    return {
      productId: p.id,
      name: p.name,
      nameRu: p.nameRu,
      nameEt: p.nameEt,
      description: p.description,
      descriptionRu: p.descriptionRu,
      descriptionEt: p.descriptionEt,
      basePrice: p.price,
      effectivePrice,
      hasCustomPrice: !!customPrice,
      category: p.category,
      isRequired: p.isRequired,
      includedQuantity: p.includedQuantity,
      perPerson: p.perPerson,
      quantity: order?.quantity ?? (p.isRequired ? p.includedQuantity : 0),
      total: order?.total ?? "0",
    };
  });

  return NextResponse.json(result);
}

// Save/update orders
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  const tid = parseInt(teamId);

  const team = await db.query.teams.findFirst({ where: eq(teams.id, tid) });
  if (!team || team.clubId !== session.clubId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Load registration
  const registration = await db.query.tournamentRegistrations.findFirst({
    where: session.tournamentId
      ? and(eq(tournamentRegistrations.teamId, tid), eq(tournamentRegistrations.tournamentId, session.tournamentId))
      : eq(tournamentRegistrations.teamId, tid),
    orderBy: (r, { desc }) => [desc(r.id)],
  });
  if (!registration) {
    return NextResponse.json({ error: "No registration found" }, { status: 404 });
  }

  const body: { productId: number; quantity: number; unitPrice: string }[] = await req.json();

  for (const item of body) {
    const total = (parseFloat(item.unitPrice) * item.quantity).toFixed(2);

    const existing = await db.query.orders.findFirst({
      where: and(eq(orders.registrationId, registration.id), eq(orders.productId, item.productId)),
    });

    if (existing) {
      await db
        .update(orders)
        .set({ quantity: item.quantity, unitPrice: item.unitPrice, total, updatedAt: new Date() })
        .where(eq(orders.id, existing.id));
    } else {
      await db.insert(orders).values({
        registrationId: registration.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
