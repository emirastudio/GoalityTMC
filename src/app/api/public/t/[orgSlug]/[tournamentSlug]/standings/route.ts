import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, tournaments, tournamentStages, tournamentClasses, qualificationRules, tournamentRegistrations } from "@/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import { getEffectivePlan, PLAN_LIMITS } from "@/lib/plan-gates";
import { computeLiveGroupStandings, type StoredStandingRow } from "@/lib/live-standings";

// GET /api/public/t/[orgSlug]/[tournamentSlug]/standings
// Публичные таблицы групп + лиги — без авторизации
// Pro/Elite: возвращает LIVE provisional standings + liveMatches
// Free/Starter: только завершённые матчи (стандартные standings)
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
  if (!tournament.schedulePublishedAt) return NextResponse.json({ liveEnabled: false, hasLive: false, stages: [] });

  // Check if live standings are enabled for this tournament's plan
  const effectivePlan = getEffectivePlan(
    (tournament.plan ?? "free") as Parameters<typeof getEffectivePlan>[0],
    org.eliteSubStatus
  );
  const liveEnabled = PLAN_LIMITS[effectivePlan].hasLiveTimeline;

  // Resolve team IDs for classId filter (via tournamentRegistrations)
  let classTeamIds: Set<number> | null = null;
  if (classId) {
    const regsForClass = await db
      .select({ teamId: tournamentRegistrations.teamId })
      .from(tournamentRegistrations)
      .where(and(
        eq(tournamentRegistrations.tournamentId, tournament.id),
        eq(tournamentRegistrations.classId, parseInt(classId))
      ));
    if (regsForClass.length === 0) return NextResponse.json([]);
    classTeamIds = new Set(regsForClass.map(r => r.teamId));
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

  // Загрузим имена дивизионов для каждого этапа
  const classIds = [...new Set(stages.map(s => s.classId).filter(Boolean) as number[])];
  const classRows = classIds.length > 0
    ? await db.query.tournamentClasses.findMany({
        where: inArray(tournamentClasses.id, classIds),
        columns: { id: true, name: true },
      })
    : [];
  const classMap = new Map(classRows.map(c => [c.id, c.name]));

  // Для каждого этапа грузим qualificationRules
  const allStageIds = stages.map(s => s.id);
  const allRules = allStageIds.length > 0
    ? await db.query.qualificationRules.findMany({
        where: inArray(qualificationRules.fromStageId, allStageIds),
        orderBy: (r, { asc }) => [asc(r.fromRank)],
      })
    : [];

  const targetStageIds = [...new Set(allRules.map(r => r.targetStageId))];
  const targetStages = targetStageIds.length > 0
    ? await db.query.tournamentStages.findMany({
        where: inArray(tournamentStages.id, targetStageIds),
        columns: { id: true, name: true, nameRu: true, nameEt: true, type: true },
      })
    : [];

  const targetStageMap = new Map(targetStages.map(s => [s.id, s]));

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
    if (!zonesByStage.has(rule.fromStageId)) zonesByStage.set(rule.fromStageId, []);
    zonesByStage.get(rule.fromStageId)!.push({
      fromRank:      rule.fromRank,
      toRank:        rule.toRank,
      targetName:    target.name,
      targetNameRu:  target.nameRu,
      targetNameEt:  target.nameEt,
      targetType:    target.type,
    });
  }

  // ── Live standings overlay (Pro/Elite only) ─────────────────────────────────

  // For each stage, for each group: if liveEnabled → compute provisional standings
  type EnhancedGroup = {
    id: number;
    name: string;
    order: number;
    isLive: boolean;
    liveMatches: Array<{
      id: number;
      homeTeamId: number;
      awayTeamId: number;
      homeScore: number;
      awayScore: number;
    }>;
    standings: (StoredStandingRow & { provisional: boolean; livePoints: number })[];
    [key: string]: unknown;
  };

  async function enhanceGroups(
    stageGroups: typeof stages[0]["groups"],
    stageSettings: Record<string, number>
  ): Promise<EnhancedGroup[]> {
    return Promise.all(
      stageGroups.map(async group => {
        if (!liveEnabled) {
          return {
            ...group,
            isLive:      false,
            liveMatches: [],
            standings:   group.standings.map(s => ({
              ...s,
              provisional: false,
              livePoints:  0,
            })),
          };
        }

        const { hasLive, liveMatches, standings } = await computeLiveGroupStandings(
          group.id,
          group.standings as StoredStandingRow[],
          stageSettings.pointsWin  ?? 3,
          stageSettings.pointsDraw ?? 1,
        );

        return {
          ...group,
          isLive:      hasLive,
          liveMatches,
          standings,
        };
      })
    );
  }

  // ── Compose response ─────────────────────────────────────────────────────────

  const enrichedStages = await Promise.all(
    stages.map(async stage => {
      const settings = (stage.settings ?? {}) as Record<string, number>;
      const enhancedGroups = await enhanceGroups(stage.groups, settings);

      // Filter by classId if provided
      const filteredGroups = classTeamIds
        ? enhancedGroups
            .map(group => ({
              ...group,
              standings: group.standings.filter(
                s => classTeamIds!.has(s.teamId)
              ),
            }))
            .filter(group => group.standings.length > 0)
        : enhancedGroups;

      // Does ANY group in this stage have a live match?
      const stageHasLive = filteredGroups.some(g => g.isLive);

      return {
        ...stage,
        zones:      zonesByStage.get(stage.id) ?? [],
        groups:     filteredGroups,
        hasLive:    stageHasLive,
        className:  stage.classId ? (classMap.get(stage.classId) ?? null) : null,
      };
    })
  );

  // Top-level: does the whole tournament have any live action right now?
  const tournamentHasLive = enrichedStages.some(s => s.hasLive);

  // Filter stages with no groups (after classId filtering)
  const result = classTeamIds
    ? enrichedStages.filter(s => s.groups.length > 0)
    : enrichedStages;

  return NextResponse.json({
    liveEnabled,          // true = this plan supports live standings
    hasLive:              tournamentHasLive,  // true = there are live matches NOW
    stages:               result,
  });
}
