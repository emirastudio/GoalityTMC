import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  teams,
  tournamentRegistrations,
  tournaments,
  tournamentClasses,
  organizations,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET /api/clubs/[clubId]/tournaments
// Returns all tournaments the club's teams are registered in
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId } = await params;
  const cid = parseInt(clubId);

  if (session.clubId !== cid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1. Get all teams for this club
  const clubTeams = await db.query.teams.findMany({
    where: eq(teams.clubId, cid),
    orderBy: (t, { desc, asc }) => [desc(t.birthYear), asc(t.gender)],
  });

  if (clubTeams.length === 0) {
    return NextResponse.json({ tournaments: [] });
  }

  const teamIds = clubTeams.map((t) => t.id);

  // 2. Get registrations with tournament + org + class info
  const regs = await db
    .select({
      regId: tournamentRegistrations.id,
      teamId: tournamentRegistrations.teamId,
      classId: tournamentRegistrations.classId,
      className: tournamentClasses.name,
      displayName: tournamentRegistrations.displayName,
      regNumber: tournamentRegistrations.regNumber,
      regStatus: tournamentRegistrations.status,
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      tournamentSlug: tournaments.slug,
      tournamentStartDate: tournaments.startDate,
      tournamentEndDate: tournaments.endDate,
      orgId: organizations.id,
      orgSlug: organizations.slug,
      orgName: organizations.name,
    })
    .from(tournamentRegistrations)
    .innerJoin(tournaments, eq(tournamentRegistrations.tournamentId, tournaments.id))
    .innerJoin(organizations, eq(tournaments.organizationId, organizations.id))
    .leftJoin(tournamentClasses, eq(tournamentRegistrations.classId, tournamentClasses.id))
    .where(inArray(tournamentRegistrations.teamId, teamIds));

  // 3. Group by tournament
  type TeamInfo = {
    teamId: number;
    teamName: string | null;
    displayName: string | null;
    classId: number | null;
    className: string | null;
    regNumber: number;
    regStatus: string;
  };

  type TournamentEntry = {
    tournament: {
      id: number;
      name: string;
      slug: string;
      startDate: Date | null;
      endDate: Date | null;
    };
    org: { id: number; slug: string; name: string };
    teams: TeamInfo[];
  };

  const map = new Map<number, TournamentEntry>();

  for (const reg of regs) {
    const team = clubTeams.find((t) => t.id === reg.teamId);
    if (!team) continue;

    if (!map.has(reg.tournamentId)) {
      map.set(reg.tournamentId, {
        tournament: {
          id: reg.tournamentId,
          name: reg.tournamentName,
          slug: reg.tournamentSlug,
          startDate: reg.tournamentStartDate,
          endDate: reg.tournamentEndDate,
        },
        org: { id: reg.orgId, slug: reg.orgSlug, name: reg.orgName },
        teams: [],
      });
    }

    map.get(reg.tournamentId)!.teams.push({
      teamId: team.id,
      teamName: team.name,
      displayName: reg.displayName,
      classId: reg.classId,
      className: reg.className,
      regNumber: reg.regNumber,
      regStatus: reg.regStatus,
    });
  }

  // Sort by start date descending (newest first)
  const result = Array.from(map.values()).sort((a, b) => {
    const da = a.tournament.startDate?.getTime() ?? 0;
    const db_ = b.tournament.startDate?.getTime() ?? 0;
    return db_ - da;
  });

  return NextResponse.json({ tournaments: result });
}
