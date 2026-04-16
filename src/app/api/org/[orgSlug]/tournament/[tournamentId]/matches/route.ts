import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, tournamentStages, tournamentRegistrations } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, and, isNull, asc, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Params = { orgSlug: string; tournamentId: string };

// GET /api/org/[orgSlug]/tournament/[tournamentId]/matches
// Все матчи турнира (с фильтрами: ?classId=, ?stageId=, ?groupId=, ?status=)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const classIdParam = searchParams.get("classId");
  const stageId = searchParams.get("stageId");
  const groupId = searchParams.get("groupId");
  const roundId = searchParams.get("roundId");
  const status = searchParams.get("status");

  const conditions = [
    eq(matches.tournamentId, ctx.tournament.id),
    isNull(matches.deletedAt),
  ];

  // Filter by classId: resolve to stageIds belonging to this class
  if (classIdParam) {
    const classStages = await db
      .select({ id: tournamentStages.id })
      .from(tournamentStages)
      .where(and(
        eq(tournamentStages.tournamentId, ctx.tournament.id),
        eq(tournamentStages.classId, parseInt(classIdParam))
      ));
    const stageIds = classStages.map(s => s.id);
    if (stageIds.length === 0) return NextResponse.json([]);
    conditions.push(inArray(matches.stageId, stageIds));
  }

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
      field: { with: { stadium: { columns: { id: true, name: true } } } },
      stage: true,
      group: true,
      round: true,
      events: {
        with: {
          person: { columns: { id: true, firstName: true, lastName: true } },
          assistPerson: { columns: { id: true, firstName: true, lastName: true } },
          team: { columns: { id: true, name: true } },
        },
        orderBy: (e, { asc }) => [asc(e.minute)],
      },
    },
  });

  // Resolve displayName from tournamentRegistrations (priority: reg.displayName → team.name → club.name)
  // Needed because teams.name is optional — club-registered teams get their display name from registrations.
  const teamIds = new Set<number>();
  for (const m of result) {
    if (m.homeTeamId) teamIds.add(m.homeTeamId);
    if (m.awayTeamId) teamIds.add(m.awayTeamId);
  }
  const displayMap = new Map<number, string | null>();
  if (teamIds.size > 0) {
    const regs = await db
      .select({ teamId: tournamentRegistrations.teamId, displayName: tournamentRegistrations.displayName })
      .from(tournamentRegistrations)
      .where(and(
        eq(tournamentRegistrations.tournamentId, ctx.tournament.id),
        inArray(tournamentRegistrations.teamId, [...teamIds])
      ));
    for (const r of regs) displayMap.set(r.teamId, r.displayName);
  }

  const enriched = result.map(m => ({
    ...m,
    homeTeam: m.homeTeam ? {
      ...m.homeTeam,
      name: (m.homeTeamId ? displayMap.get(m.homeTeamId) : undefined)
        ?? m.homeTeam.name
        ?? m.homeTeam.club?.name
        ?? null,
    } : m.homeTeam,
    awayTeam: m.awayTeam ? {
      ...m.awayTeam,
      name: (m.awayTeamId ? displayMap.get(m.awayTeamId) : undefined)
        ?? m.awayTeam.name
        ?? m.awayTeam.club?.name
        ?? null,
    } : m.awayTeam,
  }));

  return NextResponse.json(enriched);
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
