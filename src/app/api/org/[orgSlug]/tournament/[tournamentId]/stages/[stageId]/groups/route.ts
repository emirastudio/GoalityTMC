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
  // groups: [{ name: "A", targetSize?: 5 }, ...] или count: 4 (авто A-D) + optional targetSize
  const { groups, count, targetSize } = body;

  // Проверяем что этап принадлежит этому турниру
  const stage = await db.query.tournamentStages.findFirst({
    where: and(
      eq(tournamentStages.id, parseInt(p.stageId)),
      eq(tournamentStages.tournamentId, ctx.tournament.id)
    ),
  });
  if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  const groupNames: { name: string; targetSize?: number }[] = groups ?? [];

  // Если передан count — генерируем имена A, B, C...
  if (count && groupNames.length === 0) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < count; i++) {
      groupNames.push({ name: letters[i] ?? String(i + 1), targetSize });
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
        targetSize: g.targetSize ?? targetSize ?? null,
      }))
    )
    .returning();

  // Инициализируем standings для каждой группы (пустые строки добавятся при распределении команд)
  return NextResponse.json(created, { status: 201 });
}

// PATCH /api/.../stages/[stageId]/groups
// Заменить все группы (установить новое количество)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const { count, targetSize } = await req.json();
  if (typeof count !== "number" || count < 0 || count > 26) {
    return NextResponse.json({ error: "count must be 0-26" }, { status: 400 });
  }

  const stageId = parseInt(p.stageId);

  // Убеждаемся что этап принадлежит этому турниру
  const stage = await db.query.tournamentStages.findFirst({
    where: and(
      eq(tournamentStages.id, stageId),
      eq(tournamentStages.tournamentId, ctx.tournament.id)
    ),
  });
  if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  // Удаляем все существующие группы (groupTeams и standings удалятся каскадно)
  await db.delete(stageGroups).where(
    and(
      eq(stageGroups.stageId, stageId),
      eq(stageGroups.tournamentId, ctx.tournament.id)
    )
  );

  if (count === 0) return NextResponse.json([]);

  // Создаём новые группы A, B, C...
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const created = await db
    .insert(stageGroups)
    .values(
      Array.from({ length: count }, (_, i) => ({
        stageId,
        tournamentId: ctx.tournament.id,
        name: letters[i] ?? String(i + 1),
        order: i,
        targetSize: targetSize ?? null,
      }))
    )
    .returning();

  return NextResponse.json(created);
}
