import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  tournamentStages,
  stageGroups,
  standings,
  matches,
  qualificationRules,
  matchRounds,
  groupTeams,
} from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, and, asc, inArray } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string; stageId: string };

// ── Стандартное сетка плей-офф: 1 vs N, 2 vs N-1, ...
// Возвращает массив пар [homeTeamId, awayTeamId] в правильном порядке для bracket
function buildSeededPairs(
  teams: Array<{ teamId: number; rank: number }>,
): Array<[number | null, number | null]> {
  if (teams.length === 0) return [];

  const sorted = [...teams].sort((a, b) => a.rank - b.rank);
  const half = Math.ceil(sorted.length / 2);
  const top = sorted.slice(0, half);
  const bottom = sorted.slice(half).reverse();

  const pairs: Array<[number | null, number | null]> = [];
  for (let i = 0; i < top.length; i++) {
    pairs.push([top[i]?.teamId ?? null, bottom[i]?.teamId ?? null]);
  }
  return pairs;
}

// POST /api/org/[orgSlug]/tournament/[tournamentId]/stages/[stageId]/advance
// Автоматически переводит команды из завершённой фазы в следующую
// 1. Читает таблицу (standings) из источника
// 2. Применяет qualification_rules
// 3. Для knockout: заполняет матчи первого раунда командами (сеяными)
// 4. Для group: добавляет команды в группы целевого этапа
// 5. Помечает источник как "finished", цель как "active"
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const stageId = parseInt(p.stageId);

  // 1. Загружаем источник
  const sourceStage = await db.query.tournamentStages.findFirst({
    where: and(
      eq(tournamentStages.id, stageId),
      eq(tournamentStages.tournamentId, ctx.tournament.id)
    ),
  });
  if (!sourceStage) {
    return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  }
  if (sourceStage.type !== "group" && sourceStage.type !== "league") {
    return NextResponse.json(
      { error: "Can only advance from group or league stages" },
      { status: 400 }
    );
  }

  // 2. Загружаем все группы источника со standings
  const groups = await db.query.stageGroups.findMany({
    where: eq(stageGroups.stageId, stageId),
    with: {
      standings: {
        orderBy: (s, { asc }) => [asc(s.position)],
      },
    },
    orderBy: (g, { asc }) => [asc(g.order)],
  });

  if (groups.length === 0) {
    return NextResponse.json(
      { error: "No groups found in this stage" },
      { status: 400 }
    );
  }

  // 3. Строим общий рейтинг всех команд
  // Для league (1 группа): берём позиции напрямую
  // Для группового этапа (несколько групп): сортируем глобально по очкам → разнице → голам
  interface TeamRank {
    teamId: number;
    rank: number;     // итоговое место в общем зачёте (1-based)
    points: number;
    goalDiff: number;
    goalsFor: number;
    groupName: string;
    groupPosition: number;
  }

  let allTeams: TeamRank[] = [];

  if (sourceStage.type === "league" || groups.length === 1) {
    // Одна группа / лига — берём позиции напрямую
    const group = groups[0];
    for (const s of group.standings) {
      allTeams.push({
        teamId: s.teamId,
        rank: s.position ?? 999,
        points: s.points,
        goalDiff: s.goalDiff,
        goalsFor: s.goalsFor,
        groupName: group.name,
        groupPosition: s.position ?? 999,
      });
    }
    // Уже отсортированы по position
  } else {
    // Несколько групп — собираем вместе и сортируем глобально
    for (const group of groups) {
      for (const s of group.standings) {
        allTeams.push({
          teamId: s.teamId,
          rank: 0, // будет пересчитан
          points: s.points,
          goalDiff: s.goalDiff,
          goalsFor: s.goalsFor,
          groupName: group.name,
          groupPosition: s.position ?? 999,
        });
      }
    }
    // Сортировка: очки → разница мячей → забитые → позиция в группе
    allTeams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.groupPosition - b.groupPosition;
    });
    // Присваиваем ранг
    for (let i = 0; i < allTeams.length; i++) {
      allTeams[i].rank = i + 1;
    }
  }

  // 4. Загружаем правила квалификации
  const rules = await db.query.qualificationRules.findMany({
    where: eq(qualificationRules.fromStageId, stageId),
    orderBy: (r, { asc }) => [asc(r.fromRank)],
  });

  if (rules.length === 0) {
    return NextResponse.json(
      { error: "No qualification rules defined for this stage" },
      { status: 400 }
    );
  }

  const advancedTeams: Array<{
    teamId: number;
    targetStageId: number;
    rank: number;
    targetStage: string;
  }> = [];

  const activatedStageIds: number[] = [];

  // 5. Для каждого правила — наполняем следующий этап
  for (const rule of rules) {
    const targetStage = await db.query.tournamentStages.findFirst({
      where: and(
        eq(tournamentStages.id, rule.targetStageId),
        eq(tournamentStages.tournamentId, ctx.tournament.id)
      ),
    });
    if (!targetStage) continue;

    // Берём команды в диапазоне fromRank..toRank (1-indexed)
    const teamsInRange = allTeams.filter(
      (t) => t.rank >= rule.fromRank && t.rank <= rule.toRank
    );

    if (teamsInRange.length === 0) continue;

    // ── Knockout: заполняем матчи первого раунда
    if (targetStage.type === "knockout") {
      // Берём раунд с наименьшим order = первый игровой раунд (R32, R16, QF и т.д.)
      const firstRound = await db.query.matchRounds.findFirst({
        where: eq(matchRounds.stageId, targetStage.id),
        orderBy: [asc(matchRounds.order)],
      });
      if (!firstRound) continue;

      const roundMatches = await db.query.matches.findMany({
        where: and(
          eq(matches.roundId, firstRound.id),
          eq(matches.stageId, targetStage.id)
        ),
        orderBy: [asc(matches.matchNumber)],
      });

      // Строим сеяные пары: 1 vs N, 2 vs N-1, ...
      const pairs = buildSeededPairs(
        teamsInRange.map((t) => ({ teamId: t.teamId, rank: t.rank }))
      );

      // Заполняем матчи
      for (let i = 0; i < Math.min(pairs.length, roundMatches.length); i++) {
        const match = roundMatches[i];
        const [homeId, awayId] = pairs[i];

        await db
          .update(matches)
          .set({
            homeTeamId: homeId,
            awayTeamId: awayId,
          })
          .where(eq(matches.id, match.id));

        if (homeId) {
          advancedTeams.push({
            teamId: homeId,
            targetStageId: targetStage.id,
            rank: teamsInRange.find((t) => t.teamId === homeId)?.rank ?? 0,
            targetStage: targetStage.name,
          });
        }
        if (awayId) {
          advancedTeams.push({
            teamId: awayId,
            targetStageId: targetStage.id,
            rank: teamsInRange.find((t) => t.teamId === awayId)?.rank ?? 0,
            targetStage: targetStage.name,
          });
        }
      }

      if (!activatedStageIds.includes(targetStage.id)) {
        activatedStageIds.push(targetStage.id);
      }
    }

    // ── Group: добавляем команды в группы следующего этапа
    else if (targetStage.type === "group") {
      const condition = (rule.condition ?? {}) as Record<string, unknown>;

      // Если в condition указан конкретный groupId — кладём всех туда
      if (condition.targetGroupId) {
        const targetGroupId = Number(condition.targetGroupId);
        for (const team of teamsInRange) {
          await db
            .insert(groupTeams)
            .values({ groupId: targetGroupId, teamId: team.teamId })
            .onConflictDoNothing();
          advancedTeams.push({
            teamId: team.teamId,
            targetStageId: targetStage.id,
            rank: team.rank,
            targetStage: targetStage.name,
          });
        }
      } else {
        // Иначе распределяем по группам round-robin
        const targetGroups = await db.query.stageGroups.findMany({
          where: eq(stageGroups.stageId, targetStage.id),
          orderBy: (g, { asc }) => [asc(g.order)],
        });

        for (let i = 0; i < teamsInRange.length; i++) {
          const team = teamsInRange[i];
          const group = targetGroups[i % targetGroups.length];
          if (!group) continue;

          await db
            .insert(groupTeams)
            .values({ groupId: group.id, teamId: team.teamId })
            .onConflictDoNothing();

          advancedTeams.push({
            teamId: team.teamId,
            targetStageId: targetStage.id,
            rank: team.rank,
            targetStage: targetStage.name,
          });
        }
      }

      if (!activatedStageIds.includes(targetStage.id)) {
        activatedStageIds.push(targetStage.id);
      }
    }
  }

  // 6. Активируем все целевые этапы
  if (activatedStageIds.length > 0) {
    await db
      .update(tournamentStages)
      .set({ status: "active" })
      .where(inArray(tournamentStages.id, activatedStageIds));
  }

  // 7. Помечаем источник как завершённый
  await db
    .update(tournamentStages)
    .set({ status: "finished" })
    .where(eq(tournamentStages.id, stageId));

  return NextResponse.json({
    ok: true,
    advancedTeams: advancedTeams.length,
    activatedStages: activatedStageIds.length,
    details: advancedTeams,
  });
}
