import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matchEvents, matches } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, and, isNull, asc } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string; matchId: string };

// GET /api/.../matches/[matchId]/events
// Протокол матча — все события (голы, карточки, замены)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const mid = parseInt(p.matchId);

  // Проверяем что матч принадлежит турниру
  const match = await db.query.matches.findFirst({
    where: and(
      eq(matches.id, mid),
      eq(matches.tournamentId, ctx.tournament.id),
      isNull(matches.deletedAt)
    ),
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const events = await db.query.matchEvents.findMany({
    where: eq(matchEvents.matchId, mid),
    orderBy: [asc(matchEvents.minute), asc(matchEvents.minuteExtra)],
    with: {
      person: true,
      assistPerson: true,
      team: { with: { club: true } },
    },
  });

  return NextResponse.json(events);
}

// POST /api/.../matches/[matchId]/events
// Добавить событие в протокол матча
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const mid = parseInt(p.matchId);
  const body = await req.json();

  const { teamId, personId, eventType, minute, minuteExtra, assistPersonId, notes } = body;

  if (!teamId || !eventType || minute === undefined) {
    return NextResponse.json(
      { error: "teamId, eventType and minute are required" },
      { status: 400 }
    );
  }

  // Проверяем матч
  const match = await db.query.matches.findFirst({
    where: and(
      eq(matches.id, mid),
      eq(matches.tournamentId, ctx.tournament.id),
      isNull(matches.deletedAt)
    ),
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

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

  return NextResponse.json(event, { status: 201 });
}

// DELETE /api/.../matches/[matchId]/events?eventId=123
// Удалить событие из протокола
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(matchEvents)
    .where(
      and(
        eq(matchEvents.id, parseInt(eventId)),
        eq(matchEvents.matchId, parseInt(p.matchId)),
        eq(matchEvents.tournamentId, ctx.tournament.id)
      )
    )
    .returning();

  if (!deleted) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
