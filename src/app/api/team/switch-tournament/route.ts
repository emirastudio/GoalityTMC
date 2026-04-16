import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { tournamentRegistrations, teams } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";

const COOKIE = "active_tournament_id";

// POST /api/team/switch-tournament
// Body: { tournamentId: number }
// Sets a cookie so the team layout renders the correct tournament context.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tournamentId } = await req.json() as { tournamentId: number };
  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId required" }, { status: 400 });
  }

  // Verify this club actually has a team registered in this tournament
  const reg = await db.query.tournamentRegistrations.findFirst({
    where: sql`${tournamentRegistrations.teamId} IN (
      SELECT id FROM teams WHERE club_id = ${session.clubId}
    ) AND ${tournamentRegistrations.tournamentId} = ${tournamentId}`,
  });

  if (!reg) {
    return NextResponse.json({ error: "Not registered in this tournament" }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, String(tournamentId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return NextResponse.json({ ok: true, tournamentId });
}
