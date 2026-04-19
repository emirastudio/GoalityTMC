import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamOfferingDeals, tournamentRegistrations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireV3Tournament } from "@/lib/offerings/guard";
import { buildDealBreakdown } from "@/lib/offerings/calculator";

type Params = { orgSlug: string; tournamentId: string; dealId: string };

async function loadDealWithOwnership(tournamentId: number, dealId: number) {
  const [row] = await db
    .select({
      deal: teamOfferingDeals,
      tournamentId: tournamentRegistrations.tournamentId,
    })
    .from(teamOfferingDeals)
    .innerJoin(tournamentRegistrations, eq(tournamentRegistrations.id, teamOfferingDeals.registrationId))
    .where(eq(teamOfferingDeals.id, dealId))
    .limit(1);
  if (!row || row.tournamentId !== tournamentId) return null;
  return row.deal;
}

// GET — full breakdown for a deal.
export async function GET(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const dealId = parseInt(p.dealId);
  const deal = await loadDealWithOwnership(guard.tournament.id, dealId);
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const breakdown = await buildDealBreakdown(dealId);
  return NextResponse.json({ deal, breakdown });
}

// PATCH — update state / due date. Body: { state?, dueDate? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const dealId = parseInt(p.dealId);
  const deal = await loadDealWithOwnership(guard.tournament.id, dealId);
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = { updatedAt: new Date() };
  if (body.state && ["proposed", "accepted", "declined", "archived"].includes(body.state)) {
    patch.state = body.state;
  }
  if ("dueDate" in body) patch.dueDate = body.dueDate ? String(body.dueDate) : null;
  if ("isPublished" in body) patch.isPublished = Boolean(body.isPublished);

  // Free slots (per-category organiser gifts inside this deal).
  const clampNonNeg = (v: unknown) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  if ("freePlayersCount" in body) patch.freePlayersCount = clampNonNeg(body.freePlayersCount);
  if ("freeStaffCount" in body) patch.freeStaffCount = clampNonNeg(body.freeStaffCount);
  if ("freeAccompanyingCount" in body) patch.freeAccompanyingCount = clampNonNeg(body.freeAccompanyingCount);
  if ("mealsCountOverride" in body) {
    if (body.mealsCountOverride === null || body.mealsCountOverride === "") {
      patch.mealsCountOverride = null;
    } else {
      const n = Math.floor(Number(body.mealsCountOverride));
      patch.mealsCountOverride = Number.isFinite(n) && n >= 0 ? n : null;
    }
  }

  const [updated] = await db.update(teamOfferingDeals).set(patch).where(eq(teamOfferingDeals.id, dealId)).returning();
  return NextResponse.json({ deal: updated });
}

// DELETE — remove the deal (and its adjustments/payments via cascade).
// Organisers typically use this when they've assigned the wrong package.
// Payment history inside a deleted deal is lost — keep in mind for UX.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const dealId = parseInt(p.dealId);
  const deal = await loadDealWithOwnership(guard.tournament.id, dealId);
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(teamOfferingDeals).where(eq(teamOfferingDeals.id, dealId));
  return NextResponse.json({ deleted: true });
}
