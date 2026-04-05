import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { standings, stageGroups, tournamentStages } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { recalculateGroupStandings } from "@/lib/standings-calculator";
import { eq, and, asc } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string };

// GET /api/org/[orgSlug]/tournament/[tournamentId]/standings
// Таблицы всех групп (или конкретного этапа ?stageId=)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const stageId = searchParams.get("stageId");
  const groupId = searchParams.get("groupId");

  if (groupId) {
    // Таблица конкретной группы — проверяем что группа принадлежит турниру
    const group = await db.query.stageGroups.findFirst({
      where: and(
        eq(stageGroups.id, parseInt(groupId)),
        eq(stageGroups.tournamentId, ctx.tournament.id)
      ),
    });
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    const rows = await db.query.standings.findMany({
      where: and(
        eq(standings.groupId, parseInt(groupId)),
        eq(standings.tournamentId, ctx.tournament.id)
      ),
      orderBy: [asc(standings.position)],
      with: { team: { with: { club: true } } },
    });
    return NextResponse.json(rows);
  }

  if (stageId) {
    // Таблицы всех групп этапа
    const groups = await db.query.stageGroups.findMany({
      where: and(
        eq(stageGroups.stageId, parseInt(stageId)),
        eq(stageGroups.tournamentId, ctx.tournament.id)
      ),
      orderBy: [asc(stageGroups.order)],
      with: {
        standings: {
          orderBy: (s, { asc }) => [asc(s.position)],
          with: { team: { with: { club: true } } },
        },
      },
    });
    return NextResponse.json(groups);
  }

  // Все этапы + все группы + таблицы
  const stages = await db.query.tournamentStages.findMany({
    where: eq(tournamentStages.tournamentId, ctx.tournament.id),
    orderBy: [asc(tournamentStages.order)],
    with: {
      groups: {
        orderBy: (g, { asc }) => [asc(g.order)],
        with: {
          standings: {
            orderBy: (s, { asc }) => [asc(s.position)],
            with: { team: { with: { club: true } } },
          },
        },
      },
    },
  });

  return NextResponse.json(stages);
}

// POST /api/org/[orgSlug]/tournament/[tournamentId]/standings/recalculate
// Принудительный пересчёт таблицы (например после исправления результата)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = await req.json();
  const { groupId, stageId } = body;

  if (groupId) {
    // Пересчитываем одну группу
    await recalculateGroupStandings(groupId);
    return NextResponse.json({ ok: true, recalculated: [groupId] });
  }

  if (stageId) {
    // Пересчитываем все группы этапа
    const groups = await db.query.stageGroups.findMany({
      where: and(
        eq(stageGroups.stageId, stageId),
        eq(stageGroups.tournamentId, ctx.tournament.id)
      ),
    });

    for (const group of groups) {
      await recalculateGroupStandings(group.id);
    }

    return NextResponse.json({ ok: true, recalculated: groups.map((g) => g.id) });
  }

  return NextResponse.json({ error: "Provide groupId or stageId" }, { status: 400 });
}
