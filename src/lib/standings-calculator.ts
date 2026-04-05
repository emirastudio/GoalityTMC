import { db } from "@/db";
import { matches, standings, stageGroups, groupTeams, matchEvents } from "@/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";

// ─── Types ──────────────────────────────────────────────────────────────────

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
  fairPlayScore: number; // lower = better (yellow=-1, red=-3)
  form: string[];
  headToHead: Record<string, { points: number; goalDiff: number; goalsFor: number }>;
};

type RawMatch = {
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  scheduledAt: Date | null;
};

// ─── FIFA/UEFA Tiebreaker Engine ─────────────────────────────────────────────

/**
 * Сравнивает команды по критериям FIFA/UEFA.
 * Для 2 команд: прямое H2H сравнение.
 * Для 3+ команд: мини-таблица только между ними → если ещё равны → общая статистика.
 *
 * Порядок критериев:
 *  1. Очки в личных встречах (H2H pts)
 *  2. Разница мячей в личных встречах (H2H GD)
 *  3. Забитые мячи в личных встречах (H2H GS)
 *  4. Общая разница мячей
 *  5. Общие забитые мячи
 *  6. Fair Play (карточки)
 *  7. Жеребьёвка (случайно — финальный резерв)
 */
function sortByFIFAUEFA(
  group: StandingRow[],
  allMatches: RawMatch[],
  pointsWin: number,
  pointsDraw: number
): StandingRow[] {
  if (group.length <= 1) return group;

  if (group.length === 2) {
    return breakTwoTeamTie(group[0], group[1]);
  }

  return breakMultiTeamTie(group, allMatches, pointsWin, pointsDraw);
}

/** Разбирает ничью между 2 командами через их сохранённый H2H */
function breakTwoTeamTie(a: StandingRow, b: StandingRow): StandingRow[] {
  const h2hA = a.headToHead[b.teamId] ?? { points: 0, goalDiff: 0, goalsFor: 0 };
  const h2hB = b.headToHead[a.teamId] ?? { points: 0, goalDiff: 0, goalsFor: 0 };

  // 1. H2H очки
  if (h2hB.points !== h2hA.points) return h2hB.points > h2hA.points ? [b, a] : [a, b];
  // 2. H2H разница мячей
  if (h2hB.goalDiff !== h2hA.goalDiff) return h2hB.goalDiff > h2hA.goalDiff ? [b, a] : [a, b];
  // 3. H2H забитые
  if (h2hB.goalsFor !== h2hA.goalsFor) return h2hB.goalsFor > h2hA.goalsFor ? [b, a] : [a, b];
  // 4. Общая разница
  if (b.goalDiff !== a.goalDiff) return b.goalDiff > a.goalDiff ? [b, a] : [a, b];
  // 5. Общие забитые
  if (b.goalsFor !== a.goalsFor) return b.goalsFor > a.goalsFor ? [b, a] : [a, b];
  // 6. Fair Play (меньше = лучше)
  if (a.fairPlayScore !== b.fairPlayScore) return a.fairPlayScore < b.fairPlayScore ? [a, b] : [b, a];
  // 7. Жеребьёвка (оставляем в текущем порядке)
  return [a, b];
}

/** Разбирает ничью между 3+ командами через мини-таблицу */
function breakMultiTeamTie(
  group: StandingRow[],
  allMatches: RawMatch[],
  pointsWin: number,
  pointsDraw: number
): StandingRow[] {
  const tiedIds = new Set(group.map((t) => t.teamId));

  // Строим мини-таблицу: только матчи между этими командами
  const h2hMatches = allMatches.filter(
    (m) => tiedIds.has(m.homeTeamId) && tiedIds.has(m.awayTeamId)
  );

  const mini: Record<number, { pts: number; gd: number; gf: number }> = {};
  for (const t of group) mini[t.teamId] = { pts: 0, gd: 0, gf: 0 };

  for (const m of h2hMatches) {
    const hg = m.homeScore ?? 0;
    const ag = m.awayScore ?? 0;
    if (hg > ag) {
      mini[m.homeTeamId].pts += pointsWin;
    } else if (ag > hg) {
      mini[m.awayTeamId].pts += pointsWin;
    } else {
      mini[m.homeTeamId].pts += pointsDraw;
      mini[m.awayTeamId].pts += pointsDraw;
    }
    mini[m.homeTeamId].gd += hg - ag;
    mini[m.awayTeamId].gd += ag - hg;
    mini[m.homeTeamId].gf += hg;
    mini[m.awayTeamId].gf += ag;
  }

  // Первичная сортировка по мини-таблице + общей статистике
  const sorted = [...group].sort((a, b) => {
    const ma = mini[a.teamId];
    const mb = mini[b.teamId];
    if (mb.pts !== ma.pts) return mb.pts - ma.pts;
    if (mb.gd !== ma.gd) return mb.gd - ma.gd;
    if (mb.gf !== ma.gf) return mb.gf - ma.gf;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    if (a.fairPlayScore !== b.fairPlayScore) return a.fairPlayScore - b.fairPlayScore;
    return 0;
  });

  // Ищем подгруппы, у которых ВСЕ критерии равны — применяем рекурсию
  const result: StandingRow[] = [];
  let i = 0;

  while (i < sorted.length) {
    let j = i + 1;
    const curr = sorted[i];

    while (j < sorted.length) {
      const next = sorted[j];
      const mc = mini[curr.teamId];
      const mn = mini[next.teamId];
      const stillTied =
        mc.pts === mn.pts &&
        mc.gd === mn.gd &&
        mc.gf === mn.gf &&
        curr.goalDiff === next.goalDiff &&
        curr.goalsFor === next.goalsFor &&
        curr.fairPlayScore === next.fairPlayScore;
      if (!stillTied) break;
      j++;
    }

    const subGroup = sorted.slice(i, j);

    if (subGroup.length === 1) {
      result.push(subGroup[0]);
    } else if (subGroup.length === 2) {
      // Подгруппа из 2 — прямое H2H
      result.push(...breakTwoTeamTie(subGroup[0], subGroup[1]));
    } else {
      // Подгруппа из 3+ с полностью равными показателями — жеребьёвка
      result.push(...subGroup);
    }

    i = j;
  }

  return result;
}

// ─── Fair Play Calculator ────────────────────────────────────────────────────

async function calcFairPlayScores(
  teamIds: number[],
  groupId: number
): Promise<Record<number, number>> {
  const scores: Record<number, number> = {};
  for (const id of teamIds) scores[id] = 0;

  // Получаем все матчи группы
  const groupMatches = await db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.groupId, groupId), isNull(matches.deletedAt)));

  if (groupMatches.length === 0) return scores;

  const matchIds = groupMatches.map((m) => m.id);

  // Карточки для команд из этих матчей
  const cards = await db
    .select({
      teamId: matchEvents.teamId,
      eventType: matchEvents.eventType,
    })
    .from(matchEvents)
    .where(
      and(
        inArray(matchEvents.matchId, matchIds),
        inArray(matchEvents.eventType, ["yellow", "red", "yellow_red"])
      )
    );

  for (const card of cards) {
    if (!card.teamId || !scores[card.teamId] !== undefined) continue;
    if (card.eventType === "yellow") scores[card.teamId] = (scores[card.teamId] ?? 0) - 1;
    if (card.eventType === "red") scores[card.teamId] = (scores[card.teamId] ?? 0) - 3;
    if (card.eventType === "yellow_red") scores[card.teamId] = (scores[card.teamId] ?? 0) - 3;
  }

  return scores;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Пересчитывает таблицу для одной группы после изменения результата матча.
 * Использует алгоритм FIFA/UEFA с мини-таблицей для 3+ команд.
 * Вызывается при сохранении результата матча.
 */
export async function recalculateGroupStandings(
  groupId: number,
  pointsWin = 3,
  pointsDraw = 1,
  pointsLoss = 0
): Promise<void> {
  // Команды группы
  const groupTeamRows = await db
    .select({ teamId: groupTeams.teamId })
    .from(groupTeams)
    .where(eq(groupTeams.groupId, groupId));

  if (groupTeamRows.length === 0) return;

  const teamIds = groupTeamRows.map((r) => r.teamId);

  // Все завершённые матчи группы
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

  // Fair play
  const fairPlay = await calcFairPlayScores(teamIds, groupId);

  // Инициализируем строки
  const rows: Record<number, StandingRow> = {};
  for (const teamId of teamIds) {
    rows[teamId] = {
      teamId,
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDiff: 0,
      points: 0,
      fairPlayScore: fairPlay[teamId] ?? 0,
      form: [],
      headToHead: {},
    };
  }

  // Считаем статистику из матчей
  const rawMatches: RawMatch[] = [];

  for (const match of finishedMatches) {
    const homeId = match.homeTeamId;
    const awayId = match.awayTeamId;
    const hg = match.homeScore ?? 0;
    const ag = match.awayScore ?? 0;

    if (!homeId || !awayId) continue;
    if (!rows[homeId] || !rows[awayId]) continue;

    rawMatches.push({
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeScore: hg,
      awayScore: ag,
      scheduledAt: match.scheduledAt,
    });

    rows[homeId].played++;
    rows[homeId].goalsFor += hg;
    rows[homeId].goalsAgainst += ag;
    rows[awayId].played++;
    rows[awayId].goalsFor += ag;
    rows[awayId].goalsAgainst += hg;

    // Инициализация H2H
    if (!rows[homeId].headToHead[awayId]) rows[homeId].headToHead[awayId] = { points: 0, goalDiff: 0, goalsFor: 0 };
    if (!rows[awayId].headToHead[homeId]) rows[awayId].headToHead[homeId] = { points: 0, goalDiff: 0, goalsFor: 0 };

    if (hg > ag) {
      rows[homeId].won++;
      rows[homeId].points += pointsWin;
      rows[homeId].form.push("W");
      rows[awayId].lost++;
      rows[awayId].points += pointsLoss;
      rows[awayId].form.push("L");
      rows[homeId].headToHead[awayId].points += pointsWin;
      rows[homeId].headToHead[awayId].goalDiff += hg - ag;
      rows[homeId].headToHead[awayId].goalsFor += hg;
      rows[awayId].headToHead[homeId].goalDiff += ag - hg;
      rows[awayId].headToHead[homeId].goalsFor += ag;
    } else if (ag > hg) {
      rows[awayId].won++;
      rows[awayId].points += pointsWin;
      rows[awayId].form.push("W");
      rows[homeId].lost++;
      rows[homeId].points += pointsLoss;
      rows[homeId].form.push("L");
      rows[awayId].headToHead[homeId].points += pointsWin;
      rows[awayId].headToHead[homeId].goalDiff += ag - hg;
      rows[awayId].headToHead[homeId].goalsFor += ag;
      rows[homeId].headToHead[awayId].goalDiff += hg - ag;
      rows[homeId].headToHead[awayId].goalsFor += hg;
    } else {
      rows[homeId].drawn++;
      rows[homeId].points += pointsDraw;
      rows[homeId].form.push("D");
      rows[awayId].drawn++;
      rows[awayId].points += pointsDraw;
      rows[awayId].form.push("D");
      rows[homeId].headToHead[awayId].points += pointsDraw;
      rows[homeId].headToHead[awayId].goalsFor += hg;
      rows[awayId].headToHead[homeId].points += pointsDraw;
      rows[awayId].headToHead[homeId].goalsFor += ag;
    }
  }

  // Финальный goalDiff и форма
  for (const row of Object.values(rows)) {
    row.goalDiff = row.goalsFor - row.goalsAgainst;
    row.form = row.form.slice(-5);
  }

  // ── FIFA/UEFA сортировка ──────────────────────────────────────────────────
  // 1. Сортируем по очкам
  const byPoints = Object.values(rows).sort((a, b) => b.points - a.points);

  // 2. Внутри одинаковых очков — FIFA/UEFA tiebreaker
  const sorted: StandingRow[] = [];
  let i = 0;
  while (i < byPoints.length) {
    let j = i + 1;
    while (j < byPoints.length && byPoints[j].points === byPoints[i].points) j++;
    const tiedGroup = byPoints.slice(i, j);
    sorted.push(...sortByFIFAUEFA(tiedGroup, rawMatches, pointsWin, pointsDraw));
    i = j;
  }

  // Upsert standings
  const group = await db.query.stageGroups.findFirst({
    where: eq(stageGroups.id, groupId),
  });
  if (!group) return;

  for (let pos = 0; pos < sorted.length; pos++) {
    const row = sorted[pos];
    const position = pos + 1;

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
        headToHead: row.headToHead as Record<string, unknown>,
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
          headToHead: row.headToHead as Record<string, unknown>,
          updatedAt: new Date(),
        },
      });
  }
}
