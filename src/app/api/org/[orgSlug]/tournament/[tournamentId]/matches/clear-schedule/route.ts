import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, tournamentStages } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, and, isNull, inArray } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string };

// POST /api/org/[orgSlug]/tournament/[tournamentId]/matches/clear-schedule
// Clears scheduledAt and fieldId for:
//   - all=true            → entire tournament
//   - classId             → all stages of a division
//   - stageId [+ groupId] → one stage (or group within it)
//
// v2 behavior: LOCKED matches (matches.locked_at IS NOT NULL) are ALWAYS
// preserved. Admin must explicitly unlock them before they can be cleared.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = await req.json();
  const { stageId, groupId, classId, all } = body;

  // ── Clear entire tournament ──────────────────────────────────────────────
  if (all) {
    const updated = await db
      .update(matches)
      .set({ scheduledAt: null, fieldId: null })
      .where(and(
        eq(matches.tournamentId, ctx.tournament.id),
        isNull(matches.deletedAt),
        isNull(matches.lockedAt),
      ))
      .returning({ id: matches.id });
    return NextResponse.json({ cleared: updated.length });
  }

  // ── Clear by classId (all stages of a division) ──────────────────────────
  if (classId) {
    const stages = await db
      .select({ id: tournamentStages.id })
      .from(tournamentStages)
      .where(and(
        eq(tournamentStages.tournamentId, ctx.tournament.id),
        eq(tournamentStages.classId, classId),
      ));
    if (stages.length === 0) return NextResponse.json({ cleared: 0 });

    const stageIds = stages.map(s => s.id);
    const updated = await db
      .update(matches)
      .set({ scheduledAt: null, fieldId: null })
      .where(and(
        eq(matches.tournamentId, ctx.tournament.id),
        inArray(matches.stageId, stageIds),
        isNull(matches.deletedAt),
        isNull(matches.lockedAt),
      ))
      .returning({ id: matches.id });
    return NextResponse.json({ cleared: updated.length });
  }

  // ── Clear by stageId [+ groupId] ─────────────────────────────────────────
  if (!stageId) {
    return NextResponse.json({ error: "stageId, classId, or all=true required" }, { status: 400 });
  }

  const conditions = [
    eq(matches.tournamentId, ctx.tournament.id),
    eq(matches.stageId, stageId),
    isNull(matches.deletedAt),
    isNull(matches.lockedAt),
  ];
  if (groupId) conditions.push(eq(matches.groupId, groupId));

  const updated = await db
    .update(matches)
    .set({ scheduledAt: null, fieldId: null })
    .where(and(...conditions))
    .returning({ id: matches.id });

  return NextResponse.json({ cleared: updated.length });
}
