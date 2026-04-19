import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  organizations,
  tournaments,
  teams,
  tournamentRegistrations,
  tournamentClasses,
  groupTeams,
  stageGroups,
  standings,
  matches,
} from "@/db/schema";
import { eq, and, asc, or, isNull } from "drizzle-orm";
import { resolveTeamDisplayNames } from "@/lib/team-display-names";

// GET /api/public/t/[orgSlug]/[tournamentSlug]/teams/[teamId]
// Public team detail — no auth required
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentSlug: string; teamId: string }> }
) {
  const { orgSlug, tournamentSlug, teamId } = await params;
  const tid = parseInt(teamId);
  if (isNaN(tid)) return NextResponse.json({ error: "Invalid teamId" }, { status: 400 });

  // 1. Resolve org + tournament
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tournament = await db.query.tournaments.findFirst({
    where: and(
      eq(tournaments.organizationId, org.id),
      eq(tournaments.slug, tournamentSlug)
    ),
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 2. Fetch team with club
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, tid),
    with: { club: true },
  });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  // 3. Fetch registration for this team in this tournament (with class)
  const [registration] = await db
    .select({
      id: tournamentRegistrations.id,
      displayName: tournamentRegistrations.displayName,
      classId: tournamentRegistrations.classId,
      className: tournamentClasses.name,
      status: tournamentRegistrations.status,
      regNumber: tournamentRegistrations.regNumber,
    })
    .from(tournamentRegistrations)
    .leftJoin(tournamentClasses, eq(tournamentRegistrations.classId, tournamentClasses.id))
    .where(
      and(
        eq(tournamentRegistrations.teamId, tid),
        eq(tournamentRegistrations.tournamentId, tournament.id)
      )
    )
    .limit(1);

  // 4. Find which group this team is in (for this tournament)
  let groupStandings: {
    groupId: number;
    groupName: string;
    standings: Array<{
      position: number | null;
      teamId: number;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDiff: number;
      points: number;
      form: string[] | null;
      team: { name: string | null; club: { badgeUrl: string | null } | null } | null;
    }>;
  } | null = null;

  {
    // Find the group this team belongs to in this tournament's stages
    const [groupTeamJoin] = await db
      .select({
        groupId: groupTeams.groupId,
        groupName: stageGroups.name,
        groupStageId: stageGroups.stageId,
      })
      .from(groupTeams)
      .innerJoin(stageGroups, eq(groupTeams.groupId, stageGroups.id))
      .where(
        and(
          eq(groupTeams.teamId, tid),
          eq(stageGroups.tournamentId, tournament.id)
        )
      )
      .limit(1);

    const groupTeamRow = groupTeamJoin
      ? { groupId: groupTeamJoin.groupId, group: { name: groupTeamJoin.groupName, stageId: groupTeamJoin.groupStageId } }
      : null;

    if (groupTeamRow) {
      const groupId = groupTeamRow.groupId;
      const groupName = groupTeamRow.group.name;

      // Fetch full group standings
      const groupStandingRows = await db.query.standings.findMany({
        where: eq(standings.groupId, groupId),
        orderBy: [asc(standings.position)],
        with: {
          team: {
            with: { club: true },
          },
        },
      });

      groupStandings = {
        groupId,
        groupName,
        standings: groupStandingRows.map((s) => ({
          position: s.position,
          teamId: s.teamId,
          played: s.played,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
          goalDiff: s.goalDiff,
          points: s.points,
          form: s.form,
          team: s.team
            ? {
                name: s.team.name,
                club: s.team.club ? { badgeUrl: s.team.club.badgeUrl } : null,
              }
            : null,
        })),
      };
    }
  }

  // 4b. Resolve tournament-scoped displayName for every team that appears
  //     in standings. `teams.name` is often NULL — the real label lives in
  //     `tournamentRegistrations.displayName`.
  const standingsTeamIds = groupStandings ? groupStandings.standings.map(s => s.teamId) : [];
  const displayNameByTeamId = await resolveTeamDisplayNames(tournament.id, standingsTeamIds);

  if (groupStandings) {
    for (const s of groupStandings.standings) {
      const dn = displayNameByTeamId.get(s.teamId);
      if (dn && s.team) s.team.name = s.team.name ?? dn;
      else if (dn && !s.team) s.team = { name: dn, club: null };
    }
  }

  // 5. Fetch all matches for this team in this tournament
  const teamMatches = await db.query.matches.findMany({
    where: and(
      eq(matches.tournamentId, tournament.id),
      eq(matches.isPublic, true),
      isNull(matches.deletedAt),
      or(eq(matches.homeTeamId, tid), eq(matches.awayTeamId, tid))!
    ),
    orderBy: [asc(matches.scheduledAt), asc(matches.matchNumber)],
    with: {
      homeTeam: { with: { club: true } },
      awayTeam: { with: { club: true } },
      field: { with: { stadium: true } },
      stage: true,
      group: true,
      round: true,
    },
  });

  // 5b. Apply displayName fallback for home/away team names in matches.
  const matchTeamIds = new Set<number>();
  for (const m of teamMatches) {
    if (m.homeTeam && !displayNameByTeamId.has(m.homeTeam.id)) matchTeamIds.add(m.homeTeam.id);
    if (m.awayTeam && !displayNameByTeamId.has(m.awayTeam.id)) matchTeamIds.add(m.awayTeam.id);
  }
  if (matchTeamIds.size > 0) {
    const extra = await resolveTeamDisplayNames(tournament.id, Array.from(matchTeamIds));
    for (const [id, name] of extra) displayNameByTeamId.set(id, name);
  }
  for (const m of teamMatches) {
    if (m.homeTeam) {
      const dn = displayNameByTeamId.get(m.homeTeam.id);
      if (dn && !m.homeTeam.name) m.homeTeam.name = dn;
    }
    if (m.awayTeam) {
      const dn = displayNameByTeamId.get(m.awayTeam.id);
      if (dn && !m.awayTeam.name) m.awayTeam.name = dn;
    }
  }

  // 5c. Mark 3rd-place matches. In a knockout round with hasThirdPlace=true,
  //     the extra match(es) beyond matchCount are the bronze match. Detect by
  //     asking the DB for each round's full match list ordered by matchNumber.
  const thirdPlaceMatchIds = new Set<number>();
  {
    const roundsWithBronze = new Map<number, { matchCount: number }>();
    for (const m of teamMatches) {
      if (m.round?.hasThirdPlace && m.round?.id && !roundsWithBronze.has(m.round.id)) {
        roundsWithBronze.set(m.round.id, { matchCount: m.round.matchCount });
      }
    }
    for (const [roundId, info] of roundsWithBronze) {
      const all = await db.query.matches.findMany({
        where: and(
          eq(matches.roundId, roundId),
          isNull(matches.deletedAt),
        ),
        orderBy: [asc(matches.matchNumber)],
        columns: { id: true },
      });
      all.slice(info.matchCount).forEach(r => thirdPlaceMatchIds.add(r.id));
    }
  }

  const matchesWithFlags = teamMatches.map(m => ({
    ...m,
    isThirdPlace: thirdPlaceMatchIds.has(m.id),
  }));

  // Also resolve the main team's own display name for the hero card.
  const mainDisplayName = registration?.displayName ?? team.name ?? null;

  return NextResponse.json({
    team: {
      id: team.id,
      name: mainDisplayName,
      club: team.club
        ? { name: team.club.name, badgeUrl: team.club.badgeUrl, city: team.club.city }
        : null,
    },
    registration: registration ?? null,
    groupStandings,
    matches: matchesWithFlags,
  });
}
