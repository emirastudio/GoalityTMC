import { NextRequest, NextResponse } from "next/server";
import { isError, requireGameAdmin } from "@/lib/game-auth";
import {
  legacyAutoSchedule,
  type LegacyAutoScheduleBody,
} from "@/lib/scheduling-db";

type Params = { orgSlug: string; tournamentId: string };

/**
 * POST /api/org/.../matches/auto-schedule
 *
 * Legacy endpoint preserved for backward compat. Internally it now delegates
 * to the new LNS solver through `legacyAutoSchedule` — same REST contract,
 * totally different engine underneath. The old greedy scheduler is gone.
 *
 * Body shape (unchanged):
 *   { stageId, groupId?, fieldIds, days, groupFieldMap?, fieldTimeOverrides?,
 *     matchDurationMinutes, breakBetweenMatchesMinutes?,
 *     maxMatchesPerTeamPerDay?, overwriteScheduled? }
 *
 * Response shape (unchanged):
 *   { updated, unassigned, totalSlots, message, schedule }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = (await req.json()) as LegacyAutoScheduleBody;

  if (
    !body.stageId ||
    !body.fieldIds?.length ||
    !body.days?.length ||
    !body.matchDurationMinutes
  ) {
    return NextResponse.json(
      { error: "stageId, fieldIds, days, matchDurationMinutes are required" },
      { status: 400 },
    );
  }

  try {
    const result = await legacyAutoSchedule({
      tournamentId: ctx.tournament.id,
      organizationId: ctx.organizationId,
      body,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
