import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, tournamentStages, tournamentFields } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, and, asc, isNull } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string };

type ScheduleBody = {
  stageId: number;
  groupId?: number;           // фильтровать только матчи одной группы
  fieldIds: number[];         // поля (хотя бы одно)
  days: DaySlot[];            // дни с временными окнами
  matchDurationMinutes: number; // полное время матча (2×20 = 40 мин)
  breakBetweenMatchesMinutes: number; // пауза между матчами на одном поле
  maxMatchesPerTeamPerDay?: number;   // по умолчанию 1
  overwriteScheduled?: boolean;       // перезаписать уже расставленные
};

type DaySlot = {
  date: string;       // ISO: "2026-08-01"
  startTime: string;  // "09:00"
  endTime: string;    // "18:00"
};

// ── Утилиты ──────────────────────────────────────────────────────────────────

function parseDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** Генерирует слоты времени для одного поля в один день */
function buildFieldSlots(
  date: string,
  startTime: string,
  endTime: string,
  matchDuration: number,
  breakMinutes: number
): Date[] {
  const slotDuration = matchDuration + breakMinutes;
  const start = parseDateTime(date, startTime);
  const end = parseDateTime(date, endTime);
  const slots: Date[] = [];
  let cursor = start;
  while (addMinutes(cursor, matchDuration).getTime() <= end.getTime()) {
    slots.push(new Date(cursor));
    cursor = addMinutes(cursor, slotDuration);
  }
  return slots;
}

/** Строит расписание слотов: Map<fieldId, Date[]> per day */
function buildDaySchedule(
  day: DaySlot,
  fieldIds: number[],
  matchDuration: number,
  breakMinutes: number
): Array<{ fieldId: number; time: Date }> {
  const slots: Array<{ fieldId: number; time: Date }> = [];

  // Генерируем слоты для каждого поля
  const fieldSlots: Array<Date[]> = fieldIds.map(() =>
    buildFieldSlots(day.date, day.startTime, day.endTime, matchDuration, breakMinutes)
  );

  // Чередуем по времени: сначала 09:00 все поля, потом 09:45 все поля...
  const maxSlots = Math.max(...fieldSlots.map((s) => s.length));
  for (let si = 0; si < maxSlots; si++) {
    for (let fi = 0; fi < fieldIds.length; fi++) {
      if (si < fieldSlots[fi].length) {
        slots.push({ fieldId: fieldIds[fi], time: fieldSlots[fi][si] });
      }
    }
  }

  // Сортируем по времени
  slots.sort((a, b) => a.time.getTime() - b.time.getTime());
  return slots;
}

// ── Main Route ───────────────────────────────────────────────────────────────

// POST /api/org/.../matches/auto-schedule
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = (await req.json()) as ScheduleBody;
  const {
    stageId,
    groupId,
    fieldIds,
    days,
    matchDurationMinutes,
    breakBetweenMatchesMinutes,
    maxMatchesPerTeamPerDay = 1,
    overwriteScheduled = false,
  } = body;

  // Валидация
  if (!stageId || !fieldIds?.length || !days?.length || !matchDurationMinutes) {
    return NextResponse.json(
      { error: "stageId, fieldIds, days, matchDurationMinutes are required" },
      { status: 400 }
    );
  }

  // Проверяем принадлежность этапа
  const stage = await db.query.tournamentStages.findFirst({
    where: and(
      eq(tournamentStages.id, stageId),
      eq(tournamentStages.tournamentId, ctx.tournament.id)
    ),
  });
  if (!stage) {
    return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  }

  // Проверяем поля
  const validFields = await db
    .select({ id: tournamentFields.id })
    .from(tournamentFields)
    .where(eq(tournamentFields.tournamentId, ctx.tournament.id));
  const validFieldIds = new Set(validFields.map((f) => f.id));
  const usableFields = fieldIds.filter((id) => validFieldIds.has(id));
  if (usableFields.length === 0) {
    return NextResponse.json({ error: "No valid fields found" }, { status: 400 });
  }

  // Загружаем матчи для расписания
  const whereClause = and(
    eq(matches.stageId, stageId),
    eq(matches.tournamentId, ctx.tournament.id),
    isNull(matches.deletedAt),
    ...(groupId ? [eq(matches.groupId, groupId)] : [])
  );

  const allMatches = await db
    .select()
    .from(matches)
    .where(whereClause)
    .orderBy(asc(matches.roundId), asc(matches.groupId), asc(matches.matchNumber));

  // Фильтруем матчи без команд (не готовы к расписанию)
  const schedulableMatches = allMatches.filter(
    (m) => m.homeTeamId && m.awayTeamId
  );

  // Если overwriteScheduled=false, берём только нераспределённые
  const unscheduled = overwriteScheduled
    ? schedulableMatches
    : schedulableMatches.filter((m) => !m.scheduledAt);

  if (unscheduled.length === 0) {
    return NextResponse.json({
      updated: 0,
      message: "No unscheduled matches with both teams assigned",
      totalMatches: schedulableMatches.length,
    });
  }

  // ── Строим расписание слотов для всех дней ───────────────────────────────
  const allSlots: Array<{ fieldId: number; time: Date; dayKey: string }> = [];
  for (const day of days) {
    const daySlots = buildDaySchedule(
      day,
      usableFields,
      matchDurationMinutes,
      breakBetweenMatchesMinutes ?? 10
    );
    for (const slot of daySlots) {
      allSlots.push({ ...slot, dayKey: day.date });
    }
  }

  if (allSlots.length === 0) {
    return NextResponse.json(
      { error: "No time slots available with given parameters" },
      { status: 400 }
    );
  }

  // ── Жадный алгоритм распределения с проверкой конфликтов ────────────────
  // teamDayCount: сколько раз команда уже играет в данный день
  const teamDayCount: Record<string, number> = {};
  const usedSlots = new Set<number>(); // индексы занятых слотов

  function getKey(teamId: number, dayKey: string) {
    return `${teamId}:${dayKey}`;
  }

  function canSchedule(
    homeId: number,
    awayId: number,
    dayKey: string
  ): boolean {
    const hk = getKey(homeId, dayKey);
    const ak = getKey(awayId, dayKey);
    return (
      (teamDayCount[hk] ?? 0) < maxMatchesPerTeamPerDay &&
      (teamDayCount[ak] ?? 0) < maxMatchesPerTeamPerDay
    );
  }

  function reserveSlot(homeId: number, awayId: number, dayKey: string, slotIdx: number) {
    const hk = getKey(homeId, dayKey);
    const ak = getKey(awayId, dayKey);
    teamDayCount[hk] = (teamDayCount[hk] ?? 0) + 1;
    teamDayCount[ak] = (teamDayCount[ak] ?? 0) + 1;
    usedSlots.add(slotIdx);
  }

  // Распределяем матчи по слотам
  const schedule: Array<{ matchId: number; fieldId: number; scheduledAt: Date }> = [];
  const unassigned: number[] = [];

  for (const match of unscheduled) {
    const homeId = match.homeTeamId!;
    const awayId = match.awayTeamId!;

    let placed = false;
    for (let si = 0; si < allSlots.length; si++) {
      if (usedSlots.has(si)) continue;
      const slot = allSlots[si];
      if (!canSchedule(homeId, awayId, slot.dayKey)) continue;

      schedule.push({
        matchId: match.id,
        fieldId: slot.fieldId,
        scheduledAt: slot.time,
      });
      reserveSlot(homeId, awayId, slot.dayKey, si);
      placed = true;
      break;
    }

    if (!placed) unassigned.push(match.id);
  }

  // ── Сохраняем в БД ───────────────────────────────────────────────────────
  for (const entry of schedule) {
    await db
      .update(matches)
      .set({
        scheduledAt: entry.scheduledAt,
        fieldId: entry.fieldId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(matches.id, entry.matchId),
          eq(matches.tournamentId, ctx.tournament.id)
        )
      );
  }

  return NextResponse.json({
    updated: schedule.length,
    unassigned: unassigned.length,
    totalSlots: allSlots.length,
    message:
      unassigned.length > 0
        ? `${unassigned.length} matches could not be scheduled — not enough slots or team conflict. Add more days/fields.`
        : `All ${schedule.length} matches scheduled successfully.`,
    schedule: schedule.map((s) => ({
      matchId: s.matchId,
      fieldId: s.fieldId,
      scheduledAt: s.scheduledAt.toISOString(),
    })),
  });
}
