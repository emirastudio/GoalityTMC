import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubUsers } from "@/db/schema";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "currentPassword and newPassword are required" }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  // Find the club user
  const user = await db.query.clubUsers.findFirst({
    where: eq(clubUsers.id, session.userId),
  });

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Verify current password
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  // Hash and save new password
  const newHash = await hashPassword(newPassword);
  await db
    .update(clubUsers)
    .set({ passwordHash: newHash })
    .where(eq(clubUsers.id, session.userId));

  return NextResponse.json({ ok: true });
}
