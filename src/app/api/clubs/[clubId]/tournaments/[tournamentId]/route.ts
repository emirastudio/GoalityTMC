import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  teams,
  tournamentRegistrations,
  tournaments,
  tournamentClasses,
  organizations,
  groupTeams,
  standings,
  matches,
  tournamentStages,
} from "@/db/schema";
import { eq, and, asc, inArray, isNull, or } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET /api/clubs/[clubId]/tournaments/[tournamentId]
// Returns detailed info for a specific tournament for this club's teams
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string; tournamentId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId, tournamentId } = await params;
  const cid = parseInt(clubId);
  const tid = parseInt(tournamentId);

  if (session.clubId !== cid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isNaN(tid)) {
    return NextResponse.json({ error: "Invalid tournamentId" }, { status: 400 });
  }

  // 1. Get tournament + org (via join)
  const [tournamentRow] = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      slug: tournaments.slug,
      startDate: tournaments.startDate,
      endDate: tournaments.endDate,
      orgId: organizations.id,
      orgSlug: organizations.slug,
      orgName: organizations.name,
    })
    .from(tournaments)
    .innerJoin(organizations, eq(tournaments.organizationId, organizations.id))
    .where(eq(tournaments.id, tid))
    .limit(1);

  if (!tournamentRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tournament = tournamentRow;

  // 2. Get all teams for this club
  const clubTeams = await db.query.teams.findMany({
    where: eq(teams.clubId, cid),
  });
  if (clubTeams.length === 0) {
    return NextResponse.json({ error: "No teams" }, { status: 404 });
  }
  const clubTeamIds = clubTeams.map((t) => t.id);

  // 3. Get registrations for this tournament for club's teams
  const regs = await db
    .select({
      regId: tournamentRegistrations.id,
      teamId: tournamentRegistrations.teamId,
      classId: tournamentRegistrations.classId,
      className: tournamentClasses.name,
      displayName: tournamentRegistrations.displayName,
      regNumber: tournamentRegistrations.regNumber,
      regStatus: tournamentRegistrations.status,
    })
    .from(tournamentRegistrations)
    .leftJoin(tournamentClasses, eq(tournamentRegistrations.classId, tournamentClasses.id))
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tid),
        inArray(tournamentRegistrations.teamId, clubTeamIds)
      )
    );

  if (regs.length === 0) {
    return NextResponse.json({ error: "No registrations for this club in this tournament" }, { status: 404 });
  }

  // 4. Get all stage IDs for this tournament
  const stageIds = await db
    .select({ id: tournamentStages.id })
    .from(tournamentStages)
    .where(eq(tournamentStages.tournamentId, tid));
  const stageIdList = stageIds.map((s) => s.id);

  // 5. For each registered team, find group + standings + matches
  const registeredTeamIds = regs.map((r) => r.teamId);

  type StandingRow = {
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
    team: { name: string | null; club: { badgeUrl: string | null; name: string } | null } | null;
  };

  type TeamData = {
    teamId: number;
    teamName: string | null;
    displayName: string | null;
    classId: number | null;
    className: string | null;
    regNumber: number;
    regStatus: string;
    groupStandings: {
      groupId: number;
      groupName: string;
      standings: StandingRow[];
    } | null;
    matches: typeof teamMatches;
  };

  // Fetch matches for all club's teams in this tournament in one query
  const teamMatches = await db.query.matches.findMany({
    where: and(
      eq(matches.tournamentId, tid),
      isNull(matches.deletedAt),
      or(
        inArray(matches.homeTeamId, registeredTeamIds),
        inArray(matches.awayTeamId, registeredTeamIds)
      )!
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

  // Fetch all group assignments for club's teams
  const groupTeamRows = await db.query.groupTeams.findMany({
    where: inArray(groupTeams.teamId, registeredTeamIds),
    with: { group: true },
  });

  // Build per-team data
  const teamDataList: TeamData[] = [];

  for (const reg of regs) {
    const team = clubTeams.find((t) => t.id === reg.teamId);
    if (!team) continue;

    // Find group for this team (in this tournament)
    const groupTeamRow = groupTeamRows.find(
      (gt) => gt.teamId === reg.teamId && stageIdList.includes(gt.group.stageId)
    );

    let groupStandings: TeamData["groupStandings"] = null;

    if (groupTeamRow) {
      const groupId = groupTeamRow.groupId;
      const groupStandingRows = await db.query.standings.findMany({
        where: eq(standings.groupId, groupId),
        orderBy: [asc(standings.position)],
        with: {
          team: { with: { club: true } },
        },
      });

      groupStandings = {
        groupId,
        groupName: groupTeamRow.group.name,
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
                club: s.team.club ? { badgeUrl: s.team.club.badgeUrl, name: s.team.club.name } : null,
              }
            : null,
        })),
      };
    }

    // Filter matches for this team
    const myMatches = teamMatches.filter(
      (m) => m.homeTeamId === reg.teamId || m.awayTeamId === reg.teamId
    );

    teamDataList.push({
      teamId: reg.teamId,
      teamName: team.name,
      displayName: reg.displayName,
      classId: reg.classId,
      className: reg.className,
      regNumber: reg.regNumber,
      regStatus: reg.regStatus,
      groupStandings,
      matches: myMatches,
    });
  }

  return NextResponse.json({
    tournament: {
      id: tournament.id,
      name: tournament.name,
      slug: tournament.slug,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
    },
    org: {
      id: tournament.orgId,
      slug: tournament.orgSlug,
      name: tournament.orgName,
    },
    teams: teamDataList,
  });
}
