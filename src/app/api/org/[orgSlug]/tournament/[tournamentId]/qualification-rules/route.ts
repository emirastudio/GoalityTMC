import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { qualificationRules, tournamentStages } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, and, inArray } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string };

// GET /api/org/[orgSlug]/tournament/[tournamentId]/qualification-rules
export async function GET(req: NextRequest, { params }: { params: Promise<Params> }) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  // Get all stage IDs for this tournament
  const stages = await db.query.tournamentStages.findMany({
    where: eq(tournamentStages.tournamentId, ctx.tournament.id),
    columns: { id: true },
  });
  const stageIds = stages.map((s) => s.id);

  if (stageIds.length === 0) return NextResponse.json([]);

  const rules = await db.query.qualificationRules.findMany({
    where: inArray(qualificationRules.fromStageId, stageIds),
  });

  return NextResponse.json(rules);
}

// POST /api/org/[orgSlug]/tournament/[tournamentId]/qualification-rules
// Body: { fromStageId, targetStageId, fromRank, toRank, targetSlot, condition }
export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = await req.json();
  const { fromStageId, targetStageId, fromRank, toRank, targetSlot, condition } = body;

  if (!fromStageId || !targetStageId || !fromRank) {
    return NextResponse.json({ error: "fromStageId, targetStageId, fromRank are required" }, { status: 400 });
  }

  // Verify stages belong to this tournament
  const stagesCheck = await db.query.tournamentStages.findMany({
    where: and(
      eq(tournamentStages.tournamentId, ctx.tournament.id),
      inArray(tournamentStages.id, [fromStageId, targetStageId]),
    ),
    columns: { id: true },
  });
  if (stagesCheck.length < 2) {
    return NextResponse.json({ error: "Stages do not belong to this tournament" }, { status: 403 });
  }

  const [rule] = await db
    .insert(qualificationRules)
    .values({
      fromStageId,
      targetStageId,
      fromRank,
      toRank: toRank ?? fromRank,
      targetSlot: targetSlot ?? null,
      condition: condition ?? {},
    })
    .returning();

  return NextResponse.json(rule, { status: 201 });
}

// DELETE - removes rules for a fromStageId → targetStageId pair
export async function DELETE(req: NextRequest, { params }: { params: Promise<Params> }) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const fromStageId = searchParams.get("fromStageId");
  const targetStageId = searchParams.get("targetStageId");

  if (!fromStageId) {
    return NextResponse.json({ error: "fromStageId required" }, { status: 400 });
  }

  // Verify it belongs to this tournament
  const fromStage = await db.query.tournamentStages.findFirst({
    where: and(
      eq(tournamentStages.id, parseInt(fromStageId)),
      eq(tournamentStages.tournamentId, ctx.tournament.id),
    ),
    columns: { id: true },
  });
  if (!fromStage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  const conditions = [eq(qualificationRules.fromStageId, parseInt(fromStageId))];
  if (targetStageId) {
    conditions.push(eq(qualificationRules.targetStageId, parseInt(targetStageId)));
  }

  await db.delete(qualificationRules).where(and(...conditions));

  return NextResponse.json({ ok: true });
}
