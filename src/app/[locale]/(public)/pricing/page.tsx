"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { PublicNavHeader } from "@/components/ui/public-nav-header";
import {
  Check, X, Sparkles, ArrowRight, Zap, Trophy, Crown,
  Rocket, Megaphone, TrendingUp, Star, BarChart3, Globe,
  Lock, ChevronDown, ChevronUp, Mail, Calculator,
} from "lucide-react";

/* ─── Price calculator ─── */
function PriceCalculator({ t }: { t: ReturnType<typeof useTranslations<"pricing">> }) {
  const [plan, setPlan] = useState<"starter" | "pro" | "elite">("pro");
  const [teams, setTeams] = useState(20);
  const [divs, setDivs] = useState(2);

  const base = plan === "starter" ? 19 : plan === "pro" ? 49 : 89;
  const extra = Math.max(0, teams - 16);
  const extraPrice = plan === "starter" ? 1 : 2;
  // Starter: 1 дивизион включён, Pro: 3 включено, Elite: ∞ включено (без доплаты)
  const includedDivs = plan === "starter" ? 1 : plan === "pro" ? 3 : Infinity;
  const extraDivs = plan === "elite" ? 0 : Math.max(0, divs - includedDivs);
  const total = base + extra * extraPrice + extraDivs * 9;

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      <div className="p-6 border-b" style={{ borderColor: "var(--cat-divider)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
          <p className="text-[13px] font-black" style={{ color: "var(--cat-text)" }}>{t("calcTitle")}</p>
        </div>

        {/* Plan selector */}
        <div className="flex gap-2 mb-5">
          {(["starter", "pro", "elite"] as const).map(p => (
            <button key={p} onClick={() => setPlan(p)}
              className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-all capitalize"
              style={plan === p
                ? { background: "var(--cat-pill-active-bg)", color: "var(--cat-accent)", border: "1px solid var(--cat-pill-active-border)" }
                : { background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)", border: "1px solid var(--cat-card-border)" }
              }>
              {p === "starter" ? "Starter" : p === "pro" ? "Pro" : "Elite"}
            </button>
          ))}
        </div>

        {/* Teams slider */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-[12px] font-semibold" style={{ color: "var(--cat-text-secondary)" }}>
                {t("calcTeamsLabel")}
              </label>
              <span className="text-[12px] font-black" style={{ color: "var(--cat-text)" }}>{teams}</span>
            </div>
            <input type="range" min={4} max={240} value={teams}
              onChange={e => setTeams(Number(e.target.value))}
              className="w-full accent-emerald-400" />
            <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--cat-text-faint)" }}>
              <span>4</span><span>{t("calcIncluded", { n: 16 })}</span><span>240</span>
            </div>
          </div>

          {plan === "elite" ? (
            /* Elite — все дивизионы включены */
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background: "var(--cat-badge-open-bg)", border: "1px solid var(--cat-pill-active-border)" }}>
              <span className="text-[12px] font-semibold" style={{ color: "var(--cat-text-secondary)" }}>
                {t("calcDivisionsLabel")}
              </span>
              <span className="text-[13px] font-black" style={{ color: "var(--cat-accent)" }}>∞ {t("calcDivUnlimited")}</span>
            </div>
          ) : (
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-[12px] font-semibold" style={{ color: "var(--cat-text-secondary)" }}>
                  {t("calcDivisionsLabel")}
                </label>
                <span className="text-[12px] font-black" style={{ color: "var(--cat-text)" }}>{divs}</span>
              </div>
              <input type="range" min={1} max={plan === "starter" ? 5 : 10} value={divs}
                onChange={e => setDivs(Number(e.target.value))}
                className="w-full accent-emerald-400" />
              <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--cat-text-faint)" }}>
                <span>1</span>
                <span>{plan === "starter" ? t("calcDivIncluded1") : t("calcDivIncluded3")}</span>
                <span>{plan === "starter" ? 5 : 10}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Total */}
      <div className="p-6">
        <div className="space-y-2 mb-4 text-[13px]">
          <div className="flex justify-between">
            <span style={{ color: "var(--cat-text-secondary)" }}>
              {t("calcBasePrice", { plan: plan === "starter" ? "Starter" : plan === "pro" ? "Pro" : "Elite" })}
            </span>
            <span style={{ color: "var(--cat-text)" }}>€{base}</span>
          </div>
          {extra > 0 && (
            <div className="flex justify-between">
              <span style={{ color: "var(--cat-text-secondary)" }}>
                {t("calcExtraTeams", { extra, price: extraPrice })}
              </span>
              <span style={{ color: "var(--cat-text)" }}>€{extra * extraPrice}</span>
            </div>
          )}
          {extraDivs > 0 && (
            <div className="flex justify-between">
              <span style={{ color: "var(--cat-text-secondary)" }}>
                {t("calcExtraDivs", { extra: extraDivs })}
              </span>
              <span style={{ color: "var(--cat-text)" }}>€{extraDivs * 9}</span>
            </div>
          )}
          <div className="h-px my-2" style={{ background: "var(--cat-divider)" }} />
          <div className="flex justify-between items-center">
            <span className="font-black" style={{ color: "var(--cat-text)" }}>{t("calcTotal")}</span>
            <span className="text-2xl font-black" style={{ color: "var(--cat-accent)" }}>€{total}</span>
          </div>
        </div>
        <Link href="/onboarding"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[13px] font-black transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(90deg, #2BFEBA, #00D98F)", color: "#0A0E14", boxShadow: "0 4px 20px rgba(43,254,186,0.25)" }}>
          {t("calcCta")} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

/* ─── FAQ item ─── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b" style={{ borderColor: "var(--cat-divider)" }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4">
        <span className="text-[14px] font-semibold" style={{ color: "var(--cat-text)" }}>{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "var(--cat-accent)" }} />
          : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
        }
      </button>
      {open && (
        <p className="pb-5 text-[13px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>{a}</p>
      )}
    </div>
  );
}

/* ─── Table cell ─── */
function Cell({ val, accent }: { val: boolean | string | null; accent: string }) {
  if (val === null) return <span className="text-[12px]" style={{ color: "var(--cat-text-faint)" }}>—</span>;
  if (val === true) return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center mx-auto"
      style={{ background: accent + "20" }}>
      <Check className="w-3 h-3" style={{ color: accent }} />
    </div>
  );
  if (val === false) return <X className="w-4 h-4 mx-auto" style={{ color: "var(--cat-text-faint)" }} />;
  return <span className="text-[11px] font-semibold leading-tight" style={{ color: "var(--cat-text-secondary)" }}>{val}</span>;
}

/* ─── Main pricing page ─── */
export default function PricingPage() {
  const t = useTranslations("pricing");
  const [showTable, setShowTable] = useState(false);

  const PLANS = [
    { key: "free",    name: "Free",    price: "€0",  priceNote: t("planPriceNoteForever"),       color: "#6B7280", accent: "#6B7280", icon: Zap,    highlight: false },
    { key: "starter", name: "Starter", price: "€19", priceNote: t("planPriceNotePerTournament"), color: "#3B82F6", accent: "#3B82F6", icon: Rocket, highlight: false },
    { key: "pro",     name: "Pro",     price: "€49", priceNote: t("planPriceNoteFrom"),          color: "#2BFEBA", accent: "#2BFEBA", icon: Trophy, highlight: true, badge: t("planBadgePopular") },
    { key: "elite",   name: "Elite",   price: "€89", priceNote: t("planPriceNoteFrom"),          color: "#F59E0B", accent: "#F59E0B", icon: Crown,  highlight: false },
  ];

  const planFeatures: Record<string, string[]> = {
    free:    [t("freeFeat1"),    t("freeFeat2"),    t("freeFeat3"),    t("freeFeat4"),    t("freeFeat5")],
    starter: [t("starterFeat1"), t("starterFeat2"), t("starterFeat3"), t("starterFeat4")],
    pro:     [t("proFeat1"),     t("proFeat2"),     t("proFeat3"),     t("proFeat4"),     t("proFeat5")],
    elite:   [t("eliteFeat1"),   t("eliteFeat2"),   t("eliteFeat3"),   t("eliteFeat4"),  t("eliteFeat5")],
  };

  const planLocked: Record<string, string[]> = {
    free:    [t("freeLocked1"),    t("freeLocked2"),    t("freeLocked3")],
    starter: [t("starterLocked1"), t("starterLocked2")],
    pro:     [],
    elite:   [],
  };

  const TABLE_ROWS: { label: string; group?: boolean; values: [boolean | string | null, boolean | string | null, boolean | string | null, boolean | string | null] }[] = [
    { label: t("tableGroupConditions"), group: true, values: [false, false, false, false] },
    { label: t("tableRowTournaments"),       values: [t("tableVal1Tournament"), "∞", "∞", "∞"] },
    { label: t("tableRowDays"),              values: [t("tableVal1Day"), t("tableValUp2Days"), "∞", "∞"] },
    { label: t("tableRowDivisions"),         values: [t("tableVal1Div"), t("tableVal1Div"), t("tableValUp3Divs"), "∞"] },
    { label: t("tableRowTeamsIncluded"),     values: [t("tableVal1Teams"), t("tableValStarter16"), t("tableValStarter16"), t("tableValStarter16")] },
    { label: t("tableRowExtraTeam"),         values: [null, t("tableValExtraStarter"), t("tableValExtraPro"), t("tableValExtraPro")] },
    { label: t("tableGroupProtocol"), group: true, values: [false, false, false, false] },
    { label: t("tableRowProtocolBasic"),     values: [true, true, true, true] },
    { label: t("tableRowProtocolFull"),      values: [false, false, true, true] },
    { label: t("tableRowLiveTimeline"),      values: [false, false, true, true] },
    { label: t("tableRowMatchHub"),          values: [false, false, true, true] },
    { label: t("tableRowPlayerStats"),       values: [false, false, true, true] },
    { label: t("tableGroupTools"), group: true, values: [false, false, false, false] },
    { label: t("tableRowTeamReg"),           values: [true, true, true, true] },
    { label: t("tableRowDocuments"),         values: [false, true, true, true] },
    { label: t("tableRowMessaging"),         values: [false, false, true, true] },
    { label: t("tableRowFinances"),          values: [false, false, true, true] },
    { label: t("tableRowFormatBuilder"),     values: [true, true, true, true] },
    { label: t("tableRowEliteFormats"),      values: [false, false, false, true] },
    { label: t("tableGroupVisibility"), group: true, values: [false, false, false, false] },
    { label: t("tableRowPublicPage"),        values: [true, true, true, true] },
    { label: t("tableRowCatalog"),           values: [false, true, true, true] },
    { label: t("tableRowCatalogPriority"),   values: [false, false, true, false] },
    { label: t("tableRowCatalogTop"),        values: [false, false, false, true] },
    { label: t("tableRowMultiAdmin"),        values: [false, false, false, true] },
  ];

  const tableRows = showTable ? TABLE_ROWS : TABLE_ROWS.slice(0, 12);

  const FAQ_ITEMS = [
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq2Q"), a: t("faq2A") },
    { q: t("faq3Q"), a: t("faq3A") },
    { q: t("faq4Q"), a: t("faq4A") },
    { q: t("faq5Q"), a: t("faq5A") },
    { q: t("faq6Q"), a: t("faq6A") },
  ];

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen overflow-x-hidden" style={{ background: "var(--cat-bg)" }}>
        <PublicNavHeader />

        {/* HERO */}
        <section className="relative overflow-hidden pt-24 pb-20 px-6">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] opacity-[0.06]"
              style={{ background: "radial-gradient(ellipse, #2BFEBA, transparent 65%)" }} />
            <div className="absolute top-[10%] left-[5%] w-[300px] h-[300px] opacity-[0.04]"
              style={{ background: "radial-gradient(circle, #3B82F6, transparent 70%)" }} />
            <div className="absolute top-[15%] right-[5%] w-[250px] h-[250px] opacity-[0.04]"
              style={{ background: "radial-gradient(circle, #F59E0B, transparent 70%)" }} />
          </div>
          <div className="relative z-10 max-w-[1200px] mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 border"
              style={{ background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-badge-open-border)" }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
              <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--cat-accent)" }}>
                {t("heroBadge")}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.95] mb-6">
              <span style={{ color: "var(--cat-text)" }}>{t("heroHeading1")}</span>{" "}
              <span style={{
                background: "linear-gradient(90deg, #2BFEBA, #00E5FF)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>{t("heroHeadingHighlight")}</span>
            </h1>
            <p className="text-[16px] max-w-2xl mx-auto leading-relaxed mb-3"
              style={{ color: "var(--cat-text-secondary)" }}>
              {t("heroSubtitle")}
            </p>
            <p className="text-[13px]" style={{ color: "var(--cat-text-muted)" }}>
              {t("heroNote")}
            </p>
          </div>
        </section>

        {/* PLAN CARDS */}
        <section className="max-w-[1200px] mx-auto px-6 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              return (
                <div key={plan.key}
                  className="relative rounded-2xl p-6 flex flex-col border transition-all"
                  style={{
                    background: plan.highlight
                      ? "linear-gradient(135deg, rgba(43,254,186,0.06), rgba(0,229,255,0.03))"
                      : "var(--cat-card-bg)",
                    borderColor: plan.highlight ? "rgba(43,254,186,0.35)" : "var(--cat-card-border)",
                    boxShadow: plan.highlight ? "0 0 40px rgba(43,254,186,0.12), 0 0 0 1px rgba(43,254,186,0.15)" : "var(--cat-card-shadow)",
                  }}>
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                      style={{ background: "linear-gradient(90deg, #2BFEBA, #00E5FF)", color: "#0A0E14" }}>
                      {plan.badge}
                    </div>
                  )}

                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: plan.color + "18" }}>
                    <Icon className="w-5 h-5" style={{ color: plan.color } as React.CSSProperties} />
                  </div>

                  <p className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: plan.color }}>
                    {plan.name}
                  </p>
                  <div className="flex items-baseline gap-1 mb-0.5">
                    <span className="text-4xl font-black" style={{ color: "var(--cat-text)" }}>{plan.price}</span>
                  </div>
                  <p className="text-[12px] mb-6" style={{ color: "var(--cat-text-muted)" }}>{plan.priceNote}</p>

                  <ul className="space-y-2.5 mb-8 flex-1">
                    {planFeatures[plan.key].map(f => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: plan.color }} />
                        <span className="text-[12px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>{f}</span>
                      </li>
                    ))}
                    {planLocked[plan.key].map(f => (
                      <li key={f} className="flex items-start gap-2 opacity-35">
                        <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
                        <span className="text-[12px] leading-relaxed" style={{ color: "var(--cat-text-muted)" }}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href={plan.key === "free" ? "/onboarding" : `/onboarding?plan=${plan.key}`}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black transition-all hover:opacity-90"
                    style={plan.highlight
                      ? { background: "linear-gradient(90deg, #2BFEBA, #00D98F)", color: "#0A0E14", boxShadow: "0 4px 20px rgba(43,254,186,0.3)" }
                      : { background: plan.color + "14", color: plan.color, border: `1px solid ${plan.color}30` }
                    }>
                    {plan.key === "free" ? t("planCtaFree") : t("planCtaChoose", { name: plan.name })}
                    {plan.highlight && <ArrowRight className="w-4 h-4" />}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Elite subscription */}
          <div className="mt-5 relative rounded-2xl p-6 border overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(239,68,68,0.03))", borderColor: "rgba(245,158,11,0.25)" }}>
            <div className="absolute top-0 right-0 w-[300px] h-[200px] pointer-events-none opacity-[0.06]"
              style={{ background: "radial-gradient(circle at top right, #F59E0B, transparent 70%)" }} />
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(245,158,11,0.15)" }}>
                  <Crown className="w-6 h-6" style={{ color: "#F59E0B" }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[14px] font-black" style={{ color: "var(--cat-text)" }}>{t("eliteSubTitle")}</p>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}>
                      {t("eliteSubBadge")}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>
                    {t("eliteSubDesc")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <p className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>€249</p>
                  <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{t("eliteSubPerMonth")}</p>
                </div>
                <div className="w-px h-10" style={{ background: "var(--cat-divider)" }} />
                <div className="text-center">
                  <p className="text-2xl font-black" style={{ color: "var(--cat-accent)" }}>€1 999</p>
                  <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{t("eliteSubPerYear")}</p>
                </div>
                <Link href="/onboarding?plan=elite-subscription"
                  className="px-5 py-2.5 rounded-xl text-[13px] font-black transition-opacity hover:opacity-90 whitespace-nowrap"
                  style={{ background: "linear-gradient(90deg, #F59E0B, #EF4444)", color: "#fff" }}>
                  {t("eliteSubCta")}
                </Link>
              </div>
            </div>
          </div>

          {/* Extra teams note */}
          <div className="mt-4 flex items-start gap-3 p-4 rounded-xl border"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <BarChart3 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--cat-accent)" }} />
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--cat-text-muted)" }}>
              <strong style={{ color: "var(--cat-text-secondary)" }}>{t("extraTeamsLabel")}</strong>{" "}
              {t("extraTeamsNote")}
            </p>
          </div>
        </section>

        {/* CALCULATOR */}
        <section className="max-w-[1200px] mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: "var(--cat-accent)" }}>
                {t("calcEyebrow")}
              </p>
              <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: "var(--cat-text)" }}>
                {t("calcHeading").split("\n").map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
              </h2>
              <p className="text-[14px] leading-relaxed mb-6" style={{ color: "var(--cat-text-secondary)" }}>
                {t("calcDesc")}
              </p>
              <div className="space-y-3">
                {[
                  { plan: "Starter", teams: 16, total: 19, note: t("calcEx1Note") },
                  { plan: "Starter", teams: 20, total: 23, note: t("calcEx2Note") },
                  { plan: "Pro",     teams: 24, total: 65, note: t("calcEx3Note") },
                  { plan: "Pro",     teams: 32, total: 81, note: t("calcEx4Note") },
                ].map((ex, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}>
                    <div>
                      <p className="text-[12px] font-semibold" style={{ color: "var(--cat-text)" }}>
                        {ex.plan} · {ex.teams}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{ex.note}</p>
                    </div>
                    <p className="text-[16px] font-black" style={{ color: "var(--cat-accent)" }}>€{ex.total}</p>
                  </div>
                ))}
              </div>
            </div>
            <PriceCalculator t={t} />
          </div>
        </section>

        {/* MARKETING COMING SOON */}
        <section className="max-w-[1200px] mx-auto px-6 pb-20">
          <div className="relative rounded-2xl overflow-hidden border"
            style={{ borderColor: "rgba(245,158,11,0.25)" }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.05), rgba(239,68,68,0.03), rgba(139,92,246,0.05))" }} />
            <div className="relative z-10 p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-4 border"
                    style={{ background: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.3)" }}>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#F59E0B" }} />
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#F59E0B" }}>{t("marketingBadge")}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black mb-2" style={{ color: "var(--cat-text)" }}>
                    {t("marketingHeading")}
                  </h2>
                  <p className="text-[14px] leading-relaxed max-w-lg" style={{ color: "var(--cat-text-secondary)" }}>
                    {t("marketingDesc")}
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[260px]">
                  <div className="flex gap-2">
                    <input type="email" placeholder={t("marketingEmailPlaceholder")}
                      className="flex-1 px-4 py-2.5 rounded-xl text-[13px] border outline-none"
                      style={{ background: "var(--cat-input-bg)", borderColor: "var(--cat-input-border)", color: "var(--cat-text)" }} />
                    <button className="shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-black flex items-center gap-2"
                      style={{ background: "linear-gradient(90deg, #F59E0B, #EF4444)", color: "#fff" }}>
                      <Mail className="w-4 h-4" /> OK
                    </button>
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{t("marketingNoSpam")}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Star,       color: "#F59E0B", title: t("marketingFeat1Title"), desc: t("marketingFeat1Desc") },
                  { icon: Megaphone,  color: "#EF4444", title: t("marketingFeat2Title"), desc: t("marketingFeat2Desc") },
                  { icon: Globe,      color: "#8B5CF6", title: t("marketingFeat3Title"), desc: t("marketingFeat3Desc") },
                  { icon: TrendingUp, color: "#3B82F6", title: t("marketingFeat4Title"), desc: t("marketingFeat4Desc") },
                ].map(item => (
                  <div key={item.title}
                    className="rounded-xl p-4 border relative"
                    style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                    <Lock className="absolute top-3 right-3 w-3 h-3" style={{ color: "var(--cat-text-faint)" }} />
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                      style={{ background: item.color + "18" }}>
                      <item.icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <p className="text-[12px] font-bold mb-1" style={{ color: "var(--cat-text)" }}>{item.title}</p>
                    <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* COMPARISON TABLE */}
        <section className="max-w-[1200px] mx-auto px-6 pb-20">
          <div className="text-center mb-10">
            <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: "var(--cat-accent)" }}>{t("tableEyebrow")}</p>
            <h2 className="text-3xl md:text-4xl font-black" style={{ color: "var(--cat-text)" }}>{t("tableHeading")}</h2>
          </div>
          <div className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <div className="grid border-b"
              style={{ gridTemplateColumns: "1fr 80px 80px 80px 80px", borderColor: "var(--cat-divider)" }}>
              <div className="p-4" />
              {PLANS.map(p => (
                <div key={p.key} className="p-3 text-center"
                  style={{ background: p.highlight ? "rgba(43,254,186,0.04)" : undefined }}>
                  <p className="text-[10px] font-black uppercase" style={{ color: p.color }}>{p.name}</p>
                  <p className="text-[12px] font-black mt-0.5" style={{ color: "var(--cat-text)" }}>{p.price}</p>
                </div>
              ))}
            </div>
            {tableRows.map((row, i) => {
              if (row.group) {
                return (
                  <div key={i} className="px-4 py-2.5"
                    style={{ background: "var(--cat-tag-bg)", borderBottom: "1px solid var(--cat-divider)", gridColumn: "1/-1" }}>
                    <p className="text-[10px] font-black uppercase tracking-widest"
                      style={{ color: "var(--cat-text-muted)" }}>{row.label}</p>
                  </div>
                );
              }
              return (
                <div key={i} className="grid items-center border-b"
                  style={{ gridTemplateColumns: "1fr 80px 80px 80px 80px", borderColor: "var(--cat-divider)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                  <div className="px-4 py-3">
                    <span className="text-[12px]" style={{ color: "var(--cat-text-secondary)" }}>{row.label}</span>
                  </div>
                  {PLANS.map((p, pi) => (
                    <div key={p.key} className="px-2 py-3 flex items-center justify-center text-center"
                      style={{ background: p.highlight ? "rgba(43,254,186,0.02)" : undefined }}>
                      <Cell val={row.values[pi as 0|1|2|3]} accent={p.color} />
                    </div>
                  ))}
                </div>
              );
            })}
            {!showTable && (
              <button onClick={() => setShowTable(true)}
                className="w-full py-4 text-[13px] font-semibold flex items-center justify-center gap-2"
                style={{ color: "var(--cat-accent)", background: "var(--cat-tag-bg)" }}>
                {t("tableShowAll")} <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-[800px] mx-auto px-6 pb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black" style={{ color: "var(--cat-text)" }}>{t("faqHeading")}</h2>
          </div>
          <div className="rounded-2xl border px-6"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            {FAQ_ITEMS.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} />)}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-[1200px] mx-auto px-6 pb-24">
          <div className="relative rounded-2xl overflow-hidden p-12 text-center border"
            style={{ background: "linear-gradient(135deg, rgba(43,254,186,0.07), rgba(0,0,0,0), rgba(139,92,246,0.05))", borderColor: "rgba(43,254,186,0.2)" }}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] opacity-[0.07]"
                style={{ background: "radial-gradient(ellipse, #2BFEBA, transparent 70%)" }} />
            </div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: "var(--cat-text)" }}>
                {t("ctaHeading1")}{" "}
                <span style={{ background: "linear-gradient(90deg, #2BFEBA, #00E5FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  {t("ctaHeadingFree")}
                </span>
              </h2>
              <p className="text-[15px] max-w-xl mx-auto mb-8 leading-relaxed"
                style={{ color: "var(--cat-text-secondary)" }}>
                {t("ctaSubtitle")}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link href="/onboarding"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-black transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(90deg, #2BFEBA, #00D98F)", color: "#0A0E14", boxShadow: "0 8px 30px rgba(43,254,186,0.3)" }}>
                  {t("ctaCreate")} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/features"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-semibold border transition-all hover:opacity-80"
                  style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}>
                  {t("ctaFeatures")}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t" style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
          <div className="max-w-[1200px] mx-auto px-6 py-5 flex items-center justify-between text-xs"
            style={{ color: "var(--cat-text-muted)" }}>
            <span>&copy; {new Date().getFullYear()} Goality. {t("footerCopyright")}</span>
            <div className="flex items-center gap-4">
              <Link href="/" className="hover:opacity-80">{t("footerHome")}</Link>
              <Link href="/features" className="hover:opacity-80">{t("footerFeatures")}</Link>
              <Link href="/catalog" className="hover:opacity-80">{t("footerCatalog")}</Link>
              <Link href="/pricing" className="hover:opacity-80" style={{ color: "var(--cat-accent)" }}>{t("footerPricing")}</Link>
            </div>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}
