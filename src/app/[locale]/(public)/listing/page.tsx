"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { PublicNavHeader } from "@/components/ui/public-nav-header";
import {
  Search, Globe, Link2, Megaphone, Users, ArrowRight,
  CheckCircle, Zap, ChevronRight, Trophy, Star, TrendingUp,
  MapPin, Calendar, Shield, BarChart3, Flame, Lock,
} from "lucide-react";

/* ─── Section header ─── */
function SectionHeader({ eyebrow, title, highlight, desc }: {
  eyebrow: string; title: string; highlight?: string; desc?: string;
}) {
  return (
    <div className="text-center mb-14">
      <p className="text-[11px] font-black uppercase tracking-widest mb-3"
        style={{ color: "var(--cat-accent)" }}>
        {eyebrow}
      </p>
      <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4"
        style={{ color: "var(--cat-text)" }}>
        {title}{" "}
        {highlight && (
          <span style={{
            background: "linear-gradient(90deg, #2BFEBA, #00E5FF)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>{highlight}</span>
        )}
      </h2>
      {desc && (
        <p className="text-[15px] max-w-2xl mx-auto leading-relaxed"
          style={{ color: "var(--cat-text-secondary)" }}>
          {desc}
        </p>
      )}
    </div>
  );
}

/* ─── Check item ─── */
function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--cat-accent)" }} />
      <span className="text-[13px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>
        {children}
      </span>
    </li>
  );
}

/* ─── Benefit card ─── */
function BenefitCard({ icon: Icon, color, title, desc }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string; title: string; desc: string;
}) {
  return (
    <div className="rounded-2xl p-6 border transition-all hover:-translate-y-0.5"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
        style={{ background: color + "18" }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <h3 className="text-[14px] font-bold mb-2" style={{ color: "var(--cat-text)" }}>{title}</h3>
      <p className="text-[13px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>{desc}</p>
    </div>
  );
}

/* ─── Mock catalog card ─── */
function MockCatalogCard({ t }: { t: ReturnType<typeof useTranslations<"listing">> }) {
  const brand = "#2BFEBA";
  return (
    <div className="rounded-2xl border overflow-hidden shadow-2xl"
      style={{ background: "var(--cat-card-bg)", borderColor: brand + "40", maxWidth: 320, minWidth: 280 }}>
      {/* Cover */}
      <div className="relative h-32 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${brand}22, #0A0E14)` }}>
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <Trophy className="w-20 h-20" style={{ color: brand }} />
        </div>
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-black"
          style={{ background: brand + "22", color: brand, border: `1px solid ${brand}44` }}>
          {t("mockOpen")}
        </div>
        <div className="absolute bottom-3 left-3 w-10 h-10 rounded-xl border-2 flex items-center justify-center"
          style={{ background: "#0A0E14", borderColor: brand + "60" }}>
          <Trophy className="w-5 h-5" style={{ color: brand }} />
        </div>
      </div>
      {/* Info */}
      <div className="p-4">
        <h4 className="text-[14px] font-black mb-1" style={{ color: "var(--cat-text)" }}>
          {t("mockTournament")}
        </h4>
        <p className="text-[11px] mb-3" style={{ color: "var(--cat-text-secondary)" }}>
          {t("mockOrg")}
        </p>
        <div className="flex items-center gap-3 text-[11px] mb-3" style={{ color: "var(--cat-text-muted)" }}>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{t("mockLocation")}</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{t("mockDates")}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["U10", "U12", "U14"].map(age => (
            <span key={age} className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: brand + "15", color: brand, border: `1px solid ${brand}30` }}>
              {age}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ */

export default function ListingPage() {
  const t = useTranslations("listing");
  const brand = "#2BFEBA";

  const benefits = [
    { icon: Search,   color: "#2BFEBA", title: t("b1Title"), desc: t("b1Desc") },
    { icon: Users,    color: "#3B82F6", title: t("b2Title"), desc: t("b2Desc") },
    { icon: Globe,    color: "#8B5CF6", title: t("b3Title"), desc: t("b3Desc") },
    { icon: Link2,    color: "#F59E0B", title: t("b4Title"), desc: t("b4Desc") },
    { icon: Megaphone,color: "#EF4444", title: t("b5Title"), desc: t("b5Desc") },
    { icon: Star,     color: "#EC4899", title: t("b6Title"), desc: t("b6Desc") },
  ];

  const steps = [
    { num: "01", icon: Calendar, color: "#2BFEBA", title: t("s1Title"), desc: t("s1Desc") },
    { num: "02", icon: Zap,      color: "#F59E0B", title: t("s2Title"), desc: t("s2Desc") },
    { num: "03", icon: Search,   color: "#3B82F6", title: t("s3Title"), desc: t("s3Desc") },
  ];

  const forWho = [
    {
      emoji: t("fw1Emoji"), title: t("fw1Title"), desc: t("fw1Desc"),
      checks: [t("fw1c1"), t("fw1c2"), t("fw1c3")],
    },
    {
      emoji: t("fw2Emoji"), title: t("fw2Title"), desc: t("fw2Desc"),
      checks: [t("fw2c1"), t("fw2c2"), t("fw2c3")],
    },
    {
      emoji: t("fw3Emoji"), title: t("fw3Title"), desc: t("fw3Desc"),
      checks: [t("fw3c1"), t("fw3c2"), t("fw3c3")],
    },
  ];

  const listingItems = [t("li1"), t("li2"), t("li3"), t("li4"), t("li5")];
  const fullItems = [t("fi1"), t("fi2"), t("fi3"), t("fi4"), t("fi5"), t("fi6"), t("fi7"), t("fi8")];
  const notIncluded = [t("fi2"), t("fi3"), t("fi4"), t("fi7")];

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen overflow-x-hidden" style={{ background: "var(--cat-bg)" }}>
        <PublicNavHeader />

        {/* ── HERO ── */}
        <section className="cat-banner cat-hero-decor relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.07]"
              style={{ background: "radial-gradient(circle, #2BFEBA, transparent 70%)" }} />
            <div className="absolute bottom-[-20%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.05]"
              style={{ background: "radial-gradient(circle, #8B5CF6, transparent 70%)" }} />
          </div>

          <div className="relative z-10 max-w-[1200px] mx-auto px-6 pt-24 pb-20">
            <div className="flex flex-col lg:flex-row items-center gap-16">

              {/* Left */}
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 border"
                  style={{ background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-badge-open-border)" }}>
                  <TrendingUp className="w-3.5 h-3.5" style={{ color: brand }} />
                  <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: brand }}>
                    {t("badge")}
                  </span>
                </div>

                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95] mb-6">
                  <span style={{ color: "var(--cat-text)" }}>{t("heroTitle1")}</span>
                  <br />
                  <span style={{
                    background: "linear-gradient(90deg, #2BFEBA, #00E5FF, #2BFEBA)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}>{t("heroTitle2")}</span>
                </h1>

                <p className="text-[16px] leading-relaxed mb-8 max-w-lg"
                  style={{ color: "var(--cat-text-secondary)" }}>
                  {t("heroDesc")}
                </p>

                {/* Early bird price pill */}
                <div className="flex items-center gap-3 mb-8 justify-center lg:justify-start">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border"
                    style={{ background: "#F59E0B15", borderColor: "#F59E0B50" }}>
                    <Flame className="w-4 h-4" style={{ color: "#F59E0B" }} />
                    <span className="text-[13px] font-black" style={{ color: "#F59E0B" }}>
                      €4.99/month · First 50 forever
                    </span>
                    <span className="text-[11px] line-through ml-1" style={{ color: "var(--cat-text-muted)" }}>€9.99</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <Link href="/onboarding"
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-[14px] font-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: brand, color: "#0A0E14" }}>
                    {t("heroCta")} <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/catalog"
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-[14px] font-semibold border transition-all hover:opacity-80"
                    style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}>
                    {t("heroViewCatalog")}
                  </Link>
                </div>

                <p className="text-[11px] mt-4" style={{ color: "var(--cat-text-muted)" }}>
                  {t("heroNote")}
                </p>
              </div>

              {/* Right: mock card */}
              <div className="flex-shrink-0 relative">
                <div className="absolute -inset-4 rounded-3xl opacity-20 blur-2xl"
                  style={{ background: `radial-gradient(circle, ${brand}, transparent 70%)` }} />
                <div className="relative">
                  <MockCatalogCard t={t} />
                  {/* Search hint */}
                  <div className="absolute -top-4 -left-4 flex items-center gap-2 px-3 py-2 rounded-xl border shadow-lg"
                    style={{ background: "var(--cat-dropdown-bg, #141920)", borderColor: "var(--cat-card-border)" }}>
                    <Search className="w-3.5 h-3.5" style={{ color: brand }} />
                    <span className="text-[11px] font-semibold" style={{ color: "var(--cat-text)" }}>
                      "{t("mockSearch")}"
                    </span>
                  </div>
                  {/* Found badge */}
                  <div className="absolute -bottom-4 -right-4 flex items-center gap-2 px-3 py-2 rounded-xl border shadow-lg"
                    style={{ background: "var(--cat-dropdown-bg, #141920)", borderColor: brand + "40" }}>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: brand }} />
                    <span className="text-[11px] font-semibold" style={{ color: brand }}>
                      {t("mockFound")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── EARLY BIRD BANNER ── */}
        <section className="relative overflow-hidden py-10" style={{ background: "linear-gradient(135deg, #2BFEBA18, #8B5CF615)" }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(43,254,186,0.015) 40px, rgba(43,254,186,0.015) 80px)" }} />
          </div>
          <div className="relative max-w-[1000px] mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
              {/* Left: fire + counter */}
              <div className="flex flex-col items-center md:items-start gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Flame className="w-7 h-7" style={{ color: "#F59E0B" }} />
                  <span className="text-[28px] font-black" style={{ color: "#F59E0B" }}>
                    {t("earlyBirdTitle")}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
                  style={{ background: "#F59E0B15", borderColor: "#F59E0B40" }}>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#F59E0B" }} />
                  <span className="text-[12px] font-black" style={{ color: "#F59E0B" }}>
                    ~40 {t("earlyBirdSpots")}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px h-16 shrink-0" style={{ background: "rgba(255,255,255,0.1)" }} />

              {/* Center: desc */}
              <div className="flex-1 text-center md:text-left">
                <p className="text-[15px] font-semibold mb-1" style={{ color: "var(--cat-text)" }}>
                  {t("earlyBirdDesc")}
                </p>
                <p className="text-[13px]" style={{ color: "var(--cat-text-secondary)" }}>
                  {t("earlyBirdNormal")}
                </p>
              </div>

              {/* Right: price + CTA */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                <div className="text-center">
                  <div className="flex items-baseline gap-2 justify-center">
                    <span className="text-[42px] font-black leading-none" style={{ color: "var(--cat-text)" }}>€4.99</span>
                    <div className="text-left">
                      <div className="text-[11px] font-bold" style={{ color: "#2BFEBA" }}>/month</div>
                      <div className="text-[10px] line-through" style={{ color: "var(--cat-text-muted)" }}>€9.99</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 justify-center mt-1">
                    <Lock className="w-3 h-3" style={{ color: "#F59E0B" }} />
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#F59E0B" }}>
                      Lifetime price
                    </span>
                  </div>
                </div>
                <Link href="/onboarding"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-black transition-all hover:scale-[1.02]"
                  style={{ background: "#F59E0B", color: "#0A0E14" }}>
                  <Flame className="w-4 h-4" /> {t("earlyBirdCta")}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── BENEFITS ── */}
        <section className="max-w-[1200px] mx-auto px-6 py-24">
          <SectionHeader
            eyebrow={t("benefitsEyebrow")}
            title={t("benefitsTitle")}
            highlight={t("benefitsHighlight")}
            desc={t("benefitsDesc")}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map(b => (
              <BenefitCard key={b.title} icon={b.icon} color={b.color} title={b.title} desc={b.desc} />
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="py-20" style={{ background: "var(--cat-card-bg)", borderTop: "1px solid var(--cat-card-border)", borderBottom: "1px solid var(--cat-card-border)" }}>
          <div className="max-w-[1200px] mx-auto px-6">
            <SectionHeader
              eyebrow={t("stepsEyebrow")}
              title={t("stepsTitle")}
              highlight={t("stepsHighlight")}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-8 left-[calc(16.66%+16px)] right-[calc(16.66%+16px)] h-px"
                style={{ background: "linear-gradient(90deg, transparent, var(--cat-accent), transparent)", opacity: 0.3 }} />
              {steps.map(step => (
                <div key={step.num} className="relative flex flex-col items-center text-center md:items-start md:text-left">
                  <div className="relative mb-5">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: step.color + "15", border: `1px solid ${step.color}30` }}>
                      <step.icon className="w-7 h-7" style={{ color: step.color }} />
                    </div>
                    <span className="absolute -top-2 -right-2 text-[10px] font-black px-1.5 py-0.5 rounded-lg"
                      style={{ background: step.color, color: "#0A0E14" }}>
                      {step.num}
                    </span>
                  </div>
                  <h3 className="text-[16px] font-black mb-2" style={{ color: "var(--cat-text)" }}>{step.title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FOR WHO ── */}
        <section className="max-w-[1200px] mx-auto px-6 py-24">
          <SectionHeader
            eyebrow={t("forWhoEyebrow")}
            title={t("forWhoTitle")}
            highlight={t("forWhoHighlight")}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {forWho.map(card => (
              <div key={card.title} className="rounded-2xl p-7 border"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                <div className="text-4xl mb-4">{card.emoji}</div>
                <h3 className="text-[16px] font-black mb-3" style={{ color: "var(--cat-text)" }}>{card.title}</h3>
                <p className="text-[13px] leading-relaxed mb-5" style={{ color: "var(--cat-text-secondary)" }}>{card.desc}</p>
                <ul className="space-y-2.5">
                  {card.checks.map(c => <CheckItem key={c}>{c}</CheckItem>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── UPGRADE PATH ── */}
        <section className="py-20" style={{ background: "var(--cat-card-bg)", borderTop: "1px solid var(--cat-card-border)", borderBottom: "1px solid var(--cat-card-border)" }}>
          <div className="max-w-[900px] mx-auto px-6">
            <SectionHeader
              eyebrow={t("upgradeEyebrow")}
              title={t("upgradeTitle")}
              highlight={t("upgradeHighlight")}
              desc={t("upgradeDesc")}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Listing */}
              <div className="rounded-2xl p-7 border"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "#2BFEBA18" }}>
                    <BarChart3 className="w-5 h-5" style={{ color: "#2BFEBA" }} />
                  </div>
                  <div>
                    <p className="text-[14px] font-black" style={{ color: "var(--cat-text)" }}>{t("listingLabel")}</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[12px]" style={{ color: "var(--cat-text-muted)" }}>{t("listingPrice")}</p>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: "#F59E0B20", color: "#F59E0B" }}>
                        FOUNDER
                      </span>
                    </div>
                  </div>
                </div>
                <ul className="space-y-3">
                  {listingItems.map(item => <CheckItem key={item}>{item}</CheckItem>)}
                  {notIncluded.map(item => (
                    <li key={item} className="flex items-center gap-2.5 opacity-30">
                      <div className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5"
                        style={{ borderColor: "var(--cat-text-muted)" }}>
                        <div className="w-1.5 h-px" style={{ background: "var(--cat-text-muted)" }} />
                      </div>
                      <span className="text-[13px]" style={{ color: "var(--cat-text-secondary)" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Full platform */}
              <div className="rounded-2xl p-7 border relative overflow-hidden"
                style={{ background: "var(--cat-card-bg)", borderColor: "#2BFEBA40" }}>
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse at 80% 0%, #2BFEBA08, transparent 60%)" }} />
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "#2BFEBA18" }}>
                    <Trophy className="w-5 h-5" style={{ color: "#2BFEBA" }} />
                  </div>
                  <div>
                    <p className="text-[14px] font-black" style={{ color: "var(--cat-text)" }}>{t("fullLabel")}</p>
                    <p className="text-[12px]" style={{ color: "#2BFEBA" }}>{t("fullPrice")} <span className="text-[10px] opacity-60">(not monthly)</span></p>
                  </div>
                  <div className="ml-auto px-2.5 py-1 rounded-full text-[10px] font-black"
                    style={{ background: "#2BFEBA20", color: "#2BFEBA", border: "1px solid #2BFEBA40" }}>
                    {t("fullIncluded")}
                  </div>
                </div>
                <ul className="space-y-3">
                  {fullItems.map(item => <CheckItem key={item}>{item}</CheckItem>)}
                </ul>
                <Link href="/pricing"
                  className="mt-6 flex items-center gap-2 text-[13px] font-black transition-all hover:gap-3"
                  style={{ color: "#2BFEBA" }}>
                  {t("seePlans")} <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── TRUST ── */}
        <section className="max-w-[900px] mx-auto px-6 py-20 text-center">
          <div className="flex justify-center gap-1 mb-5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-current" style={{ color: "#F59E0B" }} />
            ))}
          </div>
          <blockquote className="text-[18px] md:text-[22px] font-bold leading-relaxed mb-6 max-w-2xl mx-auto"
            style={{ color: "var(--cat-text)" }}>
            "{t("trustQuote")}"
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "#2BFEBA20", border: "1px solid #2BFEBA40" }}>
              <Trophy className="w-5 h-5" style={{ color: "#2BFEBA" }} />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-bold" style={{ color: "var(--cat-text)" }}>{t("trustAuthor")}</p>
              <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{t("trustLocation")}</p>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="cat-banner relative overflow-hidden py-24">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(135deg, #2BFEBA10, transparent 50%, #8B5CF608)" }} />
          <div className="relative z-10 max-w-[700px] mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 border"
              style={{ background: "#F59E0B15", borderColor: "#F59E0B50" }}>
              <Flame className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#F59E0B" }}>
                {t("ctaBadge")} · ~40 spots left
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6" style={{ color: "var(--cat-text)" }}>
              {t("ctaTitle1")}
              <br />
              <span style={{
                background: "linear-gradient(90deg, #2BFEBA, #00E5FF)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>{t("ctaTitle2")}</span>
            </h2>
            <p className="text-[15px] leading-relaxed mb-10 max-w-lg mx-auto"
              style={{ color: "var(--cat-text-secondary)" }}>
              {t("ctaDesc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/onboarding"
                className="cat-cta-glow inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "#F59E0B", color: "#0A0E14" }}>
                <Flame className="w-5 h-5" /> {t("ctaPrimary")} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/pricing"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-semibold border transition-all hover:opacity-80"
                style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}>
                {t("ctaSecondary")}
              </Link>
            </div>
            <p className="text-[11px] mt-5" style={{ color: "var(--cat-text-muted)" }}>
              {t("ctaNote")}
            </p>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="border-t" style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
          <div className="max-w-[1200px] mx-auto px-6 py-5 flex items-center justify-between text-[12px]"
            style={{ color: "var(--cat-text-muted)" }}>
            <span>© {new Date().getFullYear()} Goality Sport Group</span>
            <div className="flex items-center gap-6">
              <Link href="/catalog" className="hover:opacity-80 transition-opacity">{t("li1").split(" ")[0]}</Link>
              <Link href="/features" className="hover:opacity-80 transition-opacity">Features</Link>
              <Link href="/pricing" className="hover:opacity-80 transition-opacity">Pricing</Link>
            </div>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}
