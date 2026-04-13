import { NextRequest, NextResponse } from "next/server";
import { isError, requireGameAdmin } from "@/lib/game-auth";
import { buildProblem, checkMove, type Assignment } from "@/lib/scheduling";
import { loadSchedulingSnapshot } from "@/lib/scheduling-db";

type Params = { orgSlug: string; tournamentId: string };

/**
 * POST /api/org/[orgSlug]/tournament/[tournamentId]/schedule/what-if
 * Body: { matchId, slotId }
 *
 * Dry-runs a single-match move against the CURRENT committed schedule and
 * returns a structured reason if the move would violate hard constraints.
 * Used by the UI for live drag-drop conflict highlighting.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = await req.json().catch(() => ({}));
  const { matchId, slotId } = body as { matchId?: number; slotId?: string };
  if (!matchId || !slotId) {
    return NextResponse.json({ error: "matchId and slotId required" }, { status: 400 });
  }

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

  const result = checkMove(problem, currentAssignments, { matchId, slotId });
  return NextResponse.json(result);
}
