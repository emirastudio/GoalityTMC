import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentHotels, tournamentRegistrations } from "@/db/schema";
import { requireTournamentAdmin, requireAdmin, isError } from "@/lib/api-auth";
import { eq, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;
  const { tournament } = ctx;

  const hotels = await db.query.tournamentHotels.findMany({
    where: eq(tournamentHotels.tournamentId, tournament.id),
    orderBy: [asc(tournamentHotels.sortOrder), asc(tournamentHotels.id)],
  });

  return NextResponse.json(hotels);
}

export async function POST(req: NextRequest) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;
  const { tournament } = ctx;

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
      photoUrl: body.photoUrl ?? null,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json(hotel);
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

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
      photoUrl: values.photoUrl ?? null,
      sortOrder: values.sortOrder ?? 0,
    })
    .where(eq(tournamentHotels.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") ?? "0");

  // Unassign registrations from this hotel before deleting
  await db
    .update(tournamentRegistrations)
    .set({ hotelId: null })
    .where(eq(tournamentRegistrations.hotelId, id));

  await db.delete(tournamentHotels).where(eq(tournamentHotels.id, id));

  return NextResponse.json({ ok: true });
}
