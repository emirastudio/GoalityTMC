import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, clubs, people, tournamentClasses } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// Get all teams for a club
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

  const clubTeams = await db.query.teams.findMany({
    where: eq(teams.clubId, cid),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });

  // Get player counts for each team
  const result = await Promise.all(
    clubTeams.map(async (team) => {
      const playerCount = await db
        .select({ count: count() })
        .from(people)
        .where(and(eq(people.teamId, team.id), eq(people.personType, "player")));

      const staffCount = await db
        .select({ count: count() })
        .from(people)
        .where(and(eq(people.teamId, team.id), eq(people.personType, "staff")));

      // Get class name
      let className = "";
      if (team.classId) {
        const cls = await db.query.tournamentClasses.findFirst({
          where: eq(tournamentClasses.id, team.classId),
        });
        className = cls?.name ?? "";
      }

      return {
        ...team,
        className,
        playersCount: playerCount[0]?.count ?? 0,
        staffCount: staffCount[0]?.count ?? 0,
      };
    })
  );

  return NextResponse.json(result);
}

// Add a new team to the club
export async function POST(
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

  const body = await req.json();

  const club = await db.query.clubs.findFirst({
    where: eq(clubs.id, cid),
  });
  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  // Generate next reg number
  const lastTeam = await db.query.teams.findFirst({
    where: eq(teams.tournamentId, club.tournamentId),
    orderBy: (t, { desc }) => [desc(t.regNumber)],
  });
  const nextRegNumber = (lastTeam?.regNumber ?? 10000) + 1;

  const [team] = await db
    .insert(teams)
    .values({
      tournamentId: club.tournamentId,
      clubId: cid,
      classId: body.classId ? parseInt(body.classId) : null,
      name: body.name,
      status: "open",
      regNumber: nextRegNumber,
    })
    .returning();

  return NextResponse.json(team, { status: 201 });
}
