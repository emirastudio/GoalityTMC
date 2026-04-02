import { NextResponse } from "next/server";
import { db } from "@/db";
import { clubUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, createToken, ADMIN_BACKUP_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

const DEV_EMAIL = "gol@goality.ee";
const TOKEN_NAME = "goality_token";

// POST /api/dev/enter-team — переключает super admin в сессию клубного юзера
export async function POST() {
  const session = await getSession();
  if (!session?.isSuper) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clubUser = await db.query.clubUsers.findFirst({
    where: eq(clubUsers.email, DEV_EMAIL),
  });

  if (!clubUser) {
    return NextResponse.json({ error: "Dev club user not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const currentToken = cookieStore.get(TOKEN_NAME)?.value;

  // Сохраняем admin-токен в backup
  if (currentToken) {
    cookieStore.set(ADMIN_BACKUP_COOKIE, currentToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
    });
  }

  // Создаём club-токен с флагом isSuper
  const clubToken = createToken({
    userId: clubUser.id,
    role: "club",
    clubId: clubUser.clubId,
    ...(clubUser.teamId ? { teamId: clubUser.teamId } : {}),
    isSuper: true,
  });

  cookieStore.set(TOKEN_NAME, clubToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
