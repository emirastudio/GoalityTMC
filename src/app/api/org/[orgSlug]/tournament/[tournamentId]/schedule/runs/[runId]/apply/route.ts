import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  matches,
  notificationQueue,
  scheduleRuns,
  tournamentRegistrations,
} from "@/db/schema";
import { isError, requireGameAdmin } from "@/lib/game-auth";
import { applyScheduleSolution } from "@/lib/scheduling-db";
import type { Assignment, Solution } from "@/lib/scheduling";

type Params = { orgSlug: string; tournamentId: string; runId: string };

/**
 * POST /api/org/[orgSlug]/tournament/[tournamentId]/schedule/runs/[runId]/apply
 *
 * Atomically writes the run's Solution into the matches table, enqueues
 * notification rows for every affected team, and triggers cache revalidation
 * on the public schedule pages.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const resolved = await params;
  const ctx = await requireGameAdmin(req, resolved);
  if (isError(ctx)) return ctx;

  // 1. Load run
  const [run] = await db
    .select()
    .from(scheduleRuns)
    .where(
      and(eq(scheduleRuns.id, resolved.runId), eq(scheduleRuns.tournamentId, ctx.tournament.id)),
    )
    .limit(1);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  if (run.status !== "succeeded") {
    return NextResponse.json(
      { error: `Run is not in a commit-able state: ${run.status}` },
      { status: 409 },
    );
  }

  const solution = run.result as unknown as Solution | null;
  if (!solution || !Array.isArray(solution.assignments)) {
    return NextResponse.json({ error: "Run has no solution" }, { status: 409 });
  }

  // 2. Apply the solution
  const { affectedMatchIds } = await applyScheduleSolution({
    tournamentId: ctx.tournament.id,
    organizationId: ctx.organizationId,
    assignments: solution.assignments as Assignment[],
  });

  // 3. Enqueue notifications per affected team
  if (affectedMatchIds.length > 0) {
    const touched = await db
      .select()
      .from(matches)
      .where(inArray(matches.id, affectedMatchIds));

    // Gather distinct team IDs
    const teamIds = new Set<number>();
    for (const m of touched) {
      if (m.homeTeamId != null) teamIds.add(m.homeTeamId);
      if (m.awayTeamId != null) teamIds.add(m.awayTeamId);
    }

    if (teamIds.size > 0) {
      const regs = await db
        .select({
          teamId: tournamentRegistrations.teamId,
        })
        .from(tournamentRegistrations)
        .where(
          and(
            eq(tournamentRegistrations.tournamentId, ctx.tournament.id),
            inArray(tournamentRegistrations.teamId, Array.from(teamIds)),
          ),
        );

      if (regs.length > 0) {
        await db.insert(notificationQueue).values(
          regs.map((r) => ({
            kind: "schedule_changed",
            tournamentId: ctx.tournament.id,
            targetType: "team",
            targetId: r.teamId,
            payload: {
              runId: run.id,
              affectedMatchIds,
            } as Record<string, unknown>,
            status: "pending" as const,
          })),
        );
      }
    }
  }

  // 4. Mark run as applied
  await db
    .update(scheduleRuns)
    .set({
      status: "applied",
      appliedAt: new Date(),
    })
    .where(eq(scheduleRuns.id, run.id));

  // 5. Revalidate public schedule pages
  try {
    revalidatePath(`/[locale]/t/${resolved.orgSlug}/${ctx.tournament.slug}/schedule`, "page");
    revalidatePath(`/[locale]/t/${resolved.orgSlug}/${ctx.tournament.slug}/d/[classId]/schedule`, "page");
  } catch {
    // revalidatePath may not be supported in all runtimes — best-effort.
  }

  return NextResponse.json({
    ok: true,
    applied: affectedMatchIds.length,
    affectedMatchIds,
  });
}
