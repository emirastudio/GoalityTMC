import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { organizations, tournaments, tournamentPurchases } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { getStripeMode } from "@/lib/stripe-mode";
import {
  PLAN_PRICES_EUR_CENTS,
  EXTRA_DIVISION_PRICE_CENTS,
  PLAN_NAMES,
  calculateTotalPrice,
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
  if (!body?.tournamentId || !body?.plan) {
    return NextResponse.json({ error: "Missing tournamentId or plan" }, { status: 400 });
  }

  const { tournamentId, plan, extraTeams = 0, extraDivisions = 0, waiverAcceptedAt, waiverVersion } = body as {
    tournamentId: number;
    plan: TournamentPlan;
    extraTeams?: number;
    extraDivisions?: number;
    waiverAcceptedAt?: string;
    waiverVersion?: string;
  };

  if (!["starter", "pro", "elite"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // EU Consumer Rights Directive 2011/83/EU Art. 16(m): mandatory waiver
  // to disable the 14-day right of withdrawal for digital services.
  // Reject the checkout if the client didn't record the acceptance.
  if (!waiverAcceptedAt || !waiverVersion) {
    return NextResponse.json({ error: "Waiver acceptance required" }, { status: 400 });
  }

  // Verify tournament belongs to this org
  const [tournament] = await db
    .select({ id: tournaments.id, name: tournaments.name, organizationId: tournaments.organizationId, slug: tournaments.slug })
    .from(tournaments)
    .where(and(eq(tournaments.id, tournamentId), eq(tournaments.organizationId, session.organizationId!)))
    .limit(1);

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  // Get or create Stripe customer for this org
  const [org] = await db
    .select({ id: organizations.id, name: organizations.name, stripeCustomerId: organizations.stripeCustomerId, contactEmail: organizations.contactEmail, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, session.organizationId!))
    .limit(1);

  // In test mode, never reuse the LIVE customer ID from DB (different Stripe environment).
  // Create a temporary test customer but don't persist it.
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
      // Only persist customer IDs from live mode
      await db.update(organizations).set({ stripeCustomerId }).where(eq(organizations.id, org.id));
    }
  }

  const amountCents = calculateTotalPrice(plan, extraTeams) + (extraDivisions * EXTRA_DIVISION_PRICE_CENTS);
  const planLabel = PLAN_NAMES[plan];
  const base = baseUrl();

  // Build line items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineItems: any[] = [
    {
      price_data: {
        currency: "eur",
        unit_amount: PLAN_PRICES_EUR_CENTS[plan as keyof typeof PLAN_PRICES_EUR_CENTS],
        product_data: {
          name: `${planLabel} Plan — ${tournament.name}`,
          description: `Goality TMC ${planLabel} plan for tournament "${tournament.name}"`,
        },
      },
      quantity: 1,
    },
  ];

  if (extraTeams > 0) {
    const extraTeamPriceCents = plan === "starter" ? 100 : 200; // €1 or €2
    lineItems.push({
      price_data: {
        currency: "eur",
        unit_amount: extraTeamPriceCents,
        product_data: {
          name: `Extra teams (×${extraTeams})`,
          description: `Additional team slots beyond plan limit`,
        },
      },
      quantity: extraTeams,
    });
  }

  if (extraDivisions > 0) {
    lineItems.push({
      price_data: {
        currency: "eur",
        unit_amount: EXTRA_DIVISION_PRICE_CENTS,
        product_data: {
          name: `Extra divisions (×${extraDivisions})`,
          description: `Additional division slots beyond plan limit`,
        },
      },
      quantity: extraDivisions,
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    success_url: `${base}/api/billing/verify-payment?session_id={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(`/${session.organizationSlug ? `en/org/${session.organizationSlug}/admin/tournament/${tournamentId}` : "en/admin/dashboard"}`)}`,
    cancel_url: `${base}/en/org/${session.organizationSlug}/admin/tournament/${tournamentId}/billing?payment=cancelled`,
    metadata: {
      tournamentId: String(tournamentId),
      organizationId: String(session.organizationId),
      plan,
      extraTeams: String(extraTeams),
      extraDivisions: String(extraDivisions),
      // Legal audit trail — EU Consumer Rights Directive Art. 16(m).
      waiverAcceptedAt,
      waiverVersion,
      waiverIp:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "unknown",
    },
    client_reference_id: String(tournamentId),
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min
  });

  // Record pending purchase
  await db.insert(tournamentPurchases).values({
    tournamentId,
    organizationId: session.organizationId!,
    stripeCheckoutSessionId: checkoutSession.id,
    plan,
    extraTeams,
    extraDivisions,
    amountEurCents: amountCents,
    status: "pending",
    metadata: { orgSlug: org.slug },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
