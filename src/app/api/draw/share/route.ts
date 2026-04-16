/**
 * POST /api/draw/share — persist a ShareableDrawState and hand back a
 * short id the wizard navigates to.
 *
 * Anonymous endpoint (no auth): this backs the standalone /draw
 * product, which is meant for visitors who don't have a Goality
 * account yet. Rate-limiting is left as a TODO; v1 rides on the
 * assumption that the payload is bounded (~8 KB from the wizard) and
 * the volume is low.
 *
 * Shape validation reuses the same isShareableDrawState guard the
 * client encoder uses, so both paths agree on what a valid draw
 * looks like.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  publicDraws,
  publicDrawLeads,
  drawShowEvents,
  drawPromoCodes,
} from "@/db/schema";
import { generateShortId } from "@/lib/draw-show/short-id";
import {
  normalizePromoCode,
  validatePromo,
} from "@/lib/draw-show/promo";
import { sendDrawShareLink } from "@/lib/email";

// Conservative cap so an abusive client can't stuff the table with
// megabyte payloads. The wizard produces a few KB at most.
const MAX_BODY_BYTES = 32 * 1024;

// Loose RFC-5322-ish: just enough to reject obviously bad inputs.
// Strict deliverability check is the user's problem at activation time.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SharePayload = {
  state: unknown;
  email: string;
  consent: boolean;
  organization?: string;
  promoCode?: string;
};

export async function POST(req: NextRequest) {
  // Reject oversized bodies before we even parse JSON.
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

  // Two accepted shapes for backwards-compat:
  //   • new wizard sends { state, email, consent, organization? }
  //   • legacy direct ShareableDrawState (no lead capture)
  // The new shape is required once the wizard is updated; we detect
  // by presence of the `email` key.
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
    if (typeof payload.email !== "string" || !EMAIL_RE.test(payload.email.trim())) {
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
    state = raw;
  }

  // Validate the promo code (if any) BEFORE creating the draw so we
  // never end up with a created row + a failed promo apply.
  let validatedPromo: { code: string; type: string } | null = null;
  if (promoCodeRaw) {
    const codeNorm = normalizePromoCode(promoCodeRaw);
    const [promoRow] = await db
      .select()
      .from(drawPromoCodes)
      .where(eq(drawPromoCodes.code, codeNorm))
      .limit(1);
    const result = validatePromo(promoRow ?? null);
    if (!result.valid) {
      return NextResponse.json(
        { error: "invalid_promo", reason: result.reason },
        { status: 400 },
      );
    }
    validatedPromo = { code: result.code, type: result.discountType };
  }

  if (!isShareableDrawStateShape(state)) {
    return NextResponse.json({ error: "invalid_state_shape" }, { status: 400 });
  }

  // Persist the draw with collision-retried short id, then record the
  // lead + audit event. The two side-tables are best-effort — if they
  // fail we still return the id so the user can run their show.
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
      await db.insert(publicDraws).values({ id, state });

      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      const userAgent = req.headers.get("user-agent") ?? null;
      const referrer = req.headers.get("referer") ?? null;
      const locale =
        req.headers.get("accept-language")?.split(",")[0]?.trim() ?? null;

      if (email && consent) {
        try {
          await db.insert(publicDrawLeads).values({
            drawId: id,
            email,
            organization,
            ip,
            userAgent,
            referrer,
            locale,
          });
        } catch (e) {
          console.error("public_draw_leads insert failed", e);
        }
      }

      try {
        await db.insert(drawShowEvents).values({
          eventType: "created",
          status: validatedPromo ? "promo" : "free_standalone",
          drawId: id,
          email,
          promoCode: validatedPromo?.code ?? null,
          ip,
          userAgent,
          referrer,
          locale,
          meta: {
            organization,
            ...(validatedPromo
              ? { promoDiscountType: validatedPromo.type }
              : {}),
          },
        });
      } catch (e) {
        console.error("draw_show_events insert (created) failed", e);
      }

      // Bump the promo-code use counter once the draw is safely
      // persisted. Best-effort — if the increment fails we've still
      // recorded the use in draw_show_events.
      if (validatedPromo) {
        try {
          await db
            .update(drawPromoCodes)
            .set({
              currentUses: sql`${drawPromoCodes.currentUses} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(drawPromoCodes.code, validatedPromo.code));
        } catch (e) {
          console.error("promo current_uses bump failed", e);
        }
      }

      // Fire-and-forget the share-link email. We don't want a flaky
      // SMTP server to fail the whole submit, so any error is logged
      // but the user still gets their share id back.
      if (email && consent) {
        const stateObj = state as {
          branding?: {
            tournamentName?: string;
            divisionName?: string;
          };
          scheduledAt?: string;
          scheduledAtTz?: string;
        };
        sendDrawShareLink({
          to: email,
          drawId: id,
          tournamentName: stateObj.branding?.tournamentName,
          divisionName: stateObj.branding?.divisionName,
          scheduledAt: stateObj.scheduledAt,
          scheduledAtTz: stateObj.scheduledAtTz,
          organization,
        }).catch((e) => {
          console.error("sendDrawShareLink failed", e);
        });
      }

      return NextResponse.json({ id }, { status: 201 });
    } catch (e) {
      lastError = e;
    }
  }

  // We exhausted retries — surface a 500 rather than an infinite loop.
  console.error("public_draws insert failed after retries", lastError);
  return NextResponse.json({ error: "id_generation_failed" }, { status: 500 });
}

// ─── Local shape guard (mirrors client-side validation) ───────────────

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

  // scheduledAt is optional; when present it's a string (the client
  // writes ISO, we don't bother parsing here — consumers handle it).
  if (
    value.scheduledAt !== undefined &&
    typeof value.scheduledAt !== "string"
  ) {
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
