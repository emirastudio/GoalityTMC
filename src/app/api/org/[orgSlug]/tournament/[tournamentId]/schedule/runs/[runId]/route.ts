import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { scheduleRuns } from "@/db/schema";
import { isError, requireGameAdmin } from "@/lib/game-auth";

type Params = { orgSlug: string; tournamentId: string; runId: string };

/**
 * GET /api/org/[orgSlug]/tournament/[tournamentId]/schedule/runs/[runId]
 *
 * Returns the full run including the Solution blob. This endpoint is only
 * called when the user opens a run detail view — list views use the runs
 * endpoint with lightweight summaries instead.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const resolved = await params;
  const ctx = await requireGameAdmin(req, resolved);
  if (isError(ctx)) return ctx;

  const [row] = await db
    .select()
    .from(scheduleRuns)
    .where(
      and(eq(scheduleRuns.id, resolved.runId), eq(scheduleRuns.tournamentId, ctx.tournament.id)),
    )
    .limit(1);
  if (!row) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  return NextResponse.json({ run: row });
}
