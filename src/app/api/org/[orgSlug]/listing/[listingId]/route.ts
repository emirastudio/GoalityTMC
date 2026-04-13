import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authorizeOrg } from "@/lib/tenant";
import { db } from "@/db";
import { listingTournaments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { stripe } from "@/lib/stripe";

type ListingUpdate = Partial<typeof listingTournaments.$inferInsert>;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; listingId: string }> }
) {
  const { orgSlug, listingId } = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [listing] = await db.select().from(listingTournaments)
    .where(and(eq(listingTournaments.id, Number(listingId)), eq(listingTournaments.organizationId, organization.id)))
    .limit(1);

  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ listing });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; listingId: string }> }
) {
  const { orgSlug, listingId } = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const updateData: ListingUpdate = { updatedAt: new Date() };
  const allowed = [
    "name", "description", "startDate", "endDate", "country", "city",
    "logoUrl", "coverUrl", "cardImageUrl", "photos", "regulations", "formats", "divisions",
    "pricing", "contactEmail", "contactPhone", "website", "ageGroups",
    "venue", "registrationDeadline", "level", "prizeInfo", "instagram", "facebook",
    "translations",
  ] as const;
  for (const key of allowed) {
    if (key in body) (updateData as Record<string, unknown>)[key] = body[key];
  }

  const [listing] = await db.update(listingTournaments)
    .set(updateData)
    .where(and(eq(listingTournaments.id, Number(listingId)), eq(listingTournaments.organizationId, organization.id)))
    .returning();

  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Sync cancel_at with Stripe if endDate changed
  if ("endDate" in body && listing.stripeSubscriptionId && body.endDate) {
    try {
      const endDate = new Date(body.endDate + "T23:59:59Z");
      const cancelAt = Math.floor(endDate.getTime() / 1000);
      await stripe.subscriptions.update(listing.stripeSubscriptionId, { cancel_at: cancelAt } as any);
    } catch (err) {
      console.error("[Listing] Failed to update Stripe cancel_at:", err);
    }
  }

  return NextResponse.json({ listing });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; listingId: string }> }
) {
  const { orgSlug, listingId } = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [listing] = await db.select({ id: listingTournaments.id, stripeSubscriptionId: listingTournaments.stripeSubscriptionId })
    .from(listingTournaments)
    .where(and(eq(listingTournaments.id, Number(listingId)), eq(listingTournaments.organizationId, organization.id)))
    .limit(1);

  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cancel Stripe subscription if active
  if (listing.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.cancel(listing.stripeSubscriptionId);
    } catch (err) {
      console.error("[Listing] Failed to cancel Stripe sub:", err);
    }
  }

  await db.delete(listingTournaments).where(eq(listingTournaments.id, listing.id));
  return NextResponse.json({ ok: true });
}
