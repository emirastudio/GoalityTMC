import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matchEvents, matches, tournamentStages } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { recalculateGroupStandings } from "@/lib/standings-calculator";
import { eq, and, isNull, asc } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string; matchId: string };

// Получить матч с проверкой принадлежности турниру
async function getMatch(mid: number, tournamentId: number) {
  return db.query.matches.findFirst({
    where: and(
      eq(matches.id, mid),
      eq(matches.tournamentId, tournamentId),
      isNull(matches.deletedAt)
    ),
  });
}

// Пересчитать standings если матч групповой
async function recalcIfGroup(match: Awaited<ReturnType<typeof getMatch>>) {
  if (!match?.groupId || match.status !== "finished") return;
  const stage = match.stageId
    ? await db.query.tournamentStages.findFirst({ where: eq(tournamentStages.id, match.stageId) })
    : null;
  const s = (stage?.settings ?? {}) as Record<string, number>;
  await recalculateGroupStandings(
    match.groupId,
    s.pointsWin ?? 3,
    s.pointsDraw ?? 1,
    s.pointsLoss ?? 0
  );
}

// GET /api/.../matches/[matchId]/events
export async function GET(req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const mid = parseInt(p.matchId);
  const match = await getMatch(mid, ctx.tournament.id);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const events = await db.query.matchEvents.findMany({
    where: eq(matchEvents.matchId, mid),
    orderBy: [asc(matchEvents.minute), asc(matchEvents.minuteExtra)],
    with: { person: true, assistPerson: true, team: { with: { club: true } } },
  });

  return NextResponse.json(events);
}

// POST /api/.../matches/[matchId]/events
export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const mid = parseInt(p.matchId);
  const body = await req.json();
  const { teamId, personId, eventType, minute, minuteExtra, assistPersonId, notes } = body;

  if (!teamId || !eventType || minute === undefined) {
    return NextResponse.json({ error: "teamId, eventType and minute are required" }, { status: 400 });
  }

  const match = await getMatch(mid, ctx.tournament.id);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  // ✅ Валидация: команда должна быть участником матча
  if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
    return NextResponse.json(
      { error: "teamId does not belong to this match" },
      { status: 400 }
    );
  }

  const [event] = await db
    .insert(matchEvents)
    .values({
      matchId: mid,
      tournamentId: ctx.tournament.id,
      teamId,
      personId: personId ?? null,
      eventType,
      minute,
      minuteExtra: minuteExtra ?? null,
      assistPersonId: assistPersonId ?? null,
      notes: notes ?? null,
    })
    .returning();

  // ✅ Пересчёт таблицы если завершённый групповой матч
  await recalcIfGroup(match);

  return NextResponse.json(event, { status: 201 });
}

// DELETE /api/.../matches/[matchId]/events?eventId=123
export async function DELETE(req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const mid = parseInt(p.matchId);
  const match = await getMatch(mid, ctx.tournament.id);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const [deleted] = await db
    .delete(matchEvents)
    .where(
      and(
        eq(matchEvents.id, parseInt(eventId)),
        eq(matchEvents.matchId, mid),
        eq(matchEvents.tournamentId, ctx.tournament.id)
      )
    )
    .returning();

  if (!deleted) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // ✅ Пересчёт таблицы после удаления события
  await recalcIfGroup(match);

  return NextResponse.json({ ok: true });
}
