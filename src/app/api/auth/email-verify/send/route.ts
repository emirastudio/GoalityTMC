import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailVerifications } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { sendEmailVerificationCode } from "@/lib/email";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

// POST /api/auth/email-verify/send  { email }
//
// Generates a 6-digit code, hashes it, stores a row with 15-min
// expiry, and emails the code to the address. Rate-limited per IP
// (3 sends / 5 min) and per email (5 sends / hour). Any prior
// un-used row for this email is invalidated (used_at set) so only
// the latest code is valid.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const ipLimit = checkRateLimit(`emv:ip:${ip}`, 3, 5 * 60 * 1000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSec);

  const body = await req.json().catch(() => ({}));
  const emailRaw = (body.email ?? "") as string;
  const email = emailRaw.toLowerCase().trim();
  if (!email || !email.includes("@") || email.length > 254) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const emailLimit = checkRateLimit(`emv:em:${email}`, 5, 60 * 60 * 1000);
  if (!emailLimit.allowed) return rateLimitResponse(emailLimit.retryAfterSec);

  // Generate 6-digit code (zero-padded, e.g. "047231").
  const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  const codeHash = await bcrypt.hash(code, 8);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Invalidate previous active codes for this email.
  await db
    .update(emailVerifications)
    .set({ usedAt: new Date() })
    .where(and(eq(emailVerifications.email, email), isNull(emailVerifications.usedAt)));

  await db.insert(emailVerifications).values({ email, codeHash, expiresAt });

  // Best-effort send — failures still return ok=true so we don't reveal
  // whether the email is well-formed/deliverable. The user retries via UI.
  try {
    // Locale picked from the request: NEXT_LOCALE cookie set by next-intl
    // middleware. Verification code goes out in the user's UI language.
    const locale = req.cookies.get("NEXT_LOCALE")?.value;
    await sendEmailVerificationCode({ to: email, code, locale });
  } catch (e) {
    console.error("[EMAIL-VERIFY] send failed:", e);
  }

  // In dev, log the code so testing without SMTP works.
  if (process.env.NODE_ENV !== "production") {
    console.log(`[EMAIL-VERIFY] code for ${email}: ${code}`);
  }

  return NextResponse.json({ ok: true, expiresInSec: 15 * 60 });
}
