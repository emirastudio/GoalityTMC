import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authorizeOrg } from "@/lib/tenant";
import { db } from "@/db";
import { organizations, listingTournaments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe";

function baseUrl(): string {
  const env =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL;
  return env?.replace(/\/$/, "") ?? "https://goality.app";
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

  // Fetch listing
  const [listing] = await db
    .select()
    .from(listingTournaments)
    .where(eq(listingTournaments.organizationId, organization.id))
    .limit(1);

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (!listing.endDate) {
    return NextResponse.json(
      { error: "Please set a tournament end date before subscribing" },
      { status: 400 }
    );
  }

  const priceId = process.env.STRIPE_PRICE_LISTING_MONTHLY;
  if (!priceId) {
    return NextResponse.json(
      { error: "Listing price not configured" },
      { status: 503 }
    );
  }

  // Get or create Stripe customer
  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      stripeCustomerId: organizations.stripeCustomerId,
      contactEmail: organizations.contactEmail,
      slug: organizations.slug,
    })
    .from(organizations)
    .where(eq(organizations.id, organization.id))
    .limit(1);

  let stripeCustomerId = org.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      email: org.contactEmail ?? undefined,
      metadata: {
        organizationId: String(org.id),
        orgSlug: org.slug,
      },
    });
    stripeCustomerId = customer.id;
    await db
      .update(organizations)
      .set({ stripeCustomerId })
      .where(eq(organizations.id, org.id));
  }

  // Calculate cancel_at: end of tournament end date (midnight UTC)
  const endDate = new Date(listing.endDate + "T23:59:59Z");
  const cancelAt = Math.floor(endDate.getTime() / 1000);

  const base = baseUrl();
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/en/org/${org.slug}/admin/listing?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/en/org/${org.slug}/admin/listing?subscription=cancelled`,
    metadata: {
      organizationId: String(org.id),
      orgSlug: org.slug,
      listingId: String(listing.id),
      type: "listing",
    },
    subscription_data: {
      metadata: {
        organizationId: String(org.id),
        orgSlug: org.slug,
        listingId: String(listing.id),
        type: "listing",
        cancelAt: String(cancelAt), // applied via webhook after subscription created
      },
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
