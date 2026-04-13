import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  orders, payments, teams, tournamentProducts, teamBookings,
  teamServiceOverrides, accommodationOptions, extraMealOptions,
  transferOptions, registrationFees, tournamentRegistrations,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { recalculateAll } from "@/lib/booking-calculator";

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

  const team = await db.query.teams.findFirst({ where: eq(teams.id, tid) });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  const tournamentId = registration.tournamentId;

  // Legacy orders (old model)
  const teamOrders = await db
    .select({
      productName: tournamentProducts.name,
      productNameRu: tournamentProducts.nameRu,
      productNameEt: tournamentProducts.nameEt,
      category: tournamentProducts.category,
      quantity: orders.quantity,
      unitPrice: orders.unitPrice,
      total: orders.total,
    })
    .from(orders)
    .innerJoin(tournamentProducts, eq(orders.productId, tournamentProducts.id))
    .where(eq(orders.registrationId, registration.id));

  // New model: fetch raw bookings + live service prices + per-team overrides
  const [rawBookings, overrides, accommodations, meals, transfers, regFees] = await Promise.all([
    db.query.teamBookings.findMany({ where: eq(teamBookings.registrationId, registration.id) }),
    db.query.teamServiceOverrides.findMany({ where: eq(teamServiceOverrides.registrationId, registration.id) }),
    db.query.accommodationOptions.findMany({ where: eq(accommodationOptions.tournamentId, tournamentId) }),
    db.query.extraMealOptions.findMany({ where: eq(extraMealOptions.tournamentId, tournamentId) }),
    db.query.transferOptions.findMany({ where: eq(transferOptions.tournamentId, tournamentId) }),
    db.query.registrationFees.findMany({ where: eq(registrationFees.tournamentId, tournamentId) }),
  ]);

  const services = {
    accommodation: accommodations.map((a) => ({
      id: a.id, pricePerPlayer: a.pricePerPlayer,
      pricePerStaff: a.pricePerStaff, pricePerAccompanying: a.pricePerAccompanying,
    })),
    meals: meals.map((m) => ({ id: m.id, pricePerPerson: m.pricePerPerson })),
    transfers: transfers.map((t) => ({ id: t.id, pricePerPerson: t.pricePerPerson })),
    registration: regFees.map((r) => ({ id: r.id, price: r.price })),
  };

  // ─── Recalculate from CURRENT prices — ignores stored unitPrice ───────────
  const { bookings: recalcBookings, total: bookingTotal } = recalculateAll(
    rawBookings, services, overrides
  );

  // Build display lines with human-readable names
  const bookingLines = recalcBookings.map((b) => {
    let productName = b.bookingType;
    if (b.bookingType === "accommodation") {
      const opt = accommodations.find((a) => a.id === b.serviceId);
      const personLabel = b.notes ?? "players";
      productName = `${opt?.name ?? "Accommodation"} (${personLabel})`;
    } else if (b.bookingType === "transfer") {
      const opt = transfers.find((t) => t.id === b.serviceId);
      productName = opt?.name ?? "Transfer";
    } else if (b.bookingType === "registration") {
      const opt = regFees.find((r) => r.id === b.serviceId);
      productName = opt?.name ?? "Registration Fee";
    } else if (b.bookingType === "meal") {
      const opt = meals.find((m) => m.id === b.serviceId);
      productName = opt?.name ?? "Meal";
    }
    return {
      productName,
      productNameRu: null,
      productNameEt: null,
      category: b.bookingType,
      quantity: b.quantity,
      unitPrice: b.unitPrice,
      total: b.total,
    };
  });

  const allLines = [...teamOrders, ...bookingLines];

  // Legacy orders subtotal
  const [orderTotalRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${orders.total}::numeric), 0)` })
    .from(orders)
    .where(eq(orders.registrationId, registration.id));
  const legacyTotal = parseFloat(orderTotalRow?.total ?? "0");

  const totalToPay = legacyTotal + bookingTotal;

  // Payments
  const [teamPayments, receivedPayments] = await Promise.all([
    db.query.payments.findMany({
      where: eq(payments.registrationId, registration.id),
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    }),
    db.query.payments.findMany({
      where: and(eq(payments.registrationId, registration.id), eq(payments.status, "received")),
    }),
  ]);
  const totalPaid = receivedPayments.reduce((s, p) => s + parseFloat(p.amount), 0);

  return NextResponse.json({
    orders: allLines,
    payments: teamPayments,
    totalToPay: totalToPay.toFixed(2),
    totalPaid: totalPaid.toFixed(2),
    balance: (totalPaid - totalToPay).toFixed(2),
  });
}
