import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { organizations, tournaments, tournamentClasses, tournamentRegistrations, tournamentPurchases } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { getStripeMode } from "@/lib/stripe-mode";
import {
  getEffectivePlan,
  PLAN_LIMITS,
  EXTRA_DIVISION_PRICE_CENTS,
  type TournamentPlan,
} from "@/lib/plan-gates";

function baseUrl(): string {
  const env = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  return env?.replace(/\/$/, "") ?? "https://goality.app";
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { tournamentId } = body as { tournamentId: number };

  if (!tournamentId) {
    return NextResponse.json({ error: "Missing tournamentId" }, { status: 400 });
  }

  // Load tournament + org
  const [tournament] = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      plan: tournaments.plan,
      organizationId: tournaments.organizationId,
      extraTeamsPurchased: tournaments.extraTeamsPurchased,
      extraDivisionsPurchased: tournaments.extraDivisionsPurchased,
    })
    .from(tournaments)
    .where(and(eq(tournaments.id, tournamentId), eq(tournaments.organizationId, session.organizationId!)))
    .limit(1);

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const [org] = await db
    .select({ id: organizations.id, name: organizations.name, stripeCustomerId: organizations.stripeCustomerId, contactEmail: organizations.contactEmail, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, session.organizationId!))
    .limit(1);

  const effectivePlan = getEffectivePlan(tournament.plan as TournamentPlan, undefined);
  const limits = PLAN_LIMITS[effectivePlan];

  // Calculate extras owed
  const [divCountRow] = await db.select({ value: count() }).from(tournamentClasses).where(eq(tournamentClasses.tournamentId, tournamentId));
  const [teamCountRow] = await db.select({ value: count() }).from(tournamentRegistrations).where(eq(tournamentRegistrations.tournamentId, tournamentId));

  const currentDivisions = Number(divCountRow?.value ?? 0);
  const currentTeams     = Number(teamCountRow?.value ?? 0);

  const paidDivisions = limits.maxDivisions === Infinity ? Infinity : limits.maxDivisions + (tournament.extraDivisionsPurchased ?? 0);
  const paidTeams     = limits.maxTeams     === Infinity ? Infinity : limits.maxTeams     + (tournament.extraTeamsPurchased     ?? 0);

  const divisionsOwed = (effectivePlan === "free" || paidDivisions === Infinity) ? 0 : Math.max(0, currentDivisions - paidDivisions);
  const teamsOwed     = (effectivePlan === "free" || paidTeams     === Infinity) ? 0 : Math.max(0, currentTeams     - paidTeams);
  const extraTeamPriceCents = (limits.extraTeamPriceEur ?? 0) * 100;
  const totalCents = divisionsOwed * EXTRA_DIVISION_PRICE_CENTS + teamsOwed * extraTeamPriceCents;

  if (totalCents <= 0) {
    return NextResponse.json({ error: "Nothing owed" }, { status: 400 });
  }

  // Get or create Stripe customer (test-mode safe)
  const isTestMode = getStripeMode() === "test";
  let stripeCustomerId = isTestMode ? null : org.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      email: org.contactEmail ?? undefined,
      metadata: { organizationId: String(org.id), orgSlug: org.slug },
    });
    stripeCustomerId = customer.id;
    if (!isTestMode) {
      await db.update(organizations).set({ stripeCustomerId }).where(eq(organizations.id, org.id));
    }
  }

  const base = baseUrl();
  const lineItems = [];

  if (divisionsOwed > 0) {
    lineItems.push({
      price_data: {
        currency: "eur",
        unit_amount: EXTRA_DIVISION_PRICE_CENTS,
        product_data: { name: `Extra divisions — ${tournament.name}`, description: `${divisionsOwed} extra division(s) beyond plan limit` },
      },
      quantity: divisionsOwed,
    });
  }

  if (teamsOwed > 0) {
    lineItems.push({
      price_data: {
        currency: "eur",
        unit_amount: extraTeamPriceCents,
        product_data: { name: `Extra teams — ${tournament.name}`, description: `${teamsOwed} extra team slot(s) beyond plan limit` },
      },
      quantity: teamsOwed,
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    success_url: `${base}/api/billing/verify-payment?session_id={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(`/en/org/${org.slug}/admin/tournament/${tournamentId}`)}`,
    cancel_url: `${base}/en/org/${org.slug}/admin/tournament/${tournamentId}/billing?payment=cancelled`,
    metadata: {
      type: "extras",
      tournamentId: String(tournamentId),
      organizationId: String(session.organizationId),
      extraDivisions: String(divisionsOwed),
      extraTeams: String(teamsOwed),
    },
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });

  // Record pending purchase
  await db.insert(tournamentPurchases).values({
    tournamentId,
    organizationId: session.organizationId!,
    stripeCheckoutSessionId: checkoutSession.id,
    plan: tournament.plan as TournamentPlan,
    extraTeams: teamsOwed,
    extraDivisions: divisionsOwed,
    amountEurCents: totalCents,
    status: "pending",
    metadata: { type: "extras", orgSlug: org.slug },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
