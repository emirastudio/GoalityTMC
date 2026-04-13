import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { tournaments, tournamentPurchases } from "@/db/schema";
import { eq, sql, and, ne } from "drizzle-orm";

/**
 * GET /api/billing/verify-payment?session_id=cs_xxx&redirect=/en/org/...
 *
 * Called from Stripe success_url redirect. Verifies the checkout session
 * and applies the plan update to the tournament. Works as a reliable
 * fallback when webhooks are not yet delivered (e.g. test mode, slow delivery).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sessionId = searchParams.get("session_id");
  const redirectTo = searchParams.get("redirect") ?? "/";

  if (!sessionId) {
    return NextResponse.redirect(new URL(`${redirectTo}?payment=error`, req.url));
  }

  try {
    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid" || session.mode !== "payment") {
      return NextResponse.redirect(new URL(`${redirectTo}?payment=pending`, req.url));
    }

    const { type, tournamentId, plan, extraTeams, extraDivisions } = session.metadata ?? {};
    if (!tournamentId) {
      return NextResponse.redirect(new URL(`${redirectTo}?payment=success`, req.url));
    }

    const tId = Number(tournamentId);
    const extra    = Number(extraTeams    ?? 0);
    const extraDiv = Number(extraDivisions ?? 0);

    // Check if this session was already processed
    const existing = await db.query.tournamentPurchases.findFirst({
      where: eq(tournamentPurchases.stripeCheckoutSessionId, sessionId),
    });

    if (!existing || existing.status !== "completed") {
      if (type === "extras") {
        // Extras payment: accumulate extra slots and clear payment due date
        await db
          .update(tournaments)
          .set({
            extraTeamsPurchased:     sql`extra_teams_purchased + ${extra}`,
            extraDivisionsPurchased: sql`extra_divisions_purchased + ${extraDiv}`,
            extrasPaymentDue:        null,  // debt cleared
            updatedAt: new Date(),
          })
          .where(eq(tournaments.id, tId));
        console.log(`[Billing] verify-payment: extras paid for tournament ${tId} — +${extraDiv} divs, +${extra} teams`);
      } else {
        // Plan purchase: update plan + accumulate extras
        if (!plan) return NextResponse.redirect(new URL(`${redirectTo}?payment=success`, req.url));
        await db
          .update(tournaments)
          .set({
            plan: plan as "free" | "starter" | "pro" | "elite",
            extraTeamsPurchased:     sql`extra_teams_purchased + ${extra}`,
            extraDivisionsPurchased: sql`extra_divisions_purchased + ${extraDiv}`,
            updatedAt: new Date(),
          })
          .where(eq(tournaments.id, tId));
        console.log(`[Billing] verify-payment: tournament ${tId} activated on plan: ${plan}`);
      }

      // Mark purchase as completed
      await db
        .update(tournamentPurchases)
        .set({
          status: "completed",
          stripePaymentIntentId: session.payment_intent as string ?? null,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tournamentPurchases.stripeCheckoutSessionId, sessionId));
    } else {
      console.log(`[Billing] verify-payment: session ${sessionId} already processed, skipping`);
    }
  } catch (err) {
    console.error("[Billing] verify-payment error:", err);
    // Still redirect on error — webhook may handle it later
  }

  return NextResponse.redirect(new URL(`${redirectTo}?payment=success`, req.url));
}
