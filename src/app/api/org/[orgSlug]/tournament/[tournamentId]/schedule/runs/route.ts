import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { scheduleRuns } from "@/db/schema";
import { isError, requireGameAdmin } from "@/lib/game-auth";

type Params = { orgSlug: string; tournamentId: string };

/**
 * GET /api/org/[orgSlug]/tournament/[tournamentId]/schedule/runs
 *
 * Lists run history for the tournament, newest first. Returns only lightweight
 * summaries — full Solution blobs are fetched on-demand via /runs/[runId].
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

  const where = classId
    ? and(
        eq(scheduleRuns.tournamentId, ctx.tournament.id),
        eq(scheduleRuns.classId, Number(classId)),
      )
    : eq(scheduleRuns.tournamentId, ctx.tournament.id);

  const rows = await db
    .select({
      id: scheduleRuns.id,
      classId: scheduleRuns.classId,
      status: scheduleRuns.status,
      kind: scheduleRuns.kind,
      inputHash: scheduleRuns.inputHash,
      resultSummary: scheduleRuns.resultSummary,
      createdAt: scheduleRuns.createdAt,
      startedAt: scheduleRuns.startedAt,
      finishedAt: scheduleRuns.finishedAt,
      appliedAt: scheduleRuns.appliedAt,
      parentRunId: scheduleRuns.parentRunId,
      error: scheduleRuns.error,
    })
    .from(scheduleRuns)
    .where(where)
    .orderBy(desc(scheduleRuns.createdAt))
    .limit(limit);

  return NextResponse.json({ runs: rows });
}
