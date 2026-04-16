/**
 * Promo-code validation + discount math, shared by the public
 * validate endpoint and the share endpoint that records the use.
 *
 * Pure logic — no DB access, no React. Pass in the row and the base
 * price, get back the result. The DB increment of `current_uses` is
 * the caller's responsibility (single transaction with the share
 * insert).
 */

export const DRAW_BASE_PRICE_CENTS = 1100; // €11.00

export type PromoDiscountType = "free" | "percent" | "flat";

export type PromoCodeRow = {
  id: number;
  code: string;
  discountType: string;
  discountValue: number;
  maxUses: number | null;
  currentUses: number;
  validFrom: Date | null;
  validTo: Date | null;
  disabled: boolean;
};

export type PromoValidation =
  | {
      valid: true;
      code: string;
      discountType: PromoDiscountType;
      discountCents: number;
      finalPriceCents: number;
      isFree: boolean;
    }
  | {
      valid: false;
      reason:
        | "not_found"
        | "disabled"
        | "expired"
        | "not_yet_valid"
        | "exhausted"
        | "invalid_shape";
    };

/**
 * Run all the gates against a code row. Returns either a valid result
 * with computed discount or a structured invalid reason for the UI to
 * display the right message.
 */
export function validatePromo(
  row: PromoCodeRow | null,
  basePriceCents: number = DRAW_BASE_PRICE_CENTS,
  now: Date = new Date(),
): PromoValidation {
  if (!row) return { valid: false, reason: "not_found" };
  if (row.disabled) return { valid: false, reason: "disabled" };
  if (row.validFrom && row.validFrom > now) {
    return { valid: false, reason: "not_yet_valid" };
  }
  if (row.validTo && row.validTo < now) {
    return { valid: false, reason: "expired" };
  }
  if (row.maxUses != null && row.currentUses >= row.maxUses) {
    return { valid: false, reason: "exhausted" };
  }

  const dt = row.discountType as PromoDiscountType;
  let discountCents: number;
  switch (dt) {
    case "free":
      discountCents = basePriceCents;
      break;
    case "percent": {
      const pct = Math.max(0, Math.min(100, row.discountValue));
      discountCents = Math.round((basePriceCents * pct) / 100);
      break;
    }
    case "flat":
      discountCents = Math.max(0, Math.min(basePriceCents, row.discountValue));
      break;
    default:
      return { valid: false, reason: "invalid_shape" };
  }
  const finalPriceCents = Math.max(0, basePriceCents - discountCents);
  return {
    valid: true,
    code: row.code,
    discountType: dt,
    discountCents,
    finalPriceCents,
    isFree: finalPriceCents === 0,
  };
}

/** Normalise a user-typed code: strip whitespace, uppercase. */
export function normalizePromoCode(input: string): string {
  return input.trim().toUpperCase();
}
