import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getStripeWebhookSecret } from "@/lib/stripe-mode";
import { db } from "@/db";
import {
  organizations,
  tournaments,
  tournamentPurchases,
  platformSubscriptions,
  listingTournaments,
  stripeWebhookEvents,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  // ── 1. Read raw body BEFORE any parsing ──────────────────
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  // ── 2. Verify webhook signature ──────────────────────────
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret()
    );
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── 3. Idempotency — prevent double processing ────────────
  const existing = await db.query.stripeWebhookEvents.findFirst({
    where: eq(stripeWebhookEvents.id, event.id),
  });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // ── 4. Store event BEFORE processing ─────────────────────
  await db.insert(stripeWebhookEvents).values({
    id: event.id,
    type: event.type,
    payload: event.data as unknown as Record<string, unknown>,
  });

  // ── 5. Handle events ──────────────────────────────────────
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "checkout.session.expired":
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        break;
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, err);
    // Return 500 → Stripe will retry
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ─── Handler: One-time tournament purchase ───────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode === "payment") {
    const { tournamentId, plan, extraTeams, extraDivisions } = session.metadata ?? {};
    if (!tournamentId || !plan) return;

    const tId = Number(tournamentId);
    const extra = Number(extraTeams ?? 0);
    const extraDiv = Number(extraDivisions ?? 0);

    // ✅ FIX: ACCUMULATE extra purchases (not overwrite)
    // This prevents losing previously purchased extras on double webhook fire
    await db
      .update(tournaments)
      .set({
        plan: plan as "free" | "starter" | "pro" | "elite",
        extraTeamsPurchased: sql`extra_teams_purchased + ${extra}`,
        extraDivisionsPurchased: sql`extra_divisions_purchased + ${extraDiv}`,
        updatedAt: new Date(),
      })
      .where(eq(tournaments.id, tId));

    // Mark purchase complete
    await db
      .update(tournamentPurchases)
      .set({
        status: "completed",
        stripePaymentIntentId: session.payment_intent as string ?? null,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tournamentPurchases.stripeCheckoutSessionId, session.id));

    console.log(`[Billing] Tournament ${tId} activated on plan: ${plan}`);
  }

  if (session.mode === "subscription") {
    // Subscription created via checkout — handled by customer.subscription.created event
  }
}

// ─── Handler: Checkout session expired (30 min timeout) ─────

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  if (session.mode !== "payment") return;

  // Mark pending purchase as expired so it doesn't pollute transaction history
  await db
    .update(tournamentPurchases)
    .set({ status: "expired", updatedAt: new Date() })
    .where(eq(tournamentPurchases.stripeCheckoutSessionId, session.id));

  console.log(`[Billing] Checkout session expired: ${session.id}`);
}

// ─── Handler: Charge refunded ────────────────────────────────

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string | null;
  if (!paymentIntentId) return;

  // Find the purchase by PaymentIntent ID
  const [purchase] = await db
    .select()
    .from(tournamentPurchases)
    .where(eq(tournamentPurchases.stripePaymentIntentId, paymentIntentId))
    .limit(1);

  if (!purchase) {
    console.log(`[Billing] Refund: no purchase found for PI ${paymentIntentId}`);
    return;
  }

  // Mark purchase as refunded
  await db
    .update(tournamentPurchases)
    .set({ status: "refunded", updatedAt: new Date() })
    .where(eq(tournamentPurchases.id, purchase.id));

  // Revert tournament plan to free and clear purchased extras
  await db
    .update(tournaments)
    .set({
      plan: "free",
      extraTeamsPurchased: 0,
      extraDivisionsPurchased: 0,
      updatedAt: new Date(),
    })
    .where(eq(tournaments.id, purchase.tournamentId));

  console.log(`[Billing] Refund processed: tournament ${purchase.tournamentId} reverted to free`);
}

// ─── Handler: Elite subscription ────────────────────────────

async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  const orgId = sub.metadata?.organizationId;
  if (!orgId) return;

  // Route to listing handler if type === 'listing'
  if (sub.metadata?.type === "listing") {
    await handleListingSubscriptionUpsert(sub);
    return;
  }

  const orgIdNum = Number(orgId);
  const status = sub.status as "active" | "trialing" | "past_due" | "cancelled";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subAny = sub as any;
  const periodEndTs =
    subAny.items?.data?.[0]?.period?.end ??
    subAny.current_period_end ??
    (subAny.billing_cycle_anchor ? subAny.billing_cycle_anchor + 30 * 24 * 3600 : 0);
  const periodStartTs =
    subAny.items?.data?.[0]?.period?.start ??
    subAny.current_period_start ??
    subAny.created ?? 0;
  const periodEnd = new Date(periodEndTs * 1000);
  const periodStart = new Date(periodStartTs * 1000);
  const priceId = sub.items.data[0]?.price.id ?? "";
  const interval = sub.items.data[0]?.price.recurring?.interval ?? "month";

  // Upsert subscription record
  await db
    .insert(platformSubscriptions)
    .values({
      organizationId: orgIdNum,
      stripeSubscriptionId: sub.id,
      stripeCustomerId: sub.customer as string,
      stripePriceId: priceId,
      billingInterval: interval,
      status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      cancelledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    })
    .onConflictDoUpdate({
      target: platformSubscriptions.stripeSubscriptionId,
      set: {
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        cancelledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
        updatedAt: new Date(),
      },
    });

  // Update org-level elite status
  const isActive = status === "active" || status === "trialing";
  await db
    .update(organizations)
    .set({
      eliteSubId: sub.id,
      eliteSubStatus: status as "active" | "trialing" | "past_due" | "cancelled",
      eliteSubPeriodEnd: periodEnd,
      plan: isActive ? "elite" : "free",
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgIdNum));

  console.log(`[Billing] Org ${orgIdNum} Elite subscription: ${status}`);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const orgId = sub.metadata?.organizationId;
  if (!orgId) return;

  // Route to listing handler if type === 'listing'
  if (sub.metadata?.type === "listing") {
    await handleListingSubscriptionDeleted(sub);
    return;
  }

  const orgIdNum = Number(orgId);

  await db
    .update(platformSubscriptions)
    .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
    .where(eq(platformSubscriptions.stripeSubscriptionId, sub.id));

  // ✅ FIX: Reset org.plan to "free" when Elite subscription is cancelled
  await db
    .update(organizations)
    .set({ eliteSubStatus: "cancelled", plan: "free", updatedAt: new Date() })
    .where(eq(organizations.id, orgIdNum));

  console.log(`[Billing] Org ${orgIdNum} Elite subscription cancelled → plan reset to free`);
}

// ─── Handler: Listing subscription upsert ───────────────────

async function handleListingSubscriptionUpsert(sub: Stripe.Subscription) {
  const listingId = sub.metadata?.listingId;
  if (!listingId) return;

  const listingIdNum = Number(listingId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subAny = sub as any;
  const periodEndTs =
    subAny.items?.data?.[0]?.period?.end ??
    subAny.current_period_end ??
    (subAny.billing_cycle_anchor ? subAny.billing_cycle_anchor + 30 * 24 * 3600 : 0);
  const periodEnd = new Date(periodEndTs * 1000);
  const status = sub.status === "active" || sub.status === "trialing" ? "active" : sub.status;

  // Apply cancel_at from metadata if not already set on subscription
  const cancelAt = sub.metadata?.cancelAt ? Number(sub.metadata.cancelAt) : null;
  if (cancelAt && !subAny.cancel_at) {
    try {
      await stripe.subscriptions.update(sub.id, { cancel_at: cancelAt } as any);
    } catch (err) {
      console.error("[Billing] Failed to set cancel_at on listing subscription:", err);
    }
  }

  await db
    .update(listingTournaments)
    .set({
      stripeSubscriptionId: sub.id,
      subscriptionStatus: status,
      subscriptionPeriodEnd: periodEnd,
      updatedAt: new Date(),
    })
    .where(eq(listingTournaments.id, listingIdNum));

  console.log(`[Billing] Listing ${listingIdNum} subscription: ${status}`);
}

async function handleListingSubscriptionDeleted(sub: Stripe.Subscription) {
  const listingId = sub.metadata?.listingId;
  if (!listingId) return;

  await db
    .update(listingTournaments)
    .set({
      subscriptionStatus: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(listingTournaments.id, Number(listingId)));

  console.log(`[Billing] Listing ${listingId} subscription cancelled`);
}

// ─── Handler: Payment failed ─────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentFailed(invoice: any) {
  const subId = invoice.subscription as string | null;
  if (!subId) return;

  // ✅ FIX: Also handle listing subscription payment failures
  // Try listing first (by stripeSubscriptionId stored on listing)
  const listingUpdated = await db
    .update(listingTournaments)
    .set({ subscriptionStatus: "past_due", updatedAt: new Date() })
    .where(eq(listingTournaments.stripeSubscriptionId, subId));

  // If not a listing subscription, handle as Elite org subscription
  await db
    .update(platformSubscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(platformSubscriptions.stripeSubscriptionId, subId));

  await db
    .update(organizations)
    .set({ eliteSubStatus: "past_due", updatedAt: new Date() })
    .where(eq(organizations.eliteSubId, subId));

  console.log(`[Billing] Payment failed for subscription ${subId}`);
}
