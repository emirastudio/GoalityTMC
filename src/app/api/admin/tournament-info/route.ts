import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, tournamentInfo } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.registrationOpen, true),
  });
  if (!tournament) {
    return NextResponse.json(
      { error: "No active tournament" },
      { status: 404 }
    );
  }

  const info = await db.query.tournamentInfo.findFirst({
    where: eq(tournamentInfo.tournamentId, tournament.id),
  });

  return NextResponse.json(info ?? { tournamentId: tournament.id });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.registrationOpen, true),
  });
  if (!tournament) {
    return NextResponse.json(
      { error: "No active tournament" },
      { status: 404 }
    );
  }

  const body = await req.json();

  const values = {
    tournamentId: tournament.id,
    scheduleUrl: body.scheduleUrl ?? null,
    scheduleDescription: body.scheduleDescription ?? null,
    hotelName: body.hotelName ?? null,
    hotelAddress: body.hotelAddress ?? null,
    hotelCheckIn: body.hotelCheckIn ?? null,
    hotelCheckOut: body.hotelCheckOut ?? null,
    hotelNotes: body.hotelNotes ?? null,
    venueName: body.venueName ?? null,
    venueAddress: body.venueAddress ?? null,
    venueMapUrl: body.venueMapUrl ?? null,
    mealTimes: body.mealTimes ?? null,
    mealLocation: body.mealLocation ?? null,
    mealNotes: body.mealNotes ?? null,
    emergencyContact: body.emergencyContact ?? null,
    emergencyPhone: body.emergencyPhone ?? null,
    additionalNotes: body.additionalNotes ?? null,
    updatedAt: new Date(),
  };

  const existing = await db.query.tournamentInfo.findFirst({
    where: eq(tournamentInfo.tournamentId, tournament.id),
  });

  let result;
  if (existing) {
    [result] = await db
      .update(tournamentInfo)
      .set(values)
      .where(eq(tournamentInfo.tournamentId, tournament.id))
      .returning();
  } else {
    [result] = await db.insert(tournamentInfo).values(values).returning();
  }

  return NextResponse.json(result);
}
