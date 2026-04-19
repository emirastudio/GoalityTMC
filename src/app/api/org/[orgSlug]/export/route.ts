import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  organizations,
  adminUsers,
  tournaments,
  tournamentPurchases,
  platformSubscriptions,
  planOverrideAudits,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, inArray } from "drizzle-orm";

/**
 * GDPR Art. 15 (right of access) + Art. 20 (data portability) export for
 * an organisation. Returns a JSON dump of everything we store about the
 * org, its admin accounts and its tournament purchases.
 *
 * Scoped to the authenticated org admin — they can only export their own
 * organisation. Super admins can export any org.
 *
 * Tournament content itself (teams, matches, registrations) is owned by
 * the organiser as data controller — we export the summaries, not the
 * participants' personal data. A club owner can export their own players
 * separately via /api/clubs/[clubId]/export.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgSlug } = await params;

  const [org] = await db.select().from(organizations).where(eq(organizations.slug, orgSlug));
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // Authorization: the caller must belong to this org, or be a super admin.
  if (!session.isSuper && session.organizationId !== org.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Admin accounts under this org (password hash is redacted).
  const adminRows = await db
    .select({
      id: adminUsers.id,
      organizationId: adminUsers.organizationId,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
      createdAt: adminUsers.createdAt,
    })
    .from(adminUsers)
    .where(eq(adminUsers.organizationId, org.id));

  // Tournament summaries (what the org has created).
  const tournamentRows = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      slug: tournaments.slug,
      plan: tournaments.plan,
      startDate: tournaments.startDate,
      endDate: tournaments.endDate,
      registrationDeadline: tournaments.registrationDeadline,
      schedulePublishedAt: tournaments.schedulePublishedAt,
      extraTeamsPurchased: tournaments.extraTeamsPurchased,
      extraDivisionsPurchased: tournaments.extraDivisionsPurchased,
      createdAt: tournaments.createdAt,
      deletedAt: tournaments.deletedAt,
    })
    .from(tournaments)
    .where(eq(tournaments.organizationId, org.id));

  // Billing history.
  const purchases = await db
    .select()
    .from(tournamentPurchases)
    .where(eq(tournamentPurchases.organizationId, org.id));

  const platformSubs = await db
    .select()
    .from(platformSubscriptions)
    .where(eq(platformSubscriptions.organizationId, org.id));

  // Plan override audit trail — super-admin actions on this org or its tournaments.
  const orgTournamentIds = tournamentRows.map(t => t.id);
  const audits = await db
    .select()
    .from(planOverrideAudits)
    .where(
      and(
        eq(planOverrideAudits.entityType, "organization"),
        eq(planOverrideAudits.entityId, org.id),
      )
    );
  // Also include tournament-level overrides for the org's tournaments.
  const tournamentAudits: (typeof audits)[number][] = orgTournamentIds.length > 0
    ? await db
        .select()
        .from(planOverrideAudits)
        .where(
          and(
            eq(planOverrideAudits.entityType, "tournament"),
            inArray(planOverrideAudits.entityId, orgTournamentIds),
          )
        )
    : [];

  // Redact the Stripe customer ID but keep the reference shape so the
  // org can see that one exists. Full secret is never stored anyway.
  const orgPayload = {
    ...org,
    stripeCustomerId: org.stripeCustomerId ? "[linked]" : null,
    eliteSubId: org.eliteSubId ? "[linked]" : null,
  };

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      format: "goality-org-export",
      version: 1,
      legalBasis: "GDPR Art. 15 (right of access), Art. 20 (data portability)",
      controller: {
        name: "Goality Sport Group OÜ",
        registryCode: "17232252",
        address: "Tallinn, Estonia",
        contactEmail: "privacy@goality.app",
      },
      organizationId: org.id,
      organizationSlug: org.slug,
      counts: {
        admins: adminRows.length,
        tournaments: tournamentRows.length,
        purchases: purchases.length,
        platformSubscriptions: platformSubs.length,
        planOverrideAudits: audits.length + tournamentAudits.length,
      },
      note: "This export covers data we hold about your organisation and its admin accounts. Player- and club-level personal data is owned by the respective clubs and can be exported by them individually. Full accounting records are retained for 7 years under the Estonian Accounting Act — these are kept even after account deletion and will be redacted to the legal minimum after 30 days.",
    },
    organization: orgPayload,
    adminUsers: adminRows,
    legalAcceptance: {
      termsAcceptedAt: org.termsAcceptedAt,
      termsVersion: org.termsVersion,
      dpaAcceptedAt: org.dpaAcceptedAt,
      dpaVersion: org.dpaVersion,
      ipAddress: org.legalAcceptanceIp,
    },
    tournaments: tournamentRows,
    billing: {
      tournamentPurchases: purchases,
      platformSubscriptions: platformSubs,
    },
    auditTrail: {
      organizationPlanOverrides: audits,
      tournamentPlanOverrides: tournamentAudits,
    },
  };

  const filename = `goality-org-${org.slug}-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, private",
    },
  });
}
