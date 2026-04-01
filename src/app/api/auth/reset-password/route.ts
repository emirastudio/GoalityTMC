import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { hashPassword } from "@/lib/auth";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, password } = body;

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  // Verify the reset token
  let payload: { purpose?: string; userId?: number; email?: string } | null = null;
  try {
    payload = jwt.verify(token, JWT_SECRET) as { purpose: string; userId: number; email: string };
  } catch {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }

  if (payload?.purpose !== "password-reset" || !payload.userId) {
    return NextResponse.json({ error: "Invalid reset token" }, { status: 400 });
  }

  // Hash the new password and update
  const passwordHash = await hashPassword(password);

  const [updated] = await db
    .update(clubUsers)
    .set({ passwordHash })
    .where(eq(clubUsers.id, payload.userId))
    .returning({ id: clubUsers.id });

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
