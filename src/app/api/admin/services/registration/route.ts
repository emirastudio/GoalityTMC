import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { registrationFees } from "@/db/schema";
import { requireTournamentAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;
  const { tournament } = ctx;

  const fee = await db.query.registrationFees.findFirst({
    where: eq(registrationFees.tournamentId, tournament.id),
  });

  return NextResponse.json(fee ?? null);
}

export async function POST(req: NextRequest) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;
  const { tournament } = ctx;

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
