import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamBlackouts } from "@/db/schema";
import { isError, requireGameAdmin } from "@/lib/game-auth";

type Params = { orgSlug: string; tournamentId: string };

/**
 * GET — lists all team blackouts for this tournament.
 * Query params: ?teamId=
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  const where = teamId
    ? and(eq(teamBlackouts.tournamentId, ctx.tournament.id), eq(teamBlackouts.teamId, Number(teamId)))
    : eq(teamBlackouts.tournamentId, ctx.tournament.id);

  const rows = await db.select().from(teamBlackouts).where(where);
  return NextResponse.json({ blackouts: rows });
}

/**
 * POST — creates a team blackout.
 * Body: { teamId, date, startTime?, endTime?, reason? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = await req.json().catch(() => ({}));
  const { teamId, date, startTime, endTime, reason } = body as {
    teamId?: number;
    date?: string;
    startTime?: string;
    endTime?: string;
    reason?: string;
  };
  if (!teamId || !date) {
    return NextResponse.json({ error: "teamId and date required" }, { status: 400 });
  }

  const [row] = await db
    .insert(teamBlackouts)
    .values({
      tournamentId: ctx.tournament.id,
      teamId,
      date,
      startTime: startTime ?? null,
      endTime: endTime ?? null,
      reason: reason ?? null,
    })
    .returning();

  return NextResponse.json({ blackout: row });
}
