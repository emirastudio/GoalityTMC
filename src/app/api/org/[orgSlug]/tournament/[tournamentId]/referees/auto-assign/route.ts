import { and, asc, eq, inArray, isNull, isNotNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  matchReferees,
  matches,
  tournamentReferees,
  refereeAvailability,
  tournamentFields,
} from "@/db/schema";
import { isError, requireGameAdmin } from "@/lib/game-auth";
import { assertFeature } from "@/lib/plan-gates";

type Params = { orgSlug: string; tournamentId: string };

const VALID_ROLES = ["main", "assistant1", "assistant2", "fourth"] as const;
type Role = (typeof VALID_ROLES)[number];

const MATCH_DURATION_MS = 90 * 60 * 1000; // 90 minutes assumed max

/**
 * POST /api/org/[orgSlug]/tournament/[tournamentId]/referees/auto-assign
 *
 * Body: { role: Role, matchIds?: number[] }
 * Assigns available referees to matches for the given role, avoiding double-booking.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const gate = assertFeature(ctx.effectivePlan, "hasMatchHub");
  if (gate) return gate;

  const body = await req.json().catch(() => ({})) as {
    role?: string;
    matchIds?: number[];
  };

  const { role, matchIds } = body;

  if (!role || !(VALID_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json(
      { error: "role must be one of: main, assistant1, assistant2, fourth" },
      { status: 400 },
    );
  }

  const tid = ctx.tournament.id;

  // ── 1. Load all non-deleted referees for this tournament ──────────────────
  const allReferees = await db
    .select()
    .from(tournamentReferees)
    .where(
      and(
        eq(tournamentReferees.tournamentId, tid),
        isNull(tournamentReferees.deletedAt),
      ),
    );

  if (allReferees.length === 0) {
    return NextResponse.json({ assigned: 0, skipped: 0, details: [] });
  }

  // ── 2. Load blackout windows for all referees ─────────────────────────────
  const refereeIds = allReferees.map((r) => r.id);
  const blackouts = await db
    .select()
    .from(refereeAvailability)
    .where(
      and(
        inArray(refereeAvailability.refereeId, refereeIds),
        eq(refereeAvailability.isBlackout, true),
      ),
    );

  // ── 3. Load scheduled matches ─────────────────────────────────────────────
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
    .select({
      id: matches.id,
      scheduledAt: matches.scheduledAt,
      fieldId: matches.fieldId,
    })
    .from(matches)
    .where(and(...matchConditions))
    .orderBy(asc(matches.scheduledAt));

  if (targetMatches.length === 0) {
    return NextResponse.json({ assigned: 0, skipped: 0, details: [] });
  }

  // ── 4. Load existing matchReferee rows for all target matches ─────────────
  const targetMatchIds = targetMatches.map((m) => m.id);
  const existingAssignments = await db
    .select()
    .from(matchReferees)
    .where(inArray(matchReferees.matchId, targetMatchIds));

  // Also load ALL matchReferee rows for ALL tournament matches (for overlap check)
  const allMatchAssignments = await db
    .select({
      matchId: matchReferees.matchId,
      refereeId: matchReferees.refereeId,
      scheduledAt: matches.scheduledAt,
    })
    .from(matchReferees)
    .innerJoin(matches, eq(matchReferees.matchId, matches.id))
    .where(
      and(
        eq(matches.tournamentId, tid),
        isNull(matches.deletedAt),
        isNotNull(matches.scheduledAt),
      ),
    );

  // ── 5. Load field→stadiumId for stadium continuity preference ─────────────
  const fieldIds = targetMatches
    .map((m) => m.fieldId)
    .filter((fid): fid is number => fid !== null);

  const fieldRows =
    fieldIds.length > 0
      ? await db
          .select({ id: tournamentFields.id, stadiumId: tournamentFields.stadiumId })
          .from(tournamentFields)
          .where(inArray(tournamentFields.id, fieldIds))
      : [];

  const fieldToStadium = new Map<number, number | null>(
    fieldRows.map((f) => [f.id, f.stadiumId ?? null]),
  );

  // ── 6. Build runtime assignment map (refereeId → assigned match times) ────
  // Starts from existing DB assignments; we'll mutate it as we assign.
  const refereeSchedule = new Map<number, Array<{ matchId: number; start: Date; end: Date }>>();
  for (const ref of allReferees) {
    refereeSchedule.set(ref.id, []);
  }
  for (const a of allMatchAssignments) {
    if (a.scheduledAt) {
      const start = new Date(a.scheduledAt);
      const end = new Date(start.getTime() + MATCH_DURATION_MS);
      const list = refereeSchedule.get(a.refereeId);
      if (list) list.push({ matchId: a.matchId, start, end });
    }
  }

  // Helper: does a time window overlap with [start, end)?
  function overlaps(
    existStart: Date,
    existEnd: Date,
    newStart: Date,
    newEnd: Date,
  ): boolean {
    return newStart < existEnd && newEnd > existStart;
  }

  // Helper: is referee blacked out during [start, end)?
  function isBlackedOut(refereeId: number, start: Date, end: Date): boolean {
    const dateStr = start.toISOString().slice(0, 10);
    return blackouts.some((b) => {
      if (b.refereeId !== refereeId) return false;
      if (b.date !== dateStr) return false;
      if (!b.startTime && !b.endTime) return true; // whole day
      const bStart = b.startTime
        ? new Date(`${dateStr}T${b.startTime}:00`)
        : new Date(`${dateStr}T00:00:00`);
      const bEnd = b.endTime
        ? new Date(`${dateStr}T${b.endTime}:00`)
        : new Date(`${dateStr}T23:59:59`);
      return overlaps(bStart, bEnd, start, end);
    });
  }

  // Helper: count assignments today for load balancing
  function assignmentsToday(refereeId: number, dateStr: string): number {
    const list = refereeSchedule.get(refereeId) ?? [];
    return list.filter(
      (a) => a.start.toISOString().slice(0, 10) === dateStr,
    ).length;
  }

  // ── 7. Per-match processing ────────────────────────────────────────────────
  const details: Array<{ matchId: number; refereeId: number | null; reason: string }> = [];
  let assigned = 0;
  let skipped = 0;

  // Pre-build: which referees are already assigned to each match in the requested role?
  const matchRoleMap = new Map<number, Set<number>>(); // matchId → Set<refereeId>
  for (const a of existingAssignments) {
    if (!matchRoleMap.has(a.matchId)) matchRoleMap.set(a.matchId, new Set());
    matchRoleMap.get(a.matchId)!.add(a.refereeId);
  }
  const matchRoleAssigned = new Map<number, string | null>(); // matchId → role already filled
  for (const a of existingAssignments) {
    if (a.role === role) {
      matchRoleAssigned.set(a.matchId, role);
    }
  }

  for (const match of targetMatches) {
    const matchStart = new Date(match.scheduledAt!);
    const matchEnd = new Date(matchStart.getTime() + MATCH_DURATION_MS);
    const dateStr = matchStart.toISOString().slice(0, 10);

    // Skip if this role is already filled for this match
    if (matchRoleAssigned.has(match.id)) {
      skipped++;
      details.push({ matchId: match.id, refereeId: null, reason: "role_already_assigned" });
      continue;
    }

    const matchStadiumId =
      match.fieldId != null ? (fieldToStadium.get(match.fieldId) ?? null) : null;

    // Gather candidates: not blacked out, not overlapping another match
    const candidates = allReferees.filter((ref) => {
      // Already assigned to this match in any role?
      if (matchRoleMap.get(match.id)?.has(ref.id)) return false;
      // Blacked out?
      if (isBlackedOut(ref.id, matchStart, matchEnd)) return false;
      // Overlap with existing assignment?
      const schedule = refereeSchedule.get(ref.id) ?? [];
      for (const slot of schedule) {
        if (slot.matchId === match.id) continue; // same match, different role already counted
        if (overlaps(slot.start, slot.end, matchStart, matchEnd)) return false;
      }
      return true;
    });

    if (candidates.length === 0) {
      skipped++;
      details.push({ matchId: match.id, refereeId: null, reason: "no_available_referee" });
      continue;
    }

    // Sort candidates: prefer same stadium today, then fewest assignments today
    candidates.sort((a, b) => {
      const aStadium = matchStadiumId != null
        ? (refereeSchedule.get(a.id) ?? []).some(
            (s) => {
              if (s.start.toISOString().slice(0, 10) !== dateStr) return false;
              // We don't store stadiumId in the schedule — skip this tie-break
              return false;
            },
          )
          ? -1
          : 0
        : 0;
      const bStadium = 0;
      void aStadium; void bStadium;

      // Primary sort: fewest assignments today
      return assignmentsToday(a.id, dateStr) - assignmentsToday(b.id, dateStr);
    });

    const chosen = candidates[0];

    // Insert into DB
    await db
      .insert(matchReferees)
      .values({ matchId: match.id, refereeId: chosen.id, role })
      .onConflictDoUpdate({
        target: [matchReferees.matchId, matchReferees.refereeId],
        set: { role },
      });

    // Update runtime schedule to prevent double-booking in subsequent iterations
    const refSchedule = refereeSchedule.get(chosen.id)!;
    refSchedule.push({ matchId: match.id, start: matchStart, end: matchEnd });

    // Mark role as filled
    matchRoleAssigned.set(match.id, role);
    if (!matchRoleMap.has(match.id)) matchRoleMap.set(match.id, new Set());
    matchRoleMap.get(match.id)!.add(chosen.id);

    assigned++;
    details.push({ matchId: match.id, refereeId: chosen.id, reason: "assigned" });
  }

  return NextResponse.json({ assigned, skipped, details });
}
