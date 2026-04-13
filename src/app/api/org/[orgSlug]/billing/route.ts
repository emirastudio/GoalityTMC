import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authorizeOrg } from "@/lib/tenant";
import { db } from "@/db";
import { organizations, tournaments, tournamentPurchases, platformSubscriptions, listingTournaments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getEffectivePlan, PLAN_LIMITS, PLAN_NAMES, type TournamentPlan } from "@/lib/plan-gates";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get org with elite sub status
  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      eliteSubStatus: organizations.eliteSubStatus,
      eliteSubId: organizations.eliteSubId,
      eliteSubPeriodEnd: organizations.eliteSubPeriodEnd,
    })
    .from(organizations)
    .where(eq(organizations.id, organization.id))
    .limit(1);

  // Get all tournaments for this org with their plans
  const orgTournaments = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      plan: tournaments.plan,
      extraTeamsPurchased: tournaments.extraTeamsPurchased,
      extraDivisionsPurchased: tournaments.extraDivisionsPurchased,
    })
    .from(tournaments)
    .where(eq(tournaments.organizationId, organization.id));

  // Get purchase history
  const purchases = await db
    .select({
      id: tournamentPurchases.id,
      tournamentId: tournamentPurchases.tournamentId,
      plan: tournamentPurchases.plan,
      extraTeams: tournamentPurchases.extraTeams,
      extraDivisions: tournamentPurchases.extraDivisions,
      amountEurCents: tournamentPurchases.amountEurCents,
      status: tournamentPurchases.status,
      completedAt: tournamentPurchases.completedAt,
      createdAt: tournamentPurchases.createdAt,
      stripeCheckoutSessionId: tournamentPurchases.stripeCheckoutSessionId,
    })
    .from(tournamentPurchases)
    .where(eq(tournamentPurchases.organizationId, organization.id))
    .orderBy(desc(tournamentPurchases.createdAt))
    .limit(50);

  // Get listing tournaments for this org
  const orgListings = await db
    .select({
      id: listingTournaments.id,
      name: listingTournaments.name,
      slug: listingTournaments.slug,
      subscriptionStatus: listingTournaments.subscriptionStatus,
      subscriptionPeriodEnd: listingTournaments.subscriptionPeriodEnd,
      stripeSubscriptionId: listingTournaments.stripeSubscriptionId,
      startDate: listingTournaments.startDate,
      endDate: listingTournaments.endDate,
      city: listingTournaments.city,
      country: listingTournaments.country,
    })
    .from(listingTournaments)
    .where(eq(listingTournaments.organizationId, organization.id))
    .orderBy(desc(listingTournaments.createdAt));

  // Get elite subscription
  const eliteSubs = await db
    .select()
    .from(platformSubscriptions)
    .where(eq(platformSubscriptions.organizationId, organization.id))
    .orderBy(desc(platformSubscriptions.createdAt))
    .limit(5);

  // Enrich purchases with tournament names
  const tournamentMap = Object.fromEntries(orgTournaments.map(t => [t.id, t.name]));
  const enrichedPurchases = purchases.map(p => ({
    ...p,
    tournamentName: tournamentMap[p.tournamentId] ?? `Tournament #${p.tournamentId}`,
    planName: PLAN_NAMES[p.plan as TournamentPlan] ?? p.plan,
    amountEur: p.amountEurCents / 100,
  }));

  // Compute effective plan for each tournament
  const tournamentsWithPlan = orgTournaments.map(t => {
    const effectivePlan = getEffectivePlan(t.plan as TournamentPlan, org?.eliteSubStatus);
    const limits = PLAN_LIMITS[effectivePlan];
    return {
      ...t,
      effectivePlan,
      planName: PLAN_NAMES[effectivePlan],
      maxDivisions: limits.maxDivisions === Infinity ? "∞" : String(limits.maxDivisions + (t.extraDivisionsPurchased ?? 0)),
      maxTeams: limits.maxTeams === Infinity ? "∞" : String(limits.maxTeams + (t.extraTeamsPurchased ?? 0)),
    };
  });

  return NextResponse.json({
    organization: {
      name: org?.name,
      eliteSubStatus: org?.eliteSubStatus,
      eliteSubPeriodEnd: org?.eliteSubPeriodEnd,
      hasEliteSub: org?.eliteSubStatus === "active" || org?.eliteSubStatus === "trialing",
    },
    tournaments: tournamentsWithPlan,
    purchases: enrichedPurchases,
    eliteSubscriptions: eliteSubs,
    listings: orgListings,
  });
}
