import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, tournamentStages } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { recalculateGroupStandings } from "@/lib/standings-calculator";
import { eq, and, isNull, asc } from "drizzle-orm";
import { matchEvents } from "@/db/schema";

type Params = { orgSlug: string; tournamentId: string; matchId: string };

// ── Хелпер: пересчитать таблицу если матч в групповой стадии ─────────────────
async function recalcIfGroup(match: typeof matches.$inferSelect) {
  if (!match.groupId || !match.stageId) return;
  const stage = await db.query.tournamentStages.findFirst({
    where: eq(tournamentStages.id, match.stageId),
  });
  const settings = (stage?.settings ?? {}) as {
    pointsWin?: number; pointsDraw?: number; pointsLoss?: number;
  };
  await recalculateGroupStandings(
    match.groupId,
    settings.pointsWin ?? 3,
    settings.pointsDraw ?? 1,
    settings.pointsLoss ?? 0,
  );
}

// GET /api/.../matches/[matchId]
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
    with: {
      homeTeam: { with: { club: true } },
      awayTeam: { with: { club: true } },
      field: true,
      stage: true,
      group: true,
      round: true,
      events: {
        with: { person: true, assistPerson: true },
        orderBy: [asc(matchEvents.minute), asc(matchEvents.minuteExtra)],
      },
    },
  });

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  return NextResponse.json(match);
}

// PATCH /api/.../matches/[matchId]
// Обновить поля матча (поле, время, статус, переоткрыть)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  // Получаем текущее состояние матча до обновления
  const currentMatch = await db.query.matches.findFirst({
    where: and(
      eq(matches.id, parseInt(p.matchId)),
      eq(matches.tournamentId, ctx.tournament.id),
      isNull(matches.deletedAt)
    ),
  });
  if (!currentMatch) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.fieldId !== undefined)     updates.fieldId     = body.fieldId ?? null;
  if (body.scheduledAt !== undefined) updates.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if (body.homeTeamId !== undefined)  updates.homeTeamId  = body.homeTeamId ?? null;
  if (body.awayTeamId !== undefined)  updates.awayTeamId  = body.awayTeamId ?? null;
  if (body.matchNumber !== undefined) updates.matchNumber  = body.matchNumber;
  if (body.notes !== undefined)       updates.notes        = body.notes ?? null;
  if (body.isPublic !== undefined)    updates.isPublic     = body.isPublic;
  if (body.status !== undefined)      updates.status       = body.status;
  if (body.startedAt !== undefined)   updates.startedAt    = body.startedAt ? new Date(body.startedAt) : null;
  if (body.finishedAt !== undefined)  updates.finishedAt   = body.finishedAt ? new Date(body.finishedAt) : null;
  if (body.homeScore !== undefined)   updates.homeScore    = body.homeScore;
  if (body.awayScore !== undefined)   updates.awayScore    = body.awayScore;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  updates.updatedAt = new Date();

  const [updated] = await db
    .update(matches)
    .set(updates)
    .where(
      and(
        eq(matches.id, parseInt(p.matchId)),
        eq(matches.tournamentId, ctx.tournament.id),
        isNull(matches.deletedAt)
      )
    )
    .returning();

  if (!updated) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  // ── Пересчёт таблицы при переоткрытии матча или смене счёта ─────────────────
  // Если матч был "finished" и теперь стал "live"/"scheduled" → убрать из таблицы
  // Если счёт изменён у "finished" матча → пересчитать
  const wasFinished = currentMatch.status === "finished";
  const isNowReopened = body.status && body.status !== "finished";
  const scoreChanged = body.homeScore !== undefined || body.awayScore !== undefined;

  if (currentMatch.groupId && (wasFinished && isNowReopened || scoreChanged)) {
    await recalcIfGroup(updated);
  }

  return NextResponse.json(updated);
}

// DELETE /api/.../matches/[matchId]
// Soft delete — никогда не удаляем физически
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  // Получаем матч до удаления, чтобы знать groupId
  const currentMatch = await db.query.matches.findFirst({
    where: and(
      eq(matches.id, parseInt(p.matchId)),
      eq(matches.tournamentId, ctx.tournament.id),
      isNull(matches.deletedAt)
    ),
  });
  if (!currentMatch) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const [updated] = await db
    .update(matches)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(matches.id, parseInt(p.matchId)),
        eq(matches.tournamentId, ctx.tournament.id),
        isNull(matches.deletedAt)
      )
    )
    .returning();

  if (!updated) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  // ── Пересчитать таблицу если удалили матч из группы ─────────────────────────
  if (currentMatch.groupId && currentMatch.status === "finished") {
    await recalcIfGroup(currentMatch);
  }

  return NextResponse.json({ ok: true });
}
