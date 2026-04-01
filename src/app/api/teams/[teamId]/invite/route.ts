import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, teamInvites } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

type RouteContext = { params: Promise<{ teamId: string }> };

// POST /api/teams/[teamId]/invite
// Генерирует ссылку-приглашение для тренера команды.
// Доступно только клубному администратору (без teamId в сессии).
export async function POST(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Тренер команды не может создавать инвайты
  if (session.teamId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { teamId } = await params;
  const tid = parseInt(teamId);

  const team = await db.query.teams.findFirst({ where: eq(teams.id, tid) });
  if (!team || team.clubId !== session.clubId) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Деактивировать существующие неиспользованные инвайты для этой команды
  // (просто создаём новый — старые перестают работать через expiresAt)

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 дней

  await db.insert(teamInvites).values({
    clubId: session.clubId,
    teamId: tid,
    token,
    expiresAt,
  });

  return NextResponse.json({ token, expiresAt });
}

// GET /api/teams/[teamId]/invite
// Возвращает текущий активный инвайт для команды (для отображения в профиле)
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId || session.teamId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { teamId } = await params;
  const tid = parseInt(teamId);

  const team = await db.query.teams.findFirst({ where: eq(teams.id, tid) });
  if (!team || team.clubId !== session.clubId) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Найти последний действующий инвайт
  const invite = await db.query.teamInvites.findFirst({
    where: and(
      eq(teamInvites.teamId, tid),
      eq(teamInvites.clubId, session.clubId)
    ),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return NextResponse.json({ invite: null });
  }

  return NextResponse.json({ invite: { token: invite.token, expiresAt: invite.expiresAt } });
}
