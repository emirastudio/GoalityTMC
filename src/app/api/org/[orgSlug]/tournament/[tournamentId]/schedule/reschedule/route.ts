import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { isError, requireGameAdmin } from "@/lib/game-auth";
import { buildProblem, checkMove, type Assignment } from "@/lib/scheduling";
import { loadSchedulingSnapshot } from "@/lib/scheduling-db";

type Params = { orgSlug: string; tournamentId: string };

/**
 * POST /api/org/[orgSlug]/tournament/[tournamentId]/schedule/reschedule
 * Body: { matchId, scheduledAtUtc, fieldId, force? }
 *
 * Moves a single match manually. By default refuses the move if it would
 * create a hard-constraint violation. `force:true` bypasses the check
 * (for admin emergency overrides).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const resolved = await params;
  const ctx = await requireGameAdmin(req, resolved);
  if (isError(ctx)) return ctx;

  const body = await req.json().catch(() => ({}));
  const { matchId, scheduledAtUtc, fieldId, force } = body as {
    matchId?: number;
    scheduledAtUtc?: string;
    fieldId?: number;
    force?: boolean;
  };

  if (!matchId || !scheduledAtUtc || !fieldId) {
    return NextResponse.json(
      { error: "matchId, scheduledAtUtc, fieldId required" },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select()
    .from(matches)
    .where(and(eq(matches.id, matchId), eq(matches.tournamentId, ctx.tournament.id)));
  if (!existing) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (existing.lockedAt && !force) {
    return NextResponse.json({ error: "Match is locked" }, { status: 409 });
  }

  if (!force) {
    const snapshot = await loadSchedulingSnapshot({
      tournamentId: ctx.tournament.id,
      classId: null,
    });
    const problem = buildProblem(snapshot);
    const currentAssignments: Assignment[] = snapshot.matches
      .filter((m) => m.scheduledAt && m.fieldId)
      .map((m) => ({
        matchId: m.id,
        slotId: `${m.fieldId}:${m.scheduledAt!.toISOString()}`,
        fieldId: m.fieldId!,
        scheduledAtUtc: m.scheduledAt!.toISOString(),
        refereeAssignments: m.matchReferees,
      }));

    const slotId = `${fieldId}:${scheduledAtUtc}`;
    const check = checkMove(problem, currentAssignments, { matchId, slotId });
    if (!check.ok) {
      return NextResponse.json({ error: "Move would create a conflict", reason: check.reason }, { status: 409 });
    }
  }

  await db
    .update(matches)
    .set({
      scheduledAt: new Date(scheduledAtUtc),
      fieldId,
      version: (existing.version ?? 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(matches.id, matchId));

  try {
    revalidatePath(
      `/[locale]/t/${resolved.orgSlug}/${ctx.tournament.slug}/schedule`,
      "page",
    );
  } catch {
    /* best effort */
  }

  return NextResponse.json({ ok: true });
}
