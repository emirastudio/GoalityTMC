import { db } from "@/db";
import { organizations, listingTournaments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { PublicNavHeader } from "@/components/ui/public-nav-header";
import {
  Calendar, MapPin, Mail, Phone, Globe, ExternalLink,
  Trophy, Info, Layers, Star,
  Clock, Users, ChevronRight, Shield,
} from "lucide-react";

/* ─── Types ─── */
type AgeGroup = {
  name: string;
  gender: string;
  minBirthYear: number;
  maxBirthYear: number;
};

type Props = {
  params: Promise<{ locale: string; orgSlug: string; listingSlug: string }>;
};

/* ─── Data fetcher (React cache — deduped between generateMetadata & page) ─── */
const getListingData = cache(async (orgSlug: string, listingSlug: string) => {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });
  if (!org) return null;

  const listing = await db.query.listingTournaments.findFirst({
    where: and(
      eq(listingTournaments.slug, listingSlug),
      eq(listingTournaments.organizationId, org.id)
    ),
  });
  if (!listing) return null;

  const isActive =
    listing.subscriptionStatus === "active" ||
    listing.subscriptionStatus === "trialing";
  if (!isActive) return null;

  return { org, listing };
});

/* ─── SEO Metadata ─── */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, orgSlug, listingSlug } = await params;
  const data = await getListingData(orgSlug, listingSlug);
  if (!data) return { title: "Tournament | Goality" };

  const { org, listing } = data;
  // Apply locale translations for metadata too
  const metaTrans = (() => { try { return (listing.translations as Record<string, Record<string, string>>) ?? {}; } catch { return {}; } })();
  const metaLang = metaTrans[locale] ?? {};
  const metaName = metaLang.name || listing.name;
  const metaDesc = metaLang.description || listing.description;

  const title = `${metaName} | ${org.name}`;
  const desc = metaDesc?.slice(0, 160) ??
    `${metaName} — youth football tournament in ${[listing.city, listing.country].filter(Boolean).join(", ")}. Goality TMC.`;
  const imgUrl = listing.coverUrl ?? listing.cardImageUrl ?? listing.logoUrl ?? `https://goality.app/defaults/og-default.jpg`;
  const pageUrl = `https://goality.app/en/t/${orgSlug}/listing/${listingSlug}`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: pageUrl,
      siteName: "Goality TMC",
      type: "website",
      images: [{ url: imgUrl, width: 1200, height: 630, alt: metaName }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [imgUrl],
    },
    alternates: { canonical: pageUrl },
    robots: { index: true, follow: true },
  };
}

/* ─── Helpers ─── */
function fmtDate(d: string | null, locale: string) {
  if (!d) return null;
  return new Date(d + "T12:00:00Z").toLocaleDateString(locale === "ru" ? "ru-RU" : locale === "et" ? "et-EE" : "en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}
function fmtShort(d: string | null) {
  if (!d) return null;
  return new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const BIRTH_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  2008: { bg: "rgba(239,68,68,0.15)",   text: "#F87171",  border: "rgba(239,68,68,0.3)" },
  2009: { bg: "rgba(239,68,68,0.15)",   text: "#F87171",  border: "rgba(239,68,68,0.3)" },
  2010: { bg: "rgba(245,158,11,0.15)",  text: "#FBBF24",  border: "rgba(245,158,11,0.3)" },
  2011: { bg: "rgba(245,158,11,0.15)",  text: "#FBBF24",  border: "rgba(245,158,11,0.3)" },
  2012: { bg: "rgba(16,185,129,0.15)",  text: "#34D399",  border: "rgba(16,185,129,0.3)" },
  2013: { bg: "rgba(16,185,129,0.15)",  text: "#34D399",  border: "rgba(16,185,129,0.3)" },
  2014: { bg: "rgba(59,130,246,0.15)",  text: "#60A5FA",  border: "rgba(59,130,246,0.3)" },
  2015: { bg: "rgba(59,130,246,0.15)",  text: "#60A5FA",  border: "rgba(59,130,246,0.3)" },
  2016: { bg: "rgba(99,102,241,0.15)",  text: "#818CF8",  border: "rgba(99,102,241,0.3)" },
  2017: { bg: "rgba(236,72,153,0.15)",  text: "#EC4899",  border: "rgba(236,72,153,0.3)" },
  2018: { bg: "rgba(20,184,166,0.15)",  text: "#2DD4BF",  border: "rgba(20,184,166,0.3)" },
};
function birthColor(year: number) {
  return BIRTH_COLORS[year] ?? { bg: "rgba(43,254,186,0.12)", text: "#2BFEBA", border: "rgba(43,254,186,0.25)" };
}
function genderLabel(g: string, t: (key: string) => string) {
  if (g === "M") return t("pubBoys");
  if (g === "F") return t("pubGirls");
  return t("pubMixed");
}
function genderEmoji(g: string) {
  if (g === "M") return "👦";
  if (g === "F") return "👧";
  return "⚽";
}
const LEVEL_COLOR: Record<string, string> = {
  Local:         "#94A3B8",
  Regional:      "#60A5FA",
  National:      "#34D399",
  International: "#FBBF24",
};

/* ─── Section card wrapper ─── */
function Section({ title, icon: Icon, accent = false, children }: {
  title: string;
  icon: React.ElementType;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b"
        style={{ borderColor: "var(--cat-card-border)", background: accent ? "rgba(43,254,186,0.04)" : undefined }}>
        <Icon className="w-4 h-4 shrink-0" style={{ color: accent ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
        <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--cat-text-secondary)" }}>
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ─── Page ─── */
export default async function ListingPublicPage({ params }: Props) {
  const { locale, orgSlug, listingSlug } = await params;
  const t = await getTranslations("listing");
  const data = await getListingData(orgSlug, listingSlug);
  if (!data) redirect(`/${locale}/catalog`);

  const { org, listing } = data!;
  const brand = org.brandColor ?? "#2BFEBA";

  // ── Translations (locale-specific content with English fallback) ──
  const allTranslations = (() => {
    try { return (listing.translations as Record<string, Record<string, string>>) ?? {}; } catch { return {}; }
  })();
  const langContent = allTranslations[locale] ?? {};
  const displayName        = langContent.name        || listing.name;
  const displayDescription = langContent.description || listing.description;
  const displayRegulations = langContent.regulations || listing.regulations;
  const displayPricing     = langContent.pricing     || listing.pricing;
  const displayPrizeInfo   = langContent.prizeInfo   || (listing as any).prizeInfo;

  const photos: string[] = (() => { try { return JSON.parse(listing.photos ?? "[]"); } catch { return []; } })();
  const ageGroups: AgeGroup[] = (() => { try { return JSON.parse(listing.ageGroups ?? "[]"); } catch { return []; } })();
  const formats: string[] = (() => {
    try { const r = JSON.parse(listing.formats ?? "[]"); return Array.isArray(r) ? r : []; } catch { return []; }
  })();

  const coverImg = listing.coverUrl ?? photos[0] ?? null;
  const startFmt = fmtDate(listing.startDate, locale);
  const endFmt = fmtDate(listing.endDate, locale);
  const regFmt = fmtDate((listing as any).registrationDeadline, locale);
  const dateLabel = startFmt && endFmt ? `${startFmt} – ${endFmt}` : startFmt ?? endFmt ?? null;
  const dateShort = listing.startDate && listing.endDate
    ? `${fmtShort(listing.startDate)} – ${fmtShort(listing.endDate)}`
    : fmtShort(listing.startDate) ?? null;
  const days = listing.startDate && listing.endDate
    ? Math.ceil((new Date(listing.endDate + "T00:00:00Z").getTime() - new Date(listing.startDate + "T00:00:00Z").getTime()) / 86400000) + 1
    : null;
  const level = (listing as any).level as string | null;
  const venue = (listing as any).venue as string | null;
  const prizeInfo = displayPrizeInfo as string | null;
  const instagram = (listing as any).instagram as string | null;
  const facebook = (listing as any).facebook as string | null;

  // JSON-LD structured data (Event schema)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "name": displayName,
    "description": displayDescription ?? undefined,
    "startDate": listing.startDate ?? undefined,
    "endDate": listing.endDate ?? undefined,
    "url": `https://goality.app/en/t/${orgSlug}/listing/${listingSlug}`,
    ...(coverImg ? { "image": coverImg } : {}),
    "location": {
      "@type": "Place",
      "name": venue ?? [listing.city, listing.country].filter(Boolean).join(", ") ?? org.name,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": listing.city ?? org.city ?? undefined,
        "addressCountry": listing.country ?? org.country ?? undefined,
      },
    },
    "organizer": {
      "@type": "Organization",
      "name": org.name,
      ...(listing.website ? { "url": listing.website.startsWith("http") ? listing.website : `https://${listing.website}` } : {}),
      ...(listing.contactEmail ? { "email": listing.contactEmail } : {}),
    },
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "sport": "Football",
  };

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen" style={{ background: "var(--cat-bg)" }}>
        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <PublicNavHeader />

        {/* ── Cover ── */}
        <div className="relative w-full overflow-hidden" style={{ height: 320 }}>
          {coverImg ? (
            <img src={coverImg} alt={listing.name}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: "center 30%" }}
            />
          ) : (
            <div className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${brand}22 0%, #0A0E14 60%, #0A0E14 100%)` }} />
          )}
          {/* Dark gradient */}
          <div className="absolute inset-0" style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.2) 70%, transparent 100%)"
          }} />
          {/* Brand top glow */}
          <div className="absolute inset-x-0 top-0 h-40 pointer-events-none"
            style={{ background: `radial-gradient(ellipse 70% 140% at 50% -10%, ${brand}20 0%, transparent 70%)` }} />

          {/* Floating title inside cover */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 md:px-0"
            style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div className="flex items-end gap-4">
              {listing.logoUrl && (
                <img src={listing.logoUrl} alt={listing.name}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border-2 shrink-0"
                  style={{ borderColor: `${brand}50` }} />
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{ background: `${brand}25`, color: brand, border: `1px solid ${brand}40` }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: brand }} />
                    {t("pubActiveListing")}
                  </span>
                  {level && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: "rgba(0,0,0,0.4)", color: LEVEL_COLOR[level] ?? "#94A3B8", border: `1px solid ${LEVEL_COLOR[level] ?? "#94A3B8"}40` }}>
                      {level}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl md:text-4xl font-black leading-tight text-white">{displayName}</h1>
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {t("pubBy", { org: org.name })}
                  {dateShort && <> · {dateShort}</>}
                  {listing.city && <> · {listing.city}</>}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick stats strip ── */}
        <div className="border-b" style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
          <div className="w-full md:max-w-[1200px] mx-auto px-4 md:px-6 py-3 flex items-center gap-6 overflow-x-auto text-sm">
            {dateLabel && (
              <div className="flex items-center gap-2 shrink-0">
                <Calendar className="w-4 h-4 shrink-0" style={{ color: brand }} />
                <span style={{ color: "var(--cat-text)" }}>{dateLabel}</span>
              </div>
            )}
            {(listing.city || listing.country) && (
              <div className="flex items-center gap-2 shrink-0">
                <MapPin className="w-4 h-4 shrink-0" style={{ color: brand }} />
                <span style={{ color: "var(--cat-text)" }}>{[listing.city, listing.country].filter(Boolean).join(", ")}</span>
              </div>
            )}
            {days && (
              <div className="flex items-center gap-2 shrink-0">
                <Clock className="w-4 h-4 shrink-0" style={{ color: brand }} />
                <span style={{ color: "var(--cat-text)" }}>{t("pubDay", { count: days })}</span>
              </div>
            )}
            {ageGroups.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <Users className="w-4 h-4 shrink-0" style={{ color: brand }} />
                <span style={{ color: "var(--cat-text)" }}>{t("pubAgeCategories", { count: ageGroups.length })}</span>
              </div>
            )}
            {formats.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <Shield className="w-4 h-4 shrink-0" style={{ color: brand }} />
                <span style={{ color: "var(--cat-text)" }}>{formats.join(" · ")}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="w-full md:max-w-[1200px] mx-auto px-4 md:px-6 py-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">

            {/* ── LEFT SIDEBAR ── */}
            <div className="w-full md:w-72 shrink-0 space-y-4 md:sticky md:top-6">

              {/* Key info card */}
              <div className="rounded-2xl border overflow-hidden"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: "var(--cat-card-border)" }}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--cat-text-muted)" }}>{t("pubTournamentInfo")}</p>
                  <div className="space-y-3">
                    {dateLabel && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: `${brand}15` }}>
                          <Calendar className="w-3.5 h-3.5" style={{ color: brand }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cat-text-muted)" }}>{t("pubDates")}</p>
                          <p className="text-sm font-semibold leading-snug" style={{ color: "var(--cat-text)" }}>{dateLabel}</p>
                        </div>
                      </div>
                    )}
                    {regFmt && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: "rgba(250,204,21,0.12)" }}>
                          <Clock className="w-3.5 h-3.5" style={{ color: "#FACC15" }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cat-text-muted)" }}>{t("pubRegistrationDeadline")}</p>
                          <p className="text-sm font-semibold leading-snug" style={{ color: "#FACC15" }}>{regFmt}</p>
                        </div>
                      </div>
                    )}
                    {(listing.city || listing.country) && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: `${brand}15` }}>
                          <MapPin className="w-3.5 h-3.5" style={{ color: brand }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cat-text-muted)" }}>{t("pubLocation")}</p>
                          <p className="text-sm font-semibold leading-snug" style={{ color: "var(--cat-text)" }}>
                            {[listing.city, listing.country].filter(Boolean).join(", ")}
                          </p>
                          {venue && <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{venue}</p>}
                        </div>
                      </div>
                    )}
                    {level && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: `${LEVEL_COLOR[level] ?? "#94A3B8"}15` }}>
                          <Trophy className="w-3.5 h-3.5" style={{ color: LEVEL_COLOR[level] ?? "#94A3B8" }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cat-text-muted)" }}>{t("pubTournamentLevel")}</p>
                          <p className="text-sm font-semibold" style={{ color: LEVEL_COLOR[level] ?? "#94A3B8" }}>{level}</p>
                        </div>
                      </div>
                    )}
                    {formats.length > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: "rgba(99,102,241,0.12)" }}>
                          <Shield className="w-3.5 h-3.5" style={{ color: "#818CF8" }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cat-text-muted)" }}>{t("pubFormat")}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {formats.map((f, i) => (
                              <span key={i} className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
                                style={{ background: "rgba(99,102,241,0.15)", color: "#818CF8" }}>
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact */}
                <div className="px-5 py-4 space-y-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: "var(--cat-text-muted)" }}>{t("pubContact")}</p>
                  {listing.contactEmail && (
                    <a href={`mailto:${listing.contactEmail}`}
                      className="flex items-center gap-2.5 text-sm hover:opacity-80 transition-opacity"
                      style={{ color: "var(--cat-text-secondary)" }}>
                      <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: brand }} />
                      <span className="truncate">{listing.contactEmail}</span>
                    </a>
                  )}
                  {listing.contactPhone && (
                    <a href={`tel:${listing.contactPhone}`}
                      className="flex items-center gap-2.5 text-sm hover:opacity-80 transition-opacity"
                      style={{ color: "var(--cat-text-secondary)" }}>
                      <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: brand }} />
                      <span>{listing.contactPhone}</span>
                    </a>
                  )}
                  {listing.website && (
                    <a href={listing.website.startsWith("http") ? listing.website : `https://${listing.website}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-sm hover:opacity-80 transition-opacity"
                      style={{ color: "var(--cat-text-secondary)" }}>
                      <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: brand }} />
                      <span className="truncate">{listing.website.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                    </a>
                  )}
                </div>

                {/* Social links */}
                {(instagram || facebook) && (
                  <div className="px-5 pb-4 flex flex-wrap items-center gap-2">
                    {instagram && (
                      <a href={instagram.startsWith("http") ? instagram : `https://instagram.com/${instagram.replace("@","")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                        style={{ background: "rgba(236,72,153,0.12)", color: "#EC4899", border: "1px solid rgba(236,72,153,0.2)" }}>
                        {/* Instagram icon */}
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
                        Instagram
                      </a>
                    )}
                    {facebook && (
                      <a href={facebook.startsWith("http") ? facebook : `https://facebook.com/${facebook}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                        style={{ background: "rgba(59,130,246,0.12)", color: "#60A5FA", border: "1px solid rgba(59,130,246,0.2)" }}>
                        {/* Facebook icon */}
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                        Facebook
                      </a>
                    )}
                  </div>
                )}

                {/* CTA */}
                {listing.contactEmail && (
                  <div className="px-5 pb-5">
                    <a href={`mailto:${listing.contactEmail}`}
                      className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2.5 text-sm font-bold transition-all hover:opacity-90"
                      style={{ background: `linear-gradient(135deg, ${brand}, ${brand}cc)`, color: "#0A0E14" }}>
                      <Mail className="w-4 h-4" />
                      {t("pubContactOrganizer")}
                    </a>
                  </div>
                )}
              </div>

              {/* Organizer card */}
              <div className="rounded-2xl border p-4 flex items-center gap-3"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-sm font-black"
                  style={{ background: `${brand}20`, color: brand }}>
                  {org.logo
                    ? <img src={org.logo} alt={org.name} className="w-full h-full object-cover" />
                    : org.name.charAt(0).toUpperCase()
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate" style={{ color: "var(--cat-text)" }}>{org.name}</p>
                  <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>{t("pubTournamentOrganizer")}</p>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
              </div>

              {/* Back to catalog */}
              <a href="/catalog"
                className="flex items-center justify-center gap-2 w-full rounded-2xl px-4 py-3 text-sm font-medium transition-all hover:opacity-80"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)", border: "1px solid var(--cat-card-border)" }}>
                {t("pubAllTournaments")}
              </a>
            </div>

            {/* ── RIGHT MAIN CONTENT ── */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* About */}
              {displayDescription && (
                <Section title={t("pubAbout")} icon={Info} accent>
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--cat-text-secondary)" }}>
                    {displayDescription}
                  </p>
                </Section>
              )}

              {/* Age Categories */}
              {ageGroups.length > 0 && (
                <Section title={`${t("pubAgeCategories2")} · ${ageGroups.length}`} icon={Layers} accent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ageGroups.map((ag, i) => {
                      const col = birthColor(ag.minBirthYear);
                      const yearLabel = ag.minBirthYear === ag.maxBirthYear
                        ? String(ag.minBirthYear)
                        : `${ag.minBirthYear}–${ag.maxBirthYear}`;
                      return (
                        <div key={i}
                          className="flex items-center gap-3 rounded-2xl p-3.5 transition-all hover:scale-[1.01]"
                          style={{ background: col.bg, border: `1px solid ${col.border}` }}>
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-center font-black text-xs"
                            style={{ background: "rgba(0,0,0,0.2)", color: col.text, backdropFilter: "blur(4px)" }}>
                            {ag.minBirthYear}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-sm truncate" style={{ color: col.text }}>{ag.name}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                              {genderEmoji(ag.gender)} {genderLabel(ag.gender, t)} · {yearLabel}
                            </p>
                            {formats.length > 0 && (
                              <p className="text-[10px] mt-0.5 font-bold" style={{ color: "rgba(255,255,255,0.45)" }}>
                                {formats.join(" / ")}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Prizes */}
              {prizeInfo && (
                <Section title={t("pubPrizes")} icon={Star}>
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--cat-text-secondary)" }}>
                    {prizeInfo}
                  </p>
                </Section>
              )}

              {/* Pricing */}
              {displayPricing && (
                <Section title={t("pubFees")} icon={Trophy}>
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--cat-text-secondary)" }}>
                    {displayPricing}
                  </p>
                </Section>
              )}

              {/* Regulations */}
              {displayRegulations && (
                <Section title={t("pubRegulations")} icon={Shield}>
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--cat-text-secondary)" }}>
                    {displayRegulations}
                  </p>
                </Section>
              )}

              {/* Photo Gallery */}
              {photos.length > 0 && (
                <Section title={t("pubGalleryCount", { count: photos.length })} icon={Info}>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {photos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="block rounded-xl overflow-hidden group"
                        style={{ aspectRatio: "16/10", border: "1px solid var(--cat-card-border)" }}>
                        <img src={url} alt=""
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      </a>
                    ))}
                  </div>
                </Section>
              )}

              {/* CTA banner */}
              {listing.contactEmail && (
                <div className="rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4"
                  style={{ background: `linear-gradient(135deg, ${brand}12, ${brand}05)`, border: `1.5px solid ${brand}30` }}>
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <p className="font-bold" style={{ color: "var(--cat-text)" }}>
                      {t("pubInterestedIn", { name: displayName })}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-secondary)" }}>
                      {t("pubContactToRegister")}
                    </p>
                  </div>
                  <a href={`mailto:${listing.contactEmail}`}
                    className="shrink-0 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all hover:opacity-90"
                    style={{ background: `linear-gradient(135deg, ${brand}, ${brand}cc)`, color: "#0A0E14" }}>
                    <Mail className="w-4 h-4" />
                    {t("pubGetInTouch")}
                  </a>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="border-t mt-8" style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
          <div className="w-full md:max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between text-xs"
            style={{ color: "var(--cat-text-muted)" }}>
            <span>&copy; {new Date().getFullYear()} {org.name}</span>
            <a href="/catalog" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="" className="w-4 h-4 rounded" /> Goality TMC
            </a>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}
