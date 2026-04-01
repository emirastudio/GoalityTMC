import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, registrationFees } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

async function getActiveTournament() {
  return db.query.tournaments.findFirst({
    where: eq(tournaments.registrationOpen, true),
  });
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournament = await getActiveTournament();
  if (!tournament) {
    return NextResponse.json({ error: "No active tournament" }, { status: 404 });
  }

  const fee = await db.query.registrationFees.findFirst({
    where: eq(registrationFees.tournamentId, tournament.id),
  });

  return NextResponse.json(fee ?? null);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournament = await getActiveTournament();
  if (!tournament) {
    return NextResponse.json({ error: "No active tournament" }, { status: 404 });
  }

  const body = await req.json();

  // Check if a registration fee already exists for this tournament
  const existing = await db.query.registrationFees.findFirst({
    where: eq(registrationFees.tournamentId, tournament.id),
  });

  if (existing) {
    // Update existing
    const [updated] = await db
      .update(registrationFees)
      .set({
        name: body.name ?? existing.name,
        nameRu: body.nameRu !== undefined ? body.nameRu : existing.nameRu,
        nameEt: body.nameEt !== undefined ? body.nameEt : existing.nameEt,
        price: body.price !== undefined ? String(body.price) : existing.price,
        isRequired: body.isRequired !== undefined ? body.isRequired : existing.isRequired,
      })
      .where(eq(registrationFees.id, existing.id))
      .returning();

    return NextResponse.json(updated);
  }

  // Create new
  const [created] = await db
    .insert(registrationFees)
    .values({
      tournamentId: tournament.id,
      name: body.name ?? "Registration fee",
      nameRu: body.nameRu,
      nameEt: body.nameEt,
      price: String(body.price),
      isRequired: body.isRequired ?? true,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
