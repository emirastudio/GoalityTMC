import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubs, clubUsers, teams, tournamentRegistrations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createToken, ADMIN_BACKUP_COOKIE } from "@/lib/auth";
import { requireAdmin, isError } from "@/lib/api-auth";
import { cookies } from "next/headers";

// POST /api/admin/impersonate — admin logs in as a club
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { clubId } = await req.json();
  if (!clubId) {
    return NextResponse.json({ error: "clubId required" }, { status: 400 });
  }

  // Fetch club + its first admin user
  const club = await db.query.clubs.findFirst({ where: eq(clubs.id, clubId) });
  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  const clubUser = await db.query.clubUsers.findFirst({
    where: eq(clubUsers.clubId, clubId),
  });
  // Allow impersonation even if no clubUser exists yet (club registered manually)
  const userId = clubUser?.id ?? 0;

  const cookieStore = await cookies();
  const currentToken = cookieStore.get("kingscup_token")?.value;

  // Save current admin token as backup
  if (currentToken) {
    cookieStore.set(ADMIN_BACKUP_COOKIE, currentToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 4, // 4 hours
      path: "/",
    });
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

  // Create club token with impersonating flag
  const clubToken = createToken({
    userId,
    role: "club",
    clubId: club.id,
    tournamentId,
    impersonating: true,
  });

  cookieStore.set("kingscup_token", clubToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 4,
    path: "/",
  });

  return NextResponse.json({ ok: true, clubName: club.name });
}
