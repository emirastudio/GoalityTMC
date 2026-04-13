import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stageGroups, tournamentStages } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, and } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string; stageId: string; groupId: string };

// PATCH /api/org/.../stages/[stageId]/groups/[groupId]
// Обновить имя группы
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const stageId  = parseInt(p.stageId);
  const groupId  = parseInt(p.groupId);

  // Verify stage belongs to this tournament
  const stage = await db.query.tournamentStages.findFirst({
    where: and(
      eq(tournamentStages.id, stageId),
      eq(tournamentStages.tournamentId, ctx.tournament.id)
    ),
  });
  if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  const body = await req.json();
  const { name } = body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const [updated] = await db
    .update(stageGroups)
    .set({ name: name.trim() })
    .where(and(
      eq(stageGroups.id, groupId),
      eq(stageGroups.stageId, stageId),
      eq(stageGroups.tournamentId, ctx.tournament.id)
    ))
    .returning();

  if (!updated) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  return NextResponse.json(updated);
}
