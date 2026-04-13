import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentReferees } from "@/db/schema";
import { isError, requireGameAdmin } from "@/lib/game-auth";

type Params = { orgSlug: string; tournamentId: string; refereeId: string };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const resolved = await params;
  const ctx = await requireGameAdmin(req, resolved);
  if (isError(ctx)) return ctx;

  const [row] = await db
    .select()
    .from(tournamentReferees)
    .where(
      and(
        eq(tournamentReferees.id, Number(resolved.refereeId)),
        eq(tournamentReferees.tournamentId, ctx.tournament.id),
      ),
    );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ referee: row });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const resolved = await params;
  const ctx = await requireGameAdmin(req, resolved);
  if (isError(ctx)) return ctx;

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, string | null> = {};
  const allowed = ["firstName", "lastName", "phone", "email", "level", "colorTag", "notes"];
  for (const k of allowed) {
    if (k in body) updates[k] = body[k] ?? null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no updates" }, { status: 400 });
  }

  await db
    .update(tournamentReferees)
    .set({ ...updates, updatedAt: new Date() })
    .where(
      and(
        eq(tournamentReferees.id, Number(resolved.refereeId)),
        eq(tournamentReferees.tournamentId, ctx.tournament.id),
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

  // Soft delete — keep historical match_referees rows intact.
  await db
    .update(tournamentReferees)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(tournamentReferees.id, Number(resolved.refereeId)),
        eq(tournamentReferees.tournamentId, ctx.tournament.id),
      ),
    );

  return NextResponse.json({ ok: true });
}
