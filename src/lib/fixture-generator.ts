/**
 * Генератор матчей — Polygon Method (алгоритм Бергера).
 * Работает для любого количества команд.
 */

export type MatchPair = {
  homeTeamId: number;
  awayTeamId: number | null; // null = BYE (свободный тур)
  round: number;
};

/**
 * Генерирует fixtures для кругового турнира (round-robin).
 * Возвращает список пар по турам.
 *
 * @param teamIds — массив ID команд
 * @param doubleRoundRobin — если true, каждая пара встречается дважды (дома/в гостях)
 */
export function generateRoundRobin(
  teamIds: number[],
  doubleRoundRobin = false
): MatchPair[] {
  const pairs: MatchPair[] = [];
  let teams = [...teamIds];

  // Если нечётное количество — добавляем BYE (null)
  if (teams.length % 2 !== 0) {
    teams.push(-1); // -1 = BYE
  }

  const n = teams.length;
  const rounds = n - 1;
  const halfN = n / 2;

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < halfN; i++) {
      const home = teams[i];
      const away = teams[n - 1 - i];

      if (home === -1 || away === -1) continue; // пропускаем BYE матчи

      pairs.push({
        homeTeamId: home,
        awayTeamId: away === -1 ? null : away,
        round: round + 1,
      });
    }

    // Поворачиваем массив (фиксируем первую команду, вращаем остальных)
    const last = teams[n - 1];
    for (let i = n - 1; i > 1; i--) {
      teams[i] = teams[i - 1];
    }
    teams[1] = last;
  }

  if (!doubleRoundRobin) return pairs;

  // Второй круг — меняем home/away
  const secondLeg = pairs.map((p) => ({
    homeTeamId: p.awayTeamId ?? p.homeTeamId,
    awayTeamId: p.homeTeamId,
    round: p.round + rounds,
  }));

  return [...pairs, ...secondLeg];
}

/**
 * Планировщик расписания — назначает матчи на временные слоты.
 * Учитывает: занятость полей, минимальный отдых команд.
 *
 * @param fixtures — список матчей (без времени)
 * @param slots — доступные слоты: [{ fieldId, dateTime }]
 * @param minRestMinutes — минимальный отдых между матчами команды
 * @param matchDurationMinutes — длительность матча + перерыв
 */
export type TimeSlot = {
  fieldId: number;
  dateTime: Date;
};

export type ScheduledMatch = MatchPair & {
  fieldId: number;
  scheduledAt: Date;
};

export type ScheduleConflict = {
  matchIndex: number;
  homeTeamId: number;
  awayTeamId: number | null;
  reason: string;
};

export function scheduleMatches(
  fixtures: MatchPair[],
  slots: TimeSlot[],
  minRestMinutes = 120,
  matchDurationMinutes = 90
): { scheduled: ScheduledMatch[]; conflicts: ScheduleConflict[] } {
  const scheduled: ScheduledMatch[] = [];
  const conflicts: ScheduleConflict[] = [];

  // Трекинг: когда последний раз играла команда
  const teamLastMatch: Record<number, Date> = {};
  // Трекинг: занятые слоты на полях
  const fieldSlots = new Set<string>(); // `${fieldId}_${dateTime.getTime()}`

  const availableSlots = [...slots].sort(
    (a, b) => a.dateTime.getTime() - b.dateTime.getTime()
  );

  for (let i = 0; i < fixtures.length; i++) {
    const fixture = fixtures[i];
    let assigned = false;

    for (const slot of availableSlots) {
      const slotKey = `${slot.fieldId}_${slot.dateTime.getTime()}`;

      // Поле занято?
      if (fieldSlots.has(slotKey)) continue;

      // Проверяем отдых для homeTeam
      const homeLastTime = teamLastMatch[fixture.homeTeamId];
      if (homeLastTime) {
        const diffMs =
          slot.dateTime.getTime() - homeLastTime.getTime() -
          matchDurationMinutes * 60 * 1000;
        if (diffMs < minRestMinutes * 60 * 1000) continue;
      }

      // Проверяем отдых для awayTeam
      if (fixture.awayTeamId !== null) {
        const awayLastTime = teamLastMatch[fixture.awayTeamId];
        if (awayLastTime) {
          const diffMs =
            slot.dateTime.getTime() - awayLastTime.getTime() -
            matchDurationMinutes * 60 * 1000;
          if (diffMs < minRestMinutes * 60 * 1000) continue;
        }
      }

      // Слот подходит — назначаем
      const matchEnd = new Date(
        slot.dateTime.getTime() + matchDurationMinutes * 60 * 1000
      );

      fieldSlots.add(slotKey);
      teamLastMatch[fixture.homeTeamId] = matchEnd;
      if (fixture.awayTeamId !== null) {
        teamLastMatch[fixture.awayTeamId] = matchEnd;
      }

      scheduled.push({ ...fixture, fieldId: slot.fieldId, scheduledAt: slot.dateTime });
      assigned = true;
      break;
    }

    if (!assigned) {
      conflicts.push({
        matchIndex: i,
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
        reason: "Не удалось найти подходящий слот (конфликт расписания)",
      });
    }
  }

  return { scheduled, conflicts };
}

/**
 * Генерирует временные слоты из настроек дня.
 * Например: поле 1, 10 июля, каждые 90 минут с 09:00 до 18:00
 */
export function generateTimeSlots(
  fieldIds: number[],
  date: Date,
  startHour: number, // 9
  endHour: number,   // 18
  intervalMinutes: number // 90
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  for (const fieldId of fieldIds) {
    let current = new Date(date);
    current.setHours(startHour, 0, 0, 0);

    const end = new Date(date);
    end.setHours(endHour, 0, 0, 0);

    while (current < end) {
      slots.push({ fieldId, dateTime: new Date(current) });
      current = new Date(current.getTime() + intervalMinutes * 60 * 1000);
    }
  }

  return slots;
}
