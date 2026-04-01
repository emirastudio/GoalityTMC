import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  teams, clubs, people, teamTravel, packageAssignments,
  servicePackages, teamBookings, teamServiceOverrides, payments,
  tournaments, tournamentClasses,
  accommodationOptions, extraMealOptions, transferOptions, registrationFees,
} from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAdmin, isError } from "@/lib/api-auth";
import { recalculateAll, type ServiceData, type OverrideData } from "@/lib/booking-calculator";

export async function GET() {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.registrationOpen, true),
  });
  if (!tournament) return NextResponse.json([], { status: 200 });

  const allTeams = await db
    .select({
      id: teams.id, name: teams.name, regNumber: teams.regNumber,
      status: teams.status, classId: teams.classId, clubId: teams.clubId,
      accomPlayers: teams.accomPlayers, accomStaff: teams.accomStaff,
      accomAccompanying: teams.accomAccompanying,
      accomCheckIn: teams.accomCheckIn, accomCheckOut: teams.accomCheckOut,
      accomConfirmed: teams.accomConfirmed, accomDeclined: teams.accomDeclined,
    })
    .from(teams)
    .where(eq(teams.tournamentId, tournament.id));

  if (allTeams.length === 0) return NextResponse.json([], { status: 200 });

  const teamIds = allTeams.map((t) => t.id);

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
    // Travel
    db.select().from(teamTravel).where(inArray(teamTravel.teamId, teamIds)),
    // Package assignments
    db.select({
      teamId: packageAssignments.teamId, packageId: packageAssignments.packageId,
      isPublished: packageAssignments.isPublished,
      freePlayersCount: packageAssignments.freePlayersCount,
      freeStaffCount: packageAssignments.freeStaffCount,
      freeAccompanyingCount: packageAssignments.freeAccompanyingCount,
    }).from(packageAssignments).where(inArray(packageAssignments.teamId, teamIds)),
    // Packages (fetched after assignRows - we'll join below)
    db.select().from(servicePackages).where(eq(servicePackages.tournamentId, tournament.id)),
    // All teamBookings (individual rows — needed for live recalc)
    db.select().from(teamBookings).where(inArray(teamBookings.teamId, teamIds)),
    // All per-team overrides
    db.select().from(teamServiceOverrides).where(inArray(teamServiceOverrides.teamId, teamIds)),
    // Current service prices
    db.select().from(accommodationOptions).where(eq(accommodationOptions.tournamentId, tournament.id)),
    db.select().from(extraMealOptions).where(eq(extraMealOptions.tournamentId, tournament.id)),
    db.select().from(transferOptions).where(eq(transferOptions.tournamentId, tournament.id)),
    db.select().from(registrationFees).where(eq(registrationFees.tournamentId, tournament.id)),
    // Payments
    db.select({
      teamId: payments.teamId,
      totalPaid: sql<number>`SUM(CASE WHEN status = 'received' THEN amount ELSE 0 END)`,
    }).from(payments).where(inArray(payments.teamId, teamIds)).groupBy(payments.teamId),
  ]);

  // ─── Build maps ───────────────────────────────────────────────────────────
  const clubMap = new Map(clubsData.map((c) => [c.id, c]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const pkgMap = new Map(pkgsData.map((p) => [p.id, p]));
  const assignMap = new Map(assignRows.map((a) => [a.teamId, a]));
  const travelMap = new Map(travelRows.map((t) => [t.teamId, t]));
  const paymentMap = new Map(paymentRows.map((p) => [p.teamId, Number(p.totalPaid ?? 0)]));

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

  // Bookings per team (raw rows grouped by teamId)
  const bookingsByTeam = new Map<number, typeof allBookings>();
  for (const b of allBookings) {
    if (!bookingsByTeam.has(b.teamId)) bookingsByTeam.set(b.teamId, []);
    bookingsByTeam.get(b.teamId)!.push(b);
  }

  // Overrides per team
  const overridesByTeam = new Map<number, OverrideData[]>();
  for (const o of allOverrides) {
    if (!overridesByTeam.has(o.teamId)) overridesByTeam.set(o.teamId, []);
    overridesByTeam.get(o.teamId)!.push({
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

  // Transfer teams (has any transfer booking)
  const transferTeams = new Set(
    allBookings.filter((b) => b.bookingType === "transfer").map((b) => b.teamId)
  );

  // ─── Assemble rows with LIVE price recalculation ──────────────────────────
  const rows = allTeams.map((team) => {
    const club = team.clubId ? clubMap.get(team.clubId) : null;
    const cls = team.classId ? classMap.get(team.classId) : null;
    const counts = countsMap.get(team.id) ?? { players: 0, staff: 0, accompanying: 0 };
    const travel = travelMap.get(team.id) ?? null;
    const assign = assignMap.get(team.id) ?? null;
    const pkg = assign ? pkgMap.get(assign.packageId) : null;
    const paid = paymentMap.get(team.id) ?? 0;

    // Recalculate this team's bookings from current prices
    const rawBookings = bookingsByTeam.get(team.id) ?? [];
    const teamOverrides = overridesByTeam.get(team.id) ?? [];
    const { bookings: recalc, total: totalOrdered } = recalculateAll(
      rawBookings, sharedServices, teamOverrides
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
      hasTransfer: transferTeams.has(team.id),
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
