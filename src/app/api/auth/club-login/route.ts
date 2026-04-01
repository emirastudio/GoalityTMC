import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubUsers, clubs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const user = await db.query.clubUsers.findFirst({
    where: eq(clubUsers.email, email.toLowerCase().trim()),
  });

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const club = await db.query.clubs.findFirst({
    where: eq(clubs.id, user.clubId),
  });

  const token = createToken({
    userId: user.id,
    role: "club",
    clubId: user.clubId,
    tournamentId: club?.tournamentId,
    ...(user.teamId ? { teamId: user.teamId } : {}),
  });

  await setSessionCookie(token);

  return NextResponse.json({ ok: true, clubId: user.clubId, teamId: user.teamId ?? null });
}
