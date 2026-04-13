import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { adminUsers, organizations, clubUsers, clubs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;
  if (!session.isSuper) {
    return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  }

  // ── Org admins (adminUsers) with their org info ──────────────────
  const orgAdmins = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
      createdAt: adminUsers.createdAt,
      orgId: organizations.id,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      orgPlan: organizations.plan,
      orgEliteSubStatus: organizations.eliteSubStatus,
    })
    .from(adminUsers)
    .leftJoin(organizations, eq(organizations.id, adminUsers.organizationId))
    .orderBy(desc(adminUsers.createdAt));

  // ── Club users with club info ─────────────────────────────────────
  // Note: clubs no longer have a tournamentId; org info not derivable from club alone
  const clubMembers = await db
    .select({
      id: clubUsers.id,
      email: clubUsers.email,
      name: clubUsers.name,
      accessLevel: clubUsers.accessLevel,
      createdAt: clubUsers.createdAt,
      clubId: clubs.id,
      clubName: clubs.name,
    })
    .from(clubUsers)
    .leftJoin(clubs, eq(clubs.id, clubUsers.clubId))
    .orderBy(desc(clubUsers.createdAt));

  return NextResponse.json({ orgAdmins, clubMembers });
}
