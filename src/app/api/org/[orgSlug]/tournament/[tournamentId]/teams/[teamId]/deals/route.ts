import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamOfferingDeals, tournamentRegistrations, offerings } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { requireV3Tournament } from "@/lib/offerings/guard";
import { buildManyDealBreakdowns } from "@/lib/offerings/calculator";

type Params = { orgSlug: string; tournamentId: string; teamId: string };

// GET — all deals for this team in this tournament + the registration id
// (the unified TeamDealBlock uses this as the single source of truth).
export async function GET(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const teamId = parseInt(p.teamId);

  // Every team has at most one registration per tournament (unique key).
  const [reg] = await db
    .select({ id: tournamentRegistrations.id })
    .from(tournamentRegistrations)
    .where(and(
      eq(tournamentRegistrations.teamId, teamId),
      eq(tournamentRegistrations.tournamentId, guard.tournament.id),
    ))
    .limit(1);
  if (!reg) {
    return NextResponse.json({ registrationId: null, deals: [] });
  }

  const rows = await db
    .select({
      deal: teamOfferingDeals,
      offeringTitle: offerings.title,
      offeringKind: offerings.kind,
      offeringInclusion: offerings.inclusion,
      offeringIcon: offerings.icon,
    })
    .from(teamOfferingDeals)
    .innerJoin(offerings, eq(offerings.id, teamOfferingDeals.offeringId))
    .where(eq(teamOfferingDeals.registrationId, reg.id))
    .orderBy(asc(teamOfferingDeals.createdAt));

  const breakdowns = await buildManyDealBreakdowns(rows.map(r => r.deal.id));

  return NextResponse.json({
    registrationId: reg.id,
    deals: rows.map(r => ({
      id: r.deal.id,
      offeringId: r.deal.offeringId,
      offeringTitle: r.offeringTitle,
      offeringKind: r.offeringKind,
      offeringInclusion: r.offeringInclusion,
      offeringIcon: r.offeringIcon,
      state: r.deal.state,
      isPublished: r.deal.isPublished,
      dueDate: r.deal.dueDate,
      breakdown: breakdowns[r.deal.id] ?? null,
    })),
  });
}
