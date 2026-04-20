import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  tournamentReferees,
  matchReferees,
  matches,
  tournaments,
  organizations,
  tournamentRegistrations,
  tournamentFields,
} from "@/db/schema";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Params = { token: string };

/**
 * GET /api/referee/[token]
 * Public — no auth required.
 * Returns referee info + their assigned matches for the tournament.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { token } = await params;

  // Look up referee by access token
  const referee = await db.query.tournamentReferees.findFirst({
    where: and(
      eq(tournamentReferees.accessToken, token),
      isNull(tournamentReferees.deletedAt),
    ),
  });

  if (!referee) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Load tournament
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, referee.tournamentId),
  });
  if (!tournament) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Load organization
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, referee.organizationId),
  });
  if (!org) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Load all match assignments for this referee
  const assignments = await db
    .select()
    .from(matchReferees)
    .where(eq(matchReferees.refereeId, referee.id));

  const matchIds = assignments.map((a) => a.matchId);

  if (matchIds.length === 0) {
    return NextResponse.json({
      referee: {
        id: referee.id,
        firstName: referee.firstName,
        lastName: referee.lastName,
        colorTag: referee.colorTag,
      },
      tournament: {
        id: tournament.id,
        name: tournament.name,
        slug: tournament.slug,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        logoUrl: tournament.logoUrl,
      },
      org: {
        name: org.name,
        slug: org.slug,
        brandColor: org.brandColor,
      },
      matches: [],
    });
  }

  // Load all assigned matches with team and field info
  const matchRows = await db.query.matches.findMany({
    where: and(
      inArray(matches.id, matchIds),
      isNull(matches.deletedAt),
    ),
    orderBy: [asc(matches.scheduledAt), asc(matches.matchNumber)],
    with: {
      homeTeam: { with: { club: true } },
      awayTeam: { with: { club: true } },
      field: true,
    },
  });

  // Resolve displayName from tournamentRegistrations
  const teamIds = new Set<number>();
  for (const m of matchRows) {
    if (m.homeTeamId) teamIds.add(m.homeTeamId);
    if (m.awayTeamId) teamIds.add(m.awayTeamId);
  }
  const displayMap = new Map<number, string | null>();
  if (teamIds.size > 0) {
    const regs = await db
      .select({
        teamId: tournamentRegistrations.teamId,
        displayName: tournamentRegistrations.displayName,
      })
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, tournament.id),
          inArray(tournamentRegistrations.teamId, [...teamIds]),
        ),
      );
    for (const r of regs) displayMap.set(r.teamId, r.displayName);
  }

  // Build assignment role map
  const roleMap = new Map<number, string>();
  for (const a of assignments) {
    roleMap.set(a.matchId, a.role);
  }

  const enrichedMatches = matchRows.map((m) => {
    const homeName =
      (m.homeTeamId ? displayMap.get(m.homeTeamId) : undefined) ??
      m.homeTeam?.name ??
      m.homeTeam?.club?.name ??
      null;
    const awayName =
      (m.awayTeamId ? displayMap.get(m.awayTeamId) : undefined) ??
      m.awayTeam?.name ??
      m.awayTeam?.club?.name ??
      null;

    return {
      id: m.id,
      scheduledTime: m.scheduledAt,
      venue: m.field?.name ?? null,
      homeTeam: homeName,
      awayTeam: awayName,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
      role: roleMap.get(m.id) ?? "main",
      classId: m.stageId,
    };
  });

  return NextResponse.json({
    referee: {
      id: referee.id,
      firstName: referee.firstName,
      lastName: referee.lastName,
      colorTag: referee.colorTag,
    },
    tournament: {
      id: tournament.id,
      name: tournament.name,
      slug: tournament.slug,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      logoUrl: tournament.logoUrl,
    },
    org: {
      name: org.name,
      slug: org.slug,
      brandColor: org.brandColor,
    },
    matches: enrichedMatches,
  });
}
