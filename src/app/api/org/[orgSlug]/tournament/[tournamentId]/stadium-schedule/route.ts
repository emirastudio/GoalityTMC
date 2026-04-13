import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentStadiumSchedule, tournamentStadiums } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, and, asc } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string };

// GET /api/org/.../stadium-schedule — get per-stadium schedule
export async function GET(req: NextRequest, { params }: { params: Promise<Params> }) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const schedules = await db
    .select()
    .from(tournamentStadiumSchedule)
    .where(eq(tournamentStadiumSchedule.tournamentId, ctx.tournament.id))
    .orderBy(asc(tournamentStadiumSchedule.stadiumId), asc(tournamentStadiumSchedule.date));

  return NextResponse.json({ schedules });
}

// PUT /api/org/.../stadium-schedule — upsert per-stadium schedule
// Body: { schedules: [{ stadiumId, date, startTime, endTime }] }
// startTime/endTime null = stadium closed that day
export async function PUT(req: NextRequest, { params }: { params: Promise<Params> }) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = await req.json() as {
    schedules: Array<{
      stadiumId: number;
      date: string;
      startTime: string | null;
      endTime: string | null;
    }>;
  };

  if (!Array.isArray(body.schedules)) {
    return NextResponse.json({ error: "schedules must be an array" }, { status: 400 });
  }

  // Verify all stadiumIds belong to this tournament
  const stadiums = await db
    .select({ id: tournamentStadiums.id })
    .from(tournamentStadiums)
    .where(eq(tournamentStadiums.tournamentId, ctx.tournament.id));
  const validStadiumIds = new Set(stadiums.map(s => s.id));

  const saved: typeof body.schedules = [];

  for (const entry of body.schedules) {
    if (!validStadiumIds.has(entry.stadiumId)) continue;
    if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) continue;

    await db
      .insert(tournamentStadiumSchedule)
      .values({
        tournamentId: ctx.tournament.id,
        stadiumId: entry.stadiumId,
        date: entry.date,
        startTime: entry.startTime ?? null,
        endTime: entry.endTime ?? null,
      })
      .onConflictDoUpdate({
        target: [
          tournamentStadiumSchedule.tournamentId,
          tournamentStadiumSchedule.stadiumId,
          tournamentStadiumSchedule.date,
        ],
        set: {
          startTime: entry.startTime ?? null,
          endTime: entry.endTime ?? null,
        },
      });

    saved.push(entry);
  }

  return NextResponse.json({ saved: saved.length });
}

// DELETE /api/org/.../stadium-schedule — remove schedule entries
// Body: { stadiumId?, date? } — if omitted deletes all for tournament
export async function DELETE(req: NextRequest, { params }: { params: Promise<Params> }) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  await db
    .delete(tournamentStadiumSchedule)
    .where(eq(tournamentStadiumSchedule.tournamentId, ctx.tournament.id));

  return NextResponse.json({ ok: true });
}
