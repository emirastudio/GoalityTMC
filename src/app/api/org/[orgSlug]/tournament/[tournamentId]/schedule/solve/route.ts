import { and, eq, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { scheduleRuns } from "@/db/schema";
import { isError, requireGameAdmin } from "@/lib/game-auth";
import {
  buildProblem,
  hashProblem,
  solve,
  summarize,
  type Weights,
} from "@/lib/scheduling";
import { loadSchedulingSnapshot } from "@/lib/scheduling-db";

type Params = { orgSlug: string; tournamentId: string };

/**
 * POST /api/org/[orgSlug]/tournament/[tournamentId]/schedule/solve
 *
 * Body: {
 *   classId?: number,
 *   budgetMs?: number,
 *   weights?: Partial<Weights>,
 *   kind?: "solve" | "what_if",
 * }
 *
 * Kicks off the LNS solver in-process and awaits the result. For 50–500
 * match tournaments this completes in 2–10 seconds; hard cap 30 s.
 *
 * Returns { runId, status, summary }. Idempotent: if a successful run with
 * the same input hash exists for this tournament in the last 60 s, returns it.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = await req.json().catch(() => ({}));
  const classId: number | null = body.classId ?? null;
  const budgetMs: number = Math.min(Math.max(body.budgetMs ?? 8000, 500), 30000);
  const weights: Partial<Weights> | undefined = body.weights;
  const kind: "solve" | "what_if" = body.kind === "what_if" ? "what_if" : "solve";

  // 1. Read DB snapshot
  const snapshot = await loadSchedulingSnapshot({
    tournamentId: ctx.tournament.id,
    classId,
  });

  // 2. Build Problem
  const problem = buildProblem(snapshot, { weights });
  const inputHash = hashProblem(problem);

  // 3. Idempotency: look for a successful run with the same hash in last 60s
  const sixtySecondsAgo = new Date(Date.now() - 60_000);
  const [existing] = await db
    .select()
    .from(scheduleRuns)
    .where(
      and(
        eq(scheduleRuns.tournamentId, ctx.tournament.id),
        eq(scheduleRuns.inputHash, inputHash),
        eq(scheduleRuns.status, "succeeded"),
        gt(scheduleRuns.createdAt, sixtySecondsAgo),
      ),
    )
    .limit(1);
  if (existing) {
    return NextResponse.json({
      runId: existing.id,
      status: existing.status,
      summary: existing.resultSummary,
      cached: true,
    });
  }

  // 4. Create run row
  const runId = nanoid(16);
  await db.insert(scheduleRuns).values({
    id: runId,
    tournamentId: ctx.tournament.id,
    organizationId: ctx.organizationId,
    classId,
    status: "running",
    kind,
    inputHash,
    // Store a trimmed Problem as params — full Problem can be large.
    params: {
      weights: problem.weights,
      seed: problem.seed,
      classId: problem.classId,
      horizon: problem.horizon,
      matchCount: problem.matchTemplates.length,
      slotCount: problem.slots.length,
    },
    createdByUserId: null, // TODO: thread user id through game-auth
    startedAt: new Date(),
  });

  // 5. Solve (in-process, synchronous)
  try {
    const solution = solve(problem, { budgetMs });
    const summary = summarize(solution, problem.matchTemplates.length);

    await db
      .update(scheduleRuns)
      .set({
        status: "succeeded",
        result: solution as unknown as Record<string, unknown>,
        resultSummary: summary,
        finishedAt: new Date(),
      })
      .where(eq(scheduleRuns.id, runId));

    return NextResponse.json({ runId, status: "succeeded", summary });
  } catch (e) {
    await db
      .update(scheduleRuns)
      .set({
        status: "failed",
        error: e instanceof Error ? e.message : String(e),
        finishedAt: new Date(),
      })
      .where(eq(scheduleRuns.id, runId));
    return NextResponse.json(
      { runId, status: "failed", error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
