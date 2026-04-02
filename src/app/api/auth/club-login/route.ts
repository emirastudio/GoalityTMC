import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubUsers, clubs, tournaments, organizations, adminUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
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

  // Resolve organization from tournament
  let organizationId: number | undefined;
  let organizationSlug: string | undefined;
  if (club?.tournamentId) {
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, club.tournamentId),
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
    tournamentId: club?.tournamentId,
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
  });
}
