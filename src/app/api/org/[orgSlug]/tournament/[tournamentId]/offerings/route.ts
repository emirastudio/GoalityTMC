import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { offerings, packageContents } from "@/db/schema";
import { and, eq, asc, inArray } from "drizzle-orm";
import { requireV3Tournament } from "@/lib/offerings/guard";

type Params = { orgSlug: string; tournamentId: string };

// GET — list all offerings for the tournament, with children inlined for packages.
export async function GET(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const rows = await db
    .select()
    .from(offerings)
    .where(eq(offerings.tournamentId, guard.tournament.id))
    .orderBy(asc(offerings.sortOrder), asc(offerings.id));

  const packageIds = rows.filter(r => r.kind === "package").map(r => r.id);
  type ContentRow = {
    packageId: number;
    childOfferingId: number;
    sortOrder: number;
  };
  let contents: ContentRow[] = [];
  if (packageIds.length > 0) {
    contents = await db
      .select({
        packageId: packageContents.packageId,
        childOfferingId: packageContents.childOfferingId,
        sortOrder: packageContents.sortOrder,
      })
      .from(packageContents)
      .where(inArray(packageContents.packageId, packageIds))
      .orderBy(asc(packageContents.sortOrder));
  }

  const childrenByPackage: Record<number, number[]> = {};
  for (const c of contents) {
    (childrenByPackage[c.packageId] ??= []).push(c.childOfferingId);
  }

  const enriched = rows.map(r => ({
    ...r,
    childOfferingIds: r.kind === "package" ? (childrenByPackage[r.id] ?? []) : [],
  }));

  return NextResponse.json({ offerings: enriched });
}

// POST — create offering. Body fields are deliberately forgiving; unknown fields
// are ignored so old clients don't break when we extend the schema.
export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const guard = await requireV3Tournament({ orgSlug: p.orgSlug, tournamentId: parseInt(p.tournamentId) });
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const [row] = await db.insert(offerings).values({
    tournamentId: guard.tournament.id,
    kind: body.kind === "package" ? "package" : "single",
    inclusion:
      body.inclusion === "required" || body.inclusion === "default" ? body.inclusion : "optional",
    title,
    titleRu: body.titleRu ?? null,
    titleEt: body.titleEt ?? null,
    description: body.description ?? null,
    descriptionRu: body.descriptionRu ?? null,
    descriptionEt: body.descriptionEt ?? null,
    icon: typeof body.icon === "string" ? body.icon.slice(0, 16) : null,
    priceModel: body.priceModel ?? "per_person",
    priceCents: Math.max(0, Math.floor(Number(body.priceCents) || 0)),
    currency: typeof body.currency === "string" ? body.currency.slice(0, 3) : "EUR",
    packagePriceOverrideCents:
      body.packagePriceOverrideCents == null ? null : Math.max(0, Math.floor(Number(body.packagePriceOverrideCents))),
    nightsCount:
      body.nightsCount == null || body.nightsCount === "" ? null : Math.max(0, Math.floor(Number(body.nightsCount))),
    scopeClassIds: Array.isArray(body.scopeClassIds) ? body.scopeClassIds : null,
    availableFrom: body.availableFrom ? new Date(body.availableFrom) : null,
    availableUntil: body.availableUntil ? new Date(body.availableUntil) : null,
    inventoryLimit: body.inventoryLimit == null ? null : Math.max(0, Math.floor(Number(body.inventoryLimit))),
    sortOrder: Math.floor(Number(body.sortOrder) || 0),
  }).returning();

  // For packages, accept an initial list of child offering IDs.
  if (row.kind === "package" && Array.isArray(body.childOfferingIds) && body.childOfferingIds.length > 0) {
    const children = (body.childOfferingIds as number[]).filter((x) => Number.isInteger(x));
    if (children.length > 0) {
      // Sanity check — only children from the same tournament.
      const valid = await db
        .select({ id: offerings.id })
        .from(offerings)
        .where(and(eq(offerings.tournamentId, guard.tournament.id), inArray(offerings.id, children)));
      const validIds = new Set(valid.map(v => v.id));
      const toInsert = children.filter(c => validIds.has(c) && c !== row.id);
      if (toInsert.length > 0) {
        await db.insert(packageContents).values(
          toInsert.map((cid, i) => ({ packageId: row.id, childOfferingId: cid, sortOrder: i }))
        );
      }
    }
  }

  return NextResponse.json({ offering: row }, { status: 201 });
}
