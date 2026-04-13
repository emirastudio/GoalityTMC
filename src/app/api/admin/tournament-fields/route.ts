import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentFields } from "@/db/schema";
import { requireTournamentAdmin, requireAdmin, isError } from "@/lib/api-auth";
import { eq, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;
  const { tournament } = ctx;

  const fields = await db.query.tournamentFields.findMany({
    where: eq(tournamentFields.tournamentId, tournament.id),
    orderBy: [asc(tournamentFields.sortOrder), asc(tournamentFields.id)],
    with: { stadium: { columns: { id: true, name: true } } },
  });

  return NextResponse.json(fields);
}

export async function POST(req: NextRequest) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;
  const { tournament } = ctx;

  const body = await req.json();
  const [field] = await db
    .insert(tournamentFields)
    .values({
      tournamentId: tournament.id,
      name: body.name,
      address: body.address ?? null,
      mapUrl: body.mapUrl ?? null,
      scheduleUrl: body.scheduleUrl ?? null,
      notes: body.notes ?? null,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json(field);
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const body = await req.json();
  const { id, ...values } = body;

  const [updated] = await db
    .update(tournamentFields)
    .set({
      name: values.name,
      address: values.address ?? null,
      mapUrl: values.mapUrl ?? null,
      scheduleUrl: values.scheduleUrl ?? null,
      notes: values.notes ?? null,
      sortOrder: values.sortOrder ?? 0,
    })
    .where(eq(tournamentFields.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") ?? "0");

  await db.delete(tournamentFields).where(eq(tournamentFields.id, id));

  return NextResponse.json({ ok: true });
}
