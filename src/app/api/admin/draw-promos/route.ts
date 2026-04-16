/**
 * Superadmin promo-code list + create endpoint.
 *
 * GET  → all codes ordered by created_at desc, plus a small summary
 *        (total active, total uses across all codes).
 * POST → create a new code. Validates shape + ensures uniqueness.
 */

import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { drawPromoCodes } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { normalizePromoCode } from "@/lib/draw-show/promo";

const VALID_TYPES = ["free", "percent", "flat"] as const;

async function requireSuper() {
  const session = await getSession();
  if (!session || session.role !== "admin" || !session.isSuper) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireSuper();
  if (!session) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const rows = await db
    .select()
    .from(drawPromoCodes)
    .orderBy(desc(drawPromoCodes.createdAt));

  const [agg] = await db
    .select({
      activeCount: sql<number>`sum(case when disabled = false then 1 else 0 end)::int`,
      totalUses: sql<number>`sum(current_uses)::int`,
    })
    .from(drawPromoCodes);

  return NextResponse.json({
    promos: rows,
    summary: {
      activeCount: agg?.activeCount ?? 0,
      totalUses: agg?.totalUses ?? 0,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await requireSuper();
  if (!session) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: {
    code?: string;
    discountType?: string;
    discountValue?: number;
    maxUses?: number | null;
    validFrom?: string | null;
    validTo?: string | null;
    notes?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const code = normalizePromoCode(body.code ?? "");
  if (!code || code.length < 3 || code.length > 32) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }
  const dt = body.discountType ?? "";
  if (!VALID_TYPES.includes(dt as (typeof VALID_TYPES)[number])) {
    return NextResponse.json({ error: "invalid_discount_type" }, { status: 400 });
  }
  const dv = Number(body.discountValue ?? 0);
  if (!Number.isFinite(dv) || dv < 0) {
    return NextResponse.json({ error: "invalid_discount_value" }, { status: 400 });
  }

  // Idempotency: same code → 409 with the existing row.
  const [existing] = await db
    .select({ id: drawPromoCodes.id })
    .from(drawPromoCodes)
    .where(eq(drawPromoCodes.code, code))
    .limit(1);
  if (existing) {
    return NextResponse.json(
      { error: "code_already_exists", id: existing.id },
      { status: 409 },
    );
  }

  const [row] = await db
    .insert(drawPromoCodes)
    .values({
      code,
      discountType: dt,
      discountValue: dt === "free" ? 0 : Math.floor(dv),
      maxUses:
        body.maxUses == null
          ? null
          : Number.isFinite(body.maxUses)
            ? Math.max(1, Math.floor(body.maxUses))
            : null,
      validFrom: body.validFrom ? new Date(body.validFrom) : null,
      validTo: body.validTo ? new Date(body.validTo) : null,
      notes: body.notes?.trim() || null,
      createdBy: typeof session.userId === "number" ? session.userId : null,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
