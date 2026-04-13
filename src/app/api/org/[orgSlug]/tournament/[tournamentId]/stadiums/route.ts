import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentStadiums, tournamentFields } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, asc } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string };

// GET /api/org/.../stadiums — list stadiums with their fields
export async function GET(req: NextRequest, { params }: { params: Promise<Params> }) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const stadiums = await db.query.tournamentStadiums.findMany({
    where: eq(tournamentStadiums.tournamentId, ctx.tournament.id),
    orderBy: [asc(tournamentStadiums.sortOrder), asc(tournamentStadiums.createdAt)],
    with: {
      fields: {
        orderBy: [asc(tournamentFields.sortOrder), asc(tournamentFields.createdAt)],
      },
    },
  });

  // Also return standalone fields (no stadium)
  const standaloneFields = await db.query.tournamentFields.findMany({
    where: eq(tournamentFields.tournamentId, ctx.tournament.id),
    orderBy: [asc(tournamentFields.sortOrder), asc(tournamentFields.createdAt)],
  });
  const standalone = standaloneFields.filter(f => f.stadiumId === null);

  return NextResponse.json({ stadiums, standaloneFields: standalone });
}

// POST /api/org/.../stadiums — create a stadium
export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = await req.json();
  const { name, address, contactName, contactPhone, mapsUrl, wazeUrl, notes } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const [stadium] = await db
    .insert(tournamentStadiums)
    .values({
      tournamentId: ctx.tournament.id,
      name: name.trim(),
      address: address?.trim() || null,
      contactName: contactName?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
      mapsUrl: mapsUrl?.trim() || null,
      wazeUrl: wazeUrl?.trim() || null,
      notes: notes?.trim() || null,
    })
    .returning();

  return NextResponse.json(stadium, { status: 201 });
}
