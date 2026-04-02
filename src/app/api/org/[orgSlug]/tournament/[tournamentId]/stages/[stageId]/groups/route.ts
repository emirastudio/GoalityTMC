import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stageGroups, groupTeams, standings, tournamentStages } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, and, asc } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string; stageId: string };

// GET /api/org/[orgSlug]/tournament/[tournamentId]/stages/[stageId]/groups
// Все группы этапа с командами и таблицами
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const groups = await db.query.stageGroups.findMany({
    where: and(
      eq(stageGroups.stageId, parseInt(p.stageId)),
      eq(stageGroups.tournamentId, ctx.tournament.id)
    ),
    orderBy: [asc(stageGroups.order)],
    with: {
      groupTeams: {
        with: { team: { with: { club: true } } },
      },
      standings: {
        with: { team: { with: { club: true } } },
        orderBy: (s, { asc }) => [asc(s.position)],
      },
    },
  });

  return NextResponse.json(groups);
}

// POST /api/org/[orgSlug]/tournament/[tournamentId]/stages/[stageId]/groups
// Создать группы (bulk — сразу несколько с названиями A, B, C...)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const body = await req.json();
  // groups: [{ name: "A" }, { name: "B" }] или count: 4 (авто A-D)
  const { groups, count } = body;

  // Проверяем что этап принадлежит этому турниру
  const stage = await db.query.tournamentStages.findFirst({
    where: and(
      eq(tournamentStages.id, parseInt(p.stageId)),
      eq(tournamentStages.tournamentId, ctx.tournament.id)
    ),
  });
  if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  const groupNames: { name: string }[] = groups ?? [];

  // Если передан count — генерируем имена A, B, C...
  if (count && groupNames.length === 0) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < count; i++) {
      groupNames.push({ name: letters[i] ?? String(i + 1) });
    }
  }

  if (groupNames.length === 0) {
    return NextResponse.json({ error: "Provide groups or count" }, { status: 400 });
  }

  const created = await db
    .insert(stageGroups)
    .values(
      groupNames.map((g, i) => ({
        stageId: parseInt(p.stageId),
        tournamentId: ctx.tournament.id,
        name: g.name,
        order: i,
      }))
    )
    .returning();

  // Инициализируем standings для каждой группы (пустые строки добавятся при распределении команд)
  return NextResponse.json(created, { status: 201 });
}
