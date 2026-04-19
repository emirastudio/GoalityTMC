import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, teams, clubs, organizations, payments, tournamentRegistrations } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq, inArray } from "drizzle-orm";
import { getEffectivePlan, assertFeature, type TournamentPlan } from "@/lib/plan-gates";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const urlTournamentId = req.nextUrl.searchParams.get("tournamentId");
  let tournament;
  if (urlTournamentId) {
    tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, parseInt(urlTournamentId)),
    });
  } else {
    tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.registrationOpen, true),
    });
  }
  if (!tournament) {
    return NextResponse.json(
      { error: "No active tournament" },
      { status: 404 }
    );
  }

  // Get all registrationIds for this tournament
  const registrations = await db
    .select({ id: tournamentRegistrations.id, teamId: tournamentRegistrations.teamId, regNumber: tournamentRegistrations.regNumber })
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.tournamentId, tournament.id));
  const registrationIds = registrations.map((r) => r.id);

  if (registrationIds.length === 0) {
    return NextResponse.json([]);
  }

  // Build a map from registrationId → { teamId, regNumber }
  const regMap = new Map(registrations.map((r) => [r.id, r]));

  const rawPayments = await db
    .select({
      id: payments.id,
      registrationId: payments.registrationId,
      amount: payments.amount,
      currency: payments.currency,
      method: payments.method,
      status: payments.status,
      reference: payments.reference,
      notes: payments.notes,
      receivedAt: payments.receivedAt,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .where(inArray(payments.registrationId, registrationIds))
    .orderBy(payments.createdAt);

  // Enrich with team/club info
  const teamIds = [...new Set(registrations.map((r) => r.teamId))];
  const teamsWithClubs = teamIds.length > 0
    ? await db
        .select({ id: teams.id, name: teams.name, clubName: clubs.name })
        .from(teams)
        .leftJoin(clubs, eq(teams.clubId, clubs.id))
        .where(inArray(teams.id, teamIds))
    : [];
  const teamMap = new Map(teamsWithClubs.map((t) => [t.id, t]));

  const result = rawPayments.map((p) => {
    const reg = regMap.get(p.registrationId);
    const team = reg ? teamMap.get(reg.teamId) : undefined;
    return {
      ...p,
      teamId: reg?.teamId ?? null,
      teamName: team?.name ?? null,
      teamRegNumber: reg?.regNumber ?? null,
      clubName: team?.clubName ?? null,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const body = await req.json();
  const { registrationId, amount, method, status, reference, notes, receivedAt } = body;

  if (!registrationId || !amount) {
    return NextResponse.json(
      { error: "registrationId and amount are required" },
      { status: 400 }
    );
  }

  // Plan gate: hasFinance (Pro+). Resolve effective plan via registration → tournament → org.
  const [ctx] = await db
    .select({
      tournamentPlan: tournaments.plan,
      eliteSubStatus: organizations.eliteSubStatus,
    })
    .from(tournamentRegistrations)
    .innerJoin(tournaments, eq(tournaments.id, tournamentRegistrations.tournamentId))
    .innerJoin(organizations, eq(organizations.id, tournaments.organizationId))
    .where(eq(tournamentRegistrations.id, Number(registrationId)))
    .limit(1);
  if (!ctx) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }
  const effectivePlan = getEffectivePlan(
    (ctx.tournamentPlan as TournamentPlan) ?? "free",
    ctx.eliteSubStatus
  );
  const gate = assertFeature(effectivePlan, "hasFinance");
  if (gate) return gate;

  const [created] = await db
    .insert(payments)
    .values({
      registrationId,
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
  const session = await requireAdmin();
  if (isError(session)) return session;

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
  const session = await requireAdmin();
  if (isError(session)) return session;

  const body = await req.json();
  const { id, registrationId, amount, method, status, reference, notes, receivedAt } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const [updated] = await db
    .update(payments)
    .set({
      registrationId: registrationId ? Number(registrationId) : undefined,
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
  const session = await requireAdmin();
  if (isError(session)) return session;

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
