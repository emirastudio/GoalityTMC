import { NextResponse } from "next/server";
import { getSession, ADMIN_BACKUP_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

const TOKEN_NAME = "goality_token";

// POST /api/dev/exit-team — возвращает admin-сессию из backup
export async function POST() {
  const session = await getSession();
  if (!session?.isSuper) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookieStore = await cookies();
  const adminToken = cookieStore.get(ADMIN_BACKUP_COOKIE)?.value;

  if (!adminToken) {
    return NextResponse.json({ error: "No admin backup token" }, { status: 400 });
  }

  // Восстанавливаем admin-токен
  cookieStore.set(TOKEN_NAME, adminToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  cookieStore.delete(ADMIN_BACKUP_COOKIE);

  return NextResponse.json({ ok: true });
}
