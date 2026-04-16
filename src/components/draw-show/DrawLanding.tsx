"use client";

/**
 * DrawLanding — hero block for the /draw standalone product.
 *
 * Three stacked sections: hero with a CTA that scrolls to the wizard,
 * feature strip explaining why this beats an Excel-based draw, and a
 * footer nudging visitors to try the full Goality platform.
 *
 * The wizard itself lives in DrawWizard and is rendered right below
 * this component on the same page. We scroll into it on CTA click
 * rather than opening a modal — lower friction, better SEO.
 */

import { useTranslations } from "next-intl";
import { Sparkles, ArrowDown, Play, Share2, Tv, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-provider";
import { Link } from "@/i18n/navigation";
import { DrawMockup } from "./DrawMockup";

export function DrawLanding({
  onStart,
}: {
  /** Called when the user clicks the hero CTA; host page scrolls to wizard. */
  onStart: () => void;
}) {
  const t = useTranslations("drawLanding");

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "var(--cat-bg)", color: "var(--cat-text)" }}
    >
      {/* Ambient mint glow, echoing the stage aesthetic. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% -10%, rgba(43,254,186,0.14) 0%, transparent 50%)",
        }}
      />

      {/* ── Top nav ─────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-black leading-none">
              {t("brand")}
            </p>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mt-0.5"
              style={{ color: "var(--cat-text-muted)" }}
            >
              {t("brandSub")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden sm:inline-flex items-center text-xs font-semibold px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ color: "var(--cat-text-secondary)" }}
          >
            {t("navPlatform")}
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative z-[1] max-w-5xl mx-auto px-6 md:px-10 pt-10 md:pt-20 pb-16 text-center">
        <span
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6"
          style={{
            background: "rgba(43,254,186,0.1)",
            color: "var(--cat-accent)",
            border: "1px solid rgba(43,254,186,0.25)",
          }}
        >
          <Tv className="w-3.5 h-3.5" />
          {t("eyebrow")}
        </span>
        <h1
          className="text-4xl md:text-6xl font-black leading-tight mb-5 tracking-tight"
          style={{ color: "var(--cat-text)" }}
        >
          {t("heroTitle")}
        </h1>
        <p
          className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
          style={{ color: "var(--cat-text-secondary)" }}
        >
          {t("heroSubtitle")}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onStart}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "var(--cat-accent)",
              color: "var(--cat-accent-text)",
              boxShadow: "0 12px 40px -8px rgba(43,254,186,0.4)",
            }}
          >
            <Play className="w-4 h-4" />
            {t("ctaPrimary")}
          </button>
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: "var(--cat-text-muted)" }}
          >
            <span className="line-through">€49</span>
            <span
              className="font-bold text-sm"
              style={{ color: "var(--cat-accent)" }}
            >
              {t("priceBadge")}
            </span>
          </div>
        </div>

        {/* Important upsell signal: organizers who already pay for Pro
            or Elite on the main platform don't need to buy this
            separately — it's bundled. Keeps existing customers from
            feeling upcharged and nudges prospects towards the bigger
            plan. */}
        <div
          className="mt-6 inline-flex items-start gap-2.5 rounded-2xl px-4 py-2.5 text-left max-w-xl mx-auto"
          style={{
            background: "rgba(43,254,186,0.06)",
            border: "1px solid rgba(43,254,186,0.2)",
          }}
        >
          <Sparkles
            className="w-4 h-4 mt-0.5 shrink-0"
            style={{ color: "var(--cat-accent)" }}
          />
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--cat-text-secondary)" }}
          >
            {t.rich("includedInPlan", {
              plan: (chunks) => (
                <span className="font-bold" style={{ color: "var(--cat-accent)" }}>
                  {chunks}
                </span>
              ),
            })}
          </p>
        </div>

        <div className="mt-12 flex justify-center" aria-hidden>
          <ArrowDown
            className="w-5 h-5 animate-bounce"
            style={{ color: "var(--cat-text-muted)" }}
          />
        </div>
      </section>

      {/* ── Animated mockup (auto-plays a fake draw) ──
          Gives visitors a preview of what the product feels like
          without making them click through the wizard first. Pure
          decoration — framer-motion animations, no server state. */}
      <section className="relative z-[1] max-w-5xl mx-auto px-6 md:px-10 pb-16">
        <DrawMockup />
        <p
          className="text-center text-xs mt-4"
          style={{ color: "var(--cat-text-muted)" }}
        >
          {t("mockupCaption")}
        </p>
      </section>

      {/* ── Feature strip ─────────────────────────────── */}
      <section
        className="relative z-[1] max-w-5xl mx-auto px-6 md:px-10 pb-16"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Feature
            icon={<Zap className="w-5 h-5" />}
            title={t("feature1Title")}
            body={t("feature1Body")}
          />
          <Feature
            icon={<Tv className="w-5 h-5" />}
            title={t("feature2Title")}
            body={t("feature2Body")}
          />
          <Feature
            icon={<Share2 className="w-5 h-5" />}
            title={t("feature3Title")}
            body={t("feature3Body")}
          />
        </div>
      </section>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "var(--cat-card-bg)",
        border: "1px solid var(--cat-card-border)",
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{
          background: "rgba(43,254,186,0.1)",
          color: "var(--cat-accent)",
        }}
      >
        {icon}
      </div>
      <p
        className="text-sm font-black mb-1"
        style={{ color: "var(--cat-text)" }}
      >
        {title}
      </p>
      <p
        className="text-xs leading-relaxed"
        style={{ color: "var(--cat-text-muted)" }}
      >
        {body}
      </p>
    </div>
  );
}

/**
 * Footer CTA — rendered separately so the page can drop it below the
 * wizard. Points the visitor to the full platform after the pitch.
 */
export function DrawLandingFooter() {
  const t = useTranslations("drawLanding");
  return (
    <section
      className="relative max-w-5xl mx-auto px-6 md:px-10 py-16 text-center"
      style={{ color: "var(--cat-text)" }}
    >
      <div
        className="rounded-3xl p-8 md:p-12 overflow-hidden relative"
        style={{
          background:
            "linear-gradient(135deg, var(--cat-card-bg), color-mix(in srgb, var(--cat-accent) 6%, var(--cat-card-bg)))",
          border: "1px solid var(--cat-card-border)",
        }}
      >
        <div
          aria-hidden
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(43,254,186,0.12), transparent 70%)",
          }}
        />
        <p
          className="text-xs font-bold uppercase tracking-widest mb-2"
          style={{ color: "var(--cat-accent)" }}
        >
          {t("footerEyebrow")}
        </p>
        <h3
          className="text-2xl md:text-3xl font-black mb-3"
          style={{ color: "var(--cat-text)" }}
        >
          {t("footerTitle")}
        </h3>
        <p
          className="text-sm md:text-base mb-6 max-w-xl mx-auto leading-relaxed"
          style={{ color: "var(--cat-text-secondary)" }}
        >
          {t("footerBody")}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
          style={{
            background: "var(--cat-accent)",
            color: "var(--cat-accent-text)",
          }}
        >
          {t("footerCta")}
          <Sparkles className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
