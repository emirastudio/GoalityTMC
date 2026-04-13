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

  const [org] = await db
    .select({ stripeCustomerId: organizations.stripeCustomerId, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, session.organizationId!))
    .limit(1);

  if (!org.stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 });
  }

  const base = baseUrl();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${base}/en/org/${org.slug}/admin/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
