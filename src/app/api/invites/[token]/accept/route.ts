import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamInvites, teams, clubs, clubUsers, tournamentRegistrations } from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { hashPassword, createToken, setSessionCookie } from "@/lib/auth";

type RouteContext = { params: Promise<{ token: string }> };

// POST /api/invites/[token]/accept
// Создаёт аккаунт тренера и логинит его
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { token } = await params;
  const { email, password, name } = await req.json();

  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const invite = await db.query.teamInvites.findFirst({
    where: and(eq(teamInvites.token, token), isNull(teamInvites.usedAt)),
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found or already used" }, { status: 404 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  const [team, club] = await Promise.all([
    db.query.teams.findFirst({ where: eq(teams.id, invite.teamId) }),
    db.query.clubs.findFirst({ where: eq(clubs.id, invite.clubId) }),
  ]);

  if (!team || !club) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Создать аккаунт тренера (привязан к клубу И к команде)
  const passwordHash = await hashPassword(password);
  const [newUser] = await db
    .insert(clubUsers)
    .values({
      clubId: invite.clubId,
      teamId: invite.teamId,
      email: email.toLowerCase().trim(),
      name: name?.trim() || null,
      passwordHash,
      accessLevel: "write",
    })
    .returning();

  // Пометить инвайт как использованный
  await db
    .update(teamInvites)
    .set({ usedAt: new Date() })
    .where(eq(teamInvites.id, invite.id));

  // Find latest registration for any team belonging to this club
  const latestReg = await db
    .select({ tournamentId: tournamentRegistrations.tournamentId })
    .from(tournamentRegistrations)
    .innerJoin(teams, eq(teams.id, tournamentRegistrations.teamId))
    .where(eq(teams.clubId, club.id))
    .orderBy(desc(tournamentRegistrations.id))
    .limit(1);
  const tournamentId = latestReg[0]?.tournamentId ?? undefined;

  // Создать сессию и сразу залогинить
  const sessionToken = createToken({
    userId: newUser.id,
    role: "club",
    clubId: invite.clubId,
    tournamentId,
    teamId: invite.teamId,
  });

  await setSessionCookie(sessionToken);

  return NextResponse.json({ ok: true, teamId: invite.teamId });
}
