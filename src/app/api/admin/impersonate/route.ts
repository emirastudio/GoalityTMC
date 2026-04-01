import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubs, clubUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, createToken, ADMIN_BACKUP_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

// POST /api/admin/impersonate — admin logs in as a club
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId } = await req.json();
  if (!clubId) {
    return NextResponse.json({ error: "clubId required" }, { status: 400 });
  }

  // Fetch club + its first admin user
  const club = await db.query.clubs.findFirst({ where: eq(clubs.id, clubId) });
  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  const clubUser = await db.query.clubUsers.findFirst({
    where: eq(clubUsers.clubId, clubId),
  });
  if (!clubUser) {
    return NextResponse.json({ error: "No user for this club" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const currentToken = cookieStore.get("kingscup_token")?.value;

  // Save current admin token as backup
  if (currentToken) {
    cookieStore.set(ADMIN_BACKUP_COOKIE, currentToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 4, // 4 hours
      path: "/",
    });
  }

  // Create club token with impersonating flag
  const clubToken = createToken({
    userId: clubUser.id,
    role: "club",
    clubId: club.id,
    tournamentId: club.tournamentId,
    impersonating: true,
  });

  cookieStore.set("kingscup_token", clubToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 4,
    path: "/",
  });

  return NextResponse.json({ ok: true, clubName: club.name });
}
