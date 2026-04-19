import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  teams, clubs, tournamentClasses, people, packageAssignments, servicePackages,
  teamBookings, teamServiceOverrides, payments, teamTravel, tournamentInfo,
  accommodationOptions, extraMealOptions, transferOptions, registrationFees, tournamentHotels,
  tournamentRegistrations, registrationPeople,
} from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq, and, sql } from "drizzle-orm";
import { recalculateAll } from "@/lib/booking-calculator";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { teamId } = await context.params;
  const teamIdNum = Number(teamId);

  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamIdNum) });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  // Load the tournament registration for this team (use tournamentId from query param if provided)
  const urlTournamentId = req.nextUrl.searchParams.get("tournamentId");
  const registration = await db.query.tournamentRegistrations.findFirst({
    where: urlTournamentId
      ? and(eq(tournamentRegistrations.teamId, teamIdNum), eq(tournamentRegistrations.tournamentId, Number(urlTournamentId)))
      : eq(tournamentRegistrations.teamId, teamIdNum),
  });
  if (!registration) return NextResponse.json({ error: "Registration not found" }, { status: 404 });

  const [club, tournamentClass, allPeople, assignment] = await Promise.all([
    team.clubId ? db.query.clubs.findFirst({ where: eq(clubs.id, team.clubId) }) : Promise.resolve(null),
    registration.classId ? db.query.tournamentClasses.findFirst({ where: eq(tournamentClasses.id, registration.classId) }) : Promise.resolve(null),
    db.query.people.findMany({ where: eq(people.teamId, teamIdNum) }),
    db.query.packageAssignments.findFirst({ where: eq(packageAssignments.registrationId, registration.id) }),
  ]);

  const playerCount = allPeople.filter((p) => p.personType === "player").length;
  const staffCount = allPeople.filter((p) => p.personType === "staff").length;
  const accompanyingCount = allPeople.filter((p) => p.personType === "accompanying").length;

  // Pivot — поездочные поля людей в этой регистрации. Маппим в allPeople,
  // чтобы UI админки (team-detail-page) продолжал получать единый объект
  // с полями allergies/medicalNotes/needsHotel и т. д. — как раньше, но
  // теперь per-turnament, а не вечно.
  const pivotRows = await db
    .select()
    .from(registrationPeople)
    .where(eq(registrationPeople.registrationId, registration.id));
  const pivotByPerson = new Map(pivotRows.map((r) => [r.personId, r]));

  const allPeopleEnriched = allPeople.map((p) => {
    const rp = pivotByPerson.get(p.id);
    return {
      ...p,
      shirtNumber: rp?.shirtNumber ?? null,
      isResponsibleOnSite: rp?.isResponsibleOnSite ?? false,
      needsHotel: rp?.needsHotel ?? false,
      needsTransfer: false, // removed in 0018 — больше не поле
      allergies: rp?.allergies ?? null,
      dietaryRequirements: rp?.dietaryRequirements ?? null,
      medicalNotes: rp?.medicalNotes ?? null,
      includedInRoster: rp?.includedInRoster ?? false,
    };
  });

  // Accommodation «declared» counts — берём из самой регистрации (0020).
  // Клуб выставляет цифры в форме accom quest на /team/overview, админ видит
  // их здесь. Галки «в отель» на ростере живут параллельно как справочная
  // информация и source-of-truth для списка проживающих, но pricing
  // управляется именно этими числами.
  const accomPlayers = registration.accomPlayers ?? 0;
  const accomStaff = registration.accomStaff ?? 0;
  const accomAccompanying = registration.accomAccompanying ?? 0;

  let packageInfo = null;
  if (assignment) {
    packageInfo = await db.query.servicePackages.findFirst({ where: eq(servicePackages.id, assignment.packageId) });
  }

  // Load raw bookings + overrides + current service prices
  const [rawBookings, overrides, accommodations, meals, transfers, regFees] = await Promise.all([
    db.query.teamBookings.findMany({
      where: eq(teamBookings.registrationId, registration.id),
      orderBy: (b, { asc }) => [asc(b.createdAt)],
    }),
    db.query.teamServiceOverrides.findMany({ where: eq(teamServiceOverrides.registrationId, registration.id) }),
    db.query.accommodationOptions.findMany({ where: eq(accommodationOptions.tournamentId, registration.tournamentId) }),
    db.query.extraMealOptions.findMany({ where: eq(extraMealOptions.tournamentId, registration.tournamentId) }),
    db.query.transferOptions.findMany({ where: eq(transferOptions.tournamentId, registration.tournamentId) }),
    db.query.registrationFees.findMany({ where: eq(registrationFees.tournamentId, registration.tournamentId) }),
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
      where: and(eq(payments.registrationId, registration.id), eq(payments.status, "received")),
    }),
    db.query.payments.findMany({
      where: eq(payments.registrationId, registration.id),
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    }),
  ]);
  const totalPaid = paymentTotals.reduce((s, p) => s + parseFloat(p.amount), 0);

  // Travel + tournament data
  const [travel, tInfo, assignedHotel, availableHotels] = await Promise.all([
    db.query.teamTravel.findFirst({ where: eq(teamTravel.registrationId, registration.id) }),
    db.query.tournamentInfo.findFirst({ where: eq(tournamentInfo.tournamentId, registration.tournamentId) }),
    registration.hotelId ? db.query.tournamentHotels.findFirst({ where: eq(tournamentHotels.id, registration.hotelId) }) : Promise.resolve(null),
    db.query.tournamentHotels.findMany({
      where: eq(tournamentHotels.tournamentId, registration.tournamentId),
      orderBy: (h, { asc }) => [asc(h.sortOrder), asc(h.id)],
    }),
  ]);

  return NextResponse.json({
    team: {
      id: team.id, name: team.name,
      registrationId: registration.id,
      regNumber: registration.regNumber, status: registration.status,
      notes: registration.notes, hotelId: registration.hotelId ?? null,
      accomPlayers, accomStaff, accomAccompanying,
      accomCheckIn: registration.accomCheckIn ?? null, accomCheckOut: registration.accomCheckOut ?? null,
      accomNotes: registration.accomNotes ?? null,
      accomDeclined: registration.accomDeclined, accomConfirmed: registration.accomConfirmed,
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
      all: allPeopleEnriched,
      counts: { players: playerCount, staff: staffCount, accompanying: accompanyingCount, total: allPeople.length },
    },
    package: packageInfo ? {
      id: packageInfo.id, name: packageInfo.name,
      assignedAt: assignment!.assignedAt, isPublished: assignment!.isPublished,
      includeAccommodation: true,
      includeTransfer: true,
      includeRegistration: true,
      includeMeals: true,
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
      photoUrl: assignedHotel.photoUrl,
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
