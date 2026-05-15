import { notFound } from "next/navigation";
import { db } from "@/db";
import { tournaments, organizations } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { cache } from "react";
import type { Metadata } from "next";

const BASE = "https://goalityfootball.com";

// Short registration link: /<locale>/t/<slug>/register
//
// "orgSlug" is reused here as the TOURNAMENT slug (Next.js rule: same
// dynamic-param name at the same path depth). This is the short,
// poster/QR/social-friendly URL we hand out.
//
// We do NOT use redirect() here: redirect() returns a bare 307 with no
// HTML <head>, so Telegram/Facebook/etc. link unfurlers see no title,
// description or cover image. Instead we render a minimal HTML page that
// (a) carries full Open Graph / Twitter metadata for crawlers and
// (b) instantly forwards real browsers to the canonical register URL.

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
  const { t, org } = data;

  const target = `/${locale}/t/${org.slug}/${t.slug}/register`;

  // No <html>/<head>/<body> — the root layout owns those. Crawlers read
  // OG tags from generateMetadata (injected into the root <head>). Real
  // browsers hit the inline script and forward instantly; the visible
  // link is the no-JS / crawler fallback.
  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: `location.replace(${JSON.stringify(target)});` }}
      />
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column", gap: 12,
        background: "#0A0E14", color: "#fff", fontFamily: "system-ui, sans-serif",
      }}>
        <p style={{ opacity: 0.7, fontSize: 14 }}>Redirecting to registration…</p>
        <a href={target} style={{ color: "#2BFEBA", fontWeight: 700, textDecoration: "none" }}>
          {t.name} {t.year} — Continue →
        </a>
      </div>
    </>
  );
}
