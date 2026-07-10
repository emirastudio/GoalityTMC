import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubUsers, clubs } from "@/db/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { sendPasswordReset } from "@/lib/email";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { passwordResetSignature } from "@/lib/auth";

const JWT_SECRET = process.env.JWT_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://goalityfootball.com";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { allowed, retryAfterSec } = checkRateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterSec);

  const body = await req.json();
  const email = (body.email ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Find club user by email
  const user = await db.query.clubUsers.findFirst({
    where: eq(clubUsers.email, email),
  });

  // Always return success to prevent email enumeration. Also bail (silently)
  // for accounts with no password set (e.g. OAuth-only) — there's nothing to
  // reset, and passwordResetSignature needs a hash to bind the token to.
  if (!user || !user.passwordHash) {
    return NextResponse.json({ ok: true });
  }

  // Get club name for the email
  const club = user.clubId
    ? await db.query.clubs.findFirst({ where: eq(clubs.id, user.clubId) })
    : null;

  // Create a short-lived reset token (1 hour). `pv` binds it to the current
  // password hash so it can only be used once (see passwordResetSignature).
  const resetToken = jwt.sign(
    { purpose: "password-reset", userId: user.id, email: user.email, pv: passwordResetSignature(user.passwordHash) },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const locale = club?.preferredLocale ?? "en";
  const resetLink = `${APP_URL}/${locale}/reset-password/${resetToken}`;
  const toName = user.name ?? club?.name ?? "Club";

  try {
    await sendPasswordReset({ to: user.email, toName, resetLink, locale });
  } catch (err) {
    console.error("Failed to send password reset email:", err);
    // Still return ok — don't leak errors
  }

  return NextResponse.json({ ok: true });
}
