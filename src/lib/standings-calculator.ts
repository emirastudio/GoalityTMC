import { db } from "@/db";
import { matches, standings, stageGroups, groupTeams } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

type StandingRow = {
  teamId: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  form: string[];
  headToHead: Record<string, { points: number; goalDiff: number }>;
};

/**
 * Пересчитывает таблицу для одной группы после изменения результата матча.
 * Вызывается в транзакции при сохранении результата.
 */
export async function recalculateGroupStandings(
  groupId: number,
  pointsWin = 3,
  pointsDraw = 1,
  pointsLoss = 0
): Promise<void> {
  // Получаем все команды группы
  const groupTeamRows = await db
    .select({ teamId: groupTeams.teamId })
    .from(groupTeams)
    .where(eq(groupTeams.groupId, groupId));

  if (groupTeamRows.length === 0) return;

  const teamIds = groupTeamRows.map((r) => r.teamId);

  // Получаем все завершённые матчи группы
  const finishedMatches = await db
    .select({
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      scheduledAt: matches.scheduledAt,
    })
    .from(matches)
    .where(
      and(
        eq(matches.groupId, groupId),
        eq(matches.status, "finished"),
        isNull(matches.deletedAt)
      )
    )
    .orderBy(matches.scheduledAt);

  // Инициализируем строки таблицы
  const rows: Record<number, StandingRow> = {};
  for (const teamId of teamIds) {
    rows[teamId] = {
      teamId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
      form: [],
      headToHead: {},
    };
  }

  // Считаем статистику
  for (const match of finishedMatches) {
    const homeId = match.homeTeamId;
    const awayId = match.awayTeamId;
    const hg = match.homeScore ?? 0;
    const ag = match.awayScore ?? 0;

    if (!homeId || !awayId) continue;
    if (!rows[homeId] || !rows[awayId]) continue;

    // Домашняя команда
    rows[homeId].played++;
    rows[homeId].goalsFor += hg;
    rows[homeId].goalsAgainst += ag;

    // Гостевая команда
    rows[awayId].played++;
    rows[awayId].goalsFor += ag;
    rows[awayId].goalsAgainst += hg;

    if (hg > ag) {
      // Победа хозяев
      rows[homeId].won++;
      rows[homeId].points += pointsWin;
      rows[homeId].form.push("W");
      rows[awayId].lost++;
      rows[awayId].points += pointsLoss;
      rows[awayId].form.push("L");
      // head-to-head
      if (!rows[homeId].headToHead[awayId]) rows[homeId].headToHead[awayId] = { points: 0, goalDiff: 0 };
      if (!rows[awayId].headToHead[homeId]) rows[awayId].headToHead[homeId] = { points: 0, goalDiff: 0 };
      rows[homeId].headToHead[awayId].points += pointsWin;
      rows[homeId].headToHead[awayId].goalDiff += (hg - ag);
      rows[awayId].headToHead[homeId].goalDiff += (ag - hg);
    } else if (ag > hg) {
      // Победа гостей
      rows[awayId].won++;
      rows[awayId].points += pointsWin;
      rows[awayId].form.push("W");
      rows[homeId].lost++;
      rows[homeId].points += pointsLoss;
      rows[homeId].form.push("L");
      if (!rows[awayId].headToHead[homeId]) rows[awayId].headToHead[homeId] = { points: 0, goalDiff: 0 };
      if (!rows[homeId].headToHead[awayId]) rows[homeId].headToHead[awayId] = { points: 0, goalDiff: 0 };
      rows[awayId].headToHead[homeId].points += pointsWin;
      rows[awayId].headToHead[homeId].goalDiff += (ag - hg);
      rows[homeId].headToHead[awayId].goalDiff += (hg - ag);
    } else {
      // Ничья
      rows[homeId].drawn++;
      rows[homeId].points += pointsDraw;
      rows[homeId].form.push("D");
      rows[awayId].drawn++;
      rows[awayId].points += pointsDraw;
      rows[awayId].form.push("D");
      if (!rows[homeId].headToHead[awayId]) rows[homeId].headToHead[awayId] = { points: 0, goalDiff: 0 };
      if (!rows[awayId].headToHead[homeId]) rows[awayId].headToHead[homeId] = { points: 0, goalDiff: 0 };
      rows[homeId].headToHead[awayId].points += pointsDraw;
      rows[awayId].headToHead[homeId].points += pointsDraw;
    }
  }

  // Считаем goal_diff
  for (const row of Object.values(rows)) {
    row.goalDiff = row.goalsFor - row.goalsAgainst;
    // Оставляем последние 5 матчей в форме
    row.form = row.form.slice(-5);
  }

  // Сортировка: очки → head-to-head → разница мячей → забитые
  const sorted = Object.values(rows).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    // head-to-head очки между ними
    const h2hA = (a.headToHead[b.teamId]?.points ?? 0);
    const h2hB = (b.headToHead[a.teamId]?.points ?? 0);
    if (h2hB !== h2hA) return h2hB - h2hA;
    // head-to-head разница мячей
    const h2hGdA = (a.headToHead[b.teamId]?.goalDiff ?? 0);
    const h2hGdB = (b.headToHead[a.teamId]?.goalDiff ?? 0);
    if (h2hGdB !== h2hGdA) return h2hGdB - h2hGdA;
    // Общая разница мячей
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    // Забитые мячи
    return b.goalsFor - a.goalsFor;
  });

  // Получаем tournamentId группы
  const group = await db.query.stageGroups.findFirst({
    where: eq(stageGroups.id, groupId),
  });
  if (!group) return;

  // Upsert standings для каждой команды
  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i];
    const position = i + 1;

    await db
      .insert(standings)
      .values({
        groupId,
        tournamentId: group.tournamentId,
        teamId: row.teamId,
        played: row.played,
        won: row.won,
        drawn: row.drawn,
        lost: row.lost,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDiff: row.goalDiff,
        points: row.points,
        position,
        form: row.form,
        headToHead: row.headToHead,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [standings.groupId, standings.teamId],
        set: {
          played: row.played,
          won: row.won,
          drawn: row.drawn,
          lost: row.lost,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalDiff: row.goalDiff,
          points: row.points,
          position,
          form: row.form,
          headToHead: row.headToHead,
          updatedAt: new Date(),
        },
      });
  }
}
