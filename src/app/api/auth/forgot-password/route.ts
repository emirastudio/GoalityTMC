import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubUsers, clubs } from "@/db/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { sendPasswordReset } from "@/lib/email";

const JWT_SECRET = process.env.JWT_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://goality.kingscup.ee";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = (body.email ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Find club user by email
  const user = await db.query.clubUsers.findFirst({
    where: eq(clubUsers.email, email),
  });

  // Always return success to prevent email enumeration
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  // Get club name for the email
  const club = user.clubId
    ? await db.query.clubs.findFirst({ where: eq(clubs.id, user.clubId) })
    : null;

  // Create a short-lived reset token (1 hour)
  const resetToken = jwt.sign(
    { purpose: "password-reset", userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const resetLink = `${APP_URL}/en/reset-password/${resetToken}`;
  const toName = user.name ?? club?.name ?? "Club";

  try {
    await sendPasswordReset({ to: user.email, toName, resetLink });
  } catch (err) {
    console.error("Failed to send password reset email:", err);
    // Still return ok — don't leak errors
  }

  return NextResponse.json({ ok: true });
}
