import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dealAdjustments, teamOfferingDeals, tournamentRegistrations, offerings } from "@/db/schema";
import { and, eq } from "drizzle-orm";
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

// POST — add an adjustment.
// Body: { kind: 'discount'|'surcharge',
//         amountMode: 'fixed_cents'|'percent_bps'|'per_player',
//         amountValue: number,
//         reason: string,
//         targetOfferingId?: number }
export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const dealId = parseInt(p.dealId);
  const exists = await dealInTournament(guard.tournament.id, dealId);
  if (!exists) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const kind = body.kind === "surcharge" ? "surcharge" : "discount";
  const amountMode = ["fixed_cents", "percent_bps", "per_player"].includes(body.amountMode) ? body.amountMode : null;
  const amountValue = Math.floor(Number(body.amountValue));
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!amountMode) return NextResponse.json({ error: "amountMode required" }, { status: 400 });
  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    return NextResponse.json({ error: "amountValue must be a positive integer" }, { status: 400 });
  }
  if (!reason) return NextResponse.json({ error: "reason required" }, { status: 400 });

  // Validate target offering if provided.
  let targetOfferingId: number | null = null;
  if (body.targetOfferingId != null) {
    const tid = Number(body.targetOfferingId);
    if (!Number.isInteger(tid)) {
      return NextResponse.json({ error: "Invalid targetOfferingId" }, { status: 400 });
    }
    const [o] = await db
      .select({ id: offerings.id })
      .from(offerings)
      .where(and(eq(offerings.id, tid), eq(offerings.tournamentId, guard.tournament.id)))
      .limit(1);
    if (!o) return NextResponse.json({ error: "Target offering not in tournament" }, { status: 400 });
    targetOfferingId = tid;
  }

  const [row] = await db.insert(dealAdjustments).values({
    dealId,
    kind,
    amountMode,
    amountValue,
    targetOfferingId,
    reason,
    createdBy: guard.userId,
  }).returning();

  return NextResponse.json({ adjustment: row }, { status: 201 });
}

// GET — list adjustments on a deal.
export async function GET(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const dealId = parseInt(p.dealId);
  const exists = await dealInTournament(guard.tournament.id, dealId);
  if (!exists) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  const rows = await db.select().from(dealAdjustments).where(eq(dealAdjustments.dealId, dealId));
  return NextResponse.json({ adjustments: rows });
}
