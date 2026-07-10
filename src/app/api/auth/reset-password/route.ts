import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { hashPassword, passwordResetSignature } from "@/lib/auth";
import { isPasswordValid, PASSWORD_POLICY_MESSAGE } from "@/lib/password";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { allowed, retryAfterSec } = checkRateLimit(`reset:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterSec);

  const body = await req.json();
  const { token, password } = body;

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
  }

  // Enforce the same policy as signup (was `length < 8` only — weaker).
  if (!isPasswordValid(password)) {
    return NextResponse.json({ error: PASSWORD_POLICY_MESSAGE }, { status: 400 });
  }

  // Verify the reset token
  let payload: { purpose?: string; userId?: number; email?: string; pv?: string } | null = null;
  try {
    payload = jwt.verify(token, JWT_SECRET) as { purpose: string; userId: number; email: string; pv?: string };
  } catch {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }

  if (payload?.purpose !== "password-reset" || !payload.userId || !payload.pv) {
    return NextResponse.json({ error: "Invalid reset token" }, { status: 400 });
  }

  const user = await db.query.clubUsers.findFirst({ where: eq(clubUsers.id, payload.userId) });
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }

  // Single-use: the token's signature must match the account's CURRENT hash.
  // If it doesn't, the link was already used or the password changed since.
  if (passwordResetSignature(user.passwordHash) !== payload.pv) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await db.update(clubUsers).set({ passwordHash }).where(eq(clubUsers.id, payload.userId));

  return NextResponse.json({ ok: true });
}
