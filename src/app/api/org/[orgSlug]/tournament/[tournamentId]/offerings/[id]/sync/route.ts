import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { offerings } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireV3Tournament } from "@/lib/offerings/guard";
import { backfillRequiredDeals } from "@/lib/offerings/backfill";

type Params = { orgSlug: string; tournamentId: string; id: string };

/**
 * POST — manually re-run the "required" auto-attach for an offering.
 * Covers two gaps the create/edit hooks don't: offerings that were
 * marked required before this endpoint existed, and teams that
 * registered after the offering was created/last synced.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const offeringId = parseInt(p.id);
  const [offering] = await db
    .select({ id: offerings.id, inclusion: offerings.inclusion })
    .from(offerings)
    .where(and(eq(offerings.id, offeringId), eq(offerings.tournamentId, guard.tournament.id)))
    .limit(1);
  if (!offering) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (offering.inclusion !== "required") {
    return NextResponse.json({ error: "Only 'required' offerings can be synced" }, { status: 400 });
  }

  const { created } = await backfillRequiredDeals(guard.tournament.id, offeringId, guard.userId);
  return NextResponse.json({ created });
}
