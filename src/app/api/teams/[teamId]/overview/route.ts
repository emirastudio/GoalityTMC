import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  teams, people, teamBookings, orders, teamTravel, payments,
  tournamentClasses, tournamentInfo, tournaments, tournamentHotels,
  teamServiceOverrides, accommodationOptions, extraMealOptions,
  transferOptions, registrationFees, tournamentRegistrations,
} from "@/db/schema";
import { eq, and, count, sql, desc } from "drizzle-orm";
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

  // Find the registration for this team. If session has a tournamentId, use it;
  // otherwise fall back to the latest registration.
  let registration = null;
  if (session.tournamentId) {
    registration = await db.query.tournamentRegistrations.findFirst({
      where: and(
        eq(tournamentRegistrations.teamId, tid),
        eq(tournamentRegistrations.tournamentId, session.tournamentId)
      ),
    });
  }
  if (!registration) {
    registration = await db.query.tournamentRegistrations.findFirst({
      where: eq(tournamentRegistrations.teamId, tid),
      orderBy: [desc(tournamentRegistrations.createdAt)],
    });
  }
  if (!registration) {
    return NextResponse.json({ error: "No registration found for this team" }, { status: 404 });
  }

  const tournamentId = registration.tournamentId;
  const regId = registration.id;

  const teamClass = registration.classId
    ? await db.query.tournamentClasses.findFirst({ where: eq(tournamentClasses.id, registration.classId) })
    : null;

  // Counts
  const [playerCount] = await db.select({ count: count() }).from(people)
    .where(and(eq(people.teamId, tid), eq(people.personType, "player")));
  const [staffCount] = await db.select({ count: count() }).from(people)
    .where(and(eq(people.teamId, tid), eq(people.personType, "staff")));
  const [accompanyingCount] = await db.select({ count: count() }).from(people)
    .where(and(eq(people.teamId, tid), eq(people.personType, "accompanying")));

  // Responsible staff
  const responsibleStaff = await db.query.people.findFirst({
    where: and(eq(people.teamId, tid), eq(people.personType, "staff"), eq(people.isResponsibleOnSite, true)),
  });

  // Travel — now keyed by registrationId
  const travel = await db.query.teamTravel.findFirst({ where: eq(teamTravel.registrationId, regId) });

  // Hotel & transfer — check via teamBookings.registrationId
  const [accomBookingRow] = await db.select({ count: count() }).from(teamBookings)
    .where(and(eq(teamBookings.registrationId, regId), eq(teamBookings.bookingType, "accommodation")));
  const [transferBookingRow] = await db.select({ count: count() }).from(teamBookings)
    .where(and(eq(teamBookings.registrationId, regId), eq(teamBookings.bookingType, "transfer")));
  const hotelCount = { count: Number(accomBookingRow?.count ?? 0) > 0 ? 1 : 0 };
  const transferCount = { count: Number(transferBookingRow?.count ?? 0) > 0 ? 1 : 0 };

  // Legacy orders total — now keyed by registrationId
  const [legacyOrderTotal] = await db
    .select({ total: sql<string>`COALESCE(SUM(${orders.total}::numeric), 0)` })
    .from(orders)
    .where(eq(orders.registrationId, regId));

  // New bookings: recalculate from CURRENT prices + overrides
  const [rawBookings, overrides, accommodations, meals, transfers, regFees] = await Promise.all([
    db.query.teamBookings.findMany({ where: eq(teamBookings.registrationId, regId) }),
    db.query.teamServiceOverrides.findMany({ where: eq(teamServiceOverrides.registrationId, regId) }),
    db.query.accommodationOptions.findMany({ where: eq(accommodationOptions.tournamentId, tournamentId) }),
    db.query.extraMealOptions.findMany({ where: eq(extraMealOptions.tournamentId, tournamentId) }),
    db.query.transferOptions.findMany({ where: eq(transferOptions.tournamentId, tournamentId) }),
    db.query.registrationFees.findMany({ where: eq(registrationFees.tournamentId, tournamentId) }),
  ]);

  const { total: liveBookingTotal } = recalculateAll(rawBookings, {
    accommodation: accommodations.map((a) => ({
      id: a.id, pricePerPlayer: a.pricePerPlayer,
      pricePerStaff: a.pricePerStaff, pricePerAccompanying: a.pricePerAccompanying,
    })),
    meals: meals.map((m) => ({ id: m.id, pricePerPerson: m.pricePerPerson })),
    transfers: transfers.map((t) => ({ id: t.id, pricePerPerson: t.pricePerPerson })),
    registration: regFees.map((r) => ({ id: r.id, price: r.price })),
  }, overrides);

  const orderTotal = {
    total: (parseFloat(legacyOrderTotal?.total ?? "0") + liveBookingTotal).toFixed(2),
  };

  // Payments total — now keyed by registrationId
  const [paymentTotal] = await db
    .select({ total: sql<string>`COALESCE(SUM(${payments.amount}::numeric), 0)` })
    .from(payments)
    .where(and(eq(payments.registrationId, regId), eq(payments.status, "received")));

  // Tournament info
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  });
  const [tInfo, assignedHotel] = await Promise.all([
    tournament
      ? db.query.tournamentInfo.findFirst({ where: eq(tournamentInfo.tournamentId, tournament.id) })
      : Promise.resolve(null),
    registration.hotelId
      ? db.query.tournamentHotels.findFirst({ where: eq(tournamentHotels.id, registration.hotelId) })
      : Promise.resolve(null),
  ]);

  // Allergies & dietary list (anyone with allergies OR dietary requirements)
  const allergies = await db.query.people.findMany({
    where: and(
      eq(people.teamId, tid),
      sql`(COALESCE(${people.allergies}, '') != '' OR COALESCE(${people.dietaryRequirements}, '') != '')`
    ),
    columns: { firstName: true, lastName: true, allergies: true, dietaryRequirements: true },
  });

  // Calculate completion
  const checks = {
    hasPlayers: Number(playerCount?.count ?? 0) > 0,
    hasStaff: Number(staffCount?.count ?? 0) > 0,
    hasResponsible: !!responsibleStaff,
    hasTravel: !!(travel?.arrivalDate),
    hasOrders: registration.accomConfirmed || registration.accomDeclined || parseFloat(orderTotal?.total ?? "0") > 0,
  };
  const completedSteps = Object.values(checks).filter(Boolean).length;
  const totalSteps = Object.keys(checks).length;
  const completionPercent = Math.round((completedSteps / totalSteps) * 100);

  return NextResponse.json({
    team,
    registration,
    accomPlayers: registration.accomPlayers ?? 0,
    accomStaff: registration.accomStaff ?? 0,
    accomAccompanying: registration.accomAccompanying ?? 0,
    accomCheckIn: registration.accomCheckIn ?? null,
    accomCheckOut: registration.accomCheckOut ?? null,
    accomNotes: registration.accomNotes ?? null,
    accomDeclined: registration.accomDeclined,
    accomConfirmed: registration.accomConfirmed,
    minBirthYear: teamClass?.minBirthYear ?? null,
    counts: {
      players: Number(playerCount?.count ?? 0),
      staff: Number(staffCount?.count ?? 0),
      accompanying: Number(accompanyingCount?.count ?? 0),
      hotel: Number(hotelCount?.count ?? 0),
      transfer: Number(transferCount?.count ?? 0),
    },
    finance: {
      totalOrdered: orderTotal?.total ?? "0",
      totalPaid: paymentTotal?.total ?? "0",
      balance: (parseFloat(paymentTotal?.total ?? "0") - parseFloat(orderTotal?.total ?? "0")).toFixed(2),
    },
    checks,
    completionPercent,
    allergies,
    hasTravel: !!(travel?.arrivalDate),
    tournamentInfo: tInfo ?? null,
    assignedHotel: assignedHotel ? {
      name: assignedHotel.name,
      address: assignedHotel.address,
      contactName: assignedHotel.contactName,
      contactPhone: assignedHotel.contactPhone,
      notes: assignedHotel.notes,
    } : null,
  });
}
