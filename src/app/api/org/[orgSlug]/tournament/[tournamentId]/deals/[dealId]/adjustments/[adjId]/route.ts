import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dealAdjustments, teamOfferingDeals, tournamentRegistrations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireV3Tournament } from "@/lib/offerings/guard";

type Params = { orgSlug: string; tournamentId: string; dealId: string; adjId: string };

// DELETE — remove an adjustment.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const dealId = parseInt(p.dealId);
  const adjId = parseInt(p.adjId);

  // Sanity: adjustment belongs to a deal whose registration is in this tournament.
  const [row] = await db
    .select({ a: dealAdjustments.id, tId: tournamentRegistrations.tournamentId })
    .from(dealAdjustments)
    .innerJoin(teamOfferingDeals, eq(teamOfferingDeals.id, dealAdjustments.dealId))
    .innerJoin(tournamentRegistrations, eq(tournamentRegistrations.id, teamOfferingDeals.registrationId))
    .where(and(eq(dealAdjustments.id, adjId), eq(dealAdjustments.dealId, dealId)))
    .limit(1);
  if (!row || row.tId !== guard.tournament.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(dealAdjustments).where(eq(dealAdjustments.id, adjId));
  return NextResponse.json({ deleted: true });
}
