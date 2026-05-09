import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubUserTeams, teams } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// POST /api/clubs/[clubId]/members/[userId]/teams/[teamId]/approve
//
// Club admin confirms a pending coach for a specific team. Flips
// status from 'pending' → 'approved'. The coach already had full
// access — this just clears the moderation badge from the dashboard.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string; userId: string; teamId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.teamId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { clubId, userId, teamId } = await params;
  const cid = parseInt(clubId);
  const uid = parseInt(userId);
  const tid = parseInt(teamId);
  if (cid !== session.clubId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify the team belongs to this club (no cross-club approvals).
  const [t] = await db.select().from(teams).where(eq(teams.id, tid));
  if (!t || t.clubId !== cid) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  await db
    .update(clubUserTeams)
    .set({ status: "approved" })
    .where(and(eq(clubUserTeams.clubUserId, uid), eq(clubUserTeams.teamId, tid)));

  return NextResponse.json({ ok: true });
}
