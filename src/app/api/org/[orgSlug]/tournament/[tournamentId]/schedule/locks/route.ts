import { and, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { isError, requireGameAdmin } from "@/lib/game-auth";

type Params = { orgSlug: string; tournamentId: string };

/**
 * POST /api/org/[orgSlug]/tournament/[tournamentId]/schedule/locks
 * Body: { matchIds: number[], reason?: string }
 *
 * Pins matches so the solver never moves them. Match must already have
 * scheduledAt and fieldId (nothing to pin otherwise).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = await req.json().catch(() => ({}));
  const matchIds: number[] = Array.isArray(body.matchIds) ? body.matchIds : [];
  const reason: string | undefined = typeof body.reason === "string" ? body.reason : undefined;

  if (matchIds.length === 0) {
    return NextResponse.json({ error: "matchIds required" }, { status: 400 });
  }

  // Verify all match IDs belong to this tournament
  const found = await db
    .select({ id: matches.id, scheduledAt: matches.scheduledAt, fieldId: matches.fieldId })
    .from(matches)
    .where(and(eq(matches.tournamentId, ctx.tournament.id), inArray(matches.id, matchIds)));

  const incomplete = found.filter((m) => !m.scheduledAt || !m.fieldId);
  if (incomplete.length > 0) {
    return NextResponse.json(
      {
        error: "Cannot lock matches that are not scheduled",
        incompleteMatchIds: incomplete.map((m) => m.id),
      },
      { status: 409 },
    );
  }

  await db
    .update(matches)
    .set({
      lockedAt: new Date(),
      lockReason: reason ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(matches.tournamentId, ctx.tournament.id), inArray(matches.id, matchIds)));

  return NextResponse.json({ ok: true, locked: matchIds.length });
}

/**
 * DELETE — unlock matches. Body: { matchIds: number[] }
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = await req.json().catch(() => ({}));
  const matchIds: number[] = Array.isArray(body.matchIds) ? body.matchIds : [];
  if (matchIds.length === 0) {
    return NextResponse.json({ error: "matchIds required" }, { status: 400 });
  }

  await db
    .update(matches)
    .set({
      lockedAt: null,
      lockedByUserId: null,
      lockReason: null,
      updatedAt: new Date(),
    })
    .where(and(eq(matches.tournamentId, ctx.tournament.id), inArray(matches.id, matchIds)));

  return NextResponse.json({ ok: true, unlocked: matchIds.length });
}
