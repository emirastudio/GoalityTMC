import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { tournaments, organizations, planOverrideAudits, adminUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { TournamentPlan } from "@/lib/plan-gates";

const VALID_PLANS = ["free", "starter", "pro", "elite"] as const;

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  // Only super admins can override plans
  if (!session.isSuper) {
    return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const { entityType, entityId, newPlan, reason } = body ?? {};

  if (!entityType || !entityId || !newPlan || !reason?.trim()) {
    return NextResponse.json({
      error: "entityType, entityId, newPlan and reason are all required"
    }, { status: 400 });
  }

  if (!["tournament", "organization"].includes(entityType)) {
    return NextResponse.json({ error: "entityType must be 'tournament' or 'organization'" }, { status: 400 });
  }

  if (!VALID_PLANS.includes(newPlan)) {
    return NextResponse.json({ error: `newPlan must be one of: ${VALID_PLANS.join(", ")}` }, { status: 400 });
  }

  // Get admin info for audit
  const [adminRow] = await db
    .select({ email: adminUsers.email })
    .from(adminUsers)
    .where(eq(adminUsers.id, session.userId))
    .limit(1);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";

  let previousPlan: string;
  let entityName: string;

  if (entityType === "tournament") {
    const [tournament] = await db
      .select({ id: tournaments.id, name: tournaments.name, plan: tournaments.plan })
      .from(tournaments)
      .where(eq(tournaments.id, Number(entityId)))
      .limit(1);

    if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

    previousPlan = tournament.plan;
    entityName = tournament.name;

    await db.update(tournaments).set({
      plan: newPlan as TournamentPlan,
      planOverrideBy: session.userId,
      planOverrideReason: reason.trim(),
      planOverrideAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(tournaments.id, Number(entityId)));

  } else {
    const [org] = await db
      .select({ id: organizations.id, name: organizations.name, plan: organizations.plan })
      .from(organizations)
      .where(eq(organizations.id, Number(entityId)))
      .limit(1);

    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    previousPlan = org.plan;
    entityName = org.name;

    await db.update(organizations).set({
      plan: newPlan as "free" | "starter" | "pro" | "elite",
      updatedAt: new Date(),
    }).where(eq(organizations.id, Number(entityId)));
  }

  // Write audit log
  await db.insert(planOverrideAudits).values({
    entityType,
    entityId: Number(entityId),
    entityName,
    adminId: session.userId,
    adminEmail: adminRow?.email ?? "unknown",
    previousPlan,
    newPlan,
    reason: reason.trim(),
    ipAddress: ip,
  });

  return NextResponse.json({
    success: true,
    entityType,
    entityId,
    entityName,
    previousPlan,
    newPlan,
  });
}

export async function GET(req: NextRequest) {
  void req;
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;
  if (!session.isSuper) {
    return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  }

  const audits = await db
    .select({
      id: planOverrideAudits.id,
      entityType: planOverrideAudits.entityType,
      entityId: planOverrideAudits.entityId,
      entityName: planOverrideAudits.entityName,
      adminEmail: planOverrideAudits.adminEmail,
      previousPlan: planOverrideAudits.previousPlan,
      newPlan: planOverrideAudits.newPlan,
      reason: planOverrideAudits.reason,
      ipAddress: planOverrideAudits.ipAddress,
      createdAt: planOverrideAudits.createdAt,
    })
    .from(planOverrideAudits)
    .orderBy(planOverrideAudits.createdAt);

  return NextResponse.json(audits);
}
