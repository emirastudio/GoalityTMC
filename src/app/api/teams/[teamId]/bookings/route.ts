import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  teams,
  tournamentRegistrations,
  packageAssignments,
  servicePackages,
  accommodationOptions,
  extraMealOptions,
  transferOptions,
  registrationFees,
  teamServiceOverrides,
  teamBookings,
  registrationPeople,
  people,
  tournaments,
  teamOfferingDeals,
} from "@/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { buildManyDealBreakdowns } from "@/lib/offerings/calculator";

async function authorizeTeam(teamId: number, clubId: number) {
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });
  if (!team) return null;
  if (team.clubId !== clubId) return null;
  return team;
}

// GET /api/teams/[teamId]/bookings
// Returns available services + current bookings for this team
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

  const team = await authorizeTeam(tid, session.clubId);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
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

  // ─── Offerings v3 path ─────────────────────────────────────
  // If the tournament runs on v3, the club sees the organiser's published
  // deals as a read-only catalogue (no step-wizard). Fall through to the
  // legacy path only when v3 is OFF.
  const [tourRow] = await db
    .select({ v3: tournaments.offeringsV3Enabled })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (tourRow?.v3) {
    const dealRows = await db
      .select({ id: teamOfferingDeals.id, isPublished: teamOfferingDeals.isPublished })
      .from(teamOfferingDeals)
      .where(eq(teamOfferingDeals.registrationId, registration.id));
    const publishedIds = dealRows.filter(d => d.isPublished).map(d => d.id);
    if (publishedIds.length === 0) {
      return NextResponse.json({ available: false, v3: true });
    }
    const breakdowns = await buildManyDealBreakdowns(publishedIds);
    const orderedDeals = publishedIds
      .map(id => breakdowns[id])
      .filter(Boolean);
    const currency = orderedDeals[0]?.currency ?? "EUR";
    const grandTotalCents = orderedDeals.reduce((s, b) => s + b.totalCents, 0);
    const paidCents = orderedDeals.reduce((s, b) => s + b.paidCents, 0);
    return NextResponse.json({
      available: true,
      v3: true,
      deals: orderedDeals,
      currency,
      grandTotalCents,
      paidCents,
      outstandingCents: Math.max(0, grandTotalCents - paidCents),
    });
  }

  // Check if package has been assigned AND published
  const assignment = await db.query.packageAssignments.findFirst({
    where: eq(packageAssignments.registrationId, registration.id),
  });

  if (!assignment || !assignment.isPublished) {
    return NextResponse.json({ available: false });
  }

  // Get the package to find linked accommodation option
  const pkg = await db.query.servicePackages.findFirst({
    where: eq(servicePackages.id, assignment.packageId),
  });

  // All service types are always included (old per-package flags were removed)
  const includeAccommodation = true;
  const includeTransfer = true;
  const includeRegistration = true;
  const includeMeals = true;

  // Load accommodation options for this tournament
  const accommodation = await db.query.accommodationOptions.findMany({
    where: eq(accommodationOptions.tournamentId, tournamentId),
    orderBy: [asc(accommodationOptions.sortOrder)],
  });

  // Load service options — filtered by package flags
  const [meals, transfers, registrationFee] = await Promise.all([
    includeMeals
      ? db.query.extraMealOptions.findMany({
          where: eq(extraMealOptions.tournamentId, tournamentId),
          orderBy: [asc(extraMealOptions.sortOrder)],
        })
      : Promise.resolve([]),
    includeTransfer
      ? db.query.transferOptions.findMany({
          where: eq(transferOptions.tournamentId, tournamentId),
          orderBy: [asc(transferOptions.sortOrder)],
        })
      : Promise.resolve([]),
    includeRegistration
      ? db.query.registrationFees.findFirst({
          where: eq(registrationFees.tournamentId, tournamentId),
        })
      : Promise.resolve(null),
  ]);

  // Load team-level overrides (custom prices or disabled options)
  const overrides = await db.query.teamServiceOverrides.findMany({
    where: eq(teamServiceOverrides.registrationId, registration.id),
  });

  // Load existing bookings for this registration
  const bookings = await db.query.teamBookings.findMany({
    where: eq(teamBookings.registrationId, registration.id),
  });

  return NextResponse.json({
    available: true,
    accommodation,
    meals,
    transfers,
    registration: registrationFee ?? null,
    bookings,
    overrides,
    freeSlots: {
      players: assignment.freePlayersCount ?? 0,
      staff: assignment.freeStaffCount ?? 0,
      accompanying: assignment.freeAccompanyingCount ?? 0,
      mealsOverride: assignment.mealsCountOverride ?? null,
    },
    // Данные из квеста проживания (для автозаполнения).
    // Счётчики теперь — из registrationPeople.needsHotel, а не из ручного ввода.
    questData: await (async () => {
      const counts = await db
        .select({
          personType: people.personType,
          cnt: sql<number>`COUNT(*)::int`,
        })
        .from(registrationPeople)
        .innerJoin(people, eq(people.id, registrationPeople.personId))
        .where(and(eq(registrationPeople.registrationId, registration.id), eq(registrationPeople.needsHotel, true)))
        .groupBy(people.personType);
      const by = Object.fromEntries(counts.map((r) => [r.personType, Number(r.cnt)]));
      return {
        players: by.player ?? 0,
        staff: by.staff ?? 0,
        accompanying: by.accompanying ?? 0,
        checkIn: registration.accomCheckIn ?? null,
        checkOut: registration.accomCheckOut ?? null,
        confirmed: registration.accomConfirmed ?? false,
      };
    })(),
  });
}

// POST /api/teams/[teamId]/bookings
// Save bookings — replaces all existing bookings for this team
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

  const team = await authorizeTeam(tid, session.clubId);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
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

  const body: {
    bookings: {
      bookingType: "accommodation" | "meal" | "transfer" | "registration" | "custom";
      serviceId: number;
      quantity: number;
      unitPrice: string;
      notes?: string;
    }[];
  } = await req.json();

  if (!body?.bookings || !Array.isArray(body.bookings)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Delete existing bookings and insert new ones atomically
  await db.transaction(async (tx) => {
    await tx.delete(teamBookings).where(eq(teamBookings.registrationId, registration.id));

    if (body.bookings.length > 0) {
      const rows = body.bookings.map((b) => ({
        registrationId: registration.id,
        bookingType: b.bookingType,
        serviceId: b.serviceId,
        quantity: b.quantity,
        unitPrice: b.unitPrice,
        total: (parseFloat(b.unitPrice) * b.quantity).toFixed(2),
        notes: b.notes ?? null,
      }));

      await tx.insert(teamBookings).values(rows);
    }
  });

  const saved = await db.query.teamBookings.findMany({
    where: eq(teamBookings.registrationId, registration.id),
  });

  return NextResponse.json({ ok: true, bookings: saved });
}
