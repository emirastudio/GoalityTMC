import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubUsers, clubs, tournaments, organizations, adminUsers, teams, tournamentRegistrations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const user = await db.query.clubUsers.findFirst({
    where: eq(clubUsers.email, email.toLowerCase().trim()),
  });

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const club = await db.query.clubs.findFirst({
    where: eq(clubs.id, user.clubId),
  });

  // Find latest registration for any team belonging to this club
  const latestReg = await db
    .select({ tournamentId: tournamentRegistrations.tournamentId })
    .from(tournamentRegistrations)
    .innerJoin(teams, eq(teams.id, tournamentRegistrations.teamId))
    .where(eq(teams.clubId, user.clubId))
    .orderBy(desc(tournamentRegistrations.id))
    .limit(1);
  const tournamentId = latestReg[0]?.tournamentId ?? undefined;

  // Resolve organization from tournament
  let organizationId: number | undefined;
  let organizationSlug: string | undefined;
  if (tournamentId) {
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, tournamentId),
    });
    if (tournament?.organizationId) {
      organizationId = tournament.organizationId;
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, tournament.organizationId),
      });
      organizationSlug = org?.slug;
    }
  }

  // Если у клубного пользователя есть super_admin аккаунт — ставим флаг
  const adminUser = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, email.toLowerCase().trim()),
  });
  const isSuper = adminUser?.role === "super_admin";

  const token = createToken({
    userId: user.id,
    role: "club",
    clubId: user.clubId,
    tournamentId,
    organizationId,
    organizationSlug,
    ...(user.teamId ? { teamId: user.teamId } : {}),
    ...(isSuper ? { isSuper: true } : {}),
  });

  await setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    clubId: user.clubId,
    teamId: user.teamId ?? null,
    organizationSlug,
    hasTournament: !!tournamentId,
  });
}
