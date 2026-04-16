/**
 * Stripe webhook for the standalone Draw Show paywall.
 *
 * Handles one event: `checkout.session.completed`. When it fires we
 * pull the pending purchase row by session_id, create the public_draws
 * row + lead + audit event + share-link email, then delete the
 * pending row so the cleanup job never has to touch it.
 *
 * Signature verification uses STRIPE_WEBHOOK_SECRET_DRAW (distinct from
 * the main billing webhook secret — Stripe gives one secret per
 * endpoint). Unverified events are dropped with 400.
 *
 * Idempotency: if the pending row is already gone (e.g. Stripe retries
 * after we succeeded), we 200 without a second side-effect.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { drawPendingPurchases } from "@/db/schema";
import { getStripe } from "@/lib/stripe";
import { createDrawFromWizard } from "@/lib/draw-show/create-draw";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET_DRAW;
  if (!secret) {
    console.error("[draw-webhook] STRIPE_WEBHOOK_SECRET_DRAW not configured");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    console.error("[draw-webhook] signature verification failed", e);
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  // We only act on checkout.session.completed. Stripe sends other
  // events for the same payment (payment_intent.succeeded, etc.) —
  // we acknowledge them with 200 to silence retries but do nothing.
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    console.warn(
      `[draw-webhook] session ${session.id} completed but not paid (${session.payment_status})`,
    );
    return NextResponse.json({ ignored: "unpaid" });
  }

  // Idempotency + state lookup.
  const [pending] = await db
    .select()
    .from(drawPendingPurchases)
    .where(eq(drawPendingPurchases.stripeSessionId, session.id))
    .limit(1);

  if (!pending) {
    console.log(
      `[draw-webhook] no pending row for ${session.id} — already processed`,
    );
    return NextResponse.json({ ok: true, idempotent: true });
  }

  try {
    await createDrawFromWizard({
      state: pending.state,
      email: pending.email,
      organization: pending.organization ?? undefined,
      promoCode: pending.promoCode ?? undefined,
      status: pending.promoCode ? "promo" : "paid",
      ip: pending.ip,
      userAgent: pending.userAgent,
      referrer: pending.referrer,
      locale: pending.locale,
    });
  } catch (e) {
    console.error(
      `[draw-webhook] createDrawFromWizard failed for ${session.id}`,
      e,
    );
    // Don't delete pending — let Stripe retry the webhook so we get
    // another shot at creating the draw.
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  try {
    await db
      .delete(drawPendingPurchases)
      .where(eq(drawPendingPurchases.stripeSessionId, session.id));
  } catch (e) {
    console.error(
      `[draw-webhook] pending cleanup failed for ${session.id}`,
      e,
    );
    // Draw is already created — the leftover row will be picked up by
    // the TTL cleanup. Don't 500 back to Stripe.
  }

  return NextResponse.json({ ok: true });
}
