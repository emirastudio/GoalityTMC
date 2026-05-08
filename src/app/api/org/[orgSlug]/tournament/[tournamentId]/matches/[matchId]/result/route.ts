import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, matchResultLog, tournamentStages } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { recalculateGroupStandings } from "@/lib/standings-calculator";
import { maybeAutoAdvanceGroup } from "@/lib/playoff-advance";
import { progressPlayoffWinner } from "@/lib/playoff-progress";
import { eq, and, isNull } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string; matchId: string };

// GET /api/.../matches/[matchId]/result
// Текущий результат матча
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const match = await db.query.matches.findFirst({
    where: and(
      eq(matches.id, parseInt(p.matchId)),
      eq(matches.tournamentId, ctx.tournament.id),
      isNull(matches.deletedAt)
    ),
  });

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  return NextResponse.json({
    id: match.id,
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    homeExtraScore: match.homeExtraScore,
    awayExtraScore: match.awayExtraScore,
    homePenalties: match.homePenalties,
    awayPenalties: match.awayPenalties,
    winnerId: match.winnerId,
    resultType: match.resultType,
  });
}

// PATCH /api/.../matches/[matchId]/result
// Ввести / обновить результат матча
// Ключевой роут: сохраняет результат + пересчитывает таблицу + пишет audit log
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const body = await req.json();

  // Event-based operations (goals, cards, etc.) require Pro+ via the /events route.
  // Basic score/status updates are allowed for all plans.
  const mid = parseInt(p.matchId);

  // Получаем текущий матч
  const current = await db.query.matches.findFirst({
    where: and(
      eq(matches.id, mid),
      eq(matches.tournamentId, ctx.tournament.id),
      isNull(matches.deletedAt)
    ),
  });
  if (!current) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  // Optimistic locking — проверяем версию если передана
  if (body.version !== undefined && body.version !== current.version) {
    return NextResponse.json(
      { error: "Conflict: match was modified by another request", currentVersion: current.version },
      { status: 409 }
    );
  }

  // Строим обновления
  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
    version: (current.version ?? 0) + 1,
  };

  if (body.status !== undefined)        updates.status        = body.status;
  if (body.homeScore !== undefined)     updates.homeScore     = body.homeScore;
  if (body.awayScore !== undefined)     updates.awayScore     = body.awayScore;
  if (body.homeExtraScore !== undefined) updates.homeExtraScore = body.homeExtraScore;
  if (body.awayExtraScore !== undefined) updates.awayExtraScore = body.awayExtraScore;
  if (body.homePenalties !== undefined) updates.homePenalties = body.homePenalties;
  if (body.awayPenalties !== undefined) updates.awayPenalties = body.awayPenalties;
  if (body.resultType !== undefined)    updates.resultType    = body.resultType;
  if (body.notes !== undefined)         updates.notes         = body.notes;

  // Экспликитный победитель (приоритет — если передан напрямую)
  if (body.winnerId !== undefined) updates.winnerId = body.winnerId;

  // Определяем победителя для плей-офф при завершении
  if (updates.status === "finished") {
    updates.finishedAt = new Date();

    if (current.roundId) {
      // Приоритет определения победителя: пенальти → экстра-тайм → основное время
      const hp = (body.homePenalties ?? current.homePenalties) as number | null;
      const ap = (body.awayPenalties ?? current.awayPenalties) as number | null;
      const he = (body.homeExtraScore ?? current.homeExtraScore) as number | null;
      const ae = (body.awayExtraScore ?? current.awayExtraScore) as number | null;
      const hr = (body.homeScore ?? current.homeScore ?? 0) as number;
      const ar = (body.awayScore ?? current.awayScore ?? 0) as number;

      let winnerId: number | null = null;
      let resultType: string = "regular";

      if (hp != null && ap != null && hp !== ap) {
        // Победа по пенальти
        winnerId = hp > ap ? current.homeTeamId : current.awayTeamId;
        resultType = "penalties";
      } else if (he != null && ae != null && he !== ae) {
        // Победа в доп. времени
        winnerId = he > ae ? current.homeTeamId : current.awayTeamId;
        resultType = "extra_time";
      } else if (hr !== ar) {
        // Победа в основное время
        winnerId = hr > ar ? current.homeTeamId : current.awayTeamId;
        resultType = "regular";
      }
      // else: ничья без разрешения — winnerId остаётся null, не блокируем

      if (winnerId && !updates.winnerId) updates.winnerId = winnerId;
      if (!updates.resultType) updates.resultType = resultType;
    }
  }

  if (body.status === "live" && !current.startedAt) {
    updates.startedAt = new Date();
  }

  // Сохраняем результат
  const [updated] = await db
    .update(matches)
    .set(updates)
    .where(eq(matches.id, mid))
    .returning();

  // Audit log
  await db.insert(matchResultLog).values({
    matchId: mid,
    changedBy: ctx.session.userId,
    oldHomeScore: current.homeScore,
    oldAwayScore: current.awayScore,
    newHomeScore: updated.homeScore,
    newAwayScore: updated.awayScore,
    oldStatus: current.status,
    newStatus: updated.status,
    reason: body.reason ?? null,
  });

  // Плей-офф: прогрессия победителя в следующий раунд
  if (updated.roundId && updated.status === "finished") {
    await progressPlayoffWinner(updated);
  }

  // Broadcast live update to SSE clients (Pro/Elite live standings)
  const { emitMatchUpdate } = await import("@/lib/match-events");
  if (updated.groupId && (updated.status === "live" || updated.status === "finished")) {
    emitMatchUpdate({
      tournamentId: updated.tournamentId,
      matchId:      updated.id,
      groupId:      updated.groupId,
      homeTeamId:   updated.homeTeamId,
      awayTeamId:   updated.awayTeamId,
      homeScore:    updated.homeScore,
      awayScore:    updated.awayScore,
      status:       updated.status,
    });
  }

  // Пересчитываем таблицу группы если матч групповой и завершён
  if (updated.groupId && updated.status === "finished") {
    const stage = updated.stageId
      ? await db.query.tournamentStages.findFirst({
          where: eq(tournamentStages.id, updated.stageId),
        })
      : null;

    const settings = (stage?.settings ?? {}) as Record<string, number>;
    await recalculateGroupStandings(
      updated.groupId,
      settings.pointsWin ?? 3,
      settings.pointsDraw ?? 1,
      settings.pointsLoss ?? 0
    );

    // Авто-продвижение в плей-офф если группа полностью завершена
    if (updated.stageId) {
      await maybeAutoAdvanceGroup(updated.groupId, updated.stageId);
    }
  }

  return NextResponse.json(updated);
}
