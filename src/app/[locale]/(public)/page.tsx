"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ThemeProvider, ThemeToggle } from "@/components/ui/theme-provider";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import {
  ArrowRight, Trophy, Users, Globe, CheckCircle, Shield, Zap, BarChart3,
  Calendar, Hotel, Bus, CreditCard, Mail, ClipboardList, ChevronRight,
  Star, Sparkles, Play, Building2, UserCheck, Package, MessageSquare,
  TrendingUp, Lock, Layers, Database,
} from "lucide-react";

/* ── Animated counter ── */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      observer.disconnect();
      let start = 0;
      const step = Math.ceil(to / 60);
      const id = setInterval(() => {
        start = Math.min(start + step, to);
        setCount(start);
        if (start >= to) clearInterval(id);
      }, 16);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ── Feature card ── */
function FeatureCard({ icon: Icon, title, desc, color, delay = 0 }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; desc: string; color: string; delay?: number;
}) {
  return (
    <div
      className="cat-card cat-feature rounded-2xl p-6 border"
      style={{
        background: "var(--cat-card-bg)",
        borderColor: "var(--cat-card-border)",
        boxShadow: "var(--cat-card-shadow)",
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 cat-feature-icon" style={{ background: color + "18", color }}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-[14px] font-bold mb-2" style={{ color: "var(--cat-text)" }}>{title}</h3>
      <p className="text-[13px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>{desc}</p>
    </div>
  );
}

/* ── Who is it for card ── */
function ForCard({ emoji, title, points, color }: { emoji: string; title: string; points: string[]; color: string }) {
  return (
    <div className="cat-card rounded-2xl p-6 border" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}>
      <div className="text-3xl mb-3">{emoji}</div>
      <h3 className="text-[15px] font-bold mb-4" style={{ color: "var(--cat-text)" }}>{title}</h3>
      <ul className="space-y-2.5">
        {points.map(p => (
          <li key={p} className="flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} />
            <span className="text-[13px]" style={{ color: "var(--cat-text-secondary)" }}>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HomePage() {
  const t = useTranslations("landing");

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen overflow-x-hidden" style={{ background: "var(--cat-bg)" }}>

        {/* ══════════ NAVBAR ══════════ */}
        <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: "var(--cat-header-bg)", borderColor: "var(--cat-header-border)" }}>
          <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Goality" className="w-8 h-8 rounded-xl object-contain" style={{ boxShadow: "0 4px 14px var(--cat-accent-glow)" }} />
              <span className="font-bold text-[15px] tracking-tight" style={{ color: "var(--cat-text)" }}>Goality</span>
              <span className="hidden sm:inline text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-widest" style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}>TMC</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {[
                { label: t("navProduct"), href: "#product" },
                { label: t("navFeatures"), href: "#features" },
                { label: t("navForWho"), href: "#for-who" },
                { label: t("navCatalog"), href: "/catalog" },
              ].map(({ label, href }) => (
                <a key={label} href={href} className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors" style={{ color: "var(--cat-text-secondary)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--cat-text)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--cat-text-secondary)")}
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher variant="light" />
              <Link href="/login" className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors" style={{ color: "var(--cat-text-secondary)" }}>{t("navSignIn")}</Link>
              <Link href="/onboarding" className="cat-cta-glow inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[13px] font-semibold transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))", color: "var(--cat-accent-text)" }}>
                {t("navGetStarted")} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </header>

        {/* ══════════ HERO ══════════ */}
        <section className="cat-banner cat-hero-decor relative overflow-hidden" style={{ background: "linear-gradient(135deg, var(--cat-banner-from), var(--cat-banner-via), var(--cat-banner-to))" }}>
          {/* Glow orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.07]" style={{ background: "radial-gradient(circle, var(--cat-accent), transparent 70%)" }} />
            <div className="absolute bottom-[-30%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #8B5CF6, transparent 70%)" }} />
          </div>

          {/* Floating icons */}
          <div className="absolute top-[15%] right-[8%] cat-float-1 pointer-events-none opacity-[0.06]" style={{ color: "var(--cat-accent)" }}><Trophy className="w-16 h-16" /></div>
          <div className="absolute top-[55%] right-[18%] cat-float-2 pointer-events-none opacity-[0.04]" style={{ color: "var(--cat-accent)" }}><Users className="w-10 h-10" /></div>
          <div className="absolute top-[30%] right-[30%] cat-float-3 pointer-events-none opacity-[0.03]" style={{ color: "#8B5CF6" }}><Star className="w-8 h-8" /></div>

          <div className="relative z-10 max-w-[1200px] mx-auto px-6 pt-24 pb-32 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 border" style={{ background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-badge-open-border)" }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--cat-accent)" }}>{t("heroBadge")}</span>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] mb-8">
              <span className="cat-gradient-text" style={{ background: "linear-gradient(90deg, var(--cat-accent), #00E5FF, var(--cat-accent))", backgroundSize: "200%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Play.</span>{" "}
              <span style={{ color: "var(--cat-text)" }}>Grow.</span>{" "}
              <span className="cat-gradient-text" style={{ background: "linear-gradient(90deg, var(--cat-accent), #00E5FF, var(--cat-accent))", backgroundSize: "200%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Win.</span>
            </h1>

            <p className="text-xl md:text-2xl font-semibold mb-4 max-w-3xl mx-auto" style={{ color: "var(--cat-text)" }}>
              {t("heroSubtitle")}
            </p>
            <p className="text-[15px] md:text-base max-w-2xl mx-auto leading-relaxed mb-12" style={{ color: "var(--cat-text-secondary)" }}>
              {t("heroDesc")}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
              <Link href="/onboarding" className="cat-cta-glow inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-bold transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))", color: "var(--cat-accent-text)", boxShadow: "0 8px 30px var(--cat-accent-glow)" }}>
                {t("heroCta1")} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/catalog" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-semibold border transition-all hover:opacity-80"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}>
                <Play className="w-4 h-4" style={{ color: "var(--cat-accent)" }} /> {t("heroCta2")}
              </Link>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap items-center justify-center gap-12">
              {[
                { value: 500, suffix: "+", label: t("statTeams") },
                { value: 12, suffix: "", label: t("statCountries") },
                { value: 40, suffix: "+", label: t("statTournaments") },
                { value: 99, suffix: "%", label: t("statSatisfaction") },
              ].map(({ value, suffix, label }) => (
                <div key={label} className="text-center cat-stat">
                  <p className="text-3xl md:text-4xl font-black mb-1" style={{ color: "var(--cat-accent)" }}>
                    <Counter to={value} suffix={suffix} />
                  </p>
                  <p className="text-[12px] font-medium" style={{ color: "var(--cat-text-muted)" }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent, var(--cat-bg))" }} />
        </section>

        {/* ══════════ PRODUCT OVERVIEW ══════════ */}
        <section id="product" className="max-w-[1200px] mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--cat-accent)" }}>{t("productEyebrow")}</p>
            <h2 className="text-4xl md:text-5xl font-black mb-6" style={{ color: "var(--cat-text)" }}>
              {t("productTitle1")}<br />
              <span style={{ color: "var(--cat-accent)" }}>{t("productTitle2")}</span>
            </h2>
            <p className="text-[15px] max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>
              {t("productDesc")}
            </p>
          </div>

          {/* 3-column value props */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {[
              { icon: Zap, title: t("vp1Title"), desc: t("vp1Desc"), color: "#F59E0B" },
              { icon: Globe, title: t("vp2Title"), desc: t("vp2Desc"), color: "#3B82F6" },
              { icon: Shield, title: t("vp3Title"), desc: t("vp3Desc"), color: "#10B981" },
            ].map(item => (
              <FeatureCard key={item.title} {...item} />
            ))}
          </div>

          {/* Big visual block */}
          <div className="rounded-3xl overflow-hidden border relative" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, var(--cat-accent), transparent)" }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* Left: text */}
              <div className="p-10 md:p-14 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest w-fit" style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)", border: "1px solid var(--cat-badge-open-border)" }}>
                  <TrendingUp className="w-3.5 h-3.5" /> {t("orgBadge")}
                </div>
                <h3 className="text-3xl font-black mb-4" style={{ color: "var(--cat-text)" }}>{t("orgTitle")}</h3>
                <p className="text-[14px] leading-relaxed mb-8" style={{ color: "var(--cat-text-secondary)" }}>
                  {t("orgDesc")}
                </p>
                <ul className="space-y-3">
                  {[t("orgItem1"), t("orgItem2"), t("orgItem3"), t("orgItem4"), t("orgItem5"), t("orgItem6")].map(item => (
                    <li key={item} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--cat-badge-open-bg)" }}>
                        <CheckCircle className="w-3 h-3" style={{ color: "var(--cat-accent)" }} />
                      </div>
                      <span className="text-[13px]" style={{ color: "var(--cat-text-secondary)" }}>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/onboarding" className="mt-8 inline-flex items-center gap-2 font-semibold text-[13px]" style={{ color: "var(--cat-accent)" }}>
                  {t("orgCta")} <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              {/* Right: mock dashboard */}
              <div className="p-8 flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--cat-banner-from), var(--cat-banner-to))" }}>
                <div className="w-full max-w-sm space-y-3">
                  {[
                    { label: t("dashRegistered"), value: "24", icon: Building2, color: "#3B82F6" },
                    { label: t("dashTeams"), value: "68", icon: Users, color: "#10B981" },
                    { label: t("dashPayments"), value: "€14,200", icon: CreditCard, color: "#F59E0B" },
                    { label: t("dashMessages"), value: "142", icon: MessageSquare, color: "#8B5CF6" },
                  ].map(({ label, value, icon: Icon, color }, i) => (
                    <div key={label} className="cat-card flex items-center gap-4 px-4 py-3 rounded-xl border" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", animationDelay: `${i * 100}ms` }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "18", color }}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{label}</p>
                        <p className="text-[15px] font-black" style={{ color: "var(--cat-text)" }}>{value}</p>
                      </div>
                      <TrendingUp className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ FEATURES GRID ══════════ */}
        <section id="features" style={{ background: "linear-gradient(180deg, var(--cat-bg), var(--cat-banner-from))" }}>
          <div className="max-w-[1200px] mx-auto px-6 py-24">
            <div className="text-center mb-16">
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--cat-accent)" }}>{t("featuresEyebrow")}</p>
              <h2 className="text-4xl md:text-5xl font-black" style={{ color: "var(--cat-text)" }}>
                {t("featuresTitle")}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: ClipboardList, title: t("f1Title"), desc: t("f1Desc"), color: "#10B981", delay: 0 },
                { icon: Package, title: t("f2Title"), desc: t("f2Desc"), color: "#3B82F6", delay: 50 },
                { icon: Hotel, title: t("f3Title"), desc: t("f3Desc"), color: "#8B5CF6", delay: 100 },
                { icon: Bus, title: t("f4Title"), desc: t("f4Desc"), color: "#F59E0B", delay: 150 },
                { icon: CreditCard, title: t("f5Title"), desc: t("f5Desc"), color: "#EF4444", delay: 200 },
                { icon: Mail, title: t("f6Title"), desc: t("f6Desc"), color: "#06B6D4", delay: 250 },
                { icon: UserCheck, title: t("f7Title"), desc: t("f7Desc"), color: "#EC4899", delay: 300 },
                { icon: Calendar, title: t("f8Title"), desc: t("f8Desc"), color: "#10B981", delay: 350 },
                { icon: BarChart3, title: t("f9Title"), desc: t("f9Desc"), color: "#F59E0B", delay: 400 },
                { icon: Globe, title: t("f10Title"), desc: t("f10Desc"), color: "#3B82F6", delay: 450 },
                { icon: Lock, title: t("f11Title"), desc: t("f11Desc"), color: "#8B5CF6", delay: 500 },
                { icon: Layers, title: t("f12Title"), desc: t("f12Desc"), color: "#EF4444", delay: 550 },
              ].map(item => (
                <FeatureCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ PROBLEMS WE SOLVE ══════════ */}
        <section className="max-w-[1200px] mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--cat-accent)" }}>{t("problemsEyebrow")}</p>
            <h2 className="text-4xl md:text-5xl font-black mb-6" style={{ color: "var(--cat-text)" }}>{t("problemsTitle")}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { before: t("p1Before"), after: t("p1After") },
              { before: t("p2Before"), after: t("p2After") },
              { before: t("p3Before"), after: t("p3After") },
              { before: t("p4Before"), after: t("p4After") },
              { before: t("p5Before"), after: t("p5After") },
              { before: t("p6Before"), after: t("p6After") },
            ].map(({ before, after }) => (
              <div key={before} className="cat-card rounded-2xl p-5 border" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}>
                <p className="text-[13px] mb-3" style={{ color: "var(--cat-text-muted)" }}>{before}</p>
                <p className="text-[14px] font-semibold" style={{ color: "var(--cat-text)" }}>{after}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════ FOR WHO ══════════ */}
        <section id="for-who" style={{ background: "linear-gradient(180deg, var(--cat-bg), var(--cat-banner-to))" }}>
          <div className="max-w-[1200px] mx-auto px-6 py-24">
            <div className="text-center mb-16">
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--cat-accent)" }}>{t("forWhoEyebrow")}</p>
              <h2 className="text-4xl md:text-5xl font-black" style={{ color: "var(--cat-text)" }}>
                {t("forWhoTitle")}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ForCard
                emoji="🏟️"
                title={t("org1Title")}
                color="#10B981"
                points={[t("org1p1"), t("org1p2"), t("org1p3"), t("org1p4"), t("org1p5")]}
              />
              <ForCard
                emoji="🏃"
                title={t("club1Title")}
                color="#3B82F6"
                points={[t("club1p1"), t("club1p2"), t("club1p3"), t("club1p4"), t("club1p5")]}
              />
              <ForCard
                emoji="⚽"
                title={t("player1Title")}
                color="#8B5CF6"
                points={[t("player1p1"), t("player1p2"), t("player1p3"), t("player1p4"), t("player1p5")]}
              />
            </div>
          </div>
        </section>

        {/* ══════════ TRUST STRIP ══════════ */}
        <section className="max-w-[1200px] mx-auto px-6 py-16">
          <div className="rounded-3xl p-10 md:p-14 text-center border relative overflow-hidden" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-[-40%] left-[20%] w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, var(--cat-accent), transparent)" }} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" style={{ color: "#F59E0B" }} />)}
              </div>
              <blockquote className="text-xl md:text-2xl font-bold mb-6 max-w-3xl mx-auto" style={{ color: "var(--cat-text)" }}>
                "{t("trustQuote")}"
              </blockquote>
              <p className="text-[13px] font-semibold" style={{ color: "var(--cat-text-secondary)" }}>
                {t("trustAuthor")}
              </p>
            </div>
          </div>
        </section>

        {/* ══════════ FINAL CTA ══════════ */}
        <section className="max-w-[1200px] mx-auto px-6 pb-24">
          <div className="cat-banner rounded-3xl p-12 md:p-20 text-center relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, var(--cat-banner-from), var(--cat-banner-via), var(--cat-banner-to))" }}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-[-30%] left-[30%] w-[600px] h-[600px] rounded-full opacity-[0.08]" style={{ background: `radial-gradient(circle, var(--cat-accent), transparent)` }} />
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: "var(--cat-badge-open-bg)", boxShadow: "0 8px 32px var(--cat-accent-glow)" }}>
                <Trophy className="w-8 h-8" style={{ color: "var(--cat-accent)" }} />
              </div>
              <h2 className="text-4xl md:text-6xl font-black mb-6" style={{ color: "var(--cat-text)" }}>
                {t("ctaTitle1")}<br />
                <span style={{ color: "var(--cat-accent)" }}>{t("ctaTitle2")}</span>
              </h2>
              <p className="text-[15px] max-w-xl mx-auto mb-10" style={{ color: "var(--cat-text-secondary)" }}>
                {t("ctaDesc")}
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/onboarding" className="cat-cta-glow inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-[15px] font-bold hover:opacity-90 transition-opacity"
                  style={{ background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))", color: "var(--cat-accent-text)", boxShadow: "0 8px 30px var(--cat-accent-glow)" }}>
                  {t("ctaPrimary")} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/catalog" className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-[15px] font-semibold border hover:opacity-80 transition-opacity"
                  style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}>
                  {t("ctaSecondary")}
                </Link>
              </div>
              <p className="mt-6 text-[12px]" style={{ color: "var(--cat-text-muted)" }}>
                {t("ctaDisclaimer")}
              </p>
            </div>
          </div>
        </section>

        {/* ══════════ FOOTER ══════════ */}
        <footer className="cat-footer" style={{ background: "var(--cat-card-bg)" }}>
          <div className="max-w-[1200px] mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Goality" className="w-7 h-7 rounded-lg object-contain" />
              <span className="text-[13px] font-semibold" style={{ color: "var(--cat-text)" }}>{t("footerCompany")}</span>
              <span className="text-[12px]" style={{ color: "var(--cat-text-muted)" }}>© {new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center gap-6">
              {[
                { label: t("footerCatalog"), href: "/catalog" },
                { label: t("footerSignIn"), href: "/login" },
                { label: t("footerOrganizers"), href: "/onboarding" },
              ].map(({ label, href }) => (
                <Link key={label} href={href} className="text-[12px] transition-opacity hover:opacity-80" style={{ color: "var(--cat-text-secondary)" }}>{label}</Link>
              ))}
              <ThemeToggle />
            </div>
          </div>
        </footer>

      </div>
    </ThemeProvider>
  );
}
