import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamBlackouts } from "@/db/schema";
import { isError, requireGameAdmin } from "@/lib/game-auth";

type Params = { orgSlug: string; tournamentId: string; blackoutId: string };

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const resolved = await params;
  const ctx = await requireGameAdmin(req, resolved);
  if (isError(ctx)) return ctx;

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, string | null> = {};
  const allowed = ["date", "startTime", "endTime", "reason"];
  for (const k of allowed) {
    if (k in body) updates[k] = body[k] ?? null;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no updates" }, { status: 400 });
  }

  await db
    .update(teamBlackouts)
    .set(updates)
    .where(
      and(
        eq(teamBlackouts.id, Number(resolved.blackoutId)),
        eq(teamBlackouts.tournamentId, ctx.tournament.id),
      ),
    );
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const resolved = await params;
  const ctx = await requireGameAdmin(req, resolved);
  if (isError(ctx)) return ctx;

  await db
    .delete(teamBlackouts)
    .where(
      and(
        eq(teamBlackouts.id, Number(resolved.blackoutId)),
        eq(teamBlackouts.tournamentId, ctx.tournament.id),
      ),
    );
  return NextResponse.json({ ok: true });
}
