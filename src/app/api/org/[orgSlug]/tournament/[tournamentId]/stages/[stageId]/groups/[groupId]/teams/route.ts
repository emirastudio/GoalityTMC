import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  groupTeams,
  matches,
  stageGroups,
  standings,
  tournaments,
} from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, and, isNull, sql } from "drizzle-orm";

type Params = {
  orgSlug: string;
  tournamentId: string;
  stageId: string;
  groupId: string;
};

// Unlock headers required when the stage's draw has already been applied
// (Auto-draw / Clear could silently desync the schedule otherwise).
// The client sends them after an explicit confirmation prompt.
const UNLOCK_HEADER = "x-draw-unlock";
const UNLOCK_SCORES_HEADER = "x-draw-unlock-scores";
const UNLOCK_VALUE = "CONFIRM";

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

  if (!Array.isArray(teamIds)) {
    return NextResponse.json({ error: "teamIds array required" }, { status: 400 });
  }

  const gid = parseInt(p.groupId);
  const stageId = parseInt(p.stageId);

  // Проверяем что группа принадлежит этому турниру
  const group = await db.query.stageGroups.findFirst({
    where: and(
      eq(stageGroups.id, gid),
      eq(stageGroups.tournamentId, ctx.tournament.id)
    ),
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  // ── Tournament-level publish guard ────────────────────────────────
  // Once the schedule is published, the tournament is effectively live
  // (public standings, club admin showing brackets, notifications sent).
  // Draw edits — destructive or not — must go through the unpublish
  // path. No header overrides this: the organizer must navigate to the
  // publish screen and flip the switch back.
  if (mode === "replace") {
    const tournamentRow = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, ctx.tournament.id),
      columns: { schedulePublishedAt: true },
    });
    if (tournamentRow?.schedulePublishedAt) {
      return NextResponse.json(
        {
          error: "tournament_published",
          publishedAt: tournamentRow.schedulePublishedAt.toISOString(),
          hint: "Unpublish the schedule before editing the draw.",
        },
        { status: 423 },
      );
    }
  }

  // ── Draw-lock guard ───────────────────────────────────────────────
  // "Replace" writes destroy the existing draw → require an unlock token
  // whenever the stage has a committed draw. This prevents the common
  // disaster of accidentally hitting Auto-draw on a tournament that's
  // already in progress.
  if (mode === "replace") {
    const [lockRow] = await db
      .select({
        withTeams: sql<number>`sum(case when (${matches.homeTeamId} is not null or ${matches.awayTeamId} is not null) then 1 else 0 end)::int`,
        withScores: sql<number>`sum(case when (${matches.homeScore} is not null or ${matches.awayScore} is not null) then 1 else 0 end)::int`,
      })
      .from(matches)
      .where(
        and(
          eq(matches.tournamentId, ctx.tournament.id),
          eq(matches.stageId, stageId),
          isNull(matches.deletedAt),
        ),
      );

    const committed = (lockRow?.withTeams ?? 0) > 0;
    const hasScores = (lockRow?.withScores ?? 0) > 0;

    const hdr = req.headers.get(UNLOCK_HEADER);
    const hdrScores = req.headers.get(UNLOCK_SCORES_HEADER);

    if (committed && hdr !== UNLOCK_VALUE) {
      return NextResponse.json(
        {
          error: "draw_locked",
          hasScores,
          matchesWithTeams: lockRow?.withTeams ?? 0,
          matchesWithScores: lockRow?.withScores ?? 0,
          hint: "Draw is already applied. Send X-Draw-Unlock: CONFIRM to override.",
        },
        { status: 409 },
      );
    }
    if (hasScores && hdrScores !== UNLOCK_VALUE) {
      return NextResponse.json(
        {
          error: "draw_locked_with_scores",
          hasScores: true,
          matchesWithTeams: lockRow?.withTeams ?? 0,
          matchesWithScores: lockRow?.withScores ?? 0,
          hint: "Stage has recorded scores. Send X-Draw-Unlock-Scores: CONFIRM to override.",
        },
        { status: 409 },
      );
    }
  }

  // Если replace — удаляем старые записи
  if (mode === "replace") {
    await db.delete(groupTeams).where(eq(groupTeams.groupId, gid));
    await db.delete(standings).where(eq(standings.groupId, gid));
  }

  // Пустой массив в режиме replace = очистить группу (без вставки)
  if (teamIds.length === 0) {
    return NextResponse.json({ inserted: 0 }, { status: 200 });
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
