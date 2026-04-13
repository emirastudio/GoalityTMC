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
} from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

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
    // Данные из квеста проживания (для автозаполнения)
    questData: {
      players: registration.accomPlayers ?? 0,
      staff: registration.accomStaff ?? 0,
      accompanying: registration.accomAccompanying ?? 0,
      checkIn: registration.accomCheckIn ?? null,
      checkOut: registration.accomCheckOut ?? null,
      confirmed: registration.accomConfirmed ?? false,
    },
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
