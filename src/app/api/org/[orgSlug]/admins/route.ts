import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminUsers, organizations, orgAdminInvites, tournaments } from "@/db/schema";
import { and, eq, isNull, gt, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { authorizeOrg } from "@/lib/tenant";
import { sendOrgAdminInvite } from "@/lib/email";
import { getEffectivePlan, assertFeature, type TournamentPlan } from "@/lib/plan-gates";
import crypto from "crypto";

type RouteContext = { params: Promise<{ orgSlug: string }> };

// GET /api/org/[orgSlug]/admins
// Returns the current admin team + pending invites.
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { orgSlug } = await params;
  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admins = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
      createdAt: adminUsers.createdAt,
    })
    .from(adminUsers)
    .where(eq(adminUsers.organizationId, organization.id))
    .orderBy(adminUsers.createdAt);

  const pendingInvites = await db
    .select({
      id: orgAdminInvites.id,
      invitedEmail: orgAdminInvites.invitedEmail,
      invitedName: orgAdminInvites.invitedName,
      invitedBy: orgAdminInvites.invitedBy,
      createdAt: orgAdminInvites.createdAt,
      expiresAt: orgAdminInvites.expiresAt,
    })
    .from(orgAdminInvites)
    .where(
      and(
        eq(orgAdminInvites.organizationId, organization.id),
        isNull(orgAdminInvites.usedAt),
        isNull(orgAdminInvites.revokedAt),
        gt(orgAdminInvites.expiresAt, new Date()),
      )
    )
    .orderBy(desc(orgAdminInvites.createdAt));

  return NextResponse.json({
    currentUserId: session.userId,
    admins,
    pendingInvites,
  });
}

// POST /api/org/[orgSlug]/admins
// Invite a new admin to the organisation. Pro+Elite only.
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { orgSlug } = await params;
  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Plan gate — the feature requires Pro or Elite at org level.
  // We look at the org's eliteSubStatus + the best tournament plan as a
  // proxy, because plan is per-tournament. An organisation counts as
  // "Pro" if it has an active Elite subscription OR any non-free tournament.
  const effectivePlan = await resolveOrgPlan(organization.id);
  const gate = assertFeature(effectivePlan, "hasMultiAdmin");
  if (gate) return gate;

  const body = await req.json().catch(() => ({}));
  const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const rawName = typeof body.name === "string" ? body.name.trim() : "";
  if (!rawEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rawEmail)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  // Block obvious duplicates.
  const existingAdmin = await db.query.adminUsers.findFirst({
    where: and(eq(adminUsers.email, rawEmail), eq(adminUsers.organizationId, organization.id)),
  });
  if (existingAdmin) {
    return NextResponse.json({ error: "This email is already an admin of this organisation" }, { status: 409 });
  }

  // Revoke any previous live invite for the same email + org — one pending at a time.
  await db
    .update(orgAdminInvites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(orgAdminInvites.organizationId, organization.id),
        eq(orgAdminInvites.invitedEmail, rawEmail),
        isNull(orgAdminInvites.usedAt),
        isNull(orgAdminInvites.revokedAt),
      )
    );

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(orgAdminInvites).values({
    organizationId: organization.id,
    token,
    invitedEmail: rawEmail,
    invitedName: rawName || null,
    invitedBy: session.userId,
    expiresAt,
  });

  // Send email.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://goality.app";
  const inviteLink = `${appUrl}/en/invites/admin/${token}`;
  const [inviter] = await db
    .select({ name: adminUsers.name })
    .from(adminUsers)
    .where(eq(adminUsers.id, session.userId))
    .limit(1);

  let emailSent = false;
  if (process.env.SMTP_HOST) {
    try {
      await sendOrgAdminInvite({
        to: rawEmail,
        orgName: organization.name,
        inviteLink,
        inviterName: inviter?.name ?? null,
      });
      emailSent = true;
    } catch (err) {
      console.error("[org admin invite] email send failed:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    invite: { invitedEmail: rawEmail, expiresAt, inviteLink },
    emailSent,
  });
}

// Resolve the best available plan for an org — used purely for feature gating
// of org-wide features like multi-admin. Elite subscription wins. Otherwise
// pick the strongest plan across the org's tournaments.
async function resolveOrgPlan(orgId: number): Promise<TournamentPlan> {
  const [org] = await db
    .select({ eliteSubStatus: organizations.eliteSubStatus })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  if (!org) return "free";
  const elite = getEffectivePlan("free", org.eliteSubStatus);
  if (elite === "elite") return "elite";

  const rows = await db
    .select({ plan: tournaments.plan })
    .from(tournaments)
    .where(eq(tournaments.organizationId, orgId));
  const rank: Record<TournamentPlan, number> = { free: 0, starter: 1, pro: 2, elite: 3 };
  let best: TournamentPlan = "free";
  for (const r of rows) {
    const p = (r.plan as TournamentPlan) ?? "free";
    if (rank[p] > rank[best]) best = p;
  }
  return best;
}
