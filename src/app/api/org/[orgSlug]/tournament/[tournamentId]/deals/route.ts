import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamOfferingDeals, tournamentRegistrations, offerings, teams } from "@/db/schema";
import { and, eq, inArray, desc } from "drizzle-orm";
import { requireV3Tournament } from "@/lib/offerings/guard";
import { buildManyDealBreakdowns } from "@/lib/offerings/calculator";

type Params = { orgSlug: string; tournamentId: string };

// GET — all deals for the tournament, with a pricing breakdown per deal.
// Response shape is list-friendly so the "Team deals" tab can render in one pass.
export async function GET(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  // Find deals whose registration belongs to this tournament.
  const rows = await db
    .select({
      deal: teamOfferingDeals,
      regId: tournamentRegistrations.id,
      regDisplayName: tournamentRegistrations.displayName,
      teamId: tournamentRegistrations.teamId,
      teamName: teams.name,
      classId: tournamentRegistrations.classId,
      offeringTitle: offerings.title,
      offeringKind: offerings.kind,
    })
    .from(teamOfferingDeals)
    .innerJoin(tournamentRegistrations, eq(tournamentRegistrations.id, teamOfferingDeals.registrationId))
    .innerJoin(offerings, eq(offerings.id, teamOfferingDeals.offeringId))
    .leftJoin(teams, eq(teams.id, tournamentRegistrations.teamId))
    .where(eq(tournamentRegistrations.tournamentId, guard.tournament.id))
    .orderBy(desc(teamOfferingDeals.createdAt));

  const breakdowns = await buildManyDealBreakdowns(rows.map(r => r.deal.id));

  const deals = rows.map(r => ({
    id: r.deal.id,
    registrationId: r.regId,
    teamName: r.regDisplayName ?? r.teamName ?? `Team #${r.teamId}`,
    classId: r.classId,
    offeringId: r.deal.offeringId,
    offeringTitle: r.offeringTitle,
    offeringKind: r.offeringKind,
    state: r.deal.state,
    dueDate: r.deal.dueDate,
    breakdown: breakdowns[r.deal.id] ?? null,
  }));

  return NextResponse.json({ deals });
}

// POST — assign an offering to one or many registrations. Body:
//   { offeringId: number, registrationIds: number[], dueDate?: string }
// Uses upsert-on-unique semantics: if a deal for (reg, offering) exists,
// it is returned unchanged. No duplicates.
export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const offeringId = Number(body.offeringId);
  const regIds: number[] = Array.isArray(body.registrationIds)
    ? body.registrationIds.filter((x: unknown): x is number => Number.isInteger(x))
    : [];
  if (!Number.isInteger(offeringId) || regIds.length === 0) {
    return NextResponse.json({ error: "offeringId and registrationIds[] required" }, { status: 400 });
  }

  // Sanity: offering belongs to tournament.
  const [off] = await db
    .select({ id: offerings.id })
    .from(offerings)
    .where(and(eq(offerings.id, offeringId), eq(offerings.tournamentId, guard.tournament.id)))
    .limit(1);
  if (!off) return NextResponse.json({ error: "Offering not found in tournament" }, { status: 404 });

  // Sanity: registrations belong to this tournament.
  const validRegs = await db
    .select({ id: tournamentRegistrations.id })
    .from(tournamentRegistrations)
    .where(
      and(
        inArray(tournamentRegistrations.id, regIds),
        eq(tournamentRegistrations.tournamentId, guard.tournament.id),
      )
    );
  const validIds = validRegs.map(v => v.id);
  if (validIds.length === 0) {
    return NextResponse.json({ error: "No valid registrations" }, { status: 400 });
  }

  // Insert, ignoring duplicates. Postgres ON CONFLICT via Drizzle.
  const dueDate = body.dueDate ? String(body.dueDate) : null;
  const inserted = await db
    .insert(teamOfferingDeals)
    .values(validIds.map(rid => ({
      registrationId: rid,
      offeringId,
      state: "proposed" as const,
      dueDate,
      createdBy: guard.userId,
    })))
    .onConflictDoNothing({ target: [teamOfferingDeals.registrationId, teamOfferingDeals.offeringId] })
    .returning();

  return NextResponse.json({ created: inserted.length, skipped: validIds.length - inserted.length });
}
