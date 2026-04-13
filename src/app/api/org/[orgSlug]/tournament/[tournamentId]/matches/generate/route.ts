import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, stageGroups, tournamentStages, matchRounds } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { generateLeaguePhase, generateRoundRobin } from "@/lib/scheduling";
import { eq, and } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string };

/**
 * POST /api/org/[orgSlug]/tournament/[tournamentId]/matches/generate
 *
 * Creates fixture match ROWS for a stage (no scheduling — time/field is null).
 * Scheduling is done separately via /matches/auto-schedule or /schedule-all.
 *
 * - GROUP:    round-robin within each group (or slot-mode TBD matches)
 * - LEAGUE:   UCL-style league phase — N teams play `matchesPerTeam` matches
 *             each (default 8). All teams treated as one pool.
 * - KNOCKOUT: empty shell matches for each round
 *
 * Body: { stageId, doubleRoundRobin?, slotsPerGroup?, matchesPerTeam?, force? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = await req.json();
  const { stageId, doubleRoundRobin = false } = body;

  if (!stageId) {
    return NextResponse.json({ error: "stageId required" }, { status: 400 });
  }

  // Load stage
  const stage = await db.query.tournamentStages.findFirst({
    where: and(
      eq(tournamentStages.id, stageId),
      eq(tournamentStages.tournamentId, ctx.tournament.id)
    ),
  });
  if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  // Refuse to regenerate if there are finished matches, unless force=true
  const finishedMatches = await db.query.matches.findMany({
    where: and(
      eq(matches.stageId, stageId),
      eq(matches.status, "finished")
    ),
  });
  if (finishedMatches.length > 0 && !body.force) {
    return NextResponse.json(
      {
        error: "Stage has finished matches. Pass force:true to regenerate.",
        finishedCount: finishedMatches.length,
      },
      { status: 409 }
    );
  }

  // Wipe existing scheduled (non-finished) matches for this stage
  await db.delete(matches).where(
    and(
      eq(matches.stageId, stageId),
      eq(matches.status, "scheduled")
    )
  );

  const generatedMatches: Array<{
    tournamentId: number;
    organizationId: number;
    stageId: number;
    groupId: number | null;
    roundId: number | null;
    matchNumber: number;
    groupRound: number | null;
    homeTeamId: number | null;
    awayTeamId: number | null;
    status: "scheduled";
  }> = [];

  let globalMatchNumber = 1;

  if (stage.type === "group") {
    const { slotsPerGroup } = body;

    const groups = await db.query.stageGroups.findMany({
      where: eq(stageGroups.stageId, stageId),
      with: { groupTeams: true },
      orderBy: (g, { asc }) => [asc(g.order)],
    });

    for (const group of groups) {
      // Resolve effective slot count:
      // 1. group.targetSize (stored per-group in DB) — highest priority
      // 2. slotsPerGroup from request body (UI picker)
      // 3. fall back to actual team count (team mode)
      const effectiveSlots = group.targetSize ?? (slotsPerGroup && slotsPerGroup >= 2 ? slotsPerGroup : null);

      if (effectiveSlots && effectiveSlots >= 2) {
        // Slot mode: create TBD match slots for `effectiveSlots` capacity.
        // Strategy: run Berger on slot INDICES [1..n] so the ghost (inserted
        // for odd n) shows up as null in homeTeamId/awayTeamId and can be
        // excluded — only real slot pairs are scheduled.  Then map each index
        // to the real teamId (if a team is already assigned to that slot) or
        // null (TBD).
        const n = Math.min(effectiveSlots, 20);

        // Sorted list of actually-assigned teams (may be shorter than n)
        const assignedTeams = group.groupTeams
          .sort((a, b) => (a.seedNumber ?? 0) - (b.seedNumber ?? 0))
          .map((gt) => gt.teamId);

        // Use 1-based integer indices so Berger works correctly for odd n
        const slotIndices = Array.from({ length: n }, (_, i) => i + 1);
        const pairings = generateRoundRobin(slotIndices, doubleRoundRobin);

        for (const pair of pairings) {
          // Skip ghost/bye pairs — Berger inserts a null ghost for odd n
          if (pair.homeTeamId == null || pair.awayTeamId == null) continue;

          // Map 1-based slot index → teamId (or null = TBD)
          const home = assignedTeams[(pair.homeTeamId as number) - 1] ?? null;
          const away = assignedTeams[(pair.awayTeamId as number) - 1] ?? null;

          generatedMatches.push({
            tournamentId: ctx.tournament.id,
            organizationId: ctx.organizationId,
            stageId,
            groupId: group.id,
            roundId: null,
            matchNumber: globalMatchNumber++,
            groupRound: pair.round,
            homeTeamId: home,
            awayTeamId: away,
            status: "scheduled",
          });
        }
      } else {
        // Team mode: use assigned teams + new engine's round-robin generator
        const teamIds = group.groupTeams.map((gt) => gt.teamId);
        if (teamIds.length < 2) continue;
        const pairings = generateRoundRobin(teamIds, doubleRoundRobin);
        for (const pair of pairings) {
          if (pair.homeTeamId == null || pair.awayTeamId == null) continue; // BYE
          generatedMatches.push({
            tournamentId: ctx.tournament.id,
            organizationId: ctx.organizationId,
            stageId,
            groupId: group.id,
            roundId: null,
            matchNumber: globalMatchNumber++,
            groupRound: pair.round,
            homeTeamId: pair.homeTeamId,
            awayTeamId: pair.awayTeamId,
            status: "scheduled",
          });
        }
      }
    }
  } else if (stage.type === "league") {
    // UCL-style league phase — pool all teams from every group in this stage,
    // then generate a pre-seeded league phase where each team plays
    // `matchesPerTeam` matches. Matches are written to the *first* group so the
    // existing planner/standings UI still groups them coherently; if there is
    // no group row we fall back to groupId=null.
    const matchesPerTeamRaw = body.matchesPerTeam;
    const groups = await db.query.stageGroups.findMany({
      where: eq(stageGroups.stageId, stageId),
      with: { groupTeams: true },
      orderBy: (g, { asc }) => [asc(g.order)],
    });

    const teamIds: number[] = [];
    for (const g of groups) {
      for (const gt of g.groupTeams) teamIds.push(gt.teamId);
    }

    if (teamIds.length >= 2) {
      const defaultK = Math.min(8, teamIds.length - 1);
      const k =
        typeof matchesPerTeamRaw === "number" && matchesPerTeamRaw > 0
          ? Math.min(matchesPerTeamRaw, teamIds.length - 1)
          : defaultK;

      const pairings = generateLeaguePhase(teamIds, k);
      const hostGroupId = groups[0]?.id ?? null;

      for (const pair of pairings) {
        if (pair.homeTeamId == null || pair.awayTeamId == null) continue;
        generatedMatches.push({
          tournamentId: ctx.tournament.id,
          organizationId: ctx.organizationId,
          stageId,
          groupId: hostGroupId,
          roundId: null,
          matchNumber: globalMatchNumber++,
          groupRound: pair.round,
          homeTeamId: pair.homeTeamId,
          awayTeamId: pair.awayTeamId,
          status: "scheduled",
        });
      }
    }
  } else if (stage.type === "knockout") {
    // Knockout: empty shell matches per round (teams filled after draws)
    const rounds = await db.query.matchRounds.findMany({
      where: eq(matchRounds.stageId, stageId),
      orderBy: (r, { desc }) => [desc(r.order)],
    });

    // Check if there's a dedicated 3rd-place round (shortName "3P" or similar).
    // If yes, skip hasThirdPlace generation to avoid duplicate 3rd-place matches.
    const hasdedicated3P = rounds.some(
      r => r.shortName?.toUpperCase().startsWith("3") || r.shortName?.toUpperCase() === "BRONZE"
    );

    for (const round of rounds) {
      for (let i = 0; i < round.matchCount; i++) {
        generatedMatches.push({
          tournamentId: ctx.tournament.id,
          organizationId: ctx.organizationId,
          stageId,
          groupId: null,
          roundId: round.id,
          matchNumber: globalMatchNumber++,
          groupRound: null,
          homeTeamId: null,
          awayTeamId: null,
          status: "scheduled",
        });
      }
      // Only generate 3rd-place via hasThirdPlace if there's no dedicated 3P round.
      // Having both would create a duplicate (3 Finals-level matches instead of 2).
      if (round.hasThirdPlace && !hasdedicated3P) {
        generatedMatches.push({
          tournamentId: ctx.tournament.id,
          organizationId: ctx.organizationId,
          stageId,
          groupId: null,
          roundId: round.id,
          matchNumber: globalMatchNumber++,
          groupRound: null,
          homeTeamId: null,
          awayTeamId: null,
          status: "scheduled",
        });
      }
    }
  } else {
    return NextResponse.json(
      { error: `Auto-generation for type '${stage.type}' is not supported` },
      { status: 400 }
    );
  }

  if (generatedMatches.length === 0) {
    return NextResponse.json(
      {
        error:
          "No matches generated. For group stages, pass slotsPerGroup or assign teams to groups.",
      },
      { status: 400 }
    );
  }

  const inserted = await db.insert(matches).values(generatedMatches).returning();

  return NextResponse.json(
    {
      generated: inserted.length,
      conflicts: [],
      matches: inserted,
    },
    { status: 201 }
  );
}
