"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CreditCard, CheckCircle, Lock, Zap, Shield, Star,
  AlertCircle, ArrowRight, Users, Layers, Calendar,
  Plus, Minus, ShoppingCart, Sparkles, Check, Crown, Rocket, Gift,
} from "lucide-react";
import {
  PLAN_LIMITS,
  PLAN_PRICES_EUR_CENTS,
  PLAN_NAMES,
  type TournamentPlan,
} from "@/lib/plan-gates";

// ─── Types ────────────────────────────────────────────────────────────────────

type TournamentInfo = {
  id: number;
  name: string;
  plan: TournamentPlan;
  effectivePlan: TournamentPlan;
  extraTeamsPurchased: number;
  extraDivisionsPurchased: number;
  planOverrideAt?: string | null;
  planOverrideReason?: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_ORDER: TournamentPlan[] = ["free", "starter", "pro", "elite"];
const EXTRA_DIVISION_PRICE = 9; // €9

const PLAN_STYLE: Record<TournamentPlan, {
  icon: React.ElementType;
  gradient: string;
  border: string;
  badge: string;
  featureKeys: string[];
}> = {
  free: {
    icon: Gift,
    gradient: "linear-gradient(135deg, #6B7280, #4B5563)",
    border: "#E5E7EB",
    badge: "#6B7280",
    featureKeys: ["planFreeFeat1", "planFreeFeat2", "planFreeFeat3", "planFreeFeat4"],
  },
  starter: {
    icon: Rocket,
    gradient: "linear-gradient(135deg, #2563EB, #1D4ED8)",
    border: "#BFDBFE",
    badge: "#2563EB",
    featureKeys: ["planStarterFeat1", "planStarterFeat2", "planStarterFeat3", "planStarterFeat4", "planStarterFeat5"],
  },
  pro: {
    icon: Zap,
    gradient: "linear-gradient(135deg, #059669, #047857)",
    border: "#6EE7B7",
    badge: "#059669",
    featureKeys: ["planProFeat1", "planProFeat2", "planProFeat3", "planProFeat4", "planProFeat5", "planProFeat6", "planProFeat7"],
  },
  elite: {
    icon: Crown,
    gradient: "linear-gradient(135deg, #EA580C, #C2410C)",
    border: "#FED7AA",
    badge: "#EA580C",
    featureKeys: ["planEliteFeat1", "planEliteFeat2", "planEliteFeat3", "planEliteFeat4", "planEliteFeat5", "planEliteFeat6"],
  },
};

// ─── Components ───────────────────────────────────────────────────────────────

function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  sublabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  sublabel?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: "12px", background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}>
      <div>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--cat-text)", margin: 0 }}>{label}</p>
        {sublabel && <p style={{ fontSize: "11px", color: "var(--cat-text-muted)", margin: "2px 0 0 0" }}>{sublabel}</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid var(--cat-card-border)", background: "var(--cat-card-bg)", color: "var(--cat-text)", fontSize: "16px", cursor: value <= min ? "not-allowed" : "pointer", opacity: value <= min ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span style={{ minWidth: "28px", textAlign: "center", fontSize: "16px", fontWeight: 800, color: "var(--cat-text)" }}>
          {value}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid var(--cat-card-border)", background: "var(--cat-card-bg)", color: "var(--cat-text)", fontSize: "16px", cursor: value >= max ? "not-allowed" : "pointer", opacity: value >= max ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TournamentBillingPage() {
  const t = useTranslations("billing");
  const params = useParams();
  const searchParams = useSearchParams();
  const tournamentId = Number(params.tournamentId);
  const orgSlug = params.orgSlug as string;

  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TournamentPlan>("starter");
  const [extraTeams, setExtraTeams] = useState(0);
  const [extraDivisions, setExtraDivisions] = useState(0);
  const [error, setError] = useState("");

  const paymentStatus = searchParams.get("payment");
  const reason = searchParams.get("reason");

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/billing-info`, { credentials: "include" })
      .then(r => r.json())
      .then((d: TournamentInfo) => {
        setTournament(d);
        // Pre-select next plan if on free/starter
        const planIdx = PLAN_ORDER.indexOf(d.plan);
        if (planIdx < PLAN_ORDER.length - 1) {
          setSelectedPlan(PLAN_ORDER[Math.min(planIdx + 1, PLAN_ORDER.length - 1)]);
        } else {
          setSelectedPlan(d.plan);
        }
      })
      .catch(() => setError(t("loadError")))
      .finally(() => setLoading(false));
  }, [tournamentId, orgSlug]);

  const currentPlan = tournament?.plan ?? "free";
  const currentIdx = PLAN_ORDER.indexOf(currentPlan);
  const selectedIdx = PLAN_ORDER.indexOf(selectedPlan);
  const isUpgrade = selectedIdx > currentIdx;
  const isCurrent = selectedPlan === currentPlan;

  // Price calculation
  const planPriceCents = selectedPlan !== "free"
    ? (PLAN_PRICES_EUR_CENTS[selectedPlan as keyof typeof PLAN_PRICES_EUR_CENTS] ?? 0)
    : 0;
  const extraTeamPriceCents = selectedPlan === "starter" ? 100 : 200; // €1 or €2
  const extraTeamsTotalCents = extraTeams * extraTeamPriceCents;
  const extraDivisionsTotalCents = extraDivisions * EXTRA_DIVISION_PRICE * 100;
  const totalCents = planPriceCents + extraTeamsTotalCents + extraDivisionsTotalCents;

  async function handleCheckout() {
    if (selectedPlan === "free") return;
    setCheckoutLoading(true);
    setError("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId, plan: selectedPlan, extraTeams, extraDivisions }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? t("sessionError"));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(5,150,105,0.1)" }}>
          <CreditCard className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
        </div>
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("loading")}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Status banners */}
      {reason === "plan_required" && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-2xl" style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.25)" }}>
          <Lock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#DC2626" }} />
          <div>
            <p className="font-black text-sm" style={{ color: "#DC2626" }}>
              {t("planRequiredTitle")}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("planRequiredDesc")}
            </p>
          </div>
        </div>
      )}
      {paymentStatus === "success" && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl" style={{ background: "#D1FAE5", border: "1px solid #6EE7B7" }}>
          <CheckCircle className="w-5 h-5 shrink-0" style={{ color: "#059669" }} />
          <div>
            <p className="font-bold text-sm" style={{ color: "#065F46" }}>{t("paymentSuccess")}</p>
            <p className="text-xs mt-0.5" style={{ color: "#047857" }}>{t("paymentSuccessDesc")}</p>
          </div>
        </div>
      )}
      {paymentStatus === "cancelled" && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl" style={{ background: "#FEF3C7", border: "1px solid #FCD34D" }}>
          <AlertCircle className="w-5 h-5 shrink-0" style={{ color: "#D97706" }} />
          <p className="text-sm font-medium" style={{ color: "#92400E" }}>{t("paymentCancelled")}</p>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(5,150,105,0.1)" }}>
          <CreditCard className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>{t("tournamentBillingTitle")}</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {tournament?.name} · {t("tournamentBillingSubtitle")}:{" "}
            <span className="inline-flex items-center gap-1 font-bold" style={{ color: PLAN_STYLE[currentPlan].badge }}>
              {(() => { const I = PLAN_STYLE[currentPlan].icon; return <I className="w-3.5 h-3.5 inline" />; })()} {PLAN_NAMES[currentPlan]}
            </span>
          </p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Plan picker + add-ons */}
        <div className="lg:col-span-2 space-y-5">
          {/* Plan selection */}
          <div className="rounded-2xl p-5" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--cat-text-muted)" }}>
              {t("selectPlan")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["starter", "pro", "elite"] as TournamentPlan[]).map(plan => {
                const meta = PLAN_STYLE[plan];
                const limits = PLAN_LIMITS[plan];
                const price = (PLAN_PRICES_EUR_CENTS[plan as keyof typeof PLAN_PRICES_EUR_CENTS] ?? 0) / 100;
                const isCur = plan === currentPlan;
                const isSel = plan === selectedPlan;
                const isDown = PLAN_ORDER.indexOf(plan) < currentIdx;

                return (
                  <button
                    key={plan}
                    onClick={() => { setSelectedPlan(plan); setExtraDivisions(0); setExtraTeams(0); }}
                    disabled={isDown}
                    className="relative text-left rounded-2xl p-4 transition-all duration-200"
                    style={{
                      background: isSel
                        ? `${meta.gradient.replace("linear-gradient(135deg, ", "").split(",")[0].trim()}18`
                        : "var(--cat-tag-bg)",
                      border: isSel ? `2px solid ${meta.badge}` : `2px solid transparent`,
                      outline: "none",
                      cursor: isDown ? "not-allowed" : "pointer",
                      opacity: isDown ? 0.5 : 1,
                    }}
                  >
                    {isCur && (
                      <div className="absolute -top-2 left-3 px-2 py-0.5 rounded-full text-[9px] font-black text-white"
                        style={{ background: meta.badge }}>
                        {t("currentPlanBadge")}
                      </div>
                    )}
                    {isSel && !isCur && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: meta.badge }}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="mb-2" style={{ color: meta.badge }}>
                      {(() => { const I = meta.icon; return <I className="w-6 h-6" />; })()}
                    </div>
                    <p className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: meta.badge }}>
                      {PLAN_NAMES[plan]}
                    </p>
                    <p className="text-xl font-black" style={{ color: "var(--cat-text)" }}>
                      €{price}
                      <span className="text-xs font-normal ml-1" style={{ color: "var(--cat-text-muted)" }}>{t("perTournament")}</span>
                    </p>
                    <div className="mt-3 space-y-1">
                      {meta.featureKeys.slice(0, 3).map(key => (
                        <div key={key} className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.badge }} />
                          {t(key as "planFreeFeat1")}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected plan full feature list */}
            {selectedPlan !== "free" && (
              <div className="mt-4 rounded-xl p-4" style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}>
                <p className="text-xs font-bold mb-2" style={{ color: "var(--cat-text-muted)" }}>
                  {t("includedInPlan", { plan: PLAN_NAMES[selectedPlan] })}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {PLAN_STYLE[selectedPlan].featureKeys.map(key => (
                    <div key={key} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--cat-text)" }}>
                      <CheckCircle className="w-3 h-3 shrink-0" style={{ color: PLAN_STYLE[selectedPlan].badge }} />
                      {t(key as "planFreeFeat1")}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Add-ons (only shown for non-elite plans) */}
          {selectedPlan !== "free" && selectedPlan !== "elite" && (
            <div className="rounded-2xl p-5" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--cat-text-muted)" }}>
                  {t("addons")}
                </p>
              </div>
              <div className="space-y-3">
                {/* Extra divisions */}
                {selectedPlan === "starter" && (
                  <Stepper
                    value={extraDivisions}
                    min={0}
                    max={10}
                    onChange={setExtraDivisions}
                    label={t("extraDivisions")}
                    sublabel={t("extraDivisionsPrice", { price: EXTRA_DIVISION_PRICE })}
                  />
                )}
                {/* Extra teams */}
                <Stepper
                  value={extraTeams}
                  min={0}
                  max={100}
                  onChange={setExtraTeams}
                  label={t("extraTeams")}
                  sublabel={t("extraTeamsPrice", { price: selectedPlan === "starter" ? 1 : 2, limit: PLAN_LIMITS[selectedPlan].maxTeams })}
                />
              </div>
              <p className="text-xs mt-3" style={{ color: "var(--cat-text-muted)" }}>
                {t("eliteHint")}
              </p>
            </div>
          )}

          {/* Elite subscription upsell */}
          <div className="rounded-2xl p-5"
            style={{ background: "linear-gradient(135deg, #0f0e17, #1a1529)", border: "1px solid #7C3AED30" }}>
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4" style={{ color: "#FB923C" }} />
              <h3 className="text-base font-black" style={{ color: "#fff" }}>{t("eliteUpsellTitle")}</h3>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: "#EA580C", color: "#fff" }}>
                {t("eliteSubBestPrice")}
              </span>
            </div>
            <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
              {t("eliteUpsellDesc")}
            </p>
            <div className="flex gap-3 flex-wrap">
              <a href={`/${params.locale}/org/${orgSlug}/admin/billing`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "#EA580C", color: "#fff", textDecoration: "none" }}>
                <Zap className="w-3.5 h-3.5" />
                {t("eliteMonthlyPrice")}
              </a>
              <a href={`/${params.locale}/org/${orgSlug}/admin/billing`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{ border: "1px solid rgba(255,255,255,0.2)", color: "#fff", textDecoration: "none" }}>
                <Shield className="w-3.5 h-3.5" />
                {t("eliteYearlyPrice")}
              </a>
            </div>
          </div>
        </div>

        {/* RIGHT: Order cart */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--cat-card-border)" }}>
            {/* Cart header */}
            <div className="px-5 py-4 flex items-center gap-2"
              style={{ background: PLAN_STYLE[selectedPlan].gradient, color: "#fff" }}>
              <ShoppingCart className="w-4 h-4" />
              <span className="text-sm font-black">{t("orderTitle")}</span>
            </div>

            {/* Cart items */}
            <div className="p-5 space-y-3" style={{ background: "var(--cat-card-bg)" }}>
              {/* Plan line */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="inline-flex items-center gap-1 text-sm font-bold" style={{ color: "var(--cat-text)" }}>
                    {(() => { const I = PLAN_STYLE[selectedPlan].icon; return <I className="w-3.5 h-3.5" style={{ color: PLAN_STYLE[selectedPlan].badge }} />; })()} {PLAN_NAMES[selectedPlan]}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                    {t("basePlanDesc")}
                  </p>
                </div>
                <span className="text-sm font-black" style={{ color: "var(--cat-text)" }}>
                  €{planPriceCents / 100}
                </span>
              </div>

              {/* Extra divisions */}
              {extraDivisions > 0 && (
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
                      {t("extraDivisionsPurchased", { count: extraDivisions })}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                      €{EXTRA_DIVISION_PRICE} × {extraDivisions}
                    </p>
                  </div>
                  <span className="text-sm font-black" style={{ color: "var(--cat-text)" }}>
                    €{extraDivisionsTotalCents / 100}
                  </span>
                </div>
              )}

              {/* Extra teams */}
              {extraTeams > 0 && (
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
                      {t("extraTeamsPurchased", { count: extraTeams })}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                      €{extraTeamPriceCents / 100} × {extraTeams}
                    </p>
                  </div>
                  <span className="text-sm font-black" style={{ color: "var(--cat-text)" }}>
                    €{extraTeamsTotalCents / 100}
                  </span>
                </div>
              )}

              {/* Divider */}
              <div className="h-px" style={{ background: "var(--cat-card-border)" }} />

              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold" style={{ color: "var(--cat-text-muted)" }}>{t("total")}</span>
                <span className="text-2xl font-black" style={{ color: PLAN_STYLE[selectedPlan].badge }}>
                  €{totalCents / 100}
                </span>
              </div>

              {/* What you get */}
              <div className="rounded-xl p-3 space-y-1.5"
                style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--cat-text-muted)" }}>
                  {t("whatYouGet")}
                </p>
                {[
                  `${PLAN_LIMITS[selectedPlan].maxDivisions === Infinity ? "∞" : PLAN_LIMITS[selectedPlan].maxDivisions + extraDivisions} ${t("divisionsUnit")}`,
                  `${PLAN_LIMITS[selectedPlan].maxTeams === Infinity ? "∞" : PLAN_LIMITS[selectedPlan].maxTeams + extraTeams} ${t("teamsUnit")}`,
                  ...PLAN_STYLE[selectedPlan].featureKeys.slice(3).map(key => t(key as "planFreeFeat1")),
                ].map(f => (
                  <div key={f} className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--cat-text)" }}>
                    <Check className="w-3 h-3 shrink-0" style={{ color: PLAN_STYLE[selectedPlan].badge }} />
                    {f}
                  </div>
                ))}
              </div>

              {/* CTA */}
              {isCurrent && totalCents === planPriceCents && extraTeams === 0 && extraDivisions === 0 ? (
                <div className="text-center py-3 text-sm font-bold" style={{ color: PLAN_STYLE[selectedPlan].badge }}>
                  {t("currentPlanNote")}
                </div>
              ) : selectedPlan === "free" ? (
                <div className="text-center py-3 text-sm" style={{ color: "var(--cat-text-muted)" }}>
                  {t("freePlanNote")}
                </div>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="w-full py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-opacity"
                  style={{
                    background: PLAN_STYLE[selectedPlan].gradient,
                    color: "#fff",
                    border: "none",
                    cursor: checkoutLoading ? "wait" : "pointer",
                    opacity: checkoutLoading ? 0.7 : 1,
                  }}
                >
                  {checkoutLoading ? (
                    <>{t("paymentOpening")}</>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      {t("paySecurely")}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

              {/* Security note */}
              <p className="text-center text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                {t("paymentSecureNote")}
              </p>
            </div>
          </div>

          {/* Current plan info */}
          {(tournament?.extraTeamsPurchased ?? 0) > 0 || (tournament?.extraDivisionsPurchased ?? 0) > 0 ? (
            <div className="mt-4 rounded-xl p-4 text-xs space-y-1" style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}>
              <p className="font-bold mb-2" style={{ color: "var(--cat-text)" }}>{t("yourAddons")}</p>
              {(tournament?.extraTeamsPurchased ?? 0) > 0 && (
                <div className="flex items-center gap-1.5" style={{ color: "var(--cat-text-muted)" }}>
                  <Users className="w-3 h-3" />
                  {t("extraTeamsPurchased", { count: tournament?.extraTeamsPurchased ?? 0 })}
                </div>
              )}
              {(tournament?.extraDivisionsPurchased ?? 0) > 0 && (
                <div className="flex items-center gap-1.5" style={{ color: "var(--cat-text-muted)" }}>
                  <Layers className="w-3 h-3" />
                  {t("extraDivisionsPurchased", { count: tournament?.extraDivisionsPurchased ?? 0 })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
