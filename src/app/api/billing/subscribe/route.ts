import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe";

function baseUrl(): string {
  const env = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  return env?.replace(/\/$/, "") ?? "https://goality.app";
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const interval = body?.interval; // 'month' | 'year'
  if (!interval || !["month", "year"].includes(interval)) {
    return NextResponse.json({ error: "interval must be 'month' or 'year'" }, { status: 400 });
  }

  const priceId = interval === "year"
    ? process.env.STRIPE_PRICE_ELITE_YEARLY
    : process.env.STRIPE_PRICE_ELITE_MONTHLY;

  if (!priceId) {
    return NextResponse.json({ error: "Elite subscription price not configured" }, { status: 503 });
  }

  const [org] = await db
    .select({ id: organizations.id, name: organizations.name, stripeCustomerId: organizations.stripeCustomerId, contactEmail: organizations.contactEmail, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, session.organizationId!))
    .limit(1);

  let stripeCustomerId = org.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      email: org.contactEmail ?? undefined,
      metadata: { organizationId: String(org.id), orgSlug: org.slug },
    });
    stripeCustomerId = customer.id;
    await db.update(organizations).set({ stripeCustomerId }).where(eq(organizations.id, org.id));
  }

  const base = baseUrl();
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/en/org/${org.slug}/admin/billing?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/en/org/${org.slug}/admin/billing?subscription=cancelled`,
    metadata: {
      organizationId: String(org.id),
      orgSlug: org.slug,
      billingInterval: interval,
    },
    subscription_data: {
      metadata: {
        organizationId: String(org.id),
        orgSlug: org.slug,
      },
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
