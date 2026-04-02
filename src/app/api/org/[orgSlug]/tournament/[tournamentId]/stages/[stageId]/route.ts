import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentStages } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, and } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string; stageId: string };

// GET /api/org/[orgSlug]/tournament/[tournamentId]/stages/[stageId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const stage = await db.query.tournamentStages.findFirst({
    where: and(
      eq(tournamentStages.id, parseInt(p.stageId)),
      eq(tournamentStages.tournamentId, ctx.tournament.id)
    ),
    with: {
      groups: {
        with: {
          groupTeams: { with: { team: true } },
        },
      },
      rounds: true,
    },
  });

  if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  return NextResponse.json(stage);
}

// PATCH /api/org/[orgSlug]/tournament/[tournamentId]/stages/[stageId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.nameRu !== undefined) updates.nameRu = body.nameRu;
  if (body.nameEt !== undefined) updates.nameEt = body.nameEt;
  if (body.status !== undefined) updates.status = body.status;
  if (body.order !== undefined) updates.order = body.order;
  if (body.settings !== undefined) updates.settings = body.settings;
  if (body.tiebreakers !== undefined) updates.tiebreakers = body.tiebreakers;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  updates.updatedAt = new Date();

  const [updated] = await db
    .update(tournamentStages)
    .set(updates)
    .where(
      and(
        eq(tournamentStages.id, parseInt(p.stageId)),
        eq(tournamentStages.tournamentId, ctx.tournament.id)
      )
    )
    .returning();

  if (!updated) return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  return NextResponse.json(updated);
}

// DELETE /api/org/[orgSlug]/tournament/[tournamentId]/stages/[stageId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const [deleted] = await db
    .delete(tournamentStages)
    .where(
      and(
        eq(tournamentStages.id, parseInt(p.stageId)),
        eq(tournamentStages.tournamentId, ctx.tournament.id)
      )
    )
    .returning();

  if (!deleted) return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
