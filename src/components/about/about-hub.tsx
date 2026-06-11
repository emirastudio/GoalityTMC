"use client";

/**
 * /about hub — index of all 22 feature pages, grouped by cluster.
 *
 * Designed to be the SEO landing page for "what Goality does" queries:
 * a single H1, 5 cluster sections, each with link-rich teaser cards.
 */

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { PublicNavHeader } from "@/components/ui/public-nav-header";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  ABOUT_CLUSTERS,
  ABOUT_PAGES,
  type AboutCluster,
  type AboutPage,
} from "@/lib/about/content";
import { resolveIcon } from "./icon-map";

export function AboutHub() {
  const t = useTranslations("about.hub");
  const tc = useTranslations("about.common");

  return (
    <ThemeProvider>
      <div className="min-h-screen" style={{ background: "var(--cat-bg)" }}>
        <PublicNavHeader />

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background:
                "radial-gradient(900px 500px at 80% -10%, #2BFEBA33, transparent 60%), radial-gradient(700px 500px at 0% 110%, #8B5CF622, transparent 70%)",
            }}
          />
          <div className="relative max-w-5xl mx-auto px-5 lg:px-8 pt-16 pb-12 lg:pt-24 lg:pb-20 text-center">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-6 text-[11px] font-bold uppercase tracking-widest"
              style={{
                background: "#2BFEBA14",
                borderColor: "#2BFEBA44",
                color: "#2BFEBA",
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {t("heroEyebrow")}
            </div>
            <h1
              className="text-[36px] sm:text-[48px] lg:text-[60px] leading-[1.05] font-black tracking-tight mb-5"
              style={{ color: "var(--cat-text)" }}
            >
              {t("heroH1")}{" "}
              <span
                style={{
                  background: "linear-gradient(90deg, #2BFEBA, #00E5FF)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {t("heroH1Highlight")}
              </span>
            </h1>
            <p
              className="text-[16px] lg:text-[18px] max-w-2xl mx-auto leading-relaxed mb-8"
              style={{ color: "var(--cat-text-secondary)" }}
            >
              {t("heroSub")}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-[14px] text-black"
                style={{ background: "linear-gradient(90deg, #2BFEBA, #00E5FF)" }}
              >
                {t("heroCtaPrimary")}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-[14px] border"
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
        </section>

        {/* Cluster sections */}
        {ABOUT_CLUSTERS.map((cluster) => (
          <ClusterSection key={cluster.id} cluster={cluster} />
        ))}

        {/* Final CTA */}
        <section
          className="py-16 lg:py-24 border-t"
          style={{ borderColor: "var(--cat-divider)" }}
        >
          <div className="max-w-3xl mx-auto px-5 lg:px-8 text-center">
            <h2
              className="text-3xl lg:text-5xl font-black tracking-tight mb-5"
              style={{ color: "var(--cat-text)" }}
            >
              {t("finalH2")}
            </h2>
            <p
              className="text-[16px] lg:text-[18px] leading-relaxed mb-8"
              style={{ color: "var(--cat-text-secondary)" }}
            >
              {t("finalBody")}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-xl font-bold text-[15px] text-black"
                style={{ background: "linear-gradient(90deg, #2BFEBA, #00E5FF)" }}
              >
                {t("finalCta")}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/catalog"
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
      </div>
    </ThemeProvider>
  );
}

function ClusterSection({ cluster }: { cluster: AboutCluster }) {
  const t = useTranslations("about.common");
  const pages = ABOUT_PAGES.filter(
    (p) => p.cluster === cluster.id && p.published,
  );
  if (pages.length === 0) return null;

  return (
    <section
      id={`cluster-${cluster.id}`}
      className="py-14 lg:py-20 border-t"
      style={{ borderColor: "var(--cat-divider)" }}
    >
      <div className="max-w-6xl mx-auto px-5 lg:px-8">
        <div className="text-center mb-10">
          <p
            className="text-[11px] font-black uppercase tracking-widest mb-3"
            style={{ color: cluster.accent }}
          >
            {t(`clusterEyebrows.${cluster.key}`)}
          </p>
          <h2
            className="text-3xl lg:text-4xl font-black tracking-tight mb-2"
            style={{ color: "var(--cat-text)" }}
          >
            {t(`clusterTitles.${cluster.key}`)}
          </h2>
          <p
            className="text-[15px] max-w-2xl mx-auto leading-relaxed"
            style={{ color: "var(--cat-text-secondary)" }}
          >
            {t(`clusterDescs.${cluster.key}`)}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pages.map((p) => (
            <HubCard key={p.slug} page={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HubCard({ page }: { page: AboutPage }) {
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
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
        style={{
          background: `linear-gradient(135deg, ${page.accent}26, ${page.accentTo}14)`,
        }}
      >
        <Icon className="w-5 h-5" style={{ color: page.accent }} />
      </div>
      <h3
        className="text-[17px] font-bold mb-2 flex items-center gap-2"
        style={{ color: "var(--cat-text)" }}
      >
        {t("heroH1")}
        <ArrowRight
          className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
          style={{ color: page.accent }}
        />
      </h3>
      <p
        className="text-[13.5px] leading-relaxed line-clamp-3"
        style={{ color: "var(--cat-text-secondary)" }}
      >
        {t("heroSub")}
      </p>
    </Link>
  );
}
