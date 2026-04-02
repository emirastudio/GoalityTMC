import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, tournaments, matches } from "@/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";

// GET /api/public/t/[orgSlug]/[tournamentSlug]/matches
// Публичное расписание матчей — без авторизации
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentSlug: string }> }
) {
  const { orgSlug, tournamentSlug } = await params;
  const { searchParams } = new URL(req.url);
  const stageId = searchParams.get("stageId");
  const groupId = searchParams.get("groupId");
  const status = searchParams.get("status");

  // Разрешаем org + tournament
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tournament = await db.query.tournaments.findFirst({
    where: and(
      eq(tournaments.organizationId, org.id),
      eq(tournaments.slug, tournamentSlug)
    ),
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const conditions = [
    eq(matches.tournamentId, tournament.id),
    eq(matches.isPublic, true),
    isNull(matches.deletedAt),
  ];

  if (stageId) conditions.push(eq(matches.stageId, parseInt(stageId)));
  if (groupId) conditions.push(eq(matches.groupId, parseInt(groupId)));
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
