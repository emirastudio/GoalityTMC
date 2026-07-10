import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  tournamentStages,
  matchRounds,
  matches,
  tournamentRegistrations,
} from "@/db/schema";
import { and, eq, isNull, asc, inArray } from "drizzle-orm";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { firstPlayRound, nextPlayRound } from "@/lib/playoff-rounds";
import { buildDrawLayout } from "@/lib/playoff-draw";

type Params = { orgSlug: string; tournamentId: string; stageId: string };

/**
 * POST /stages/[stageId]/apply-knockout-draw
 *
 * Body: { teamIds: number[], force?: boolean }
 *   teamIds — the teams in the exact order the Draw Show revealed them.
 *
 * Persists the draw into the real bracket: fills the first-played round's
 * match shells with the drawn pairs and drops bye teams straight into their
 * round-2 slots. Idempotent — re-running overwrites the round-1/round-2 team
 * assignments in place (never inserts). Winner progression from there on is
 * handled by playoff-progress.ts.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const stageId = parseInt(p.stageId);

  const [stage] = await db
    .select()
    .from(tournamentStages)
    .where(and(eq(tournamentStages.id, stageId), eq(tournamentStages.tournamentId, ctx.tournament.id)));
  if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  if (stage.type !== "knockout") {
    return NextResponse.json({ error: "Stage is not a knockout stage" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const teamIds: number[] = Array.isArray(body.teamIds)
    ? body.teamIds.filter((x: unknown): x is number => Number.isInteger(x))
    : [];
  const force: boolean = body.force === true;

  if (teamIds.length < 2) {
    return NextResponse.json({ error: "teamIds[] (≥2) required" }, { status: 400 });
  }
  if (new Set(teamIds).size !== teamIds.length) {
    return NextResponse.json({ error: "Duplicate team in draw" }, { status: 400 });
  }

  // Validate every team is a confirmed registration in this stage's division.
  const regs = await db
    .select({ teamId: tournamentRegistrations.teamId })
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, ctx.tournament.id),
        stage.classId ? eq(tournamentRegistrations.classId, stage.classId) : undefined,
        eq(tournamentRegistrations.status, "confirmed"),
        inArray(tournamentRegistrations.teamId, teamIds),
      ),
    );
  const validTeamIds = new Set(regs.map((r) => r.teamId));
  const unknown = teamIds.filter((id) => !validTeamIds.has(id));
  if (unknown.length > 0) {
    return NextResponse.json(
      { error: "Some teams are not confirmed registrations of this division", unknown },
      { status: 400 },
    );
  }

  // Don't silently overwrite a bracket that already has played matches.
  const finished = await db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.stageId, stageId), eq(matches.status, "finished")));
  if (finished.length > 0 && !force) {
    return NextResponse.json(
      { error: "Stage has finished matches. Pass force:true to redraw.", finishedCount: finished.length },
      { status: 409 },
    );
  }

  // Resolve the bracket structure (convention-agnostic).
  const rounds = await db.query.matchRounds.findMany({ where: eq(matchRounds.stageId, stageId) });
  const r1 = firstPlayRound(rounds);
  if (!r1) {
    return NextResponse.json(
      { error: "No rounds generated for this stage. Generate matches first.", code: "no_rounds" },
      { status: 409 },
    );
  }
  const r2 = nextPlayRound(rounds, r1.id);

  const layout = buildDrawLayout(teamIds);

  // Round-1 shells (in match order).
  const r1Matches = await db.query.matches.findMany({
    where: and(eq(matches.roundId, r1.id), eq(matches.stageId, stageId), isNull(matches.deletedAt)),
    orderBy: [asc(matches.matchNumber)],
  });
  if (r1Matches.length < layout.pairs.length) {
    return NextResponse.json(
      {
        error: "Bracket round-1 has fewer match slots than the draw needs — regenerate matches for this team count.",
        need: layout.pairs.length,
        have: r1Matches.length,
        code: "bracket_mismatch",
      },
      { status: 409 },
    );
  }

  const r2Matches = r2
    ? await db.query.matches.findMany({
        where: and(eq(matches.roundId, r2.id), eq(matches.stageId, stageId), isNull(matches.deletedAt)),
        orderBy: [asc(matches.matchNumber)],
      })
    : [];
  if (layout.byes.length > 0 && !r2) {
    return NextResponse.json(
      { error: "Draw has byes but the bracket has no second round.", code: "bracket_mismatch" },
      { status: 409 },
    );
  }
  const maxByeMatchIndex = layout.byes.reduce((m, b) => Math.max(m, b.roundTwoMatchIndex), -1);
  if (maxByeMatchIndex >= r2Matches.length) {
    return NextResponse.json(
      { error: "Bracket round-2 has fewer slots than the byes need — regenerate matches.", code: "bracket_mismatch" },
      { status: 409 },
    );
  }

  // ── Write, idempotently ────────────────────────────────────────────────
  await db.transaction(async (tx) => {
    // Clear any prior round-1/round-2 team assignments so a redraw is clean.
    const roundIds = r2 ? [r1.id, r2.id] : [r1.id];
    await tx
      .update(matches)
      .set({ homeTeamId: null, awayTeamId: null, winnerId: null })
      .where(and(eq(matches.stageId, stageId), inArray(matches.roundId, roundIds), isNull(matches.deletedAt)));

    // Round-1 pairs.
    for (let i = 0; i < layout.pairs.length; i++) {
      const [homeId, awayId] = layout.pairs[i];
      await tx
        .update(matches)
        .set({ homeTeamId: homeId, awayTeamId: awayId })
        .where(eq(matches.id, r1Matches[i].id));
    }

    // Byes → their round-2 slots.
    for (const bye of layout.byes) {
      const target = r2Matches[bye.roundTwoMatchIndex];
      if (!target) continue;
      await tx
        .update(matches)
        .set(bye.side === "home" ? { homeTeamId: bye.teamId } : { awayTeamId: bye.teamId })
        .where(eq(matches.id, target.id));
    }
  });

  return NextResponse.json({
    ok: true,
    pairs: layout.pairs.length,
    byes: layout.byes.length,
    bracketSize: layout.bracketSize,
  });
}
