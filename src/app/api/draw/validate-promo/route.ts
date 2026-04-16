/**
 * POST /api/draw/validate-promo
 *
 * Public endpoint the wizard hits when the user types a promo code.
 * Returns the parsed discount (price after, free or not) so the UI
 * can show "−€11 · Free" instantly. Does NOT consume the code — only
 * the share endpoint does that on actual submit.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { drawPromoCodes } from "@/db/schema";
import {
  normalizePromoCode,
  validatePromo,
  DRAW_BASE_PRICE_CENTS,
} from "@/lib/draw-show/promo";

export async function POST(req: NextRequest) {
  let body: { code?: string };
  try {
    body = (await req.json()) as { code?: string };
  } catch {
    return NextResponse.json({ valid: false, reason: "invalid_json" }, { status: 400 });
  }

  const code = body.code ? normalizePromoCode(body.code) : "";
  if (!code) {
    return NextResponse.json({ valid: false, reason: "empty" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(drawPromoCodes)
    .where(eq(drawPromoCodes.code, code))
    .limit(1);

  const result = validatePromo(row ?? null);
  return NextResponse.json({
    ...result,
    basePriceCents: DRAW_BASE_PRICE_CENTS,
  });
}
