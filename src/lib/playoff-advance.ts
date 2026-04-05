import { db } from "@/db";
import {
  matches,
  standings,
  stageGroups,
  stageSlots,
  qualificationRules,
} from "@/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";

/**
 * Проверяет, завершена ли группа, и если да — автоматически
 * продвигает команды в плей-офф согласно правилам квалификации.
 *
 * Вызывается после каждого пересчёта таблицы группы.
 */
export async function maybeAutoAdvanceGroup(
  groupId: number,
  stageId: number
): Promise<void> {
  // ── Проверяем, все ли матчи группы завершены ────────────────────────────
  const [totalResult, finishedResult] = await Promise.all([
    db
      .select({ count: matches.id })
      .from(matches)
      .where(and(eq(matches.groupId, groupId), isNull(matches.deletedAt)))
      .then((rows) => rows.length),
    db
      .select({ count: matches.id })
      .from(matches)
      .where(
        and(
          eq(matches.groupId, groupId),
          eq(matches.status, "finished"),
          isNull(matches.deletedAt)
        )
      )
      .then((rows) => rows.length),
  ]);

  // Если не все матчи сыграны — ничего не делаем
  if (totalResult === 0 || finishedResult < totalResult) return;

  // ── Получаем финальные позиции группы ──────────────────────────────────
  const groupStandings = await db
    .select()
    .from(standings)
    .where(eq(standings.groupId, groupId))
    .orderBy(asc(standings.position));

  if (groupStandings.length === 0) return;

  // ── Ищем stageSlots для этой группы ────────────────────────────────────
  const slots = await db
    .select()
    .from(stageSlots)
    .where(eq(stageSlots.groupId, groupId))
    .orderBy(asc(stageSlots.order));

  if (slots.length > 0) {
    // Заполняем слоты по порядку: slot[0] → 1-е место, slot[1] → 2-е место...
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const standing = groupStandings[i];
      if (!standing) continue;

      // Обновляем слот
      await db
        .update(stageSlots)
        .set({ filledByTeamId: standing.teamId })
        .where(eq(stageSlots.id, slot.id));

      // Если у слота есть roundId и slotPosition — обновляем матч в плей-офф
      if (slot.roundId && slot.slotPosition) {
        await fillPlayoffMatchSlot(
          slot.roundId,
          slot.slotPosition as "home" | "away",
          slot.order,
          standing.teamId
        );
      }
    }
    return;
  }

  // ── Fallback: используем qualificationRules ─────────────────────────────
  const rules = await db
    .select()
    .from(qualificationRules)
    .where(eq(qualificationRules.fromStageId, stageId));

  if (rules.length === 0) return;

  // Получаем данные группы (имя, порядок)
  const group = await db.query.stageGroups.findFirst({
    where: eq(stageGroups.id, groupId),
  });
  if (!group) return;

  for (const standing of groupStandings) {
    if (!standing.position) continue;

    // Найдем правило для этой позиции
    const rule = rules.find(
      (r) => r.fromRank <= standing.position! && standing.position! <= r.toRank
    );
    if (!rule) continue;

    // Найдем подходящий слот в целевом этапе
    const targetSlots = await db
      .select()
      .from(stageSlots)
      .where(
        and(
          eq(stageSlots.stageId, rule.targetStageId),
          isNull(stageSlots.filledByTeamId)
        )
      )
      .orderBy(asc(stageSlots.order))
      .limit(1);

    if (targetSlots.length === 0) continue;
    const targetSlot = targetSlots[0];

    await db
      .update(stageSlots)
      .set({ filledByTeamId: standing.teamId })
      .where(eq(stageSlots.id, targetSlot.id));

    if (targetSlot.roundId && targetSlot.slotPosition) {
      await fillPlayoffMatchSlot(
        targetSlot.roundId,
        targetSlot.slotPosition as "home" | "away",
        targetSlot.order,
        standing.teamId
      );
    }
  }
}

/**
 * Находит матч в раунде плей-офф по порядковому номеру слота
 * и заполняет нужную позицию (home/away) командой.
 */
async function fillPlayoffMatchSlot(
  roundId: number,
  position: "home" | "away",
  slotOrder: number,
  teamId: number
): Promise<void> {
  // Матчи раунда, отсортированные по matchNumber
  const roundMatches = await db
    .select()
    .from(matches)
    .where(and(eq(matches.roundId, roundId), isNull(matches.deletedAt)))
    .orderBy(asc(matches.matchNumber));

  if (roundMatches.length === 0) return;

  // Определяем индекс матча: каждый матч имеет 2 слота (home + away)
  // slotOrder нумерует все слоты раунда подряд
  const matchIndex = Math.floor((slotOrder - 1) / 2);
  const targetMatch = roundMatches[matchIndex];
  if (!targetMatch) return;

  // Обновляем только если слот ещё не занят
  if (position === "home" && !targetMatch.homeTeamId) {
    await db
      .update(matches)
      .set({ homeTeamId: teamId })
      .where(eq(matches.id, targetMatch.id));
  } else if (position === "away" && !targetMatch.awayTeamId) {
    await db
      .update(matches)
      .set({ awayTeamId: teamId })
      .where(eq(matches.id, targetMatch.id));
  }
}
