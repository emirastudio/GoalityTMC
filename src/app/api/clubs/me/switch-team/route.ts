import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubUserTeams, clubUsers, teams } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession, createToken, setSessionCookie } from "@/lib/auth";

// POST /api/clubs/me/switch-team   { teamId: number }
// Switches the active team for a multi-team coach.
// - Verifies the team is in the user's junction (clubUserTeams).
// - Updates clubUsers.team_id (persisted) and re-issues the JWT.
// Club-admin (no junction rows) cannot use this endpoint — they don't
// need scoping in the first place.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = (await req.json()) as { teamId?: number };
  if (!teamId || typeof teamId !== "number") {
    return NextResponse.json({ error: "teamId is required" }, { status: 400 });
  }

  // Verify membership in the junction.
  const [link] = await db
    .select({ id: clubUserTeams.id })
    .from(clubUserTeams)
    .innerJoin(teams, eq(teams.id, clubUserTeams.teamId))
    .where(
      and(
        eq(clubUserTeams.clubUserId, session.userId),
        eq(clubUserTeams.teamId, teamId),
        eq(teams.clubId, session.clubId)
      )
    );
  if (!link) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Persist the active team on the clubUser row, and re-issue JWT.
  await db.update(clubUsers).set({ teamId }).where(eq(clubUsers.id, session.userId));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { exp, iat, ...payload } = session as typeof session & { exp?: number; iat?: number };
  const newToken = createToken({ ...payload, teamId });
  await setSessionCookie(newToken);

  return NextResponse.json({ ok: true, teamId });
}
