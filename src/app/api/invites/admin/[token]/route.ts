import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orgAdminInvites, organizations, adminUsers } from "@/db/schema";
import { and, eq, isNull, gt } from "drizzle-orm";

type RouteContext = { params: Promise<{ token: string }> };

// GET /api/invites/admin/[token]
// Returns basic info about an invite so the accept page can render it.
// Does not require auth.
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { token } = await params;

  const [row] = await db
    .select({
      invite: orgAdminInvites,
      orgName: organizations.name,
      orgSlug: organizations.slug,
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

  // Does an adminUsers row already exist for this email?
  const existing = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, row.invite.invitedEmail),
  });

  return NextResponse.json({
    invitedEmail: row.invite.invitedEmail,
    invitedName: row.invite.invitedName,
    orgName: row.orgName,
    orgSlug: row.orgSlug,
    expiresAt: row.invite.expiresAt,
    accountExists: !!existing,
  });
}
