import { NextResponse } from "next/server";
import { db } from "@/db";
import { clubUserTeams, teams } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET /api/clubs/me/teams
// Returns the list of teams this clubUser can switch between.
//   - Club admin (no junction rows + session.teamId == null) → empty array
//     (no switcher needed; they see all teams already).
//   - Team admin (junction rows present) → [{ id, name, derivedName }, …]
//     plus a `currentTeamId` marker.
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      birthYear: teams.birthYear,
      gender: teams.gender,
    })
    .from(clubUserTeams)
    .innerJoin(teams, eq(teams.id, clubUserTeams.teamId))
    .where(
      and(
        eq(clubUserTeams.clubUserId, session.userId),
        eq(teams.clubId, session.clubId)
      )
    );

  return NextResponse.json({
    currentTeamId: session.teamId ?? null,
    teams: rows.map((r) => ({
      id: r.id,
      name: r.name,
      birthYear: r.birthYear,
      gender: r.gender,
      label: r.name ?? `${r.gender} ${r.birthYear ?? ""}`.trim(),
    })),
  });
}
