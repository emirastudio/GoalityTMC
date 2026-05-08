import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { db } from "@/db";
import { adminUsers, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { allowed, retryAfterSec } = checkRateLimit(`admin-login:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterSec);

  const { email, password } = await req.json();

  const admin = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, email.toLowerCase()),
  });

  if (!admin) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const isSuper = admin.role === "super_admin";

  // Resolve organization slug for org admins
  let organizationSlug: string | undefined;
  if (admin.organizationId) {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, admin.organizationId),
    });
    organizationSlug = org?.slug;
  }

  const token = createToken({
    userId: admin.id,
    role: "admin",
    organizationId: admin.organizationId ?? undefined,
    organizationSlug,
    isSuper,
  });

  await setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    isSuper,
    organizationSlug,
  });
}
