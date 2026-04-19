import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { offerings, packageContents, teamOfferingDeals } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireV3Tournament } from "@/lib/offerings/guard";

type Params = { orgSlug: string; tournamentId: string; id: string };

// GET — single offering with its children (if package).
export async function GET(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const [row] = await db
    .select()
    .from(offerings)
    .where(and(eq(offerings.id, parseInt(p.id)), eq(offerings.tournamentId, guard.tournament.id)))
    .limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contents = row.kind === "package"
    ? await db.select({ childOfferingId: packageContents.childOfferingId, sortOrder: packageContents.sortOrder })
        .from(packageContents)
        .where(eq(packageContents.packageId, row.id))
        .orderBy(packageContents.sortOrder)
    : [];

  return NextResponse.json({ offering: { ...row, childOfferingIds: contents.map(c => c.childOfferingId) } });
}

// PATCH — partial update. Replaces childOfferingIds wholesale if provided.
export async function PATCH(req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const offeringId = parseInt(p.id);
  const [current] = await db
    .select()
    .from(offerings)
    .where(and(eq(offerings.id, offeringId), eq(offerings.tournamentId, guard.tournament.id)))
    .limit(1);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = { updatedAt: new Date() };

  const allowedStrings = ["title", "titleRu", "titleEt", "description", "descriptionRu", "descriptionEt", "icon"];
  for (const k of allowedStrings) {
    if (k in body) patch[k] = body[k] ?? null;
  }
  if ("inclusion" in body && ["required", "default", "optional"].includes(body.inclusion)) {
    patch.inclusion = body.inclusion;
  }
  if ("priceModel" in body && typeof body.priceModel === "string") patch.priceModel = body.priceModel;
  if ("priceCents" in body) patch.priceCents = Math.max(0, Math.floor(Number(body.priceCents) || 0));
  if ("packagePriceOverrideCents" in body) {
    patch.packagePriceOverrideCents = body.packagePriceOverrideCents == null
      ? null
      : Math.max(0, Math.floor(Number(body.packagePriceOverrideCents)));
  }
  if ("nightsCount" in body) {
    patch.nightsCount = body.nightsCount == null || body.nightsCount === ""
      ? null
      : Math.max(0, Math.floor(Number(body.nightsCount)));
  }
  if ("scopeClassIds" in body) {
    patch.scopeClassIds = Array.isArray(body.scopeClassIds) ? body.scopeClassIds : null;
  }
  if ("availableFrom" in body) patch.availableFrom = body.availableFrom ? new Date(body.availableFrom) : null;
  if ("availableUntil" in body) patch.availableUntil = body.availableUntil ? new Date(body.availableUntil) : null;
  if ("inventoryLimit" in body) {
    patch.inventoryLimit = body.inventoryLimit == null ? null : Math.max(0, Math.floor(Number(body.inventoryLimit)));
  }
  if ("sortOrder" in body) patch.sortOrder = Math.floor(Number(body.sortOrder) || 0);
  if ("isArchived" in body) patch.isArchived = Boolean(body.isArchived);

  const [updated] = await db.update(offerings).set(patch).where(eq(offerings.id, offeringId)).returning();

  // Handle child offerings wholesale replace if provided and this is a package.
  if (updated.kind === "package" && Array.isArray(body.childOfferingIds)) {
    const requested = (body.childOfferingIds as number[]).filter(Number.isInteger).filter(id => id !== offeringId);
    const valid = requested.length > 0
      ? await db
          .select({ id: offerings.id })
          .from(offerings)
          .where(and(eq(offerings.tournamentId, guard.tournament.id), inArray(offerings.id, requested)))
      : [];
    const validIds = valid.map(v => v.id);
    await db.delete(packageContents).where(eq(packageContents.packageId, offeringId));
    if (validIds.length > 0) {
      await db.insert(packageContents).values(
        validIds.map((cid, i) => ({ packageId: offeringId, childOfferingId: cid, sortOrder: i }))
      );
    }
  }

  return NextResponse.json({ offering: updated });
}

// DELETE — hard delete. We used to soft-archive when the offering had
// active deals, but the club kept seeing those deals and that's the
// opposite of what "remove" means to the organiser. FK `ON DELETE CASCADE`
// now wipes the offering, its package_contents, every team_offering_deal
// that references it (plus their dealItemOverrides, dealPayments, etc).
// UI asks for confirmation before calling this — that's enough.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const offeringId = parseInt(p.id);

  // Count dependent deals purely for the response payload — useful for the
  // UI to show a short toast ("1 package + 3 team deals removed").
  const dealRows = await db
    .select({ id: teamOfferingDeals.id })
    .from(teamOfferingDeals)
    .where(eq(teamOfferingDeals.offeringId, offeringId));

  const result = await db
    .delete(offerings)
    .where(and(eq(offerings.id, offeringId), eq(offerings.tournamentId, guard.tournament.id)))
    .returning({ id: offerings.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, cascadedDeals: dealRows.length });
}
