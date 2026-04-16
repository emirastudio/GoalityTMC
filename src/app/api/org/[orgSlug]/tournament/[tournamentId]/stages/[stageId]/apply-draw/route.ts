import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, stageGroups, groupTeams, tournamentStages } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { generateRoundRobin } from "@/lib/scheduling";
import { eq, and, isNull, asc } from "drizzle-orm";

type Params = {
  orgSlug: string;
  tournamentId: string;
  stageId: string;
};

// POST /api/.../stages/[stageId]/apply-draw
// Applies draw (groupTeams) to match records.
// For each group: generates round-robin pairings from assigned teams,
// then updates existing match records with homeTeamId/awayTeamId
// while preserving scheduledAt and fieldId.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const stageId = parseInt(p.stageId);
  const body = await req.json().catch(() => ({}));
  const { doubleRoundRobin = false, groupId: targetGroupId } = body;

  // Verify stage belongs to this tournament
  const stage = await db.query.tournamentStages.findFirst({
    where: and(
      eq(tournamentStages.id, stageId),
      eq(tournamentStages.tournamentId, ctx.tournament.id)
    ),
  });
  if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  // Load groups with their assigned teams
  const groups = await db.query.stageGroups.findMany({
    where: targetGroupId
      ? and(eq(stageGroups.stageId, stageId), eq(stageGroups.id, targetGroupId))
      : eq(stageGroups.stageId, stageId),
    with: { groupTeams: { orderBy: (gt, { asc }) => [asc(gt.seedNumber)] } },
    orderBy: (g, { asc }) => [asc(g.order)],
  });

  if (groups.length === 0) {
    return NextResponse.json({ error: "No groups found for this stage" }, { status: 404 });
  }

  const perGroup: Record<number, { updated: number; inserted: number; cleared: number }> = {};
  let totalUpdated = 0;
  let totalInserted = 0;

  for (const group of groups) {
    const teamIds = group.groupTeams.map((gt) => gt.teamId);
    const targetSize = group.targetSize ?? null;
    const isSlotMode = targetSize != null && targetSize >= 2;

    // Load existing matches for this group ordered by (groupRound, matchNumber)
    const existingMatches = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.tournamentId, ctx.tournament.id),
          eq(matches.stageId, stageId),
          eq(matches.groupId, group.id),
          isNull(matches.deletedAt),
        )
      )
      .orderBy(asc(matches.groupRound), asc(matches.matchNumber));

    if (teamIds.length < 2) {
      // Not enough teams: clear team assignments from existing matches (keep slots)
      let cleared = 0;
      for (const m of existingMatches) {
        if (m.homeTeamId !== null || m.awayTeamId !== null) {
          await db
            .update(matches)
            .set({ homeTeamId: null, awayTeamId: null, updatedAt: new Date() })
            .where(eq(matches.id, m.id));
          cleared++;
        }
      }
      perGroup[group.id] = { updated: 0, inserted: 0, cleared };
      continue;
    }

    // Build the pairing table:
    // - SLOT MODE: run Berger on 1-based slot indices [1..targetSize], filter out
    //   ghost/bye pairs (where Berger inserts null for odd n), then map each index
    //   to the registered teamId at that position (or null = TBD). This produces
    //   exactly the same match structure as /matches/generate so the 1:1 update
    //   by position correctly preserves scheduledAt/fieldId.
    // - TEAM MODE: run Berger on real teamIds, drop BYE entries.
    let filteredPairings: { round: number; homeTeamId: number | null; awayTeamId: number | null }[];

    if (isSlotMode) {
      const n = targetSize!;
      const slotIndices = Array.from({ length: n }, (_, i) => i + 1);
      const rawPairings = generateRoundRobin(slotIndices, doubleRoundRobin);
      filteredPairings = rawPairings
        .filter(p => p.homeTeamId != null && p.awayTeamId != null) // skip ghost/bye rows
        .map(p => ({
          round: p.round,
          // Map 1-based slot index → registered teamId (or null = TBD slot beyond roster)
          homeTeamId: teamIds[(p.homeTeamId as number) - 1] ?? null,
          awayTeamId: teamIds[(p.awayTeamId as number) - 1] ?? null,
        }))
        // Drop pairings where either slot index exceeds the actual team count.
        // Example: targetSize=5, only 4 teams registered → slot 5 maps to null.
        // Without this filter those matches appear as "Team A vs TBD" which is wrong.
        // The remaining match slots are left as (null,null) TBD by the clearing pass below.
        .filter(p => p.homeTeamId != null && p.awayTeamId != null);
    } else {
      const pairings = generateRoundRobin(teamIds, doubleRoundRobin);
      filteredPairings = pairings.filter(p => p.homeTeamId != null && p.awayTeamId != null);
    }

    let updated = 0;
    let inserted = 0;

    // Update existing slot-matches with pairings (1:1 by position)
    const updateCount = Math.min(filteredPairings.length, existingMatches.length);
    for (let i = 0; i < updateCount; i++) {
      await db
        .update(matches)
        .set({
          homeTeamId: filteredPairings[i].homeTeamId ?? null,
          awayTeamId: filteredPairings[i].awayTeamId ?? null,
          groupRound: filteredPairings[i].round,
          updatedAt: new Date(),
        })
        .where(eq(matches.id, existingMatches[i].id));
      updated++;
    }

    // If more pairings than existing matches — insert new ones
    if (filteredPairings.length > existingMatches.length) {
      const lastMatchNumber = existingMatches.length > 0
        ? Math.max(...existingMatches.map(m => m.matchNumber ?? 0))
        : 0;

      const toInsert = filteredPairings.slice(existingMatches.length).map((pair, i) => ({
        tournamentId: ctx.tournament.id,
        organizationId: ctx.organizationId,
        stageId,
        groupId: group.id,
        roundId: null as number | null,
        matchNumber: lastMatchNumber + i + 1,
        groupRound: pair.round,
        homeTeamId: pair.homeTeamId ?? null,
        awayTeamId: pair.awayTeamId ?? null,
        status: "scheduled" as const,
      }));

      await db.insert(matches).values(toInsert);
      inserted = toInsert.length;
    }

    // If fewer pairings than existing matches — delete or clear excess.
    // Rule: a group match with no real opponent is not a "TBD slot", it's a
    // phantom. A bye round means the team simply doesn't play that round —
    // the match record must not exist at all in the schedule.
    // We delete in both SLOT MODE and TEAM MODE; the only exception is a
    // match that already has a score (edge case: re-applying draw after games
    // started) — those we just detach teams but keep the record.
    let cleared = 0;
    if (existingMatches.length > filteredPairings.length) {
      for (let i = filteredPairings.length; i < existingMatches.length; i++) {
        const excess = existingMatches[i];
        if (excess.homeScore == null && excess.awayScore == null) {
          await db.delete(matches).where(eq(matches.id, excess.id));
        } else {
          // Match has scores — can't delete, just remove teams
          await db
            .update(matches)
            .set({ homeTeamId: null, awayTeamId: null, updatedAt: new Date() })
            .where(eq(matches.id, excess.id));
        }
        cleared++;
      }
    }

    perGroup[group.id] = { updated, inserted, cleared };
    totalUpdated += updated + inserted;
    totalInserted += inserted;
  }

  return NextResponse.json({
    updated: totalUpdated,
    inserted: totalInserted,
    perGroup,
  });
}
