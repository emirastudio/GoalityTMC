"use client";

/**
 * Shared template for /about/[slug] feature pages.
 *
 * Server page passes only the page config + lucide icon name; this client
 * component reads i18n keys under about.pages.<slug>.* and renders the
 * full SEO-strong landing layout. Section order is intentional:
 *
 *   Hero → Pain → Features → ForWhom → FAQ → Related → Final CTA
 *
 * Optional bullets / FAQ items are detected by checking for empty strings
 * so that a translator can shrink a section by leaving keys blank.
 */

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ThemeProvider, ThemeToggle } from "@/components/ui/theme-provider";
import { PublicNavHeader } from "@/components/ui/public-nav-header";
import {
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { resolveIcon } from "./icon-map";
import {
  type AboutPage,
  ABOUT_PAGES,
  ABOUT_CLUSTERS,
} from "@/lib/about/content";

type Props = { page: AboutPage };

export function AboutFeaturePage({ page }: Props) {
  const t = useTranslations(`about.pages.${page.slug}`);
  const tc = useTranslations("about.common");

  const Icon = resolveIcon(page.icon);
  const cluster = ABOUT_CLUSTERS.find((c) => c.id === page.cluster)!;
  const relatedPages = page.related
    .map((slug) => ABOUT_PAGES.find((p) => p.slug === slug))
    .filter((p): p is AboutPage => Boolean(p) && p!.published);

  const gradient = `linear-gradient(135deg, ${page.accent}, ${page.accentTo})`;
  const ctaPrimaryHref = page.ctaPrimaryHref ?? "/onboarding";
  const ctaSecondaryHref = page.ctaSecondaryHref ?? "/catalog";

  return (
    <ThemeProvider>
      <div className="min-h-screen" style={{ background: "var(--cat-bg)" }}>
        <PublicNavHeader />

        {/* ──────────────  HERO  ────────────── */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background: `radial-gradient(900px 500px at 80% -10%, ${page.accent}33, transparent 60%), radial-gradient(700px 500px at 0% 110%, ${page.accentTo}22, transparent 70%)`,
            }}
          />
          <div className="relative max-w-6xl mx-auto px-5 lg:px-8 pt-14 pb-10 lg:pt-20 lg:pb-16">
            <Breadcrumbs
              clusterKey={cluster.key}
              currentLabel={t("heroH1")}
              tc={tc}
            />

            <div className="grid lg:grid-cols-[1fr_320px] gap-10 items-start">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-5 text-[11px] font-bold uppercase tracking-widest"
                  style={{
                    background: page.accent + "14",
                    borderColor: page.accent + "44",
                    color: page.accent,
                  }}>
                  <Icon className="w-3.5 h-3.5" />
                  {t("heroEyebrow")}
                </div>

                <h1 className="text-[34px] sm:text-[42px] lg:text-[54px] leading-[1.05] font-black tracking-tight mb-5"
                  style={{ color: "var(--cat-text)" }}>
                  {t("heroH1")}
                  {t("heroH1Highlight") && (
                    <>
                      {" "}
                      <span style={{
                        background: gradient,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}>
                        {t("heroH1Highlight")}
                      </span>
                    </>
                  )}
                </h1>

                <p className="text-[16px] lg:text-[18px] leading-relaxed max-w-2xl mb-7"
                  style={{ color: "var(--cat-text-secondary)" }}>
                  {t("heroSub")}
                </p>

                <ul className="grid sm:grid-cols-2 gap-2.5 max-w-2xl mb-8">
                  {[t("heroBullet1"), t("heroBullet2"), t("heroBullet3")].map(
                    (b, i) =>
                      b && (
                        <li key={i} className="flex items-start gap-2.5">
                          <CheckCircle
                            className="w-4 h-4 mt-1 shrink-0"
                            style={{ color: page.accent }}
                          />
                          <span
                            className="text-[14px] leading-snug"
                            style={{ color: "var(--cat-text-secondary)" }}
                          >
                            {b}
                          </span>
                        </li>
                      ),
                  )}
                </ul>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={ctaPrimaryHref}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-[14px] text-black transition-transform hover:-translate-y-0.5"
                    style={{ background: gradient }}
                  >
                    {t("heroCtaPrimary")}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href={ctaSecondaryHref}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-[14px] border transition-colors"
                    style={{
                      borderColor: "var(--cat-card-border)",
                      color: "var(--cat-text)",
                      background: "var(--cat-card-bg)",
                    }}
                  >
                    {t("heroCtaSecondary")}
                  </Link>
                </div>
              </div>

              {/* Decorative icon panel */}
              <div className="hidden lg:flex aspect-square rounded-3xl border items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${page.accent}1F, ${page.accentTo}10)`,
                  borderColor: page.accent + "44",
                }}>
                <Icon className="w-32 h-32" style={{ color: page.accent }} />
              </div>
            </div>
          </div>
        </section>

        {/* ──────────────  PAIN  ────────────── */}
        <section className="py-14 lg:py-20 border-t" style={{ borderColor: "var(--cat-divider)" }}>
          <div className="max-w-4xl mx-auto px-5 lg:px-8">
            <p className="text-[11px] font-black uppercase tracking-widest mb-3"
              style={{ color: page.accent }}>
              {tc("painEyebrow")}
            </p>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight mb-5"
              style={{ color: "var(--cat-text)" }}>
              {t("painH2")}
            </h2>
            <p className="text-[16px] lg:text-[17px] leading-relaxed"
              style={{ color: "var(--cat-text-secondary)" }}>
              {t("painBody")}
            </p>
          </div>
        </section>

        {/* ──────────────  FEATURES GRID  ────────────── */}
        <section className="py-14 lg:py-20 border-t" style={{ borderColor: "var(--cat-divider)" }}>
          <div className="max-w-6xl mx-auto px-5 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-[11px] font-black uppercase tracking-widest mb-3"
                style={{ color: page.accent }}>
                {tc("featuresEyebrow")}
              </p>
              <h2 className="text-3xl lg:text-4xl font-black tracking-tight"
                style={{ color: "var(--cat-text)" }}>
                {t("featuresH2")}
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: page.featureCount }, (_, i) => i + 1).map((n) => (
                <FeatureCard
                  key={n}
                  Icon={Icon}
                  accent={page.accent}
                  title={t(`f${n}Title`)}
                  desc={t(`f${n}Desc`)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ──────────────  FOR WHOM  ────────────── */}
        <section className="py-14 lg:py-20 border-t" style={{ borderColor: "var(--cat-divider)" }}>
          <div className="max-w-5xl mx-auto px-5 lg:px-8">
            <div className="text-center mb-10">
              <p className="text-[11px] font-black uppercase tracking-widest mb-3"
                style={{ color: page.accent }}>
                {tc("forWhomEyebrow")}
              </p>
              <h2 className="text-3xl lg:text-4xl font-black tracking-tight"
                style={{ color: "var(--cat-text)" }}>
                {t("forWhomH2")}
              </h2>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {Array.from({ length: page.forWhomCount }, (_, i) => i + 1).map((n) => (
                <span
                  key={n}
                  className="px-5 py-3 rounded-full border text-[14px] font-semibold"
                  style={{
                    background: "var(--cat-card-bg)",
                    borderColor: page.accent + "44",
                    color: "var(--cat-text)",
                  }}
                >
                  {t(`forWhom${n}`)}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ──────────────  FAQ  ────────────── */}
        <section className="py-14 lg:py-20 border-t" style={{ borderColor: "var(--cat-divider)" }}>
          <div className="max-w-3xl mx-auto px-5 lg:px-8">
            <div className="text-center mb-10">
              <p className="text-[11px] font-black uppercase tracking-widest mb-3"
                style={{ color: page.accent }}>
                {tc("faqEyebrow")}
              </p>
              <h2 className="text-3xl lg:text-4xl font-black tracking-tight"
                style={{ color: "var(--cat-text)" }}>
                {t("faqH2")}
              </h2>
            </div>
            <div className="space-y-3">
              {Array.from({ length: page.faqCount }, (_, i) => i + 1).map((n) => (
                <details
                  key={n}
                  className="group rounded-2xl border overflow-hidden"
                  style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
                >
                  <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none">
                    <span className="font-bold text-[15px]" style={{ color: "var(--cat-text)" }}>
                      {t(`q${n}`)}
                    </span>
                    <ChevronRight className="w-4 h-4 shrink-0 transition-transform group-open:rotate-90" style={{ color: page.accent }} />
                  </summary>
                  <div className="px-5 pb-5 text-[14px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>
                    {t(`a${n}`)}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ──────────────  RELATED  ────────────── */}
        {relatedPages.length > 0 && (
          <section className="py-14 lg:py-20 border-t" style={{ borderColor: "var(--cat-divider)" }}>
            <div className="max-w-6xl mx-auto px-5 lg:px-8">
              <div className="text-center mb-10">
                <p className="text-[11px] font-black uppercase tracking-widest mb-3"
                  style={{ color: page.accent }}>
                  {tc("relatedEyebrow")}
                </p>
                <h2 className="text-3xl lg:text-4xl font-black tracking-tight"
                  style={{ color: "var(--cat-text)" }}>
                  {tc("relatedH2")}
                </h2>
              </div>
              <div className="grid sm:grid-cols-3 gap-5">
                {relatedPages.map((rp) => (
                  <RelatedCard key={rp.slug} page={rp} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ──────────────  FINAL CTA  ────────────── */}
        <section className="py-16 lg:py-24 border-t" style={{ borderColor: "var(--cat-divider)" }}>
          <div className="max-w-3xl mx-auto px-5 lg:px-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
              style={{ background: gradient }}>
              <Sparkles className="w-7 h-7 text-black" />
            </div>
            <h2 className="text-3xl lg:text-5xl font-black tracking-tight mb-5"
              style={{ color: "var(--cat-text)" }}>
              {t("ctaH2")}
            </h2>
            <p className="text-[16px] lg:text-[18px] leading-relaxed mb-8 max-w-xl mx-auto"
              style={{ color: "var(--cat-text-secondary)" }}>
              {t("ctaBody")}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-xl font-bold text-[15px] text-black transition-transform hover:-translate-y-0.5"
                style={{ background: gradient }}
              >
                {t("ctaButton")}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-xl font-bold text-[15px] border"
                style={{
                  borderColor: "var(--cat-card-border)",
                  color: "var(--cat-text)",
                  background: "var(--cat-card-bg)",
                }}
              >
                {tc("ctaSecondary")}
              </Link>
            </div>
          </div>
        </section>

        <div className="hidden">
          <ThemeToggle />
        </div>
      </div>
    </ThemeProvider>
  );
}

/* ──────────────  Sub-components  ────────────── */

function Breadcrumbs({
  clusterKey,
  currentLabel,
  tc,
}: {
  clusterKey: string;
  currentLabel: string;
  tc: ReturnType<typeof useTranslations>;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 text-[12px] mb-6"
      style={{ color: "var(--cat-text-muted)" }}
    >
      <Link href="/" className="hover:underline">{tc("crumbHome")}</Link>
      <ChevronRight className="w-3 h-3" />
      <Link href="/about" className="hover:underline">{tc("crumbAbout")}</Link>
      <ChevronRight className="w-3 h-3" />
      <span style={{ color: "var(--cat-text-secondary)" }}>
        {tc(`clusterLabels.${clusterKey}`)}
      </span>
      <ChevronRight className="w-3 h-3" />
      <span className="font-semibold truncate" style={{ color: "var(--cat-text)" }}>
        {currentLabel}
      </span>
    </nav>
  );
}

function FeatureCard({
  Icon,
  accent,
  title,
  desc,
}: {
  Icon: LucideIcon;
  accent: string;
  title: string;
  desc: string;
}) {
  return (
    <div
      className="rounded-2xl p-6 border transition-all hover:-translate-y-0.5"
      style={{
        background: "var(--cat-card-bg)",
        borderColor: "var(--cat-card-border)",
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
        style={{ background: accent + "1A" }}
      >
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <h3 className="text-[16px] font-bold mb-2" style={{ color: "var(--cat-text)" }}>
        {title}
      </h3>
      <p className="text-[14px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>
        {desc}
      </p>
    </div>
  );
}

function RelatedCard({ page }: { page: AboutPage }) {
  const t = useTranslations(`about.pages.${page.slug}`);
  const Icon = resolveIcon(page.icon);
  return (
    <Link
      href={`/about/${page.slug}`}
      className="block rounded-2xl p-6 border transition-all hover:-translate-y-0.5 group"
      style={{
        background: "var(--cat-card-bg)",
        borderColor: "var(--cat-card-border)",
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: page.accent + "1A" }}
      >
        <Icon className="w-5 h-5" style={{ color: page.accent }} />
      </div>
      <h3 className="text-[16px] font-bold mb-2 flex items-center gap-2" style={{ color: "var(--cat-text)" }}>
        {t("heroH1")}
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: page.accent }} />
      </h3>
      <p className="text-[13px] leading-relaxed line-clamp-3" style={{ color: "var(--cat-text-secondary)" }}>
        {t("heroSub")}
      </p>
    </Link>
  );
}
