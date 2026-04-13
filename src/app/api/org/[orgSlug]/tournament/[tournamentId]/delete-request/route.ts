import { NextRequest, NextResponse } from "next/server";
import { requireGameAdmin } from "@/lib/game-auth";
import { db } from "@/db";
import { tournaments } from "@/db/schema";
import { eq } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string };

// POST — organizer requests tournament deletion
export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json().catch(() => ({}));
  const reason: string = (body.reason ?? "").trim().slice(0, 500);

  const [row] = await db
    .select({ id: tournaments.id, deleteRequestedAt: tournaments.deleteRequestedAt, deletedAt: tournaments.deletedAt })
    .from(tournaments)
    .where(eq(tournaments.id, ctx.tournament.id));

  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (row.deletedAt) return NextResponse.json({ error: "already_deleted" }, { status: 400 });
  if (row.deleteRequestedAt) return NextResponse.json({ error: "already_requested" }, { status: 400 });

  await db.update(tournaments)
    .set({ deleteRequestedAt: new Date(), deleteRequestReason: reason || null })
    .where(eq(tournaments.id, ctx.tournament.id));

  return NextResponse.json({ ok: true });
}

// DELETE — organizer cancels their own deletion request
export async function DELETE(req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (ctx instanceof NextResponse) return ctx;

  await db.update(tournaments)
    .set({ deleteRequestedAt: null, deleteRequestReason: null })
    .where(eq(tournaments.id, ctx.tournament.id));

  return NextResponse.json({ ok: true });
}
