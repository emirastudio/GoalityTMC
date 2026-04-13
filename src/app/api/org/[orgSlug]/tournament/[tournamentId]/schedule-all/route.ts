import { NextRequest, NextResponse } from "next/server";
import { isError, requireGameAdmin } from "@/lib/game-auth";
import {
  legacyScheduleAll,
  type LegacyScheduleAllDivision,
} from "@/lib/scheduling-db";

type Params = { orgSlug: string; tournamentId: string };

/**
 * POST /api/org/.../schedule-all
 *
 * Legacy endpoint preserved for the planner UI. Internally loops through
 * divisions and runs the NEW LNS solver for each. The old greedy implementation
 * is gone — this is a thin wrapper over `legacyScheduleAll`.
 *
 * Body: { divisions: LegacyScheduleAllDivision[] }
 * Response: { updated, unassigned, message }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = await req.json().catch(() => ({}));
  const divisions: LegacyScheduleAllDivision[] = Array.isArray(body.divisions)
    ? body.divisions
    : [];

  if (divisions.length === 0) {
    return NextResponse.json(
      { error: "divisions array is required" },
      { status: 400 },
    );
  }

  try {
    const result = await legacyScheduleAll({
      tournamentId: ctx.tournament.id,
      organizationId: ctx.organizationId,
      divisions,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
