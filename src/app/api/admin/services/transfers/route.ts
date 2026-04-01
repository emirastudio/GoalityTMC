import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, transferOptions } from "@/db/schema";
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

  const options = await db.query.transferOptions.findMany({
    where: eq(transferOptions.tournamentId, tournament.id),
    orderBy: (o, { asc }) => [asc(o.sortOrder)],
  });

  return NextResponse.json(options);
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

  const [created] = await db
    .insert(transferOptions)
    .values({
      tournamentId: tournament.id,
      name: body.name,
      nameRu: body.nameRu,
      nameEt: body.nameEt,
      description: body.description,
      descriptionRu: body.descriptionRu,
      descriptionEt: body.descriptionEt,
      pricePerPerson: String(body.pricePerPerson),
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { id, ...fields } = body;

  if (fields.pricePerPerson !== undefined) fields.pricePerPerson = String(fields.pricePerPerson);

  const [updated] = await db
    .update(transferOptions)
    .set(fields)
    .where(eq(transferOptions.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  let id = Number(searchParams.get("id"));

  if (!id) {
    const body = await req.json().catch(() => ({}));
    id = body.id;
  }

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(transferOptions)
    .where(eq(transferOptions.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
