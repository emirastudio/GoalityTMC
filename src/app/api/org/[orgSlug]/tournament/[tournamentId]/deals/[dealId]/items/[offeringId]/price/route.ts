import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dealItemOverrides, offerings, teamOfferingDeals, tournamentRegistrations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireV3Tournament } from "@/lib/offerings/guard";

type Params = { orgSlug: string; tournamentId: string; dealId: string; offeringId: string };

async function assertDealAndOffering(tournamentId: number, dealId: number, offeringId: number) {
  const [deal] = await db
    .select({ id: teamOfferingDeals.id, tId: tournamentRegistrations.tournamentId })
    .from(teamOfferingDeals)
    .innerJoin(tournamentRegistrations, eq(tournamentRegistrations.id, teamOfferingDeals.registrationId))
    .where(eq(teamOfferingDeals.id, dealId))
    .limit(1);
  if (!deal || deal.tId !== tournamentId) return null;
  const [off] = await db
    .select({ id: offerings.id })
    .from(offerings)
    .where(and(eq(offerings.id, offeringId), eq(offerings.tournamentId, tournamentId)))
    .limit(1);
  if (!off) return null;
  return true;
}

// PUT — upsert a price override for one line inside a deal.
// Body: { priceCents: number, reason?: string }
export async function PUT(req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const dealId = parseInt(p.dealId);
  const offeringId = parseInt(p.offeringId);
  const ok = await assertDealAndOffering(guard.tournament.id, dealId, offeringId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const priceCents = Math.floor(Number(body.priceCents));
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return NextResponse.json({ error: "priceCents must be a non-negative integer" }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : null;

  // Upsert.
  const [existing] = await db
    .select({ id: dealItemOverrides.id })
    .from(dealItemOverrides)
    .where(and(eq(dealItemOverrides.dealId, dealId), eq(dealItemOverrides.offeringId, offeringId)))
    .limit(1);

  if (existing) {
    const [row] = await db
      .update(dealItemOverrides)
      .set({ priceCentsOverride: priceCents, reason, updatedAt: new Date() })
      .where(eq(dealItemOverrides.id, existing.id))
      .returning();
    return NextResponse.json({ override: row });
  }
  const [row] = await db
    .insert(dealItemOverrides)
    .values({
      dealId,
      offeringId,
      priceCentsOverride: priceCents,
      reason,
      createdBy: guard.userId,
    })
    .returning();
  return NextResponse.json({ override: row }, { status: 201 });
}

// DELETE — clear the override (returns the line to its base price).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const dealId = parseInt(p.dealId);
  const offeringId = parseInt(p.offeringId);
  const ok = await assertDealAndOffering(guard.tournament.id, dealId, offeringId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .delete(dealItemOverrides)
    .where(and(eq(dealItemOverrides.dealId, dealId), eq(dealItemOverrides.offeringId, offeringId)));
  return NextResponse.json({ ok: true });
}
