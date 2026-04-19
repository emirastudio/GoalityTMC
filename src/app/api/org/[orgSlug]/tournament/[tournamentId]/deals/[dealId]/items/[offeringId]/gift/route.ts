import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dealItemOverrides, offerings, teamOfferingDeals, tournamentRegistrations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireV3Tournament } from "@/lib/offerings/guard";

// Gift toggle — wraps dealItemOverrides with a canonical reason so the
// frontend can distinguish "organiser gifted this service" from "organiser
// manually discounted the price to something non-zero".
//
// POST   → upsert override { priceCents: 0, reason: "Gift" }
// DELETE → clear override entirely (line returns to base price)

type Params = { orgSlug: string; tournamentId: string; dealId: string; offeringId: string };
const GIFT_REASON = "Gift";

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

export async function POST(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const dealId = parseInt(p.dealId);
  const offeringId = parseInt(p.offeringId);
  const ok = await assertDealAndOffering(guard.tournament.id, dealId, offeringId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [existing] = await db
    .select({ id: dealItemOverrides.id })
    .from(dealItemOverrides)
    .where(and(eq(dealItemOverrides.dealId, dealId), eq(dealItemOverrides.offeringId, offeringId)))
    .limit(1);

  if (existing) {
    const [row] = await db
      .update(dealItemOverrides)
      .set({ priceCentsOverride: 0, reason: GIFT_REASON, updatedAt: new Date() })
      .where(eq(dealItemOverrides.id, existing.id))
      .returning();
    return NextResponse.json({ override: row });
  }

  const [row] = await db
    .insert(dealItemOverrides)
    .values({
      dealId,
      offeringId,
      priceCentsOverride: 0,
      reason: GIFT_REASON,
      createdBy: guard.userId,
    })
    .returning();
  return NextResponse.json({ override: row }, { status: 201 });
}

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
