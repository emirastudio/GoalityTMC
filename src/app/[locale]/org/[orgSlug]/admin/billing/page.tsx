"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CreditCard, CheckCircle, Star, Zap, Shield,
  AlertCircle, ArrowRight, Users, Layers, Clock,
  TrendingUp, Package, Crown, ExternalLink, Rocket, Gift, Plus,
} from "lucide-react";
import { PLAN_PRICES_EUR_CENTS, PLAN_NAMES, type TournamentPlan } from "@/lib/plan-gates";

// ─── Types ────────────────────────────────────────────────────────────────────

type Purchase = {
  id: number;
  tournamentId: number;
  tournamentName: string;
  plan: TournamentPlan;
  planName: string;
  extraTeams: number;
  extraDivisions: number;
  amountEur: number;
  status: string;
  completedAt: string | null;
  createdAt: string;
};

type TournamentInfo = {
  id: number;
  name: string;
  plan: TournamentPlan;
  effectivePlan: TournamentPlan;
  planName: string;
  maxDivisions: string;
  maxTeams: string;
  extraTeamsPurchased: number;
  extraDivisionsPurchased: number;
};

type ListingInfo = {
  id: number;
  name: string;
  slug: string;
  subscriptionStatus: string | null;
  subscriptionPeriodEnd: string | null;
  stripeSubscriptionId: string | null;
  startDate: string | null;
  endDate: string | null;
  city: string | null;
  country: string | null;
};

type BillingData = {
  organization: {
    name: string;
    eliteSubStatus: string | null;
    eliteSubPeriodEnd: string | null;
    hasEliteSub: boolean;
  };
  tournaments: TournamentInfo[];
  purchases: Purchase[];
  eliteSubscriptions: { id: number; status: string; billingInterval: string; createdAt: string }[];
  listings: ListingInfo[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, { badge: string; bg: string }> = {
  free:    { badge: "#6B7280", bg: "#F9FAFB" },
  starter: { badge: "#2563EB", bg: "#EFF6FF" },
  pro:     { badge: "#059669", bg: "#F0FDF4" },
  elite:   { badge: "#EA580C", bg: "#FFF7ED" },
};

const STATUS_COLORS_BASE: Record<string, { color: string; bg: string }> = {
  completed: { color: "#059669", bg: "#D1FAE5" },
  pending:   { color: "#D97706", bg: "#FEF3C7" },
  failed:    { color: "#DC2626", bg: "#FEE2E2" },
  cancelled: { color: "#6B7280", bg: "#F3F4F6" },
  refunded:  { color: "#7C3AED", bg: "#EDE9FE" },
  expired:   { color: "#6B7280", bg: "#F3F4F6" },
};

function formatDate(str: string | null) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(str: string | null) {
  if (!str) return "—";
  return new Date(str).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OrgBillingPage() {
  const t = useTranslations("billing");
  const params = useParams();
  const searchParams = useSearchParams();
  const orgSlug = params.orgSlug as string;
  const locale = params.locale as string ?? "en";

  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const paymentStatus = searchParams.get("payment");

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/billing`, { credentials: "include" })
      .then(r => r.json())
      .then(setData)
      .catch(() => setError(t("loadError")))
      .finally(() => setLoading(false));
  }, [orgSlug]);

  async function handleEliteCheckout(interval: "monthly" | "yearly") {
    setCheckoutLoading(interval);
    setError("");
    try {
      // subscribe route expects 'month' | 'year'
      const stripeInterval = interval === "monthly" ? "month" : "year";
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: stripeInterval }),
      });
      const d = await res.json();
      if (d.url) {
        window.location.href = d.url;
      } else {
        setError(d.error ?? t("sessionError"));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setCheckoutLoading(null);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <CreditCard className="w-8 h-8" style={{ color: "var(--cat-accent)" }} />
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("loading")}</p>
      </div>
    </div>
  );

  const org = data?.organization;
  const completedPurchases = (data?.purchases ?? []).filter(p => p.status === "completed");
  const totalSpent = completedPurchases.reduce((s, p) => s + p.amountEur, 0);
  const listings = data?.listings ?? [];
  const activeListings = listings.filter(l => l.subscriptionStatus === "active" || l.subscriptionStatus === "trialing");

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Status banners */}
      {paymentStatus === "success" && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl" style={{ background: "#D1FAE5", border: "1px solid #6EE7B7" }}>
          <CheckCircle className="w-5 h-5 shrink-0" style={{ color: "#059669" }} />
          <div>
            <p className="font-black text-sm" style={{ color: "#065F46" }}>{t("paymentSuccess")}</p>
            <p className="text-xs mt-0.5" style={{ color: "#047857" }}>{t("paymentSuccessDesc")}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(5,150,105,0.1)" }}>
          <CreditCard className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>{t("orgBillingTitle")}</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {org?.name} · {org?.hasEliteSub ? t("orgBillingSubtitleActive") : t("orgBillingSubtitleInactive")}
          </p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}>
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Package, label: t("statTournaments"), value: String((data?.tournaments?.length ?? 0) + listings.length), color: "#2563EB" },
          { icon: TrendingUp, label: t("statTotalSpent"), value: `€${(totalSpent + activeListings.length * 4.99).toFixed(2)}`, color: "#059669" },
          { icon: Clock, label: t("statTransactions"), value: String((data?.purchases?.length ?? 0) + activeListings.length), color: "#7C3AED" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-2xl p-4"
            style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4" style={{ color }} />
              <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{label}</p>
            </div>
            <p className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tournaments & their plans */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--cat-card-border)" }}>
        <div className="px-5 py-4" style={{ background: "var(--cat-card-bg)", borderBottom: "1px solid var(--cat-card-border)" }}>
          <h2 className="font-black text-base" style={{ color: "var(--cat-text)" }}>{t("yourTournaments")}</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{t("tournamentsSubtitle")}</p>
        </div>
        {(data?.tournaments ?? []).length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--cat-text-muted)" }}>
            {t("noTournaments")}
          </div>
        ) : (
          <div className="divide-y" style={{ background: "var(--cat-card-bg)" }}>
            {(data?.tournaments ?? []).map(trn => {
              const pc = PLAN_COLORS[trn.effectivePlan] ?? PLAN_COLORS.free;
              return (
                <div key={trn.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: "var(--cat-text)" }}>{trn.name}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full"
                        style={{ background: pc.bg, color: pc.badge, border: `1px solid ${pc.badge}30` }}>
                        {trn.effectivePlan === "elite" && <Star className="w-2.5 h-2.5" />}
                        {trn.planName}
                      </span>
                      <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--cat-text-muted)" }}>
                        <Layers className="w-3 h-3" /> {trn.maxDivisions} {t("divisionsUnit")}
                      </span>
                      <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--cat-text-muted)" }}>
                        <Users className="w-3 h-3" /> {trn.maxTeams} {t("teamsUnit")}
                      </span>
                      {(trn.extraDivisionsPurchased > 0 || trn.extraTeamsPurchased > 0) && (
                        <span className="text-[11px] font-medium" style={{ color: "#7C3AED" }}>
                          {t("extraPurchasedLabel", {
                            div: trn.extraDivisionsPurchased > 0 ? `+${trn.extraDivisionsPurchased} div` : "",
                            teams: trn.extraTeamsPurchased > 0 ? `+${trn.extraTeamsPurchased} teams` : "",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <a href={`/${locale}/org/${orgSlug}/admin/tournament/${trn.id}/billing`}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
                    style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)", border: "1px solid var(--cat-card-border)", textDecoration: "none" }}>
                    {t("manage")} <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Listing subscriptions */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--cat-card-border)" }}>
        <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ background: "var(--cat-card-bg)", borderBottom: "1px solid var(--cat-card-border)" }}>
          <div>
            <h2 className="font-black text-base" style={{ color: "var(--cat-text)" }}>{t("catalogListingsTitle")}</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("catalogListingsDesc")}
            </p>
          </div>
          <a
            href={`/${locale}/org/${orgSlug}/admin/listing`}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--cat-accent), #00e5a0)", color: "#0A0E14", textDecoration: "none" }}
          >
            <Plus className="w-3.5 h-3.5" />
            {t("addListing")}
          </a>
        </div>
        {listings.length === 0 ? (
          <div className="px-5 py-8 text-center" style={{ background: "var(--cat-card-bg)" }}>
            <p className="text-sm font-medium mb-1" style={{ color: "var(--cat-text)" }}>{t("noCatalogListings")}</p>
            <p className="text-xs mb-3" style={{ color: "var(--cat-text-muted)" }}>
              {t("noCatalogListingsDesc")}
            </p>
            <a
              href={`/${locale}/org/${orgSlug}/admin/listing`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, var(--cat-accent), #00e5a0)", color: "#0A0E14", textDecoration: "none" }}
            >
              <Plus className="w-3.5 h-3.5" />
              {t("createFirstListing")}
            </a>
          </div>
        ) : (
          <div className="divide-y" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            {listings.map(listing => {
              const isActive = listing.subscriptionStatus === "active" || listing.subscriptionStatus === "trialing";
              return (
                <div key={listing.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: "var(--cat-text)" }}>{listing.name}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full"
                        style={isActive
                          ? { background: "rgba(43,254,186,0.12)", color: "var(--cat-accent)", border: "1px solid rgba(43,254,186,0.3)" }
                          : { background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)", border: "1px solid var(--cat-card-border)" }
                        }>
                        {isActive ? t("catalogActiveBadge") : (listing.subscriptionStatus ?? t("catalogDraftBadge"))}
                      </span>
                      <span className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                        {t("catalogMonthlyPrice")}
                        {listing.subscriptionPeriodEnd && ` · ${t("catalogRenews", { date: formatDate(listing.subscriptionPeriodEnd) })}`}
                      </span>
                      {(listing.city || listing.country) && (
                        <span className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                          {[listing.city, listing.country].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <a href={`/${locale}/org/${orgSlug}/admin/listing/${listing.id}`}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
                    style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)", border: "1px solid var(--cat-card-border)", textDecoration: "none" }}>
                    {t("catalogManage")} <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Plan selection cards */}
      <div>
        <div className="mb-4">
          <h2 className="font-black text-base" style={{ color: "var(--cat-text)" }}>{t("tournamentPlansTitle")}</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {t("tournamentPlansDesc")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            {
              plan: "free" as const,
              price: t("planFreePrice"),
              label: t("planFree"),
              sub: t("planFreeDuration"),
              features: [
                t("planCardFreeFeat1"),
                t("planCardFreeFeat2"),
                t("planCardFreeFeat3"),
                t("planCardFreeFeat4"),
              ],
              accent: "#6B7280",
              bg: "var(--cat-card-bg)",
              icon: Gift,
            },
            {
              plan: "starter" as const,
              price: t("planStarterPrice"),
              label: "Starter",
              sub: t("planPerTournament"),
              features: [
                t("planCardStarterFeat1"),
                t("planCardStarterFeat2"),
                t("planCardStarterFeat3"),
                t("planCardStarterFeat4"),
              ],
              accent: "#2563EB",
              bg: "var(--cat-card-bg)",
              icon: Rocket,
            },
            {
              plan: "pro" as const,
              price: t("planProPrice"),
              label: "Pro",
              sub: t("planPerTournament"),
              features: [
                t("planCardProFeat1"),
                t("planCardProFeat2"),
                t("planCardProFeat3"),
                t("planCardProFeat4"),
                t("planCardProFeat5"),
              ],
              accent: "#059669",
              bg: "var(--cat-card-bg)",
              icon: Zap,
            },
            {
              plan: "elite" as const,
              price: t("planElitePrice"),
              label: "Elite",
              sub: t("planPerTournament"),
              features: [
                t("planCardEliteFeat1"),
                t("planCardEliteFeat2"),
                t("planCardEliteFeat3"),
                t("planCardEliteFeat4"),
                t("planCardEliteFeat5"),
              ],
              accent: "#EA580C",
              bg: "var(--cat-card-bg)",
              icon: Crown,
            },
          ]).map(({ plan, price, label, sub, features, accent, bg, icon: PlanIcon }) => (
            <div
              key={plan}
              className="rounded-2xl p-4 flex flex-col"
              style={{ background: bg, border: `1.5px solid ${accent}30` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <PlanIcon className="w-4 h-4" style={{ color: accent }} />
                <span className="text-xs font-black px-2 py-0.5 rounded-full"
                  style={{ background: `${accent}18`, color: accent }}>
                  {label}
                </span>
              </div>
              <div className="mb-3">
                <span className="text-xl font-black" style={{ color: "var(--cat-text)" }}>{price}</span>
                <span className="text-[11px] ml-1" style={{ color: "var(--cat-text-muted)" }}>{sub}</span>
              </div>
              <ul className="space-y-1 flex-1">
                {features.map(f => (
                  <li key={f} className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--cat-text-secondary)" }}>
                    <CheckCircle className="w-3 h-3 shrink-0" style={{ color: accent }} />
                    {f}
                  </li>
                ))}
              </ul>
              {plan !== "free" && (
                <a
                  href={`/${locale}/org/${orgSlug}/admin/tournaments`}
                  className="mt-4 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-all hover:opacity-90"
                  style={{ background: `${accent}18`, color: accent, textDecoration: "none" }}
                >
                  {t("createTournament")} <ArrowRight className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Elite subscription block */}
      {!org?.hasEliteSub ? (
        <div className="rounded-2xl p-6"
          style={{ background: "linear-gradient(135deg, #0f0e17, #1a1529)", border: "1px solid #7C3AED40" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #EA580C, #C2410C)" }}>
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">{t("eliteSubTitle")}</h2>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: "#EA580C", color: "#fff" }}>
                  {t("eliteSubBestPrice")}
                </span>
              </div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                {t("eliteSubDesc")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5 mt-4">
            {[
              t("eliteSubBullet1"),
              t("eliteSubBullet2"),
              t("eliteSubBullet3"),
              t("eliteSubBullet4"),
              t("eliteSubBullet5"),
              t("eliteSubBullet6"),
              t("eliteSubBullet7"),
              t("eliteSubBullet8"),
            ].map(f => (
              <div key={f} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>
                <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#EA580C" }} />
                {f}
              </div>
            ))}
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => handleEliteCheckout("monthly")}
              disabled={!!checkoutLoading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition-opacity"
              style={{ background: "linear-gradient(135deg, #EA580C, #C2410C)", color: "#fff", border: "none", cursor: checkoutLoading ? "wait" : "pointer", opacity: checkoutLoading ? 0.7 : 1 }}
            >
              <Zap className="w-4 h-4" />
              {checkoutLoading === "monthly" ? t("paymentOpening") : t("eliteMonthlyPrice")}
            </button>
            <button
              onClick={() => handleEliteCheckout("yearly")}
              disabled={!!checkoutLoading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition-opacity"
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", cursor: checkoutLoading ? "wait" : "pointer", opacity: checkoutLoading ? 0.7 : 1 }}
            >
              <Shield className="w-4 h-4" />
              {checkoutLoading === "yearly" ? t("paymentOpening") : t("eliteYearlyPrice")}
            </button>
          </div>
          <p className="text-[10px] mt-3" style={{ color: "rgba(255,255,255,0.4)" }}>
            {t("eliteSubStripeNote")}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl p-5"
          style={{ background: "linear-gradient(135deg, #0f0e17, #1a1529)", border: "1px solid #EA580C40" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #EA580C, #C2410C)" }}>
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-black text-white">{t("eliteSubActive")}</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                {t("eliteSubActiveStatus")}: <strong style={{ color: "#10B981" }}>{org.eliteSubStatus}</strong>
                {org.eliteSubPeriodEnd && ` · ${t("eliteSubUntil")} ${formatDate(org.eliteSubPeriodEnd)}`}
              </p>
            </div>
            <span className="px-3 py-1.5 rounded-xl text-xs font-black"
              style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.3)" }}>
              {t("eliteSubActiveBadge")}
            </span>
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--cat-card-border)" }}>
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ background: "var(--cat-card-bg)", borderBottom: "1px solid var(--cat-card-border)" }}>
          <div>
            <h2 className="font-black text-base" style={{ color: "var(--cat-text)" }}>{t("transactionHistory")}</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("transactionCount", { count: (data?.purchases?.length ?? 0) + activeListings.length, total: (totalSpent + activeListings.length * 4.99).toFixed(2) })}
            </p>
          </div>
          <TrendingUp className="w-4 h-4" style={{ color: "var(--cat-text-muted)" }} />
        </div>

        {(data?.purchases ?? []).length === 0 && activeListings.length === 0 ? (
          <div className="px-5 py-10 text-center" style={{ background: "var(--cat-card-bg)" }}>
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "var(--cat-text)" }} />
            <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("noTransactions")}</p>
          </div>
        ) : (
          <div style={{ background: "var(--cat-card-bg)" }}>
            {/* Header */}
            <div className="grid px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ gridTemplateColumns: "1fr 120px 100px 80px 100px", color: "var(--cat-text-muted)", borderBottom: "1px solid var(--cat-card-border)" }}>
              <span>{t("colTournamentPlan")}</span>
              <span>{t("colDate")}</span>
              <span>{t("colExtras")}</span>
              <span className="text-right">{t("colAmount")}</span>
              <span className="text-right">{t("colStatus")}</span>
            </div>

            {/* Listing subscriptions as transactions */}
            {activeListings.map(listing => {
              const isActive = listing.subscriptionStatus === "active";
              const stColor = isActive
                ? { color: "#059669", bg: "#D1FAE5" }
                : { color: "#D97706", bg: "#FEF3C7" };
              return (
                <div key={`listing-${listing.id}`}
                  className="grid px-5 py-3.5 items-center hover:opacity-80 transition-opacity"
                  style={{ gridTemplateColumns: "1fr 120px 100px 80px 100px", borderBottom: "1px solid var(--cat-card-border)" }}>
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--cat-text)" }}>{listing.name}</p>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full inline-block mt-0.5"
                      style={{ background: "rgba(43,254,186,0.12)", color: "var(--cat-accent)", border: "1px solid rgba(43,254,186,0.25)" }}>
                      {t("catalogListingBadge")}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                    {listing.subscriptionPeriodEnd
                      ? formatDate(listing.subscriptionPeriodEnd)
                      : "—"}
                  </div>
                  <div className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("eliteSubMonthlyInterval")}</div>
                  <div className="text-sm font-black text-right" style={{ color: "var(--cat-text)" }}>€4.99</div>
                  <div className="text-right">
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full"
                      style={{ background: stColor.bg, color: stColor.color }}>
                      {listing.subscriptionStatus ?? "active"}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Regular tournament purchases */}
            {(data?.purchases ?? []).map(p => {
              const st = STATUS_COLORS_BASE[p.status] ?? STATUS_COLORS_BASE.pending;
              const pc = PLAN_COLORS[p.plan] ?? PLAN_COLORS.free;
              return (
                <div key={p.id}
                  className="grid px-5 py-3.5 items-center hover:opacity-80 transition-opacity"
                  style={{ gridTemplateColumns: "1fr 120px 100px 80px 100px", borderBottom: "1px solid var(--cat-card-border)" }}>
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--cat-text)" }}>
                      {p.tournamentName}
                    </p>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full inline-block mt-0.5"
                      style={{ background: pc.bg, color: pc.badge, border: `1px solid ${pc.badge}30` }}>
                      {p.planName}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                    {formatDateTime(p.completedAt ?? p.createdAt)}
                  </div>
                  <div className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                    {[
                      p.extraTeams > 0 ? `+${p.extraTeams} teams` : null,
                      p.extraDivisions > 0 ? `+${p.extraDivisions} div` : null,
                    ].filter(Boolean).join(", ") || "—"}
                  </div>
                  <div className="text-sm font-black text-right" style={{ color: "var(--cat-text)" }}>
                    €{p.amountEur.toFixed(0)}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full"
                      style={{ background: st.bg, color: st.color }}>
                      {t(`status_${p.status}` as "status_completed")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
