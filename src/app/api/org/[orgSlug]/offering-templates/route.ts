import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizationOfferingTemplates } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { authorizeOrg } from "@/lib/tenant";
import { BUILTIN_TEMPLATE_PRESETS } from "@/lib/offerings/template-presets";

type Params = { orgSlug: string };

// Лениво сеем 8 встроенных пресетов, если для org нет ни одного builtin
// шаблона. Вызывается из GET — даёт UX "открыл страницу — сразу видно 8 карточек".
async function ensureBuiltinsSeeded(organizationId: number) {
  const existing = await db
    .select({ slug: organizationOfferingTemplates.slug })
    .from(organizationOfferingTemplates)
    .where(eq(organizationOfferingTemplates.organizationId, organizationId));
  const existingSlugs = new Set(existing.map((r) => r.slug).filter(Boolean) as string[]);

  const toInsert = BUILTIN_TEMPLATE_PRESETS.filter((p) => !existingSlugs.has(p.slug));
  if (toInsert.length === 0) return;

  await db.insert(organizationOfferingTemplates).values(
    toInsert.map((p) => ({
      organizationId,
      slug: p.slug,
      title: p.title,
      titleRu: p.titleRu,
      titleEt: p.titleEt,
      description: p.description,
      descriptionRu: p.descriptionRu,
      descriptionEt: p.descriptionEt,
      icon: p.icon,
      kind: p.kind,
      inclusion: p.inclusion,
      priceModel: p.priceModel,
      defaultPriceCents: p.defaultPriceCents,
      nightsCount: p.nightsCount,
      sortOrder: p.sortOrder,
      isBuiltin: true,
    }))
  );
}

export async function GET(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const { orgSlug } = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ensureBuiltinsSeeded(organization.id);

  const rows = await db
    .select()
    .from(organizationOfferingTemplates)
    .where(eq(organizationOfferingTemplates.organizationId, organization.id))
    .orderBy(asc(organizationOfferingTemplates.sortOrder), asc(organizationOfferingTemplates.id));

  return NextResponse.json({ templates: rows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  const { orgSlug } = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const [row] = await db.insert(organizationOfferingTemplates).values({
    organizationId: organization.id,
    slug: null, // пользовательские шаблоны без slug
    title,
    titleRu: body.titleRu?.trim() || null,
    titleEt: body.titleEt?.trim() || null,
    description: body.description?.trim() || null,
    descriptionRu: body.descriptionRu?.trim() || null,
    descriptionEt: body.descriptionEt?.trim() || null,
    icon: body.icon?.trim() || null,
    kind: body.kind ?? "single",
    inclusion: body.inclusion ?? "optional",
    priceModel: body.priceModel ?? "per_person",
    defaultPriceCents: Math.max(0, Math.floor(Number(body.defaultPriceCents ?? 0))),
    currency: body.currency?.trim() || "EUR",
    nightsCount: body.nightsCount != null && body.nightsCount !== "" ? Math.floor(Number(body.nightsCount)) : null,
    sortOrder: Number(body.sortOrder ?? 1000),
    isBuiltin: false,
  }).returning();

  return NextResponse.json({ template: row }, { status: 201 });
}
