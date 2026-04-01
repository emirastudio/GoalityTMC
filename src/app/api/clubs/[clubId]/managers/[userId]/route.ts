import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubUsers } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { getSession } from "@/lib/auth";

type RouteContext = { params: Promise<{ clubId: string; userId: string }> };

// DELETE /api/clubs/[clubId]/managers/[userId] — remove team manager access
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  const { clubId, userId } = await params;
  const cid = parseInt(clubId);
  const uid = parseInt(userId);

  if (!session || session.role !== "club" || session.clubId !== cid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only club admins can delete managers
  if (session.teamId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find the manager — must belong to this club AND have a teamId (is a team manager, not the main admin)
  const manager = await db.query.clubUsers.findFirst({
    where: and(eq(clubUsers.id, uid), eq(clubUsers.clubId, cid), isNotNull(clubUsers.teamId)),
  });

  if (!manager) {
    return NextResponse.json({ error: "Manager not found" }, { status: 404 });
  }

  await db.delete(clubUsers).where(eq(clubUsers.id, uid));

  return NextResponse.json({ ok: true });
}
