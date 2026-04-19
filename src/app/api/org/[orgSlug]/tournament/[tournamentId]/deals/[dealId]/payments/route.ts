import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dealPayments, teamOfferingDeals, tournamentRegistrations } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { requireV3Tournament } from "@/lib/offerings/guard";

type Params = { orgSlug: string; tournamentId: string; dealId: string };

async function dealInTournament(tournamentId: number, dealId: number) {
  const [row] = await db
    .select({ dealId: teamOfferingDeals.id, tId: tournamentRegistrations.tournamentId })
    .from(teamOfferingDeals)
    .innerJoin(tournamentRegistrations, eq(tournamentRegistrations.id, teamOfferingDeals.registrationId))
    .where(eq(teamOfferingDeals.id, dealId))
    .limit(1);
  return row && row.tId === tournamentId ? row.dealId : null;
}

// GET — payment history for a deal.
export async function GET(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const dealId = parseInt(p.dealId);
  const ok = await dealInTournament(guard.tournament.id, dealId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db.select().from(dealPayments).where(eq(dealPayments.dealId, dealId)).orderBy(desc(dealPayments.receivedAt));
  return NextResponse.json({ payments: rows });
}

// POST — record a manual payment (Phase 1: organiser collects money
// off-platform and marks it here). Body:
//   { amountCents: number, method?: 'bank_transfer'|'stripe'|'cash',
//     receivedAt?: iso, reference?: string, note?: string }
export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const dealId = parseInt(p.dealId);
  const ok = await dealInTournament(guard.tournament.id, dealId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const amountCents = Math.floor(Number(body.amountCents));
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: "amountCents must be a positive integer" }, { status: 400 });
  }
  const method = ["bank_transfer", "stripe", "cash"].includes(body.method) ? body.method : "bank_transfer";

  const [row] = await db.insert(dealPayments).values({
    dealId,
    amountCents,
    currency: typeof body.currency === "string" ? body.currency.slice(0, 3) : "EUR",
    method,
    receivedAt: body.receivedAt ? new Date(body.receivedAt) : new Date(),
    reference: typeof body.reference === "string" ? body.reference : null,
    note: typeof body.note === "string" ? body.note : null,
    recordedBy: guard.userId,
  }).returning();

  return NextResponse.json({ payment: row }, { status: 201 });
}
