import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamOfferingDeals, tournamentRegistrations, offerings } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { requireV3Tournament } from "@/lib/offerings/guard";
import { buildManyDealBreakdowns } from "@/lib/offerings/calculator";

type Params = { orgSlug: string; tournamentId: string; registrationId: string };

// GET — all deals of a single registration, with pricing breakdowns.
// Used by the unified TeamDealBlock on /admin/tournament/[tId]/teams/[teamId].
export async function GET(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const registrationId = parseInt(p.registrationId);

  // Confirm registration belongs to the tournament.
  const [reg] = await db
    .select({ id: tournamentRegistrations.id })
    .from(tournamentRegistrations)
    .where(and(
      eq(tournamentRegistrations.id, registrationId),
      eq(tournamentRegistrations.tournamentId, guard.tournament.id),
    ))
    .limit(1);
  if (!reg) return NextResponse.json({ error: "Registration not found" }, { status: 404 });

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
    .where(eq(teamOfferingDeals.registrationId, registrationId))
    .orderBy(asc(teamOfferingDeals.createdAt));

  const breakdowns = await buildManyDealBreakdowns(rows.map(r => r.deal.id));

  return NextResponse.json({
    registrationId,
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
