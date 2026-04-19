import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizationOfferingTemplates } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { authorizeOrg } from "@/lib/tenant";

type Params = { orgSlug: string; id: string };

async function authorize(orgSlug: string) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, organization };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<Params> }) {
  const { orgSlug, id } = await params;
  const auth = await authorize(orgSlug);
  if ("error" in auth) return auth.error;

  const templateId = parseInt(id);
  const body = await req.json();
  const updates: Record<string, unknown> = {};

  const textFields = [
    "title", "titleRu", "titleEt",
    "description", "descriptionRu", "descriptionEt",
    "icon", "currency",
  ] as const;
  for (const f of textFields) {
    if (f in body) updates[f] = body[f]?.trim?.() || null;
  }
  // title не может быть null
  if ("title" in updates && !updates.title) {
    return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
  }
  if ("kind" in body) updates.kind = body.kind;
  if ("inclusion" in body) updates.inclusion = body.inclusion;
  if ("priceModel" in body) updates.priceModel = body.priceModel;
  if ("defaultPriceCents" in body) {
    updates.defaultPriceCents = Math.max(0, Math.floor(Number(body.defaultPriceCents ?? 0)));
  }
  if ("nightsCount" in body) {
    updates.nightsCount = body.nightsCount != null && body.nightsCount !== "" ? Math.floor(Number(body.nightsCount)) : null;
  }
  if ("sortOrder" in body) updates.sortOrder = Number(body.sortOrder);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  updates.updatedAt = new Date();

  const [updated] = await db
    .update(organizationOfferingTemplates)
    .set(updates)
    .where(
      and(
        eq(organizationOfferingTemplates.id, templateId),
        eq(organizationOfferingTemplates.organizationId, auth.organization.id),
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ template: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const { orgSlug, id } = await params;
  const auth = await authorize(orgSlug);
  if ("error" in auth) return auth.error;

  const templateId = parseInt(id);
  const [deleted] = await db
    .delete(organizationOfferingTemplates)
    .where(
      and(
        eq(organizationOfferingTemplates.id, templateId),
        eq(organizationOfferingTemplates.organizationId, auth.organization.id),
      )
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
