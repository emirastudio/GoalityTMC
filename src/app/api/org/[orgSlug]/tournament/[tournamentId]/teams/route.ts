import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, clubs, tournamentRegistrations } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, and, asc, inArray } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string };

// GET /api/org/[orgSlug]/tournament/[tournamentId]/teams?classId=
// Список команд турнира для игровой логики (Draw, Fixtures)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const classIdParam = req.nextUrl.searchParams.get("classId");
  const classId = classIdParam ? parseInt(classIdParam) : null;

  // Находим регистрации для этого турнира, опционально фильтруя по дивизиону
  const whereClause = classId
    ? and(
        eq(tournamentRegistrations.tournamentId, ctx.tournament.id),
        eq(tournamentRegistrations.classId, classId)
      )
    : eq(tournamentRegistrations.tournamentId, ctx.tournament.id);

  const regs = await db.query.tournamentRegistrations.findMany({
    where: whereClause,
    with: { team: true },
    orderBy: [asc(tournamentRegistrations.regNumber)],
  });

  if (regs.length === 0) return NextResponse.json([]);

  // Обогащаем данными клуба
  const teamIds = regs.map((r) => r.teamId);
  const clubData = await db
    .select({ teamId: teams.id, clubId: clubs.id, clubName: clubs.name, clubBadgeUrl: clubs.badgeUrl })
    .from(teams)
    .leftJoin(clubs, eq(teams.clubId, clubs.id))
    .where(inArray(teams.id, teamIds));

  const clubMap = new Map(clubData.map((c) => [c.teamId, c]));

  const result = regs.map((reg) => {
    const club = clubMap.get(reg.teamId);
    // Priority: displayName (reg) → team.name → birthYear-derived
    const displayName = reg.displayName
      ?? reg.team?.name
      ?? (reg.team?.birthYear ? String(reg.team.birthYear) : null);
    return {
      id: reg.teamId,
      registrationId: reg.id,
      name: displayName,
      regNumber: reg.regNumber,
      status: reg.status,
      clubId: club?.clubId ?? null,
      clubName: club?.clubName ?? null,
      clubBadgeUrl: club?.clubBadgeUrl ?? null,
    };
  });

  return NextResponse.json(result);
}
