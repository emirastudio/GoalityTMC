import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubs, teams } from "@/db/schema";
import { eq } from "drizzle-orm";
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

  const sessionToken = createToken({
    userId: payload.clubId,
    role: "club",
    clubId: payload.clubId,
    tournamentId: club.tournamentId,
  });

  await setSessionCookie(sessionToken);

  return NextResponse.redirect(new URL("/en/team/overview", req.url));
}
