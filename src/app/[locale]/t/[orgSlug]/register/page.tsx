import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { tournaments, organizations } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { cache } from "react";
import type { Metadata } from "next";

const BASE = "https://goalityfootball.com";

// Short registration link: /<locale>/t/<slug>/register
//
// "orgSlug" is reused here as the TOURNAMENT slug (Next.js rule: same
// dynamic-param name at the same path depth). Short, poster/QR/social
// friendly URL → canonical /<locale>/t/<orgSlug>/<slug>/register.
//
// generateMetadata still emits full Open Graph / Twitter tags so social
// unfurlers (Telegram etc.) that fetch the short URL get the title,
// description and cover even though browsers are 307-redirected to the
// canonical page. (Returning JSX here triggered a Next.js route-group
// client-reference-manifest invariant, so we keep the bare redirect.)

const resolve = cache(async (slug: string) => {
  const t = await db.query.tournaments.findFirst({
    where: and(eq(tournaments.slug, slug), isNull(tournaments.deletedAt)),
  });
  if (!t) return null;
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, t.organizationId),
  });
  if (!org) return null;
  return { t, org };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string }>;
}): Promise<Metadata> {
  const { locale, orgSlug: slug } = await params;
  const data = await resolve(slug);
  if (!data) return {};
  const { t, org } = data;

  const title = `${t.name} ${t.year} — Registration | ${org.name}`;
  const metaCity = (t.city && t.city.trim()) ? t.city : org.city;
  const description = t.description
    ?? `Register your team for ${t.name} ${t.year}${metaCity ? ` in ${metaCity}` : ""}. Quick online registration via Goality.`;
  const coverImage = t.coverUrl ?? t.cardImageUrl ?? `${BASE}/defaults/tournament-cover-default.jpg`;
  const shortUrl = `${BASE}/${locale}/t/${slug}/register`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: shortUrl,
      siteName: "Goality TMC",
      images: [{ url: coverImage, width: 1200, height: 630, alt: t.name }],
      type: "website",
      locale: locale === "ru" ? "ru_RU" : locale === "et" ? "et_EE" : locale === "es" ? "es_ES" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [coverImage],
    },
    robots: { index: true, follow: true },
  };
}

export default async function ShortTournamentRegister({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string }>;
}) {
  const { locale, orgSlug: slug } = await params;
  const data = await resolve(slug);
  if (!data) notFound();
  redirect(`/${locale}/t/${data.org.slug}/${data.t.slug}/register`);
}
