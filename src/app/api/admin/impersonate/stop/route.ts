import { NextResponse } from "next/server";
import { ADMIN_BACKUP_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

// POST /api/admin/impersonate/stop — restore admin session
export async function POST() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(ADMIN_BACKUP_COOKIE)?.value;

  if (!adminToken) {
    return NextResponse.json({ error: "No admin session backup found" }, { status: 400 });
  }

  // Restore admin token
  cookieStore.set("kingscup_token", adminToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  // Clear backup
  cookieStore.delete(ADMIN_BACKUP_COOKIE);

  return NextResponse.json({ ok: true });
}
