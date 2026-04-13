import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authorizeOrg } from "@/lib/tenant";
import { db } from "@/db";
import { listingTournaments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const listings = await db
    .select()
    .from(listingTournaments)
    .where(eq(listingTournaments.organizationId, organization.id))
    .orderBy(listingTournaments.createdAt);
  return NextResponse.json({ listings });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = body.name ?? "New Tournament";

  // Generate unique slug
  let slug = orgSlug;
  let attempt = 0;
  while (true) {
    const candidateSlug = attempt === 0 ? slug : `${slug}-${attempt}`;
    const [taken] = await db
      .select({ id: listingTournaments.id })
      .from(listingTournaments)
      .where(eq(listingTournaments.slug, candidateSlug))
      .limit(1);
    if (!taken) { slug = candidateSlug; break; }
    attempt++;
  }

  const [listing] = await db
    .insert(listingTournaments)
    .values({ organizationId: organization.id, slug, name })
    .returning();

  return NextResponse.json({ listing }, { status: 201 });
}
