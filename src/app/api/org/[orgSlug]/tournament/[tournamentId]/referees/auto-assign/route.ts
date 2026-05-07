import { and, asc, eq, inArray, isNull, isNotNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matchReferees, matches, tournamentReferees } from "@/db/schema";
import { isError, requireGameAdmin } from "@/lib/game-auth";
import { assertFeature } from "@/lib/plan-gates";

type Params = { orgSlug: string; tournamentId: string };

const VALID_ROLES = ["main", "assistant1", "assistant2", "fourth"] as const;
type Role = (typeof VALID_ROLES)[number];

/**
 * POST /api/org/[orgSlug]/tournament/[tournamentId]/referees/auto-assign
 *
 * Assigns referees to scheduled matches using pure slot-based conflict detection:
 * a referee can occupy only ONE match slot (scheduledAt) at a time.
 * No artificial duration windows — the schedule itself defines slots.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const gate = assertFeature(ctx.effectivePlan, "hasMatchHub");
  if (gate) return gate;

  const body = await req.json().catch(() => ({})) as { role?: string; matchIds?: number[] };
  const { role, matchIds } = body;

  if (!role || !(VALID_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json(
      { error: "role must be one of: main, assistant1, assistant2, fourth" },
      { status: 400 },
    );
  }

  const tid = ctx.tournament.id;

  // ── 1. Load all active referees for this tournament ────────────────────────
  const allReferees = await db
    .select()
    .from(tournamentReferees)
    .where(and(eq(tournamentReferees.tournamentId, tid), isNull(tournamentReferees.deletedAt)));

  if (allReferees.length === 0) {
    return NextResponse.json({ assigned: 0, skipped: 0, alreadyAssigned: 0, noReferee: 0 });
  }

  // ── 2. Load scheduled matches ──────────────────────────────────────────────
  const matchConditions = [
    eq(matches.tournamentId, tid),
    eq(matches.status, "scheduled"),
    isNotNull(matches.scheduledAt),
    isNull(matches.deletedAt),
  ];
  if (matchIds && matchIds.length > 0) {
    matchConditions.push(inArray(matches.id, matchIds));
  }

  const targetMatches = await db
    .select({ id: matches.id, scheduledAt: matches.scheduledAt })
    .from(matches)
    .where(and(...matchConditions))
    .orderBy(asc(matches.scheduledAt));

  if (targetMatches.length === 0) {
    return NextResponse.json({ assigned: 0, skipped: 0, alreadyAssigned: 0, noReferee: 0 });
  }

  // ── 3. Load ALL existing match-referee assignments for this tournament ──────
  // Used to build the per-referee time-slot occupancy map.
  const allAssignments = await db
    .select({
      matchId: matchReferees.matchId,
      refereeId: matchReferees.refereeId,
      role: matchReferees.role,
      scheduledAt: matches.scheduledAt,
    })
    .from(matchReferees)
    .innerJoin(matches, eq(matchReferees.matchId, matches.id))
    .where(and(eq(matches.tournamentId, tid), isNull(matches.deletedAt), isNotNull(matches.scheduledAt)));

  // ── 4. Build runtime state ─────────────────────────────────────────────────

  // refereeSlots: refereeId → Set of occupied scheduledAt strings (ISO)
  const refereeSlots = new Map<number, Set<string>>();
  for (const ref of allReferees) refereeSlots.set(ref.id, new Set());
  for (const a of allAssignments) {
    if (a.scheduledAt) {
      refereeSlots.get(a.refereeId)?.add(new Date(a.scheduledAt).toISOString());
    }
  }

  // matchInRole: matchId → refereeId already filling this exact role
  const matchInRole = new Map<number, number>();
  // matchRefSet: matchId → Set<refereeId> (any role, to avoid assigning same person twice)
  const matchRefSet = new Map<number, Set<number>>();
  for (const a of allAssignments) {
    if (a.role === role) matchInRole.set(a.matchId, a.refereeId);
    if (!matchRefSet.has(a.matchId)) matchRefSet.set(a.matchId, new Set());
    matchRefSet.get(a.matchId)!.add(a.refereeId);
  }

  // refereeTotal: refereeId → total assignments (for load-balancing)
  const refereeTotal = new Map<number, number>();
  for (const ref of allReferees) refereeTotal.set(ref.id, 0);
  for (const a of allAssignments) {
    refereeTotal.set(a.refereeId, (refereeTotal.get(a.refereeId) ?? 0) + 1);
  }

  // ── 5. Assign ─────────────────────────────────────────────────────────────
  let assigned = 0;
  let alreadyAssigned = 0;
  let noReferee = 0;

  for (const match of targetMatches) {
    const slotKey = new Date(match.scheduledAt!).toISOString();

    // Skip if this role already filled
    if (matchInRole.has(match.id)) {
      alreadyAssigned++;
      continue;
    }

    // Candidates: not already in this match (any role), not already in this time slot
    const candidates = allReferees.filter(ref => {
      if (matchRefSet.get(match.id)?.has(ref.id)) return false; // already in this match
      if (refereeSlots.get(ref.id)?.has(slotKey)) return false;  // busy at this time
      return true;
    });

    if (candidates.length === 0) {
      noReferee++;
      continue;
    }

    // Load-balance: pick the referee with the fewest total assignments
    candidates.sort((a, b) => (refereeTotal.get(a.id) ?? 0) - (refereeTotal.get(b.id) ?? 0));
    const chosen = candidates[0];

    await db
      .insert(matchReferees)
      .values({ matchId: match.id, refereeId: chosen.id, role })
      .onConflictDoUpdate({
        target: [matchReferees.matchId, matchReferees.refereeId],
        set: { role },
      });

    // Update runtime state so next iterations see this assignment
    refereeSlots.get(chosen.id)!.add(slotKey);
    refereeTotal.set(chosen.id, (refereeTotal.get(chosen.id) ?? 0) + 1);
    matchInRole.set(match.id, chosen.id);
    if (!matchRefSet.has(match.id)) matchRefSet.set(match.id, new Set());
    matchRefSet.get(match.id)!.add(chosen.id);

    assigned++;
  }

  const skipped = alreadyAssigned + noReferee;
  return NextResponse.json({ assigned, skipped, alreadyAssigned, noReferee });
}
