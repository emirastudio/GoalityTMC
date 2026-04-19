import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentStages, stageGroups, groupTeams, standings } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { assertFeature } from "@/lib/plan-gates";
import { eq, asc, and, isNull } from "drizzle-orm"; // isNull kept for POST

type Params = { orgSlug: string; tournamentId: string };

// GET /api/org/[orgSlug]/tournament/[tournamentId]/stages
// Список всех этапов турнира с группами и командами
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const classIdParam = req.nextUrl.searchParams.get("classId");
  const classId = classIdParam ? parseInt(classIdParam) : null;

  // HARD RULE: classId is mandatory — never return stages across all divisions.
  if (!classId) {
    return NextResponse.json(
      { error: "classId is required — every query must be scoped to a division" },
      { status: 400 }
    );
  }

  const whereClause = and(
    eq(tournamentStages.tournamentId, ctx.tournament.id),
    eq(tournamentStages.classId, classId)
  );

  const stages = await db.query.tournamentStages.findMany({
    where: whereClause,
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
  const { name, nameRu, nameEt, type, settings, tiebreakers, classId } = body;

  if (!name || !type) {
    return NextResponse.json(
      { error: "name and type are required" },
      { status: 400 }
    );
  }

  // HARD RULE: every stage must belong to a division (classId).
  // Stages without classId mix data across divisions — strictly forbidden.
  if (!classId) {
    return NextResponse.json(
      { error: "classId is required — every stage must belong to a division" },
      { status: 400 }
    );
  }

  // Получаем следующий порядковый номер в рамках этого класса/дивизиона
  const existing = await db.query.tournamentStages.findMany({
    where: classId
      ? and(eq(tournamentStages.tournamentId, ctx.tournament.id), eq(tournamentStages.classId, classId))
      : and(eq(tournamentStages.tournamentId, ctx.tournament.id), isNull(tournamentStages.classId)),
  });
  const nextOrder = existing.length + 1;

  // Plan gate: hasEliteFormats required for
  //   (1) any 2nd+ stage in a division (multi-stage tournaments), OR
  //   (2) any stage with type knockout / swiss / double_elim.
  // Single "group" or "league" stage is allowed on every plan.
  const isEliteStageType = type === "knockout" || type === "swiss" || type === "double_elim";
  if (nextOrder > 1 || isEliteStageType) {
    const gate = assertFeature(ctx.effectivePlan, "hasEliteFormats");
    if (gate) return gate;
  }

  const [stage] = await db
    .insert(tournamentStages)
    .values({
      tournamentId: ctx.tournament.id,
      organizationId: ctx.organizationId,
      classId: classId ?? null,
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
