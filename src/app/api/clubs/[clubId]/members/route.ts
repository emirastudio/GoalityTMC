import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubUsers, clubUserTeams, teams } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET /api/clubs/[clubId]/members
// Returns the list of club users, marked as club-admin (no junction
// rows) or team-coach (with the list of teams from the junction).
// Only club admins (session.teamId == null) can call this — coaches
// don't manage other people's access.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.teamId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { clubId } = await params;
  const cid = parseInt(clubId);
  if (cid !== session.clubId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await db
    .select({
      id: clubUsers.id,
      email: clubUsers.email,
      name: clubUsers.name,
      teamId: clubUsers.teamId,
      accessLevel: clubUsers.accessLevel,
      createdAt: clubUsers.createdAt,
    })
    .from(clubUsers)
    .where(eq(clubUsers.clubId, cid));

  const userIds = users.map((u) => u.id);

  // Pull all junction rows for these users in one go.
  const junctionRows = userIds.length
    ? await db
        .select({
          clubUserId: clubUserTeams.clubUserId,
          teamId: clubUserTeams.teamId,
          teamName: teams.name,
          birthYear: teams.birthYear,
          gender: teams.gender,
        })
        .from(clubUserTeams)
        .innerJoin(teams, eq(teams.id, clubUserTeams.teamId))
        .where(eq(teams.clubId, cid))
    : [];

  const byUser = new Map<number, typeof junctionRows>();
  for (const row of junctionRows) {
    const arr = byUser.get(row.clubUserId) ?? [];
    arr.push(row);
    byUser.set(row.clubUserId, arr);
  }

  const result = users.map((u) => {
    const userTeams = (byUser.get(u.id) ?? []).map((r) => ({
      id: r.teamId,
      label: r.teamName ?? `${r.gender} ${r.birthYear ?? ""}`.trim(),
    }));
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.teamId === null && userTeams.length === 0 ? "club_admin" : "team_coach",
      activeTeamId: u.teamId,
      teams: userTeams,
      isSelf: u.id === session.userId,
      accessLevel: u.accessLevel,
      createdAt: u.createdAt,
    };
  });

  return NextResponse.json(result);
}
