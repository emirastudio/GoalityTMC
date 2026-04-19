import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizationOfferingTemplates } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { authorizeOrg } from "@/lib/tenant";
import { BUILTIN_TEMPLATE_PRESETS } from "@/lib/offerings/template-presets";

type Params = { orgSlug: string };

// POST — «Восстановить стандартные». Вставляет 8 builtin-шаблонов,
// которых сейчас нет (по slug). Существующие (даже отредактированные)
// не трогаются — иначе организатор потеряет свои правки.
export async function POST(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const { orgSlug } = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await db
    .select({ slug: organizationOfferingTemplates.slug })
    .from(organizationOfferingTemplates)
    .where(
      and(
        eq(organizationOfferingTemplates.organizationId, organization.id),
        eq(organizationOfferingTemplates.isBuiltin, true),
      )
    );
  const existingSlugs = new Set(existing.map((r) => r.slug).filter(Boolean) as string[]);

  const toInsert = BUILTIN_TEMPLATE_PRESETS.filter((p) => !existingSlugs.has(p.slug));
  if (toInsert.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }

  await db.insert(organizationOfferingTemplates).values(
    toInsert.map((p) => ({
      organizationId: organization.id,
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

  return NextResponse.json({ ok: true, inserted: toInsert.length });
}
