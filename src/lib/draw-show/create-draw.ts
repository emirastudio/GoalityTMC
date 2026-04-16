/**
 * Shared helper that actually writes a draw + its lead + its audit
 * event + fires the email. Called from two places:
 *
 *   1. /api/draw/share — free flow (paywall off, or free promo),
 *      writes the draw immediately.
 *   2. /api/draw/stripe-webhook — paid flow, called on
 *      checkout.session.completed with the state previously stored
 *      in draw_pending_purchases.
 *
 * Having one helper means the two paths produce byte-identical rows
 * in public_draws, public_draw_leads and draw_show_events, which keeps
 * superadmin dashboards consistent.
 */

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  publicDraws,
  publicDrawLeads,
  drawShowEvents,
  drawPromoCodes,
} from "@/db/schema";
import { generateShortId } from "./short-id";
import { sendDrawShareLink } from "@/lib/email";

export type CreateDrawInput = {
  state: unknown;
  email: string;
  organization?: string;
  promoCode?: string;
  /**
   * Which monetization tier this draw belongs to. Mirrors the
   * `status` column on draw_show_events so the superadmin funnel
   * is readable at a glance.
   */
  status: "free_standalone" | "free_plan" | "paid" | "promo";
  ip?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
  locale?: string | null;
};

export type CreateDrawResult = { id: string };

/**
 * Insert a public_draws row with a collision-retried short id, then
 * best-effort write the lead + audit event + promo counter bump + the
 * share-link email. Never throws for side-effect failures — only the
 * draw itself is load-bearing; side tables are advisory.
 */
export async function createDrawFromWizard(
  input: CreateDrawInput,
): Promise<CreateDrawResult> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 4; attempt++) {
    const id = generateShortId();
    try {
      const existing = await db
        .select({ id: publicDraws.id })
        .from(publicDraws)
        .where(eq(publicDraws.id, id))
        .limit(1);
      if (existing.length > 0) continue;

      await db.insert(publicDraws).values({ id, state: input.state });

      try {
        await db.insert(publicDrawLeads).values({
          drawId: id,
          email: input.email,
          organization: input.organization,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
          referrer: input.referrer ?? null,
          locale: input.locale ?? null,
        });
      } catch (e) {
        console.error("[create-draw] lead insert failed", e);
      }

      try {
        await db.insert(drawShowEvents).values({
          eventType: "created",
          status: input.status,
          drawId: id,
          email: input.email,
          promoCode: input.promoCode ?? null,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
          referrer: input.referrer ?? null,
          locale: input.locale ?? null,
          meta: { organization: input.organization },
        });
      } catch (e) {
        console.error("[create-draw] event insert failed", e);
      }

      if (input.promoCode) {
        try {
          await db
            .update(drawPromoCodes)
            .set({
              currentUses: sql`${drawPromoCodes.currentUses} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(drawPromoCodes.code, input.promoCode));
        } catch (e) {
          console.error("[create-draw] promo counter bump failed", e);
        }
      }

      const stateObj = input.state as {
        branding?: { tournamentName?: string; divisionName?: string };
        scheduledAt?: string;
        scheduledAtTz?: string;
      };
      console.log(
        `[create-draw] emailing ${input.email} for ${id} (${input.status})`,
      );
      sendDrawShareLink({
        to: input.email,
        drawId: id,
        tournamentName: stateObj.branding?.tournamentName,
        divisionName: stateObj.branding?.divisionName,
        scheduledAt: stateObj.scheduledAt,
        scheduledAtTz: stateObj.scheduledAtTz,
        organization: input.organization,
      })
        .then(() => {
          console.log(`[create-draw] email sent to ${input.email}`);
        })
        .catch((e) => {
          console.error(`[create-draw] email failed for ${input.email}:`, e);
        });

      return { id };
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError ?? new Error("create_draw_failed");
}
