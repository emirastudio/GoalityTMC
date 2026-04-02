import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matchRounds, tournamentStages, stageSlots } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, and, asc } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string; stageId: string };

// GET /api/.../stages/[stageId]/rounds
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const rounds = await db.query.matchRounds.findMany({
    where: eq(matchRounds.stageId, parseInt(p.stageId)),
    orderBy: [asc(matchRounds.order)],
  });

  return NextResponse.json(rounds);
}

// POST /api/.../stages/[stageId]/rounds
// Создать раунды плей-офф (bulk — сразу финал, полуфинал и т.д.)
// body: { rounds: [{ name, nameRu, nameEt, shortName, order, matchCount, isTwoLegged, hasThirdPlace }] }
// или shortcut: { template: "4team" | "8team" | "16team" }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const body = await req.json();
  const stageId = parseInt(p.stageId);

  // Проверяем этап
  const stage = await db.query.tournamentStages.findFirst({
    where: and(
      eq(tournamentStages.id, stageId),
      eq(tournamentStages.tournamentId, ctx.tournament.id)
    ),
  });
  if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  let roundsData: {
    name: string; nameRu?: string; nameEt?: string;
    shortName: string; order: number; matchCount: number;
    isTwoLegged: boolean; hasThirdPlace: boolean;
  }[] = [];

  // Шаблоны плей-офф
  if (body.template) {
    const templates: Record<string, typeof roundsData> = {
      "2team": [
        { name: "Final", nameRu: "Финал", nameEt: "Finaal", shortName: "F", order: 1, matchCount: 1, isTwoLegged: false, hasThirdPlace: false },
      ],
      "4team": [
        { name: "Final", nameRu: "Финал", nameEt: "Finaal", shortName: "F", order: 1, matchCount: 1, isTwoLegged: false, hasThirdPlace: true },
        { name: "Semi-final", nameRu: "Полуфинал", nameEt: "Poolfinaal", shortName: "SF", order: 2, matchCount: 2, isTwoLegged: false, hasThirdPlace: false },
      ],
      "8team": [
        { name: "Final", nameRu: "Финал", nameEt: "Finaal", shortName: "F", order: 1, matchCount: 1, isTwoLegged: false, hasThirdPlace: true },
        { name: "Semi-final", nameRu: "Полуфинал", nameEt: "Poolfinaal", shortName: "SF", order: 2, matchCount: 2, isTwoLegged: false, hasThirdPlace: false },
        { name: "Quarter-final", nameRu: "Четвертьфинал", nameEt: "Veerandfinaal", shortName: "QF", order: 3, matchCount: 4, isTwoLegged: false, hasThirdPlace: false },
      ],
      "16team": [
        { name: "Final", nameRu: "Финал", nameEt: "Finaal", shortName: "F", order: 1, matchCount: 1, isTwoLegged: false, hasThirdPlace: true },
        { name: "Semi-final", nameRu: "Полуфинал", nameEt: "Poolfinaal", shortName: "SF", order: 2, matchCount: 2, isTwoLegged: false, hasThirdPlace: false },
        { name: "Quarter-final", nameRu: "Четвертьфинал", nameEt: "Veerandfinaal", shortName: "QF", order: 3, matchCount: 4, isTwoLegged: false, hasThirdPlace: false },
        { name: "Round of 16", nameRu: "1/8 финала", nameEt: "1/8 finaal", shortName: "R16", order: 4, matchCount: 8, isTwoLegged: false, hasThirdPlace: false },
      ],
      "32team": [
        { name: "Final", nameRu: "Финал", nameEt: "Finaal", shortName: "F", order: 1, matchCount: 1, isTwoLegged: false, hasThirdPlace: true },
        { name: "Semi-final", nameRu: "Полуфинал", nameEt: "Poolfinaal", shortName: "SF", order: 2, matchCount: 2, isTwoLegged: false, hasThirdPlace: false },
        { name: "Quarter-final", nameRu: "Четвертьфинал", nameEt: "Veerandfinaal", shortName: "QF", order: 3, matchCount: 4, isTwoLegged: false, hasThirdPlace: false },
        { name: "Round of 16", nameRu: "1/8 финала", nameEt: "1/8 finaal", shortName: "R16", order: 4, matchCount: 8, isTwoLegged: false, hasThirdPlace: false },
        { name: "Round of 32", nameRu: "1/16 финала", nameEt: "1/16 finaal", shortName: "R32", order: 5, matchCount: 16, isTwoLegged: false, hasThirdPlace: false },
      ],
    };

    roundsData = templates[body.template] ?? [];
    if (roundsData.length === 0) {
      return NextResponse.json({ error: "Unknown template" }, { status: 400 });
    }
  } else if (body.rounds) {
    roundsData = body.rounds;
  } else {
    return NextResponse.json({ error: "Provide template or rounds" }, { status: 400 });
  }

  // Удаляем старые раунды этапа
  await db.delete(matchRounds).where(eq(matchRounds.stageId, stageId));

  // Создаём раунды
  const created = await db
    .insert(matchRounds)
    .values(roundsData.map((r) => ({ ...r, stageId })))
    .returning();

  // Создаём слоты для каждого матча каждого раунда
  const slotsToInsert: {
    stageId: number;
    roundId: number;
    slotPosition: string;
    order: number;
  }[] = [];

  for (const round of created) {
    for (let i = 0; i < round.matchCount; i++) {
      slotsToInsert.push({
        stageId,
        roundId: round.id,
        slotPosition: "home",
        order: i,
      });
      slotsToInsert.push({
        stageId,
        roundId: round.id,
        slotPosition: "away",
        order: i,
      });
    }
    // Матч за 3-е место
    if (round.hasThirdPlace) {
      slotsToInsert.push({ stageId, roundId: round.id, slotPosition: "home", order: round.matchCount });
      slotsToInsert.push({ stageId, roundId: round.id, slotPosition: "away", order: round.matchCount });
    }
  }

  if (slotsToInsert.length > 0) {
    await db.delete(stageSlots).where(eq(stageSlots.stageId, stageId));
    await db.insert(stageSlots).values(slotsToInsert);
  }

  return NextResponse.json(created, { status: 201 });
}
