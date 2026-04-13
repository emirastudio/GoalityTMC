import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubInvites, clubs, clubUsers } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { hashPassword, createToken, setSessionCookie } from "@/lib/auth";

type RouteContext = { params: Promise<{ token: string }> };

// POST /api/invites/club/[token]/accept
// Создаёт аккаунт менеджера клуба и сразу логинит его
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { token } = await params;
  const { email, password, name } = await req.json();

  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const invite = await db.query.clubInvites.findFirst({
    where: and(eq(clubInvites.token, token), isNull(clubInvites.usedAt)),
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found or already used" }, { status: 404 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  const club = await db.query.clubs.findFirst({ where: eq(clubs.id, invite.clubId) });
  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Проверить — вдруг уже есть такой пользователь в клубе
  const existing = await db.query.clubUsers.findFirst({
    where: (cu, { and, eq }) => and(
      eq(cu.clubId, invite.clubId),
      eq(cu.email, normalizedEmail),
    ),
  });
  if (existing) {
    return NextResponse.json({ error: "This email is already a member of this club" }, { status: 409 });
  }

  // Создать аккаунт менеджера клуба (без привязки к команде)
  const passwordHash = await hashPassword(password);
  const [newUser] = await db
    .insert(clubUsers)
    .values({
      clubId: invite.clubId,
      teamId: null, // клубный менеджер, не тренер команды
      email: normalizedEmail,
      name: name?.trim() || null,
      passwordHash,
      accessLevel: "write",
    })
    .returning();

  // Пометить инвайт как использованный
  await db
    .update(clubInvites)
    .set({ usedAt: new Date() })
    .where(eq(clubInvites.id, invite.id));

  // Создать JWT и залогинить
  const sessionToken = createToken({
    userId: newUser.id,
    role: "club",
    clubId: invite.clubId,
  });

  await setSessionCookie(sessionToken);

  return NextResponse.json({ ok: true, clubId: invite.clubId });
}
