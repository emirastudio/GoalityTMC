import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matchReferees, matches, tournamentReferees, tournamentRegistrations } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { assertFeature } from "@/lib/plan-gates";
import { eq, and, isNull, inArray } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string; matchId: string };

// GET /api/.../matches/[matchId]/referees
// Returns all referees assigned to this match with their role
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const mid = parseInt(p.matchId);

  const match = await db.query.matches.findFirst({
    where: and(
      eq(matches.id, mid),
      eq(matches.tournamentId, ctx.tournament.id),
      isNull(matches.deletedAt)
    ),
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const referees = await db.query.matchReferees.findMany({
    where: eq(matchReferees.matchId, mid),
    with: { referee: true },
  });

  return NextResponse.json({
    referees: referees.map((r) => ({
      id: r.refereeId,
      refereeId: r.refereeId,
      role: r.role,
      firstName: r.referee.firstName,
      lastName: r.referee.lastName,
      colorTag: r.referee.colorTag,
    })),
  });
}

// POST /api/.../matches/[matchId]/referees
// Assign (or update role of) a referee to this match
// Body: { refereeId: number, role: "main" | "assistant1" | "assistant2" | "fourth" }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const gate = assertFeature(ctx.effectivePlan, "hasMatchHub");
  if (gate) return gate;

  const mid = parseInt(p.matchId);
  const body = await req.json();
  const { refereeId, role } = body as { refereeId: number; role: string };

  if (!refereeId || !role) {
    return NextResponse.json({ error: "refereeId and role are required" }, { status: 400 });
  }

  const validRoles = ["main", "assistant1", "assistant2", "fourth"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const match = await db.query.matches.findFirst({
    where: and(
      eq(matches.id, mid),
      eq(matches.tournamentId, ctx.tournament.id),
      isNull(matches.deletedAt)
    ),
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  // Verify referee belongs to this tournament
  const referee = await db.query.tournamentReferees.findFirst({
    where: and(
      eq(tournamentReferees.id, refereeId),
      eq(tournamentReferees.tournamentId, ctx.tournament.id),
    ),
  });
  if (!referee) return NextResponse.json({ error: "Referee not found" }, { status: 404 });

  // Upsert: if already assigned, update role; otherwise insert
  await db
    .insert(matchReferees)
    .values({ matchId: mid, refereeId, role })
    .onConflictDoUpdate({
      target: [matchReferees.matchId, matchReferees.refereeId],
      set: { role },
    });

  // Send email notification if referee has an email address (non-blocking)
  if (referee.email && referee.accessToken) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://goalityfootball.com";
    const panelUrl = `${appUrl}/en/referee/${referee.accessToken}`;

    // Load team names for the email
    const teamIds = [match.homeTeamId, match.awayTeamId].filter(Boolean) as number[];
    const displayMap = new Map<number, string | null>();
    if (teamIds.length > 0) {
      const regs = await db
        .select({
          teamId: tournamentRegistrations.teamId,
          displayName: tournamentRegistrations.displayName,
        })
        .from(tournamentRegistrations)
        .where(
          and(
            eq(tournamentRegistrations.tournamentId, ctx.tournament.id),
            inArray(tournamentRegistrations.teamId, teamIds),
          ),
        );
      for (const r of regs) displayMap.set(r.teamId, r.displayName);
    }

    const fullMatch = await db.query.matches.findFirst({
      where: eq(matches.id, mid),
      with: {
        homeTeam: { with: { club: true } },
        awayTeam: { with: { club: true } },
        field: true,
      },
    });

    const homeName =
      (match.homeTeamId ? displayMap.get(match.homeTeamId) : undefined) ??
      fullMatch?.homeTeam?.name ??
      fullMatch?.homeTeam?.club?.name ??
      null;
    const awayName =
      (match.awayTeamId ? displayMap.get(match.awayTeamId) : undefined) ??
      fullMatch?.awayTeam?.name ??
      fullMatch?.awayTeam?.club?.name ??
      null;
    const venue = fullMatch?.field?.name ?? null;
    const matchTime = match.scheduledAt
      ? new Intl.DateTimeFormat("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(match.scheduledAt))
      : null;

    import("@/lib/email")
      .then(({ sendRefereeMatchAssignment }) =>
        sendRefereeMatchAssignment({
          to: referee.email!,
          refereeName: `${referee.firstName} ${referee.lastName}`,
          tournamentName: ctx.tournament.name,
          matchTime,
          homeTeam: homeName,
          awayTeam: awayName,
          venue,
          panelUrl,
          role,
        }),
      )
      .catch(() => {
        // Non-blocking: ignore email send failures
      });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/.../matches/[matchId]/referees
// Remove a referee from this match
// Body: { refereeId: number }
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const gate = assertFeature(ctx.effectivePlan, "hasMatchHub");
  if (gate) return gate;

  const mid = parseInt(p.matchId);
  const body = await req.json();
  const { refereeId } = body as { refereeId: number };

  if (!refereeId) {
    return NextResponse.json({ error: "refereeId is required" }, { status: 400 });
  }

  const match = await db.query.matches.findFirst({
    where: and(
      eq(matches.id, mid),
      eq(matches.tournamentId, ctx.tournament.id),
      isNull(matches.deletedAt)
    ),
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  await db
    .delete(matchReferees)
    .where(
      and(
        eq(matchReferees.matchId, mid),
        eq(matchReferees.refereeId, refereeId)
      )
    );

  return NextResponse.json({ ok: true });
}
