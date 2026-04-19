import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orgAdminInvites, organizations, adminUsers } from "@/db/schema";
import { and, eq, isNull, gt } from "drizzle-orm";
import { hashPassword, createToken, setSessionCookie, verifyPassword } from "@/lib/auth";

type RouteContext = { params: Promise<{ token: string }> };

// POST /api/invites/admin/[token]/accept
// Body: { name, password }  — when the invitee has no account yet.
// Body: { password }         — when the email already has an admin account.
// Creates or attaches an adminUsers row to the organisation, marks the
// invite used and signs the user in.
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  // Load invite + org.
  const [row] = await db
    .select({
      invite: orgAdminInvites,
      org: organizations,
    })
    .from(orgAdminInvites)
    .innerJoin(organizations, eq(organizations.id, orgAdminInvites.organizationId))
    .where(
      and(
        eq(orgAdminInvites.token, token),
        isNull(orgAdminInvites.usedAt),
        isNull(orgAdminInvites.revokedAt),
        gt(orgAdminInvites.expiresAt, new Date()),
      )
    )
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  }

  const email = row.invite.invitedEmail;

  // Decide path: new account vs existing.
  const existing = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, email),
  });

  let adminId: number;

  if (existing) {
    // Verify password to make sure it's really the owner of that email.
    const ok = await verifyPassword(password, existing.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Account with this email exists — use existing password to attach to organisation" }, { status: 401 });
    }
    if (existing.organizationId && existing.organizationId !== row.org.id) {
      // An admin of a different org cannot be re-assigned silently.
      return NextResponse.json({ error: "This email already administers a different organisation" }, { status: 409 });
    }
    if (!existing.organizationId) {
      // Attach the orphan admin to this org.
      await db
        .update(adminUsers)
        .set({ organizationId: row.org.id })
        .where(eq(adminUsers.id, existing.id));
    }
    adminId = existing.id;
  } else {
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(adminUsers)
      .values({
        organizationId: row.org.id,
        email,
        name,
        passwordHash,
        role: "admin",
      })
      .returning();
    adminId = created.id;
  }

  // Mark invite as used.
  await db
    .update(orgAdminInvites)
    .set({ usedAt: new Date() })
    .where(eq(orgAdminInvites.id, row.invite.id));

  // Sign in.
  const sessionToken = createToken({
    userId: adminId,
    role: "admin",
    organizationId: row.org.id,
    organizationSlug: row.org.slug,
    isSuper: false,
  });
  await setSessionCookie(sessionToken);

  return NextResponse.json({
    ok: true,
    orgSlug: row.org.slug,
    organizationId: row.org.id,
  });
}
