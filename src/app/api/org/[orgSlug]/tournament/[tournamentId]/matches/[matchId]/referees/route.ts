import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matchReferees, matches, tournamentReferees } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { assertFeature } from "@/lib/plan-gates";
import { eq, and, isNull } from "drizzle-orm";

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
