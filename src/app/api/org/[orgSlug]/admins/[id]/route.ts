import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminUsers, orgAdminInvites } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { authorizeOrg } from "@/lib/tenant";

type RouteContext = { params: Promise<{ orgSlug: string; id: string }> };

// DELETE /api/org/[orgSlug]/admins/[id]?type=admin|invite
// Revokes an existing admin OR a pending invite. Safeguards:
//   - You cannot remove yourself (must leave another admin in charge).
//   - You cannot remove the last admin of the organisation.
//   - Pending invites are soft-revoked (revokedAt set), never hard-deleted.
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { orgSlug, id } = await params;
  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const numericId = parseInt(id);
  if (isNaN(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const type = new URL(req.url).searchParams.get("type") ?? "admin";

  if (type === "invite") {
    const [invite] = await db
      .select()
      .from(orgAdminInvites)
      .where(and(eq(orgAdminInvites.id, numericId), eq(orgAdminInvites.organizationId, organization.id)))
      .limit(1);
    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }
    await db
      .update(orgAdminInvites)
      .set({ revokedAt: new Date() })
      .where(eq(orgAdminInvites.id, numericId));
    return NextResponse.json({ ok: true });
  }

  // type === "admin"
  if (numericId === session.userId) {
    return NextResponse.json({ error: "You cannot remove yourself" }, { status: 400 });
  }

  const [target] = await db
    .select({ id: adminUsers.id, organizationId: adminUsers.organizationId })
    .from(adminUsers)
    .where(eq(adminUsers.id, numericId))
    .limit(1);
  if (!target || target.organizationId !== organization.id) {
    return NextResponse.json({ error: "Admin not found in this organisation" }, { status: 404 });
  }

  const remaining = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.organizationId, organization.id));
  if (remaining.length <= 1) {
    return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 400 });
  }

  await db.delete(adminUsers).where(eq(adminUsers.id, numericId));
  return NextResponse.json({ ok: true });
}
