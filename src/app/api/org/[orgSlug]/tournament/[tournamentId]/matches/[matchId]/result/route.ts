import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, matchResultLog, tournamentStages } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { recalculateGroupStandings } from "@/lib/standings-calculator";
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

  // Определяем победителя для плей-офф
  if (updates.status === "finished") {
    const finalHome = (updates.homePenalties ?? current.homePenalties ?? updates.homeExtraScore ?? current.homeExtraScore ?? updates.homeScore ?? current.homeScore ?? 0) as number;
    const finalAway = (updates.awayPenalties ?? current.awayPenalties ?? updates.awayExtraScore ?? current.awayExtraScore ?? updates.awayScore ?? current.awayScore ?? 0) as number;

    if (current.roundId && finalHome !== finalAway) {
      updates.winnerId = finalHome > finalAway ? current.homeTeamId : current.awayTeamId;
    }

    updates.finishedAt = new Date();
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
  }

  return NextResponse.json(updated);
}
