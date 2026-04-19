import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, tournaments, adminUsers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendOrgDeletionRequest } from "@/lib/email";

/**
 * GDPR Art. 17 (right to erasure) — org-level request.
 *
 * Only an admin of the organisation can trigger it. The request is
 * emailed to Goality's privacy inbox for manual processing within 30
 * days; accounting records are retained for 7 years as required by
 * the Estonian Accounting Act.
 */
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "admin" || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.organizationId));
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const [admin] = await db
    .select({ name: adminUsers.name, email: adminUsers.email })
    .from(adminUsers)
    .where(eq(adminUsers.id, session.userId))
    .limit(1);

  const activeTournaments = await db
    .select({ name: tournaments.name })
    .from(tournaments)
    .where(
      and(
        eq(tournaments.organizationId, org.id),
        isNull(tournaments.deletedAt),
      )
    );

  await sendOrgDeletionRequest({
    orgName: org.name,
    orgSlug: org.slug,
    contactName: admin?.name ?? "Unknown",
    contactEmail: admin?.email ?? org.contactEmail ?? "Unknown",
    tournamentCount: activeTournaments.length,
    activeTournaments: activeTournaments.map(t => t.name),
  });

  return NextResponse.json({ ok: true });
}
