import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, and, isNull, asc } from "drizzle-orm";
import { matchEvents } from "@/db/schema";

type Params = { orgSlug: string; tournamentId: string; matchId: string };

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
// Обновить поля матча (поле, время, статус)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.fieldId !== undefined)    updates.fieldId    = body.fieldId ?? null;
  if (body.scheduledAt !== undefined) updates.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if (body.homeTeamId !== undefined) updates.homeTeamId = body.homeTeamId ?? null;
  if (body.awayTeamId !== undefined) updates.awayTeamId = body.awayTeamId ?? null;
  if (body.matchNumber !== undefined) updates.matchNumber = body.matchNumber;
  if (body.notes !== undefined)      updates.notes      = body.notes ?? null;
  if (body.isPublic !== undefined)   updates.isPublic   = body.isPublic;

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
  return NextResponse.json({ ok: true });
}
