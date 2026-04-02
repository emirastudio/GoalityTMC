import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, stageGroups, groupTeams, tournamentStages, matchRounds } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { generateRoundRobin, scheduleMatches, generateTimeSlots } from "@/lib/fixture-generator";
import { eq, and } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string };

// POST /api/org/[orgSlug]/tournament/[tournamentId]/matches/generate
// Генерация матчей для этапа:
// - Для GROUP этапа: круговой турнир внутри каждой группы
// - Для KNOCKOUT: создаёт пустые матчи под каждый раунд
// Опционально: автоматическое расписание
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = await req.json();
  const { stageId, doubleRoundRobin = false, schedule } = body;

  if (!stageId) {
    return NextResponse.json({ error: "stageId required" }, { status: 400 });
  }

  // Загружаем этап
  const stage = await db.query.tournamentStages.findFirst({
    where: and(
      eq(tournamentStages.id, stageId),
      eq(tournamentStages.tournamentId, ctx.tournament.id)
    ),
  });
  if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  // Удаляем существующие незавершённые матчи этапа
  const existingCount = await db.query.matches.findMany({
    where: and(
      eq(matches.stageId, stageId),
      eq(matches.status, "finished")
    ),
  });
  if (existingCount.length > 0 && !body.force) {
    return NextResponse.json(
      { error: "Stage has finished matches. Pass force:true to regenerate.", finishedCount: existingCount.length },
      { status: 409 }
    );
  }

  // Удаляем старые scheduled/postponed матчи
  await db.delete(matches).where(
    and(
      eq(matches.stageId, stageId),
      eq(matches.status, "scheduled")
    )
  );

  const generatedMatches: Array<{
    tournamentId: number;
    organizationId: number;
    stageId: number;
    groupId: number | null;
    roundId: number | null;
    matchNumber: number;
    homeTeamId: number | null;
    awayTeamId: number | null;
    status: "scheduled";
  }> = [];

  let globalMatchNumber = 1;

  if (stage.type === "group") {
    // ── Групповой этап: round-robin для каждой группы ──────────
    const groups = await db.query.stageGroups.findMany({
      where: eq(stageGroups.stageId, stageId),
      with: { groupTeams: true },
      orderBy: (g, { asc }) => [asc(g.order)],
    });

    for (const group of groups) {
      const teamIds = group.groupTeams.map((gt) => gt.teamId);
      if (teamIds.length < 2) continue;

      const fixtures = generateRoundRobin(teamIds, doubleRoundRobin);

      for (const fixture of fixtures) {
        generatedMatches.push({
          tournamentId: ctx.tournament.id,
          organizationId: ctx.organizationId,
          stageId,
          groupId: group.id,
          roundId: null,
          matchNumber: globalMatchNumber++,
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
          status: "scheduled",
        });
      }
    }
  } else if (stage.type === "knockout") {
    // ── Плей-офф: пустые матчи для каждого раунда ─────────────
    const rounds = await db.query.matchRounds.findMany({
      where: eq(matchRounds.stageId, stageId),
      orderBy: (r, { desc }) => [desc(r.order)], // начинаем с первого раунда (наибольший order)
    });

    for (const round of rounds) {
      for (let i = 0; i < round.matchCount; i++) {
        generatedMatches.push({
          tournamentId: ctx.tournament.id,
          organizationId: ctx.organizationId,
          stageId,
          groupId: null,
          roundId: round.id,
          matchNumber: globalMatchNumber++,
          homeTeamId: null, // заполняется после жеребьёвки
          awayTeamId: null,
          status: "scheduled",
        });
      }
      // Матч за 3-е место
      if (round.hasThirdPlace) {
        generatedMatches.push({
          tournamentId: ctx.tournament.id,
          organizationId: ctx.organizationId,
          stageId,
          groupId: null,
          roundId: round.id,
          matchNumber: globalMatchNumber++,
          homeTeamId: null,
          awayTeamId: null,
          status: "scheduled",
        });
      }
    }
  } else {
    return NextResponse.json(
      { error: `Auto-generation for type '${stage.type}' not yet supported` },
      { status: 400 }
    );
  }

  if (generatedMatches.length === 0) {
    return NextResponse.json({ error: "No matches generated. Check groups have teams." }, { status: 400 });
  }

  // ── Автоматическое расписание (если передан schedule) ─────────
  let conflicts: Array<{ matchIndex: number; homeTeamId: number; awayTeamId: number | null; reason: string }> = [];

  if (schedule) {
    const {
      fieldIds,
      days,             // [{ date: "2026-07-10", startHour: 9, endHour: 18 }]
      intervalMinutes = 90,
      minRestMinutes = 120,
    } = schedule;

    // Генерируем слоты
    const slots = [];
    for (const day of (days ?? [])) {
      const daySlots = generateTimeSlots(
        fieldIds ?? [],
        new Date(day.date),
        day.startHour ?? 9,
        day.endHour ?? 18,
        intervalMinutes
      );
      slots.push(...daySlots);
    }

    if (slots.length > 0) {
      const fixtures = generatedMatches.map((m, i) => ({
        homeTeamId: m.homeTeamId ?? 0,
        awayTeamId: m.awayTeamId,
        round: i,
      }));

      const { scheduled, conflicts: scheduleConflicts } = scheduleMatches(
        fixtures,
        slots,
        minRestMinutes,
        intervalMinutes
      );

      conflicts = scheduleConflicts;

      // Применяем расписание к матчам
      for (let i = 0; i < scheduled.length; i++) {
        if (generatedMatches[i]) {
          (generatedMatches[i] as Record<string, unknown>).fieldId = scheduled[i].fieldId;
          (generatedMatches[i] as Record<string, unknown>).scheduledAt = scheduled[i].scheduledAt;
        }
      }
    }
  }

  // Вставляем все матчи
  const inserted = await db.insert(matches).values(generatedMatches).returning();

  return NextResponse.json({
    generated: inserted.length,
    conflicts,
    matches: inserted,
  }, { status: 201 });
}
