import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groupTeams, stageGroups, standings } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, and } from "drizzle-orm";

type Params = {
  orgSlug: string;
  tournamentId: string;
  stageId: string;
  groupId: string;
};

// POST /api/.../stages/[stageId]/groups/[groupId]/teams
// Назначить команды в группу (bulk)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const body = await req.json();
  // teamIds: number[] — список ID команд для добавления
  // mode: "replace" | "append" — заменить или добавить
  const { teamIds, mode = "append" } = body;

  if (!Array.isArray(teamIds) || teamIds.length === 0) {
    return NextResponse.json({ error: "teamIds array required" }, { status: 400 });
  }

  const gid = parseInt(p.groupId);

  // Проверяем что группа принадлежит этому турниру
  const group = await db.query.stageGroups.findFirst({
    where: and(
      eq(stageGroups.id, gid),
      eq(stageGroups.tournamentId, ctx.tournament.id)
    ),
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  // Если replace — удаляем старые записи
  if (mode === "replace") {
    await db.delete(groupTeams).where(eq(groupTeams.groupId, gid));
    await db.delete(standings).where(eq(standings.groupId, gid));
  }

  // Добавляем команды
  const inserted = await db
    .insert(groupTeams)
    .values(teamIds.map((teamId: number, i: number) => ({
      groupId: gid,
      teamId,
      seedNumber: i + 1,
    })))
    .onConflictDoNothing()
    .returning();

  // Инициализируем пустые standings для новых команд
  if (inserted.length > 0) {
    await db
      .insert(standings)
      .values(inserted.map((gt) => ({
        groupId: gid,
        tournamentId: ctx.tournament.id,
        teamId: gt.teamId,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
        position: null,
        form: [],
        headToHead: {},
      })))
      .onConflictDoNothing();
  }

  return NextResponse.json({ inserted: inserted.length }, { status: 201 });
}

// DELETE /api/.../stages/[stageId]/groups/[groupId]/teams
// Убрать команду из группы
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const body = await req.json();
  const { teamId } = body;
  const gid = parseInt(p.groupId);

  await db
    .delete(groupTeams)
    .where(and(eq(groupTeams.groupId, gid), eq(groupTeams.teamId, teamId)));

  await db
    .delete(standings)
    .where(and(eq(standings.groupId, gid), eq(standings.teamId, teamId)));

  return NextResponse.json({ ok: true });
}
