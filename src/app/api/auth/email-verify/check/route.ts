import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailVerifications } from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_ATTEMPTS = 5;

// POST /api/auth/email-verify/check  { email, code }
//
// Verifies the typed 6-digit code against the latest un-used row
// for this email. On success, sets verified_at — the register
// endpoint then accepts this email within a 30-min window and
// stamps used_at to consume the verification.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const ipLimit = checkRateLimit(`emv-check:ip:${ip}`, 20, 5 * 60 * 1000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSec);

  const body = await req.json().catch(() => ({}));
  const email = ((body.email ?? "") as string).toLowerCase().trim();
  const code = ((body.code ?? "") as string).trim();
  if (!email || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(emailVerifications)
    .where(and(eq(emailVerifications.email, email), isNull(emailVerifications.usedAt)))
    .orderBy(desc(emailVerifications.createdAt))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "No active code. Request a new one." }, { status: 404 });
  }
  if (row.expiresAt < new Date()) {
    return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 410 });
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many wrong attempts. Request a new code." }, { status: 429 });
  }

  const ok = await bcrypt.compare(code, row.codeHash);
  if (!ok) {
    await db
      .update(emailVerifications)
      .set({ attempts: row.attempts + 1 })
      .where(eq(emailVerifications.id, row.id));
    const left = MAX_ATTEMPTS - row.attempts - 1;
    return NextResponse.json(
      { error: `Wrong code. ${left} attempt${left === 1 ? "" : "s"} left.` },
      { status: 400 }
    );
  }

  // Mark as verified (but not yet consumed — register stamps used_at).
  await db
    .update(emailVerifications)
    .set({ verifiedAt: new Date() })
    .where(eq(emailVerifications.id, row.id));

  return NextResponse.json({ ok: true });
}
