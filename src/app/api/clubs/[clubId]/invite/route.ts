import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubInvites, clubs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { sendClubInvite } from "@/lib/email";
import crypto from "crypto";

type RouteContext = { params: Promise<{ clubId: string }> };

// POST /api/clubs/[clubId]/invite
// Генерирует пригласительную ссылку для менеджера клуба.
// Опционально: если передан email — шлёт приглашение на почту.
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Тренер команды (с teamId) не может создавать инвайты
  if (session.teamId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { clubId } = await params;
  const cid = parseInt(clubId);
  if (cid !== session.clubId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const club = await db.query.clubs.findFirst({ where: eq(clubs.id, cid) });
  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  let invitedEmail: string | undefined;
  const body = await req.json().catch(() => ({}));
  if (body.email && typeof body.email === "string") {
    invitedEmail = body.email.toLowerCase().trim();
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 дней

  await db.insert(clubInvites).values({
    clubId: cid,
    token,
    invitedEmail: invitedEmail ?? null,
    expiresAt,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://goality.ee";
  const inviteLink = `${appUrl}/en/club/invite/${token}`;

  // Отправить email если указан и SMTP настроен
  if (invitedEmail && process.env.SMTP_HOST) {
    try {
      await sendClubInvite({ to: invitedEmail, clubName: club.name, inviteLink });
    } catch (err) {
      console.error("Failed to send invite email:", err);
      // Не ломаем ответ — ссылка всё равно создана
    }
  }

  return NextResponse.json({ token, expiresAt, inviteLink, emailSent: !!invitedEmail && !!process.env.SMTP_HOST });
}

// GET /api/clubs/[clubId]/invite
// Возвращает текущий активный инвайт клуба (для отображения в UI)
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId || session.teamId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { clubId } = await params;
  const cid = parseInt(clubId);
  if (cid !== session.clubId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invite = await db.query.clubInvites.findFirst({
    where: eq(clubInvites.clubId, cid),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return NextResponse.json({ invite: null });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://goality.ee";
  const inviteLink = `${appUrl}/en/club/invite/${invite.token}`;

  return NextResponse.json({
    invite: { token: invite.token, expiresAt: invite.expiresAt, inviteLink },
  });
}
