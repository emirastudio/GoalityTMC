/**
 * POST /api/draw/share — entry point for the standalone wizard.
 *
 * Three possible outcomes:
 *
 *   • No paywall OR free promo applied OR paywall-disabled env flag →
 *     create the draw immediately, return { id }. Same behaviour the
 *     product had pre-Stripe.
 *
 *   • Paywall enabled + partial/no promo → stash the wizard state in
 *     draw_pending_purchases, create a Stripe Checkout session, return
 *     { checkoutUrl }. The real public_draws row is created by the
 *     Stripe webhook once payment confirms, keyed by session_id.
 *
 *   • Validation error → 400 with a machine-readable reason.
 *
 * The paywall itself is gated behind DRAW_SHOW_PAYWALL_ENABLED=true so
 * the product can ship infrastructure without flipping the customer-
 * facing behaviour. When false (default), every wizard submit takes
 * the free path.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  drawPendingPurchases,
  drawPromoCodes,
} from "@/db/schema";
import {
  DRAW_BASE_PRICE_CENTS,
  normalizePromoCode,
  validatePromo,
} from "@/lib/draw-show/promo";
import { createDrawFromWizard } from "@/lib/draw-show/create-draw";
import { getStripe } from "@/lib/stripe";

const MAX_BODY_BYTES = 32 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SharePayload = {
  state: unknown;
  email: string;
  consent: boolean;
  organization?: string;
  promoCode?: string;
};

export async function POST(req: NextRequest) {
  const len = req.headers.get("content-length");
  if (len && parseInt(len) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const looksWrapped =
    typeof raw === "object" &&
    raw !== null &&
    "email" in (raw as Record<string, unknown>);

  let state: unknown;
  let email: string | null = null;
  let consent = false;
  let organization: string | undefined;
  let promoCodeRaw: string | undefined;

  if (looksWrapped) {
    const payload = raw as SharePayload;
    state = payload.state;
    if (
      typeof payload.email !== "string" ||
      !EMAIL_RE.test(payload.email.trim())
    ) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }
    if (payload.consent !== true) {
      return NextResponse.json({ error: "consent_required" }, { status: 400 });
    }
    email = payload.email.trim().toLowerCase();
    consent = true;
    if (typeof payload.organization === "string") {
      organization = payload.organization.trim() || undefined;
    }
    if (typeof payload.promoCode === "string" && payload.promoCode.trim()) {
      promoCodeRaw = payload.promoCode;
    }
  } else {
    // Legacy shape (no lead capture). Still accepted so anything that
    // already has a saved curl/bookmark keeps working — but we can't
    // email without an address, so these always go free.
    state = raw;
  }

  if (!isShareableDrawStateShape(state)) {
    return NextResponse.json({ error: "invalid_state_shape" }, { status: 400 });
  }

  // Resolve the promo code (if any) up front so both branches below
  // share the same discount math.
  let validatedPromo: ReturnType<typeof validatePromo> = {
    valid: false,
    reason: "not_found",
  };
  if (promoCodeRaw) {
    const codeNorm = normalizePromoCode(promoCodeRaw);
    const [promoRow] = await db
      .select()
      .from(drawPromoCodes)
      .where(eq(drawPromoCodes.code, codeNorm))
      .limit(1);
    validatedPromo = validatePromo(promoRow ?? null);
    if (!validatedPromo.valid) {
      return NextResponse.json(
        { error: "invalid_promo", reason: validatedPromo.reason },
        { status: 400 },
      );
    }
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;
  const referrer = req.headers.get("referer") ?? null;
  const locale =
    req.headers.get("accept-language")?.split(",")[0]?.trim() ?? null;

  // Free path: either the paywall is off globally, no email/consent
  // (legacy), or the applied promo zeroes the price.
  const paywallEnabled = process.env.DRAW_SHOW_PAYWALL_ENABLED === "true";
  const isPaidFlow =
    paywallEnabled &&
    !!email &&
    consent &&
    !(validatedPromo.valid && validatedPromo.isFree);

  if (!isPaidFlow) {
    try {
      const { id } = await createDrawFromWizard({
        state,
        email: email ?? "",
        organization,
        promoCode: validatedPromo.valid ? validatedPromo.code : undefined,
        status: validatedPromo.valid ? "promo" : "free_standalone",
        ip,
        userAgent,
        referrer,
        locale,
      });
      return NextResponse.json({ id }, { status: 201 });
    } catch (e) {
      console.error("[share] createDrawFromWizard failed", e);
      return NextResponse.json({ error: "create_failed" }, { status: 500 });
    }
  }

  // ── Paid path ───────────────────────────────────────────────────
  // Create Stripe Checkout session first, then stash the wizard
  // state in draw_pending_purchases keyed by session id. The
  // webhook completes the draw once Stripe confirms the charge.
  const finalPriceCents = validatedPromo.valid
    ? validatedPromo.finalPriceCents
    : DRAW_BASE_PRICE_CENTS;
  const discountCents = validatedPromo.valid ? validatedPromo.discountCents : 0;
  const origin = new URL(req.url).origin;
  const stripe = getStripe();

  const stateObj = state as {
    branding?: { tournamentName?: string; divisionName?: string };
  };
  const productName =
    stateObj.branding?.tournamentName?.trim() ||
    "Goality Draw Show";

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: finalPriceCents,
            product_data: {
              name: productName,
              description: "Beautiful tournament draw, as a shareable live show.",
            },
          },
          quantity: 1,
        },
      ],
      // Success URL placeholder — we don't know the draw id yet (it's
      // created by the webhook). We redirect to a tiny polling page
      // that waits for the webhook to complete then bounces the user
      // to /draw/created?s=<id>.
      success_url: `${origin}/en/draw/thanks?cs={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/en/draw?payment=cancelled`,
      metadata: {
        flow: "draw_show",
        promoCode: validatedPromo.valid ? validatedPromo.code : "",
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });
  } catch (e) {
    console.error("[share] stripe session create failed", e);
    return NextResponse.json({ error: "stripe_failed" }, { status: 502 });
  }

  try {
    await db.insert(drawPendingPurchases).values({
      stripeSessionId: session.id,
      state,
      email: email!,
      organization,
      promoCode: validatedPromo.valid ? validatedPromo.code : null,
      finalPriceCents,
      discountCents,
      ip,
      userAgent,
      referrer,
      locale,
      expiresAt: new Date(Date.now() + 35 * 60 * 1000),
    });
  } catch (e) {
    console.error("[share] pending purchase insert failed", e);
    return NextResponse.json({ error: "pending_failed" }, { status: 500 });
  }

  return NextResponse.json(
    { checkoutUrl: session.url, sessionId: session.id, finalPriceCents },
    { status: 202 },
  );
}

// ─── Shape guard (mirrors client encoder) ─────────────────────────────

function isShareableDrawStateShape(value: unknown): value is object {
  if (!isRecord(value)) return false;
  if (value.v !== 1) return false;

  const config = value.config;
  if (!isRecord(config)) return false;
  if (
    config.mode !== "groups" &&
    config.mode !== "playoff" &&
    config.mode !== "league" &&
    config.mode !== "groups-playoff"
  ) {
    return false;
  }
  if (config.seedingMode !== "random" && config.seedingMode !== "pots") {
    return false;
  }
  if (typeof config.seed !== "string" || config.seed.length === 0) return false;

  const teams = value.teams;
  if (!Array.isArray(teams)) return false;
  if (teams.length < 2 || teams.length > 128) return false;
  for (const t of teams) {
    if (!isRecord(t)) return false;
    if (typeof t.id !== "string" || t.id.length === 0) return false;
    if (typeof t.name !== "string" || t.name.length === 0) return false;
  }

  if (value.scheduledAt !== undefined && typeof value.scheduledAt !== "string") {
    return false;
  }
  if (
    value.scheduledAtTz !== undefined &&
    typeof value.scheduledAtTz !== "string"
  ) {
    return false;
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
