import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubs, teams, tournamentRegistrations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createToken, setSessionCookie, verifyToken } from "@/lib/auth";

// Invite link: /api/auth/invite/[token]
// The token is a JWT containing { clubId }
// When a club clicks the invite link, they get auto-logged in
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const payload = verifyToken(token);
  if (!payload || !payload.clubId) {
    return NextResponse.redirect(new URL("/en?error=invalid_invite", req.url));
  }

  const club = await db.query.clubs.findFirst({
    where: eq(clubs.id, payload.clubId),
  });

  if (!club) {
    return NextResponse.redirect(new URL("/en?error=club_not_found", req.url));
  }

  // Find latest registration for any team belonging to this club
  const latestReg = await db
    .select({ tournamentId: tournamentRegistrations.tournamentId })
    .from(tournamentRegistrations)
    .innerJoin(teams, eq(teams.id, tournamentRegistrations.teamId))
    .where(eq(teams.clubId, club.id))
    .orderBy(desc(tournamentRegistrations.id))
    .limit(1);
  const tournamentId = latestReg[0]?.tournamentId ?? undefined;

  const sessionToken = createToken({
    userId: payload.clubId,
    role: "club",
    clubId: payload.clubId,
    tournamentId,
  });

  await setSessionCookie(sessionToken);

  return NextResponse.redirect(new URL("/en/team/overview", req.url));
}
