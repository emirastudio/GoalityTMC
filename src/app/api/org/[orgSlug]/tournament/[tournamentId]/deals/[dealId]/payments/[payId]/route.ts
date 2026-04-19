import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dealPayments, teamOfferingDeals, tournamentRegistrations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireV3Tournament } from "@/lib/offerings/guard";

type Params = { orgSlug: string; tournamentId: string; dealId: string; payId: string };

// DELETE — undo a payment record (e.g. mis-entry). Organiser responsibility to match books.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const dealId = parseInt(p.dealId);
  const payId = parseInt(p.payId);

  const [row] = await db
    .select({ p: dealPayments.id, tId: tournamentRegistrations.tournamentId })
    .from(dealPayments)
    .innerJoin(teamOfferingDeals, eq(teamOfferingDeals.id, dealPayments.dealId))
    .innerJoin(tournamentRegistrations, eq(tournamentRegistrations.id, teamOfferingDeals.registrationId))
    .where(and(eq(dealPayments.id, payId), eq(dealPayments.dealId, dealId)))
    .limit(1);
  if (!row || row.tId !== guard.tournament.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(dealPayments).where(eq(dealPayments.id, payId));
  return NextResponse.json({ deleted: true });
}
