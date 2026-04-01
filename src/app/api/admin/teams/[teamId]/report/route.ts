import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  teams, clubs, tournamentClasses, people, packageAssignments, servicePackages,
  teamBookings, teamServiceOverrides, payments, teamTravel, tournamentInfo,
  accommodationOptions, extraMealOptions, transferOptions, registrationFees, tournamentHotels,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { recalculateAll } from "@/lib/booking-calculator";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await context.params;
  const teamIdNum = Number(teamId);

  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamIdNum) });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const [club, tournamentClass, allPeople, assignment] = await Promise.all([
    team.clubId ? db.query.clubs.findFirst({ where: eq(clubs.id, team.clubId) }) : Promise.resolve(null),
    team.classId ? db.query.tournamentClasses.findFirst({ where: eq(tournamentClasses.id, team.classId) }) : Promise.resolve(null),
    db.query.people.findMany({ where: eq(people.teamId, teamIdNum) }),
    db.query.packageAssignments.findFirst({ where: eq(packageAssignments.teamId, teamIdNum) }),
  ]);

  const playerCount = allPeople.filter((p) => p.personType === "player").length;
  const staffCount = allPeople.filter((p) => p.personType === "staff").length;
  const accompanyingCount = allPeople.filter((p) => p.personType === "accompanying").length;

  let packageInfo = null;
  if (assignment) {
    packageInfo = await db.query.servicePackages.findFirst({ where: eq(servicePackages.id, assignment.packageId) });
  }

  // Load raw bookings + overrides + current service prices
  const [rawBookings, overrides, accommodations, meals, transfers, regFees] = await Promise.all([
    db.query.teamBookings.findMany({
      where: eq(teamBookings.teamId, teamIdNum),
      orderBy: (b, { asc }) => [asc(b.createdAt)],
    }),
    db.query.teamServiceOverrides.findMany({ where: eq(teamServiceOverrides.teamId, teamIdNum) }),
    db.query.accommodationOptions.findMany({ where: eq(accommodationOptions.tournamentId, team.tournamentId) }),
    db.query.extraMealOptions.findMany({ where: eq(extraMealOptions.tournamentId, team.tournamentId) }),
    db.query.transferOptions.findMany({ where: eq(transferOptions.tournamentId, team.tournamentId) }),
    db.query.registrationFees.findMany({ where: eq(registrationFees.tournamentId, team.tournamentId) }),
  ]);

  // ─── Recalculate all booking prices from current settings ─────────────────
  const services = {
    accommodation: accommodations.map((a) => ({
      id: a.id,
      pricePerPlayer: a.pricePerPlayer,
      pricePerStaff: a.pricePerStaff,
      pricePerAccompanying: a.pricePerAccompanying,
    })),
    meals: meals.map((m) => ({ id: m.id, pricePerPerson: m.pricePerPerson })),
    transfers: transfers.map((t) => ({ id: t.id, pricePerPerson: t.pricePerPerson })),
    registration: regFees.map((r) => ({ id: r.id, price: r.price })),
  };

  const { bookings: recalcBookings, total: totalFromBookings } = recalculateAll(
    rawBookings,
    services,
    overrides
  );

  // Payments
  const [paymentTotals, paymentsHistory] = await Promise.all([
    db.query.payments.findMany({
      where: and(eq(payments.teamId, teamIdNum), eq(payments.status, "received")),
    }),
    db.query.payments.findMany({
      where: eq(payments.teamId, teamIdNum),
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    }),
  ]);
  const totalPaid = paymentTotals.reduce((s, p) => s + parseFloat(p.amount), 0);

  // Travel + tournament data
  const [travel, tInfo, assignedHotel, availableHotels] = await Promise.all([
    db.query.teamTravel.findFirst({ where: eq(teamTravel.teamId, teamIdNum) }),
    db.query.tournamentInfo.findFirst({ where: eq(tournamentInfo.tournamentId, team.tournamentId) }),
    team.hotelId ? db.query.tournamentHotels.findFirst({ where: eq(tournamentHotels.id, team.hotelId) }) : Promise.resolve(null),
    db.query.tournamentHotels.findMany({
      where: eq(tournamentHotels.tournamentId, team.tournamentId),
      orderBy: (h, { asc }) => [asc(h.sortOrder), asc(h.id)],
    }),
  ]);

  return NextResponse.json({
    team: {
      id: team.id, name: team.name, regNumber: team.regNumber, status: team.status,
      notes: team.notes, hotelId: team.hotelId ?? null,
      accomPlayers: team.accomPlayers ?? 0, accomStaff: team.accomStaff ?? 0,
      accomAccompanying: team.accomAccompanying ?? 0,
      accomCheckIn: team.accomCheckIn ?? null, accomCheckOut: team.accomCheckOut ?? null,
      accomNotes: team.accomNotes ?? null,
      accomDeclined: team.accomDeclined, accomConfirmed: team.accomConfirmed,
    },
    club: club ? {
      id: club.id, name: club.name, badgeUrl: club.badgeUrl,
      contactName: club.contactName, contactEmail: club.contactEmail,
      contactPhone: club.contactPhone, country: club.country, city: club.city,
    } : null,
    class: tournamentClass ? {
      id: tournamentClass.id, name: tournamentClass.name,
      minBirthYear: tournamentClass.minBirthYear, maxBirthYear: tournamentClass.maxBirthYear,
    } : null,
    people: {
      all: allPeople,
      counts: { players: playerCount, staff: staffCount, accompanying: accompanyingCount, total: allPeople.length },
    },
    package: packageInfo ? {
      id: packageInfo.id, name: packageInfo.name,
      assignedAt: assignment!.assignedAt, isPublished: assignment!.isPublished,
      accommodationOptionId: packageInfo.accommodationOptionId ?? null,
      includeAccommodation: packageInfo.includeAccommodation ?? true,
      includeTransfer: packageInfo.includeTransfer ?? true,
      includeRegistration: packageInfo.includeRegistration ?? true,
      includeMeals: packageInfo.includeMeals ?? true,
      freePlayersCount: assignment!.freePlayersCount ?? 0,
      freeStaffCount: assignment!.freeStaffCount ?? 0,
      freeAccompanyingCount: assignment!.freeAccompanyingCount ?? 0,
      mealsCountOverride: assignment!.mealsCountOverride ?? null,
    } : null,
    bookings: recalcBookings,     // ← live prices, not stored
    overrides,
    finance: {
      totalFromBookings,           // ← recalculated
      totalPaid,
      balance: totalFromBookings - totalPaid,
    },
    payments: paymentsHistory,
    travel: travel ?? null,
    assignedHotel: assignedHotel ? {
      id: assignedHotel.id, name: assignedHotel.name, address: assignedHotel.address,
      contactName: assignedHotel.contactName, contactPhone: assignedHotel.contactPhone,
      contactEmail: assignedHotel.contactEmail, notes: assignedHotel.notes,
    } : null,
    availableHotels: availableHotels.map((h) => ({ id: h.id, name: h.name, address: h.address })),
    tournamentInfo: tInfo ? {
      scheduleUrl: tInfo.scheduleUrl, hotelName: tInfo.hotelName, hotelAddress: tInfo.hotelAddress,
      hotelCheckIn: tInfo.hotelCheckIn, hotelCheckOut: tInfo.hotelCheckOut, hotelNotes: tInfo.hotelNotes,
      venueName: tInfo.venueName, venueAddress: tInfo.venueAddress, venueMapUrl: tInfo.venueMapUrl,
      mealTimes: tInfo.mealTimes, mealLocation: tInfo.mealLocation, mealNotes: tInfo.mealNotes,
      emergencyContact: tInfo.emergencyContact, emergencyPhone: tInfo.emergencyPhone,
    } : null,
    services: {
      accommodation: accommodations.map((a) => ({
        id: a.id, name: a.name, checkIn: a.checkIn, checkOut: a.checkOut,
        pricePerPlayer: a.pricePerPlayer, pricePerStaff: a.pricePerStaff,
        pricePerAccompanying: a.pricePerAccompanying,
        includedMeals: a.includedMeals, mealNote: a.mealNote,
      })),
      meals: meals.map((m) => ({ id: m.id, name: m.name, pricePerPerson: m.pricePerPerson, perDay: m.perDay, description: m.description })),
      transfers: transfers.map((t) => ({ id: t.id, name: t.name, pricePerPerson: t.pricePerPerson, description: t.description })),
      registration: regFees.map((r) => ({ id: r.id, name: r.name, price: r.price, isRequired: r.isRequired })),
    },
  });
}
