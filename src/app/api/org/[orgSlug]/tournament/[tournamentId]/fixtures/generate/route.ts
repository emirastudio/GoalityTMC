import { and, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  groupTeams,
  matchRounds,
  matches,
  stageGroups,
  tournamentStages,
} from "@/db/schema";
import { isError, requireGameAdmin } from "@/lib/game-auth";
import {
  generateGroupsToPlayoff,
  generateRoundRobin,
  generateSingleElim,
} from "@/lib/scheduling";

type Params = { orgSlug: string; tournamentId: string };

/**
 * POST /api/org/[orgSlug]/tournament/[tournamentId]/fixtures/generate
 *
 * Body: { stageId: number, doubleLeg?: boolean, force?: boolean }
 *
 * Generates fixtures (match pairings) for a stage. Does NOT assign time or
 * field — that happens in /schedule/solve. If the stage already has finished
 * matches, requires `force: true` to regenerate (protects against data loss).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = await req.json().catch(() => ({}));
  const stageId: number | undefined = body.stageId;
  const doubleLeg: boolean = body.doubleLeg === true;
  const force: boolean = body.force === true;
  if (!stageId) {
    return NextResponse.json({ error: "stageId required" }, { status: 400 });
  }

  const [stage] = await db
    .select()
    .from(tournamentStages)
    .where(and(eq(tournamentStages.id, stageId), eq(tournamentStages.tournamentId, ctx.tournament.id)));
  if (!stage) {
    return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  }

  // Refuse if stage has finished matches unless force=true
  const finished = await db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.stageId, stageId), eq(matches.status, "finished")));
  if (finished.length > 0 && !force) {
    return NextResponse.json(
      { error: "Stage has finished matches. Pass force:true to regenerate.", finishedCount: finished.length },
      { status: 409 },
    );
  }

  // Wipe existing non-finished matches
  await db
    .delete(matches)
    .where(and(eq(matches.stageId, stageId), eq(matches.status, "scheduled")));

  let created = 0;

  if (stage.type === "group" || stage.type === "league") {
    const groups = await db.select().from(stageGroups).where(eq(stageGroups.stageId, stageId));
    for (const g of groups) {
      const gt = await db.select().from(groupTeams).where(eq(groupTeams.groupId, g.id));
      const teamIds = gt.map((t) => t.teamId);
      if (teamIds.length < 2) continue;
      const pairings = generateRoundRobin(teamIds, doubleLeg);
      for (const p of pairings) {
        if (p.homeTeamId == null || p.awayTeamId == null) continue; // skip BYEs
        await db.insert(matches).values({
          tournamentId: ctx.tournament.id,
          organizationId: ctx.organizationId,
          stageId: stage.id,
          groupId: g.id,
          homeTeamId: p.homeTeamId,
          awayTeamId: p.awayTeamId,
          groupRound: p.round,
          status: "scheduled",
        });
        created++;
      }
    }
  } else if (stage.type === "knockout") {
    const rounds = await db
      .select()
      .from(matchRounds)
      .where(eq(matchRounds.stageId, stageId));
    // If rounds are pre-defined, create empty shell matches per round.
    if (rounds.length > 0) {
      for (const r of rounds) {
        for (let i = 0; i < r.matchCount; i++) {
          await db.insert(matches).values({
            tournamentId: ctx.tournament.id,
            organizationId: ctx.organizationId,
            stageId: stage.id,
            roundId: r.id,
            homeTeamId: null,
            awayTeamId: null,
            status: "scheduled",
          });
          created++;
        }
        if (r.hasThirdPlace) {
          await db.insert(matches).values({
            tournamentId: ctx.tournament.id,
            organizationId: ctx.organizationId,
            stageId: stage.id,
            roundId: r.id,
            homeTeamId: null,
            awayTeamId: null,
            status: "scheduled",
          });
          created++;
        }
      }
    }
  } else {
    return NextResponse.json(
      { error: `Auto-generation for type '${stage.type}' is not supported in v1` },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, created });
}
