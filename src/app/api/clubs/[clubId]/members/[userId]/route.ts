import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubUsers, clubUserTeams } from "@/db/schema";
import { eq, and, isNull, ne } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// DELETE /api/clubs/[clubId]/members/[userId]
// Remove a club user. Only club admins can do this. The last
// remaining club admin cannot be deleted (would orphan the club).
// Self-removal is also blocked — use a transfer flow instead.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string; userId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.teamId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { clubId, userId } = await params;
  const cid = parseInt(clubId);
  const uid = parseInt(userId);
  if (cid !== session.clubId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (uid === session.userId) {
    return NextResponse.json(
      { error: "You cannot remove yourself. Invite another admin first, then ask them to remove you." },
      { status: 400 }
    );
  }

  const [target] = await db.select().from(clubUsers).where(eq(clubUsers.id, uid));
  if (!target || target.clubId !== cid) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // If target is a club admin (teamId == null), make sure they're not the last one.
  if (target.teamId === null) {
    const otherAdmins = await db
      .select({ id: clubUsers.id })
      .from(clubUsers)
      .where(and(eq(clubUsers.clubId, cid), isNull(clubUsers.teamId), ne(clubUsers.id, uid)));
    if (otherAdmins.length === 0) {
      return NextResponse.json(
        { error: "Cannot remove the last club admin." },
        { status: 400 }
      );
    }
  }

  // Cascade: junction rows go away via FK ON DELETE CASCADE.
  await db.delete(clubUserTeams).where(eq(clubUserTeams.clubUserId, uid));
  await db.delete(clubUsers).where(eq(clubUsers.id, uid));

  return NextResponse.json({ ok: true });
}
