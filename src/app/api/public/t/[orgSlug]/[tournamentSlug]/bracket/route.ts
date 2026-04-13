import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, tournaments, tournamentStages, matchRounds, matches, tournamentRegistrations } from "@/db/schema";
import { eq, and, isNull, asc, desc, inArray, or } from "drizzle-orm";

// GET /api/public/t/[orgSlug]/[tournamentSlug]/bracket
// Публичная сетка плей-офф — все раунды + матчи
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentSlug: string }> }
) {
  const { orgSlug, tournamentSlug } = await params;
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");

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

  // Resolve team IDs for classId filter (via tournamentRegistrations — stages may not have classId set)
  let classTeamIds: number[] | null = null;
  if (classId) {
    const regsForClass = await db
      .select({ teamId: tournamentRegistrations.teamId })
      .from(tournamentRegistrations)
      .where(and(
        eq(tournamentRegistrations.tournamentId, tournament.id),
        eq(tournamentRegistrations.classId, parseInt(classId))
      ));
    if (regsForClass.length === 0) return NextResponse.json([]);
    classTeamIds = regsForClass.map(r => r.teamId);
  }

  // Knockout этапы
  const knockoutStages = await db.query.tournamentStages.findMany({
    where: and(
      eq(tournamentStages.tournamentId, tournament.id),
      eq(tournamentStages.type, "knockout"),
    ),
    orderBy: [asc(tournamentStages.order)],
  });

  // Для каждого knockout этапа — раунды + матчи
  const result = [];

  for (const stage of knockoutStages) {
    const rounds = await db.query.matchRounds.findMany({
      where: eq(matchRounds.stageId, stage.id),
      orderBy: [desc(matchRounds.order)], // R32 → R16 → QF → SF → F
    });

    const matchConditions = [
      eq(matches.stageId, stage.id),
      eq(matches.isPublic, true),
      isNull(matches.deletedAt),
      ...(classTeamIds ? [or(
        inArray(matches.homeTeamId, classTeamIds),
        inArray(matches.awayTeamId, classTeamIds),
      )!] : []),
    ];

    const stageMatches = await db.query.matches.findMany({
      where: and(...matchConditions),
      orderBy: [asc(matches.matchNumber)],
      with: {
        homeTeam: { with: { club: true } },
        awayTeam: { with: { club: true } },
        field: true,
      },
    });

    // Группируем матчи по раундам
    const matchesByRound: Record<number, typeof stageMatches> = {};
    for (const match of stageMatches) {
      if (!match.roundId) continue;
      if (!matchesByRound[match.roundId]) matchesByRound[match.roundId] = [];
      matchesByRound[match.roundId].push(match);
    }

    result.push({
      stage: {
        id: stage.id,
        name: stage.name,
        nameRu: stage.nameRu,
        nameEt: stage.nameEt,
        status: stage.status,
      },
      rounds: rounds.map((round) => ({
        id: round.id,
        name: round.name,
        nameRu: round.nameRu,
        nameEt: round.nameEt,
        shortName: round.shortName,
        order: round.order,
        matchCount: round.matchCount,
        isTwoLegged: round.isTwoLegged,
        hasThirdPlace: round.hasThirdPlace,
        matches: matchesByRound[round.id] ?? [],
      })),
    });
  }

  return NextResponse.json(result);
}
