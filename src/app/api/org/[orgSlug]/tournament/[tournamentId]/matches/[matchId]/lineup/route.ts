import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matchLineup, matches, people, teams } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq, and, isNull, inArray } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string; matchId: string };

// GET /api/.../matches/[matchId]/lineup
// Returns: { lineup: LineupEntry[], homePlayers: Person[], awayPlayers: Person[] }
// ?includeSquad=true — also return full team roster for player picker
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const mid = parseInt(p.matchId);
  const includeSquad = req.nextUrl.searchParams.get("includeSquad") === "true";

  const match = await db.query.matches.findFirst({
    where: and(eq(matches.id, mid), eq(matches.tournamentId, ctx.tournament.id), isNull(matches.deletedAt)),
    with: { homeTeam: true, awayTeam: true },
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  // Current lineup
  const lineup = await db.query.matchLineup.findMany({
    where: eq(matchLineup.matchId, mid),
    with: { person: true, team: { with: { club: true } } },
    orderBy: (l, { asc, desc }) => [desc(l.isStarting), asc(l.shirtNumber)],
  });

  const result: Record<string, unknown> = { lineup };

  // Optionally return full squad for player picker
  if (includeSquad) {
    const teamIds = [match.homeTeamId, match.awayTeamId].filter(Boolean) as number[];
    const squad = teamIds.length > 0
      ? await db.query.people.findMany({
          where: and(
            inArray(people.teamId, teamIds),
            eq(people.personType, "player"),
          ),
          orderBy: (p, { asc }) => [asc(p.shirtNumber), asc(p.lastName)],
        })
      : [];

    result.homePlayers = squad.filter(pl => pl.teamId === match.homeTeamId);
    result.awayPlayers = squad.filter(pl => pl.teamId === match.awayTeamId);
  }

  return NextResponse.json(result);
}

// POST /api/.../matches/[matchId]/lineup
// Add one player OR import full squad
// Body: { personId, teamId, isStarting } | { importSquad: true, teamId }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const mid = parseInt(p.matchId);
  const body = await req.json();

  const match = await db.query.matches.findFirst({
    where: and(eq(matches.id, mid), eq(matches.tournamentId, ctx.tournament.id), isNull(matches.deletedAt)),
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  // ── Import full squad ──────────────────────────────────────
  if (body.importSquad && body.teamId) {
    const squad = await db.query.people.findMany({
      where: and(eq(people.teamId, body.teamId), eq(people.personType, "player")),
      orderBy: (p, { asc }) => [asc(p.shirtNumber)],
    });

    if (squad.length === 0) {
      return NextResponse.json({ error: "No players found for this team" }, { status: 400 });
    }

    // Remove existing lineup for this team+match first
    await db.delete(matchLineup).where(
      and(eq(matchLineup.matchId, mid), eq(matchLineup.teamId, body.teamId))
    );

    const entries = squad.map((player, idx) => ({
      matchId: mid,
      teamId: body.teamId,
      personId: player.id,
      isStarting: body.isStarting !== undefined ? body.isStarting : true,
      shirtNumber: player.shirtNumber ?? null,
      position: player.position ?? null,
    }));

    await db.insert(matchLineup).values(entries);
    return NextResponse.json({ imported: entries.length });
  }

  // ── Add single player ──────────────────────────────────────
  const { personId, teamId, isStarting = true, shirtNumber, position } = body;
  if (!personId || !teamId) {
    return NextResponse.json({ error: "personId and teamId required" }, { status: 400 });
  }

  // ✅ Проверяем: команда должна быть в матче
  if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
    return NextResponse.json({ error: "teamId does not belong to this match" }, { status: 400 });
  }

  // ✅ Проверяем: игрок должен принадлежать этой команде
  const person = await db.query.people.findFirst({ where: eq(people.id, personId) });
  if (!person || person.teamId !== teamId) {
    return NextResponse.json({ error: "Person does not belong to this team" }, { status: 400 });
  }

  const [entry] = await db
    .insert(matchLineup)
    .values({ matchId: mid, teamId, personId, isStarting, shirtNumber: shirtNumber ?? null, position: position ?? null })
    .onConflictDoUpdate({
      target: [matchLineup.matchId, matchLineup.personId],
      set: { isStarting, shirtNumber: shirtNumber ?? null, position: position ?? null },
    })
    .returning();

  return NextResponse.json(entry, { status: 201 });
}

// PATCH /api/.../matches/[matchId]/lineup?personId=X
// Toggle isStarting for a player
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const mid = parseInt(p.matchId);
  const personId = parseInt(req.nextUrl.searchParams.get("personId") ?? "0");
  const body = await req.json();

  if (!personId) return NextResponse.json({ error: "personId required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body.isStarting !== undefined) updates.isStarting = body.isStarting;
  if (body.shirtNumber !== undefined) updates.shirtNumber = body.shirtNumber;
  if (body.position !== undefined) updates.position = body.position;

  const [updated] = await db
    .update(matchLineup)
    .set(updates)
    .where(and(eq(matchLineup.matchId, mid), eq(matchLineup.personId, personId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

// DELETE /api/.../matches/[matchId]/lineup?personId=X  (or ?clearTeam=teamId)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const mid = parseInt(p.matchId);
  const personId = req.nextUrl.searchParams.get("personId");
  const clearTeam = req.nextUrl.searchParams.get("clearTeam");

  if (clearTeam) {
    await db.delete(matchLineup).where(
      and(eq(matchLineup.matchId, mid), eq(matchLineup.teamId, parseInt(clearTeam)))
    );
    return NextResponse.json({ ok: true });
  }

  if (!personId) return NextResponse.json({ error: "personId or clearTeam required" }, { status: 400 });

  await db.delete(matchLineup).where(
    and(eq(matchLineup.matchId, mid), eq(matchLineup.personId, parseInt(personId)))
  );
  return NextResponse.json({ ok: true });
}
