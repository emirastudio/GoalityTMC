import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, tournamentHotels, teams } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";

async function getActiveTournament() {
  return db.query.tournaments.findFirst({
    where: eq(tournaments.registrationOpen, true),
  });
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tournament = await getActiveTournament();
  if (!tournament)
    return NextResponse.json({ error: "No active tournament" }, { status: 404 });

  const hotels = await db.query.tournamentHotels.findMany({
    where: eq(tournamentHotels.tournamentId, tournament.id),
    orderBy: [asc(tournamentHotels.sortOrder), asc(tournamentHotels.id)],
  });

  return NextResponse.json(hotels);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tournament = await getActiveTournament();
  if (!tournament)
    return NextResponse.json({ error: "No active tournament" }, { status: 404 });

  const body = await req.json();
  const [hotel] = await db
    .insert(tournamentHotels)
    .values({
      tournamentId: tournament.id,
      name: body.name,
      address: body.address ?? null,
      contactName: body.contactName ?? null,
      contactPhone: body.contactPhone ?? null,
      contactEmail: body.contactEmail ?? null,
      notes: body.notes ?? null,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json(hotel);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...values } = body;

  const [updated] = await db
    .update(tournamentHotels)
    .set({
      name: values.name,
      address: values.address ?? null,
      contactName: values.contactName ?? null,
      contactPhone: values.contactPhone ?? null,
      contactEmail: values.contactEmail ?? null,
      notes: values.notes ?? null,
      sortOrder: values.sortOrder ?? 0,
    })
    .where(eq(tournamentHotels.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") ?? "0");

  // Unassign teams from this hotel before deleting
  await db
    .update(teams)
    .set({ hotelId: null })
    .where(eq(teams.hotelId, id));

  await db.delete(tournamentHotels).where(eq(tournamentHotels.id, id));

  return NextResponse.json({ ok: true });
}
