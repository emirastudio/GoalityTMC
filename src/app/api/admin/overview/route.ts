import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  teams, clubs, people, teamTravel, packageAssignments,
  servicePackages, teamBookings, teamServiceOverrides, payments,
  tournaments, tournamentClasses,
  accommodationOptions, extraMealOptions, transferOptions, registrationFees,
  tournamentRegistrations,
} from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAdmin, isError } from "@/lib/api-auth";
import { recalculateAll, type ServiceData, type OverrideData } from "@/lib/booking-calculator";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const urlTournamentId = req.nextUrl.searchParams.get("tournamentId");
  let tournament;
  if (urlTournamentId) {
    tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, parseInt(urlTournamentId)),
    });
  } else {
    tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.registrationOpen, true),
    });
  }
  if (!tournament) return NextResponse.json([], { status: 200 });

  // Load registrations for this tournament, joined with teams
  const allRegs = await db
    .select({
      regId: tournamentRegistrations.id,
      id: teams.id, name: teams.name, clubId: teams.clubId,
      regNumber: tournamentRegistrations.regNumber,
      status: tournamentRegistrations.status,
      classId: tournamentRegistrations.classId,
      accomPlayers: tournamentRegistrations.accomPlayers,
      accomStaff: tournamentRegistrations.accomStaff,
      accomAccompanying: tournamentRegistrations.accomAccompanying,
      accomCheckIn: tournamentRegistrations.accomCheckIn,
      accomCheckOut: tournamentRegistrations.accomCheckOut,
      accomConfirmed: tournamentRegistrations.accomConfirmed,
      accomDeclined: tournamentRegistrations.accomDeclined,
    })
    .from(tournamentRegistrations)
    .innerJoin(teams, eq(tournamentRegistrations.teamId, teams.id))
    .where(eq(tournamentRegistrations.tournamentId, tournament.id));

  // Alias for backward compat in existing logic below
  const allTeams = allRegs;

  if (allTeams.length === 0) return NextResponse.json([], { status: 200 });

  const teamIds = allTeams.map((t) => t.id);
  const regIds = allTeams.map((t) => t.regId);

  // ─── Batch load all data ──────────────────────────────────────────────────
  const [
    clubsData, classes, peopleCounts, travelRows,
    assignRows, pkgsData,
    allBookings, allOverrides,
    accomOpts, mealOpts, transferOpts, regFeeRows,
    paymentRows,
  ] = await Promise.all([
    // Clubs
    (() => {
      const ids = [...new Set(allTeams.map((t) => t.clubId).filter(Boolean))] as number[];
      return ids.length ? db.select().from(clubs).where(inArray(clubs.id, ids)) : Promise.resolve([]);
    })(),
    // Classes
    db.select().from(tournamentClasses).where(eq(tournamentClasses.tournamentId, tournament.id)),
    // People counts
    db.select({ teamId: people.teamId, personType: people.personType, count: sql<number>`COUNT(*)` })
      .from(people).where(inArray(people.teamId, teamIds))
      .groupBy(people.teamId, people.personType),
    // Travel (now uses registrationId)
    db.select().from(teamTravel).where(inArray(teamTravel.registrationId, regIds)),
    // Package assignments (now uses registrationId)
    db.select({
      registrationId: packageAssignments.registrationId, packageId: packageAssignments.packageId,
      isPublished: packageAssignments.isPublished,
      freePlayersCount: packageAssignments.freePlayersCount,
      freeStaffCount: packageAssignments.freeStaffCount,
      freeAccompanyingCount: packageAssignments.freeAccompanyingCount,
    }).from(packageAssignments).where(inArray(packageAssignments.registrationId, regIds)),
    // Packages (fetched after assignRows - we'll join below)
    db.select().from(servicePackages).where(eq(servicePackages.tournamentId, tournament.id)),
    // All teamBookings (now uses registrationId)
    db.select().from(teamBookings).where(inArray(teamBookings.registrationId, regIds)),
    // All per-registration overrides
    db.select().from(teamServiceOverrides).where(inArray(teamServiceOverrides.registrationId, regIds)),
    // Current service prices
    db.select().from(accommodationOptions).where(eq(accommodationOptions.tournamentId, tournament.id)),
    db.select().from(extraMealOptions).where(eq(extraMealOptions.tournamentId, tournament.id)),
    db.select().from(transferOptions).where(eq(transferOptions.tournamentId, tournament.id)),
    db.select().from(registrationFees).where(eq(registrationFees.tournamentId, tournament.id)),
    // Payments (now uses registrationId)
    db.select({
      registrationId: payments.registrationId,
      totalPaid: sql<number>`SUM(CASE WHEN status = 'received' THEN amount ELSE 0 END)`,
    }).from(payments).where(inArray(payments.registrationId, regIds)).groupBy(payments.registrationId),
  ]);

  // ─── Build maps ───────────────────────────────────────────────────────────
  const clubMap = new Map(clubsData.map((c) => [c.id, c]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const pkgMap = new Map(pkgsData.map((p) => [p.id, p]));
  const assignMap = new Map(assignRows.map((a) => [a.registrationId, a]));
  const travelMap = new Map(travelRows.map((t) => [t.registrationId, t]));
  const paymentMap = new Map(paymentRows.map((p) => [p.registrationId, Number(p.totalPaid ?? 0)]));

  // People counts map
  type Counts = { players: number; staff: number; accompanying: number };
  const countsMap = new Map<number, Counts>();
  for (const row of peopleCounts) {
    if (!countsMap.has(row.teamId)) countsMap.set(row.teamId, { players: 0, staff: 0, accompanying: 0 });
    const c = countsMap.get(row.teamId)!;
    if (row.personType === "player") c.players = Number(row.count);
    if (row.personType === "staff") c.staff = Number(row.count);
    if (row.personType === "accompanying") c.accompanying = Number(row.count);
  }

  // Bookings per registration (raw rows grouped by registrationId)
  const bookingsByReg = new Map<number, typeof allBookings>();
  for (const b of allBookings) {
    if (!bookingsByReg.has(b.registrationId)) bookingsByReg.set(b.registrationId, []);
    bookingsByReg.get(b.registrationId)!.push(b);
  }

  // Overrides per registration
  const overridesByReg = new Map<number, OverrideData[]>();
  for (const o of allOverrides) {
    if (!overridesByReg.has(o.registrationId)) overridesByReg.set(o.registrationId, []);
    overridesByReg.get(o.registrationId)!.push({
      serviceType: o.serviceType, serviceId: o.serviceId, customPrice: o.customPrice,
    });
  }

  // Shared service data (same prices for all teams — overrides are per-team)
  const sharedServices: ServiceData = {
    accommodation: accomOpts.map((a) => ({
      id: a.id, pricePerPlayer: a.pricePerPlayer,
      pricePerStaff: a.pricePerStaff, pricePerAccompanying: a.pricePerAccompanying,
    })),
    meals: mealOpts.map((m) => ({ id: m.id, pricePerPerson: m.pricePerPerson })),
    transfers: transferOpts.map((t) => ({ id: t.id, pricePerPerson: t.pricePerPerson })),
    registration: regFeeRows.map((r) => ({ id: r.id, price: r.price })),
  };

  // Transfer registrations (has any transfer booking)
  const transferRegs = new Set(
    allBookings.filter((b) => b.bookingType === "transfer").map((b) => b.registrationId)
  );

  // ─── Assemble rows with LIVE price recalculation ──────────────────────────
  const rows = allTeams.map((team) => {
    const club = team.clubId ? clubMap.get(team.clubId) : null;
    const cls = team.classId ? classMap.get(team.classId) : null;
    const counts = countsMap.get(team.id) ?? { players: 0, staff: 0, accompanying: 0 };
    const travel = travelMap.get(team.regId) ?? null;
    const assign = assignMap.get(team.regId) ?? null;
    const pkg = assign ? pkgMap.get(assign.packageId) : null;
    const paid = paymentMap.get(team.regId) ?? 0;

    // Recalculate this registration's bookings from current prices
    const rawBookings = bookingsByReg.get(team.regId) ?? [];
    const regOverrides = overridesByReg.get(team.regId) ?? [];
    const { bookings: recalc, total: totalOrdered } = recalculateAll(
      rawBookings, sharedServices, regOverrides
    );

    // Break down by type
    const byType = { accommodation: 0, transfer: 0, registration: 0, meal: 0 };
    for (const b of recalc) {
      const t = parseFloat(b.total);
      if (b.bookingType === "accommodation") byType.accommodation += t;
      else if (b.bookingType === "transfer") byType.transfer += t;
      else if (b.bookingType === "registration") byType.registration += t;
      else if (b.bookingType === "meal") byType.meal += t;
    }

    return {
      id: team.id, regNumber: team.regNumber, status: team.status,
      clubName: club?.name ?? null, country: club?.country ?? null,
      city: club?.city ?? null, badgeUrl: club?.badgeUrl ?? null,
      teamName: team.name, division: cls?.name ?? null,
      players: counts.players, staff: counts.staff, accompanying: counts.accompanying,
      arrivalDate: travel?.arrivalDate ? travel.arrivalDate.toISOString().split("T")[0] : null,
      arrivalTime: travel?.arrivalTime ?? null,
      departureDate: travel?.departureDate ? travel.departureDate.toISOString().split("T")[0] : null,
      departureTime: travel?.departureTime ?? null,
      accomConfirmed: team.accomConfirmed, accomDeclined: team.accomDeclined,
      accomPlayers: team.accomPlayers, accomStaff: team.accomStaff,
      accomAccompanying: team.accomAccompanying,
      accomCheckIn: team.accomCheckIn, accomCheckOut: team.accomCheckOut,
      hasTransfer: transferRegs.has(team.regId),
      packageName: pkg?.name ?? null, packagePublished: assign?.isPublished ?? false,
      totalOrdered,
      accommodationTotal: byType.accommodation,
      transferTotal: byType.transfer,
      registrationTotal: byType.registration,
      mealTotal: byType.meal,
      paid,
      balance: paid - totalOrdered,
    };
  });

  rows.sort((a, b) => a.regNumber - b.regNumber);
  return NextResponse.json(rows);
}
