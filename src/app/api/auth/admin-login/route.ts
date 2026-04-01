import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminUsers, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
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

  const isSuper = admin.role === "super_admin" && !admin.organizationId;

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
