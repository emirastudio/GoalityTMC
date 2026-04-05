import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, tournaments, tournamentStages, teams, qualificationRules } from "@/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";

// GET /api/public/t/[orgSlug]/[tournamentSlug]/standings
// Публичные таблицы групп + лиги — без авторизации
// Возвращает группы + данные о зонах перехода (qualificationRules) для League Phase
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentSlug: string }> }
) {
  const { orgSlug, tournamentSlug } = await params;
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tournament = await db.query.tournaments.findFirst({
    where: and(
      eq(tournaments.organizationId, org.id),
      eq(tournaments.slug, tournamentSlug)
    ),
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Resolve team IDs for classId filter (via teams, not stages)
  let classTeamIds: Set<number> | null = null;
  if (classId) {
    const teamsForClass = await db.query.teams.findMany({
      where: and(
        eq(teams.tournamentId, tournament.id),
        eq(teams.classId, parseInt(classId))
      ),
      columns: { id: true },
    });
    if (teamsForClass.length === 0) return NextResponse.json([]);
    classTeamIds = new Set(teamsForClass.map(t => t.id));
  }

  // Все групповые И лиговые этапы с таблицами
  const stages = await db.query.tournamentStages.findMany({
    where: and(
      eq(tournamentStages.tournamentId, tournament.id),
      inArray(tournamentStages.type, ["group", "league"]),
    ),
    orderBy: [asc(tournamentStages.order)],
    with: {
      groups: {
        orderBy: (g, { asc }) => [asc(g.order)],
        with: {
          standings: {
            orderBy: (s, { asc }) => [asc(s.position)],
            with: {
              team: {
                with: { club: true },
              },
            },
          },
        },
      },
    },
  });

  // Для каждого этапа грузим qualificationRules (чтобы рисовать зоны)
  const allStageIds = stages.map(s => s.id);
  const allRules = allStageIds.length > 0
    ? await db.query.qualificationRules.findMany({
        where: inArray(qualificationRules.fromStageId, allStageIds),
        orderBy: (r, { asc }) => [asc(r.fromRank)],
      })
    : [];

  // Для каждого targetStageId грузим название целевого этапа
  const targetStageIds = [...new Set(allRules.map(r => r.targetStageId))];
  const targetStages = targetStageIds.length > 0
    ? await db.query.tournamentStages.findMany({
        where: inArray(tournamentStages.id, targetStageIds),
        columns: { id: true, name: true, nameRu: true, nameEt: true, type: true },
      })
    : [];

  const targetStageMap = new Map(targetStages.map(s => [s.id, s]));

  // Строим зоны для каждого этапа: [{fromRank, toRank, label, labelRu, labelEt, color, type}]
  const zonesByStage = new Map<number, Array<{
    fromRank: number;
    toRank: number;
    targetName: string;
    targetNameRu: string | null | undefined;
    targetNameEt: string | null | undefined;
    targetType: string;
  }>>();

  for (const rule of allRules) {
    const target = targetStageMap.get(rule.targetStageId);
    if (!target) continue;

    if (!zonesByStage.has(rule.fromStageId)) {
      zonesByStage.set(rule.fromStageId, []);
    }
    zonesByStage.get(rule.fromStageId)!.push({
      fromRank: rule.fromRank,
      toRank: rule.toRank,
      targetName: target.name,
      targetNameRu: target.nameRu,
      targetNameEt: target.nameEt,
      targetType: target.type,
    });
  }

  // Post-filter by classId via team membership
  if (classTeamIds) {
    const filtered = stages
      .map(stage => ({
        ...stage,
        zones: zonesByStage.get(stage.id) ?? [],
        groups: stage.groups
          .map(group => ({
            ...group,
            standings: group.standings.filter(
              s => s.team && classTeamIds!.has(s.team.id)
            ),
          }))
          .filter(group => group.standings.length > 0),
      }))
      .filter(stage => stage.groups.length > 0);
    return NextResponse.json(filtered);
  }

  return NextResponse.json(
    stages.map(stage => ({
      ...stage,
      zones: zonesByStage.get(stage.id) ?? [],
    }))
  );
}
