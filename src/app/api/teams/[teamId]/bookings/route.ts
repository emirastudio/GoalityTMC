import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  teams,
  packageAssignments,
  servicePackages,
  accommodationOptions,
  extraMealOptions,
  transferOptions,
  registrationFees,
  teamServiceOverrides,
  teamBookings,
} from "@/db/schema";
import { eq, asc } from "drizzle-orm";
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

  // Check if package has been assigned AND published
  const assignment = await db.query.packageAssignments.findFirst({
    where: eq(packageAssignments.teamId, tid),
  });

  if (!assignment || !assignment.isPublished) {
    return NextResponse.json({ available: false });
  }

  // Get the package to find linked accommodation option
  const pkg = await db.query.servicePackages.findFirst({
    where: eq(servicePackages.id, assignment.packageId),
  });

  const tournamentId = team.tournamentId;

  // Determine which service types are included in this package
  const includeAccommodation = pkg?.includeAccommodation ?? true;
  const includeTransfer = pkg?.includeTransfer ?? true;
  const includeRegistration = pkg?.includeRegistration ?? true;
  const includeMeals = pkg?.includeMeals ?? true;

  // Load accommodation — respects package flag + specific option if set
  const accommodation = !includeAccommodation
    ? []
    : pkg?.accommodationOptionId
    ? await db.query.accommodationOptions.findMany({
        where: eq(accommodationOptions.id, pkg.accommodationOptionId),
      })
    : await db.query.accommodationOptions.findMany({
        where: eq(accommodationOptions.tournamentId, tournamentId),
        orderBy: [asc(accommodationOptions.sortOrder)],
      });

  // Load service options — filtered by package flags
  const [meals, transfers, registration] = await Promise.all([
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
    where: eq(teamServiceOverrides.teamId, tid),
  });

  // Load existing bookings for this team
  const bookings = await db.query.teamBookings.findMany({
    where: eq(teamBookings.teamId, tid),
  });

  return NextResponse.json({
    available: true,
    accommodation,
    meals,
    transfers,
    registration: registration ?? null,
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
      players: team.accomPlayers ?? 0,
      staff: team.accomStaff ?? 0,
      accompanying: team.accomAccompanying ?? 0,
      checkIn: team.accomCheckIn ?? null,
      checkOut: team.accomCheckOut ?? null,
      confirmed: team.accomConfirmed ?? false,
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
    await tx.delete(teamBookings).where(eq(teamBookings.teamId, tid));

    if (body.bookings.length > 0) {
      const rows = body.bookings.map((b) => ({
        teamId: tid,
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
    where: eq(teamBookings.teamId, tid),
  });

  return NextResponse.json({ ok: true, bookings: saved });
}
