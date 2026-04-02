import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, and, isNull, asc } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string };

// GET /api/org/[orgSlug]/tournament/[tournamentId]/matches
// Все матчи турнира (с фильтрами: ?stageId=, ?groupId=, ?status=)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const stageId = searchParams.get("stageId");
  const groupId = searchParams.get("groupId");
  const roundId = searchParams.get("roundId");
  const status = searchParams.get("status");

  const conditions = [
    eq(matches.tournamentId, ctx.tournament.id),
    isNull(matches.deletedAt),
  ];

  if (stageId) conditions.push(eq(matches.stageId, parseInt(stageId)));
  if (groupId) conditions.push(eq(matches.groupId, parseInt(groupId)));
  if (roundId) conditions.push(eq(matches.roundId, parseInt(roundId)));
  if (status) conditions.push(eq(matches.status, status as "scheduled" | "live" | "finished" | "postponed" | "cancelled" | "walkover"));

  const result = await db.query.matches.findMany({
    where: and(...conditions),
    orderBy: [asc(matches.scheduledAt), asc(matches.matchNumber)],
    with: {
      homeTeam: { with: { club: true } },
      awayTeam: { with: { club: true } },
      field: true,
      stage: true,
      group: true,
      round: true,
    },
  });

  return NextResponse.json(result);
}

// POST /api/org/[orgSlug]/tournament/[tournamentId]/matches
// Создать матч вручную
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = await req.json();
  const {
    stageId, groupId, roundId, matchNumber,
    homeTeamId, awayTeamId,
    fieldId, scheduledAt,
  } = body;

  if (!stageId) {
    return NextResponse.json({ error: "stageId required" }, { status: 400 });
  }

  const [match] = await db
    .insert(matches)
    .values({
      tournamentId: ctx.tournament.id,
      organizationId: ctx.organizationId,
      stageId,
      groupId: groupId ?? null,
      roundId: roundId ?? null,
      matchNumber: matchNumber ?? null,
      homeTeamId: homeTeamId ?? null,
      awayTeamId: awayTeamId ?? null,
      fieldId: fieldId ?? null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: "scheduled",
    })
    .returning();

  return NextResponse.json(match, { status: 201 });
}
