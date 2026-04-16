/**
 * Superadmin: update or delete a single promo code.
 *
 * PATCH  → toggle disabled, edit notes / validity / max uses.
 * DELETE → hard delete. We don't soft-delete; the audit history of
 *          which codes were used lives in draw_show_events.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { drawPromoCodes } from "@/db/schema";
import { getSession } from "@/lib/auth";

type Params = { id: string };

const VALID_TYPES = ["free", "percent", "flat"] as const;

async function requireSuper() {
  const session = await getSession();
  if (!session || session.role !== "admin" || !session.isSuper) return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  if (!(await requireSuper())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  let body: {
    discountType?: string;
    discountValue?: number;
    maxUses?: number | null;
    validFrom?: string | null;
    validTo?: string | null;
    disabled?: boolean;
    notes?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const patch: Partial<typeof drawPromoCodes.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (body.discountType != null) {
    if (!VALID_TYPES.includes(body.discountType as (typeof VALID_TYPES)[number])) {
      return NextResponse.json({ error: "invalid_discount_type" }, { status: 400 });
    }
    patch.discountType = body.discountType;
  }
  if (body.discountValue != null) {
    const dv = Number(body.discountValue);
    if (!Number.isFinite(dv) || dv < 0) {
      return NextResponse.json({ error: "invalid_discount_value" }, { status: 400 });
    }
    patch.discountValue = Math.floor(dv);
  }
  if (body.maxUses !== undefined) {
    patch.maxUses =
      body.maxUses == null
        ? null
        : Number.isFinite(body.maxUses)
          ? Math.max(1, Math.floor(body.maxUses))
          : null;
  }
  if (body.validFrom !== undefined) {
    patch.validFrom = body.validFrom ? new Date(body.validFrom) : null;
  }
  if (body.validTo !== undefined) {
    patch.validTo = body.validTo ? new Date(body.validTo) : null;
  }
  if (body.disabled != null) {
    patch.disabled = !!body.disabled;
  }
  if (body.notes !== undefined) {
    patch.notes = body.notes?.trim() || null;
  }

  const [row] = await db
    .update(drawPromoCodes)
    .set(patch)
    .where(eq(drawPromoCodes.id, id))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  if (!(await requireSuper())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  await db.delete(drawPromoCodes).where(eq(drawPromoCodes.id, id));
  return new NextResponse(null, { status: 204 });
}
