import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, teams, clubs, payments } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.registrationOpen, true),
  });
  if (!tournament) {
    return NextResponse.json(
      { error: "No active tournament" },
      { status: 404 }
    );
  }

  const result = await db
    .select({
      id: payments.id,
      teamId: payments.teamId,
      amount: payments.amount,
      currency: payments.currency,
      method: payments.method,
      status: payments.status,
      reference: payments.reference,
      notes: payments.notes,
      receivedAt: payments.receivedAt,
      createdAt: payments.createdAt,
      teamName: teams.name,
      teamRegNumber: teams.regNumber,
      clubName: clubs.name,
    })
    .from(payments)
    .innerJoin(teams, eq(payments.teamId, teams.id))
    .leftJoin(clubs, eq(teams.clubId, clubs.id))
    .where(eq(teams.tournamentId, tournament.id))
    .orderBy(payments.createdAt);

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { teamId, amount, method, status, reference, notes, receivedAt } = body;

  if (!teamId || !amount) {
    return NextResponse.json(
      { error: "teamId and amount are required" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(payments)
    .values({
      teamId,
      amount: String(amount),
      method: method ?? "bank_transfer",
      status: status ?? "pending",
      reference: reference ?? null,
      notes: notes ?? null,
      receivedAt: receivedAt ? new Date(receivedAt) : null,
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
  const { id, status, notes } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Nothing to update" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(payments)
    .set(updates)
    .where(eq(payments.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, teamId, amount, method, status, reference, notes, receivedAt } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const [updated] = await db
    .update(payments)
    .set({
      teamId: teamId ? Number(teamId) : undefined,
      amount: amount !== undefined ? String(amount) : undefined,
      method: method ?? undefined,
      status: status ?? undefined,
      reference: reference !== undefined ? (reference || null) : undefined,
      notes: notes !== undefined ? (notes || null) : undefined,
      receivedAt: receivedAt !== undefined ? (receivedAt ? new Date(receivedAt) : null) : undefined,
    })
    .where(eq(payments.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(payments)
    .where(eq(payments.id, Number(id)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
