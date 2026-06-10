import { db } from "@/db";
import { organizations, tournaments, tournamentClasses, teams, tournamentRegistrations, tournamentInfo, tournamentFollowers } from "@/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { TournamentPublicProvider } from "@/lib/tournament-public-context";
import { PublicNavHeader } from "@/components/ui/public-nav-header";
import { TournamentSidebar } from "@/components/tournament/tournament-sidebar";
import { TournamentMobileTabs } from "@/components/tournament/tournament-mobile-tabs";
import { getSession } from "@/lib/auth";

const BASE = "https://goalityfootball.com";

const fetchTournamentData = cache(async (orgSlug: string, tournamentSlug: string) => {
  const org = await db.query.organizations.findFirst({ where: eq(organizations.slug, orgSlug) });
  if (!org) return null;
  const tournament = await db.query.tournaments.findFirst({
    where: and(eq(tournaments.organizationId, org.id), eq(tournaments.slug, tournamentSlug)),
  });
  if (!tournament) return null;
  return { org, tournament };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string; tournamentSlug: string }>;
}): Promise<Metadata> {
  const { locale, orgSlug, tournamentSlug } = await params;
  const data = await fetchTournamentData(orgSlug, tournamentSlug);
  if (!data) return {};

  const { org, tournament } = data;
  // Не дублировать год, если он уже в имени ("Kings Cup Spain 2026" + 2026 → "Kings Cup Spain 2026 2026")
  const yearStr = String(tournament.year);
  const nameHasYear = new RegExp(`\\b${yearStr}\\b`).test(tournament.name);
  const nameWithYear = nameHasYear ? tournament.name : `${tournament.name} ${yearStr}`;
  const title = `${nameWithYear} | ${org.name}`;
  const metaCity = (tournament.city && tournament.city.trim()) ? tournament.city : org.city;
  const description = tournament.description
    ?? `${tournament.name} — футбольный турнир ${tournament.year}${metaCity ? ` в ${metaCity}` : ""}. Расписание, результаты, таблицы.`;

  // ?? не проваливается на "" — пустая строка из БД ломала OG image,
  // и мессенджер падал на favicon /src/app/icon.png (Play.Grow.Win.)
  const nonEmpty = (s?: string | null) => (s && s.trim() ? s : null);
  // og:image ДОЛЖЕН быть абсолютным — WhatsApp/Telegram/Facebook молча
  // игнорируют относительные ("/uploads/...") и проваливаются на site-wide
  // fallback (зелёный Play.Grow.Win.). Префиксуем BASE для всего, что не http(s)://
  const toAbs = (u: string | null) =>
    !u ? null : (/^https?:\/\//i.test(u) ? u : `${BASE}${u.startsWith("/") ? "" : "/"}${u}`);
  // Для соцпревью предпочитаем cardImageUrl — это рекламная карточка
  // из каталога (богаче по композиции), cover — лишь подстраховка.
  const coverImage = toAbs(nonEmpty(tournament.cardImageUrl))
    ?? toAbs(nonEmpty(tournament.coverUrl))
    ?? `${BASE}/defaults/tournament-cover-default.jpg`;
  const canonicalPath = `/t/${orgSlug}/${tournamentSlug}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE}/${locale}${canonicalPath}`,
      languages: {
        "en": `${BASE}/en${canonicalPath}`,
        "ru": `${BASE}/ru${canonicalPath}`,
        "et": `${BASE}/et${canonicalPath}`,
        "es": `${BASE}/es${canonicalPath}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${BASE}/${locale}${canonicalPath}`,
      siteName: "Goality TMC",
      images: [{ url: coverImage, width: 1200, height: 630, alt: tournament.name }],
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

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string; orgSlug: string; tournamentSlug: string }>;
};

export default async function TournamentLayout({ children, params }: Props) {
  const { locale, orgSlug, tournamentSlug } = await params;

  const cached = await fetchTournamentData(orgSlug, tournamentSlug);
  if (!cached) redirect(`/${locale}/catalog`);
  const { org, tournament } = cached;

  if (!org) redirect(`/${locale}/catalog`);
  if (!tournament) redirect(`/${locale}/catalog`);

  const classes = await db.query.tournamentClasses.findMany({
    where: eq(tournamentClasses.tournamentId, tournament.id),
    orderBy: (c, { asc }) => [asc(c.minBirthYear)],
  });

  // Resolve viewer's follow state for the sidebar Follow button.
  // Anonymous + admin viewers → null (button hides). Only logged-in
  // clubs receive a boolean; one cheap select against the unique
  // (clubId, tournamentId) index.
  const session = await getSession();
  const viewerClubId = session?.role === "club" && session.clubId ? session.clubId : null;
  let viewerIsFollowing: boolean | null = null;
  if (viewerClubId) {
    const [row] = await db
      .select({ id: tournamentFollowers.id })
      .from(tournamentFollowers)
      .where(
        and(
          eq(tournamentFollowers.clubId, viewerClubId),
          eq(tournamentFollowers.tournamentId, tournament.id),
        ),
      )
      .limit(1);
    viewerIsFollowing = !!row;
  }

  // Per-tournament Contact & Social (Step 7). Может отсутствовать —
  // тогда публичная страница падает на контакты организации.
  const tInfo = await db.query.tournamentInfo.findFirst({
    where: eq(tournamentInfo.tournamentId, tournament.id),
  });

  // Public counts MUST track the public list — only confirmed
  // registrations should be visible. Same status filter as
  // /api/public/t/[orgSlug]/[tournamentSlug]/teams.
  const [clubCount] = await db.select({ count: sql<number>`COUNT(DISTINCT ${teams.clubId})` })
    .from(tournamentRegistrations)
    .innerJoin(teams, eq(tournamentRegistrations.teamId, teams.id))
    .where(and(
      eq(tournamentRegistrations.tournamentId, tournament.id),
      eq(tournamentRegistrations.status, "confirmed"),
    ));
  const [teamCount] = await db.select({ count: count() })
    .from(tournamentRegistrations)
    .where(and(
      eq(tournamentRegistrations.tournamentId, tournament.id),
      eq(tournamentRegistrations.status, "confirmed"),
    ));

  const classesWithCounts = await Promise.all(classes.map(async (cls) => {
    const [tc] = await db.select({ count: count() }).from(tournamentRegistrations)
      .where(and(
        eq(tournamentRegistrations.tournamentId, tournament.id),
        eq(tournamentRegistrations.classId, cls.id),
        eq(tournamentRegistrations.status, "confirmed"),
      ));
    return {
      id: cls.id,
      name: cls.name,
      format: cls.format,
      minBirthYear: cls.minBirthYear,
      maxBirthYear: cls.maxBirthYear,
      maxPlayers: cls.maxPlayers,
      teamCount: Number(tc?.count ?? 0),
    };
  }));

  const days = tournament.startDate && tournament.endDate
    ? Math.ceil((new Date(tournament.endDate).getTime() - new Date(tournament.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : null;

  const brand = org.brandColor ?? "#272D2D";
  const effectiveCover = tournament.coverUrl ?? "/defaults/tournament-cover-default.jpg";

  // Resolved contact — приоритет: настройки ТУРНИРА (Step 7) → fallback
  // на организацию. Пустые строки считаем «не задано».
  const pick = (a?: string | null, b?: string | null) =>
    (a && a.trim()) ? a : (b && b.trim() ? b : null);
  // Город/страна: сначала собственные поля ТУРНИРА (Step 1 — Location),
  // и только если они пустые — данные организации.
  const resolvedCity    = pick(tournament.city, org.city);
  const resolvedCountry = pick(tournament.country, org.country);
  const contact = {
    name:    pick(tInfo?.contactName, null),
    email:   pick(tInfo?.contactEmail, org.contactEmail),
    phone:   pick(tInfo?.contactPhone, null),
    website: pick(tInfo?.website, org.website),
    city:    resolvedCity,
    country: resolvedCountry,
    instagram: tInfo?.instagram ?? null,
    facebook:  tInfo?.facebook ?? null,
    twitter:   tInfo?.twitter ?? null,
    youtube:   tInfo?.youtube ?? null,
  };

  const data = {
    org: { name: org.name, slug: org.slug, logo: org.logo, brandColor: brand, city: org.city, country: org.country, contactEmail: org.contactEmail, website: org.website },
    contact,
    tournament: { id: tournament.id, name: tournament.name, slug: tournament.slug, year: tournament.year, description: tournament.description, descriptionRu: tournament.descriptionRu ?? null, descriptionEt: tournament.descriptionEt ?? null, descriptionEs: tournament.descriptionEs ?? null, logoUrl: tournament.logoUrl, coverUrl: tournament.coverUrl ?? null, registrationOpen: tournament.registrationOpen, registrationDeadline: tournament.registrationDeadline ? tournament.registrationDeadline.toISOString() : null, startDate: tournament.startDate ? tournament.startDate.toISOString() : null, endDate: tournament.endDate ? tournament.endDate.toISOString() : null, currency: tournament.currency },
    stats: { clubCount: Number(clubCount?.count ?? 0), teamCount: Number(teamCount?.count ?? 0), classCount: classes.length, days },
    classes: classesWithCounts,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "name": tournament.name,
    "description": tournament.description ?? undefined,
    "url": `${BASE}/${locale}/t/${orgSlug}/${tournamentSlug}`,
    // schema.org image — absolute URL (consistent with og:image fix above)
    "image": (() => {
      const nonEmpty = (s?: string | null) => (s && s.trim() ? s : null);
      const toAbs = (u: string | null) =>
        !u ? null : (/^https?:\/\//i.test(u) ? u : `${BASE}${u.startsWith("/") ? "" : "/"}${u}`);
      return toAbs(nonEmpty(tournament.cardImageUrl)) ?? toAbs(nonEmpty(tournament.coverUrl)) ?? undefined;
    })(),
    ...(tournament.startDate ? { "startDate": tournament.startDate.toISOString() } : {}),
    ...(tournament.endDate   ? { "endDate":   tournament.endDate.toISOString()   } : {}),
    "sport": "Soccer",
    "organizer": {
      "@type": "Organization",
      "name": org.name,
      ...(org.website ? { "url": org.website } : {}),
    },
    ...(resolvedCity || resolvedCountry ? {
      "location": {
        "@type": "Place",
        "name": [resolvedCity, resolvedCountry].filter(Boolean).join(", "),
        "address": { "@type": "PostalAddress", "addressLocality": resolvedCity ?? undefined, "addressCountry": resolvedCountry ?? undefined },
      },
    } : {}),
  };

  return (
    <ThemeProvider defaultTheme="dark">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TournamentPublicProvider data={data}>
        <div className="min-h-screen" style={{ background: "var(--cat-bg)" }}>
          <PublicNavHeader />
          <TournamentMobileTabs orgSlug={orgSlug} tournamentSlug={tournamentSlug} brandColor={brand} />

          {/* ── Full-width cover (image + gradients only, no title) ── */}
          <div
            className="relative w-full overflow-hidden"
            style={{ height: "280px" }}
          >
            {/* Cover photo — always shown (default if none uploaded) */}
            <img
              src={effectiveCover}
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />

            {/* Bottom gradient */}
            <div
              className="absolute inset-x-0 bottom-0 pointer-events-none"
              style={{
                height: "85%",
                background: "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.75) 35%, rgba(0,0,0,0.3) 65%, transparent 100%)",
              }}
            />

            {/* Brand glow overlay */}
            <div className="absolute inset-x-0 top-0 h-32 pointer-events-none"
              style={{ background: `radial-gradient(ellipse 80% 120% at 50% -10%, ${brand}25 0%, transparent 70%)` }} />
          </div>

          {/* ── Content: sidebar OVERLAPS cover ── */}
          <div className="w-full md:w-[90%] md:max-w-[1400px] mx-auto relative z-10 px-4 md:px-0" style={{ marginTop: "-116px" }}>
            {/* Desktop: sidebar + content side by side */}
            <div className="hidden md:flex gap-8 items-start">
              <TournamentSidebar
                orgSlug={orgSlug}
                tournamentSlug={tournamentSlug}
                tournamentName={tournament.name}
                orgName={org.name}
                logoUrl={tournament.logoUrl}
                brandColor={brand}
                registrationOpen={tournament.registrationOpen}
                startDate={tournament.startDate ? tournament.startDate.toISOString() : null}
                endDate={tournament.endDate ? tournament.endDate.toISOString() : null}
                city={resolvedCity}
                country={resolvedCountry}
                classes={classesWithCounts}
                clubCount={Number(clubCount?.count ?? 0)}
                teamCount={Number(teamCount?.count ?? 0)}
                tournamentId={tournament.id}
                isFollowing={viewerIsFollowing}
                clubId={viewerClubId}
              />
              <main className="flex-1 min-w-0" style={{ paddingTop: "52px" }}>
                {children}
              </main>
            </div>

            {/* Mobile: full-width stacked layout */}
            <div className="md:hidden" style={{ paddingTop: "52px" }}>
              {/* Compact tournament card on mobile */}
              <div className="rounded-2xl border mb-4 overflow-hidden" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(16px)", borderColor: `${brand}40` }}>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {tournament.logoUrl && (
                      <img src={tournament.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover border" style={{ borderColor: `${brand}40` }} />
                    )}
                    <div className="min-w-0">
                      <h1 className="text-base font-black truncate" style={{ color: "#fff" }}>{tournament.name}</h1>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>{org.name}</p>
                    </div>
                    {tournament.registrationOpen && (
                      <span className="ml-auto shrink-0 text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: `${brand}22`, color: brand, border: `1px solid ${brand}44` }}>
                        Open
                      </span>
                    )}
                  </div>
                  {/* Quick stats row */}
                  <div className="flex gap-4 text-center">
                    <div>
                      <p className="text-lg font-black" style={{ color: brand }}>{Number(clubCount?.count ?? 0)}</p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>Clubs</p>
                    </div>
                    <div>
                      <p className="text-lg font-black text-white">{Number(teamCount?.count ?? 0)}</p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>Teams</p>
                    </div>
                    {classes.length > 0 && (
                      <div>
                        <p className="text-lg font-black text-white">{classes.length}</p>
                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>Divisions</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Page content full-width */}
              <main className="w-full">
                {children}
              </main>
            </div>
          </div>

          <footer className="border-t mt-12" style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
            <div className="w-[90%] max-w-[1400px] mx-auto py-4 flex items-center justify-between text-xs" style={{ color: "var(--cat-text-muted)" }}>
              <span>&copy; {new Date().getFullYear()} Goality TMC</span>
              <a href="/catalog" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                <img src="/logo.png" alt="" className="w-4 h-4 rounded" /> Goality TMC
              </a>
            </div>
          </footer>
        </div>
      </TournamentPublicProvider>
    </ThemeProvider>
  );
}
