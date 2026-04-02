import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, clubs } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, asc } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string };

// GET /api/org/[orgSlug]/tournament/[tournamentId]/teams
// Список команд турнира для игровой логики (Draw, Fixtures)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const result = await db
    .select({
      id: teams.id,
      name: teams.name,
      regNumber: teams.regNumber,
      status: teams.status,
      clubId: clubs.id,
      clubName: clubs.name,
      clubBadgeUrl: clubs.badgeUrl,
    })
    .from(teams)
    .leftJoin(clubs, eq(teams.clubId, clubs.id))
    .where(eq(teams.tournamentId, ctx.tournament.id))
    .orderBy(asc(teams.name));

  return NextResponse.json(result);
}
