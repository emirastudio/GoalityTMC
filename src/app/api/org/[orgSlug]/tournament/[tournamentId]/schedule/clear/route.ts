import { NextRequest, NextResponse } from "next/server";
import { isError, requireGameAdmin } from "@/lib/game-auth";
import { clearSchedule } from "@/lib/scheduling-db";

type Params = { orgSlug: string; tournamentId: string };

/**
 * POST /api/org/[orgSlug]/tournament/[tournamentId]/schedule/clear
 * Body: { classId?, stageId?, groupId? }
 *
 * Clears scheduledAt + fieldId for non-locked, non-finished matches in scope.
 * Locked matches are protected — always kept untouched.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = await req.json().catch(() => ({}));
  const result = await clearSchedule({
    tournamentId: ctx.tournament.id,
    classId: body.classId,
    stageId: body.stageId,
    groupId: body.groupId,
  });

  return NextResponse.json({ ok: true, ...result });
}
