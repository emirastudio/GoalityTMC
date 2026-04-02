import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentStages, stageGroups, groupTeams, standings } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, asc } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string };

// GET /api/org/[orgSlug]/tournament/[tournamentId]/stages
// Список всех этапов турнира с группами и командами
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const stages = await db.query.tournamentStages.findMany({
    where: eq(tournamentStages.tournamentId, ctx.tournament.id),
    orderBy: [asc(tournamentStages.order)],
    with: {
      groups: {
        orderBy: [asc(stageGroups.order)],
        with: {
          groupTeams: {
            with: { team: true },
          },
        },
      },
      rounds: true,
    },
  });

  return NextResponse.json(stages);
}

// POST /api/org/[orgSlug]/tournament/[tournamentId]/stages
// Создать новый этап
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = await req.json();
  const { name, nameRu, nameEt, type, settings, tiebreakers } = body;

  if (!name || !type) {
    return NextResponse.json(
      { error: "name and type are required" },
      { status: 400 }
    );
  }

  // Получаем следующий порядковый номер
  const existing = await db.query.tournamentStages.findMany({
    where: eq(tournamentStages.tournamentId, ctx.tournament.id),
  });
  const nextOrder = existing.length + 1;

  const [stage] = await db
    .insert(tournamentStages)
    .values({
      tournamentId: ctx.tournament.id,
      organizationId: ctx.organizationId,
      name,
      nameRu: nameRu || null,
      nameEt: nameEt || null,
      type,
      order: nextOrder,
      status: "pending",
      settings: settings ?? {},
      tiebreakers: tiebreakers ?? [
        "head_to_head_points",
        "head_to_head_goal_diff",
        "goal_diff",
        "goals_scored",
        "fair_play",
      ],
    })
    .returning();

  return NextResponse.json(stage, { status: 201 });
}
