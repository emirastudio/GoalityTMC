"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Lock, Zap, MessageSquare, CreditCard, Radio, FolderOpen, Star, ArrowRight, Sparkles, Users, Layers, X, Gift, Rocket, Crown } from "lucide-react";
import { PLAN_NAMES, PLAN_PRICES_EUR_CENTS, PLAN_LIMITS, type TournamentPlan } from "@/lib/plan-gates";

// ─── Feature metadata ─────────────────────────────────────────────────────────

type FeatureKey = "hasMessaging" | "hasFinance" | "hasMatchHub" | "hasDocuments" | "hasCatalog" | "hasEliteFormats" | "maxDivisions" | "maxTeams";

const FEATURE_STYLE: Record<string, {
  icon: React.ElementType;
  requiredPlan: TournamentPlan;
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
}> = {
  hasMessaging: {
    icon: MessageSquare,
    requiredPlan: "pro",
    accentColor: "#7C3AED",
    gradientFrom: "#7C3AED",
    gradientTo: "#6D28D9",
  },
  hasFinance: {
    icon: CreditCard,
    requiredPlan: "pro",
    accentColor: "#D97706",
    gradientFrom: "#D97706",
    gradientTo: "#B45309",
  },
  hasMatchHub: {
    icon: Radio,
    requiredPlan: "pro",
    accentColor: "#DC2626",
    gradientFrom: "#DC2626",
    gradientTo: "#B91C1C",
  },
  hasDocuments: {
    icon: FolderOpen,
    requiredPlan: "starter",
    accentColor: "#2563EB",
    gradientFrom: "#2563EB",
    gradientTo: "#1D4ED8",
  },
  hasCatalog: {
    icon: Star,
    requiredPlan: "starter",
    accentColor: "#059669",
    gradientFrom: "#059669",
    gradientTo: "#047857",
  },
  maxDivisions: {
    icon: Layers,
    requiredPlan: "pro",
    accentColor: "#7C3AED",
    gradientFrom: "#7C3AED",
    gradientTo: "#6D28D9",
  },
  maxTeams: {
    icon: Users,
    requiredPlan: "starter",
    accentColor: "#059669",
    gradientFrom: "#059669",
    gradientTo: "#047857",
  },
  hasEliteFormats: {
    icon: Star,
    requiredPlan: "pro",
    accentColor: "#EA580C",
    gradientFrom: "#EA580C",
    gradientTo: "#C2410C",
  },
};

type FeatureMeta = {
  icon: React.ElementType;
  title: string;
  description: string;
  benefits: string[];
  requiredPlan: TournamentPlan;
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
};

// ─── Plan price display ───────────────────────────────────────────────────────

function getPlanPrice(plan: TournamentPlan): string {
  if (plan === "free") return "Free";
  const cents = PLAN_PRICES_EUR_CENTS[plan as keyof typeof PLAN_PRICES_EUR_CENTS];
  return `€${cents / 100}`;
}

// ─── Build localised feature metadata ────────────────────────────────────────

function useFeatureMeta(feature: string, t: ReturnType<typeof useTranslations>): FeatureMeta | null {
  const style = FEATURE_STYLE[feature];
  if (!style) return null;

  const featureKey = feature.replace(/^has/, "feature").replace(/^max/, "feature") as string;

  // Map feature key to translation key prefix
  const keyMap: Record<string, string> = {
    hasMessaging: "featureMessaging",
    hasFinance: "featureFinance",
    hasMatchHub: "featureMatchHub",
    hasDocuments: "featureDocuments",
    hasCatalog: "featureCatalog",
    maxDivisions: "featureDivisions",
    maxTeams: "featureTeams",
    hasEliteFormats: "featureEliteFormats",
  };
  const prefix = keyMap[feature];
  if (!prefix) return null;

  return {
    ...style,
    title: t(`${prefix}Title` as any),
    description: t(`${prefix}Desc` as any),
    benefits: [
      t(`${prefix}Benefit1` as any),
      t(`${prefix}Benefit2` as any),
      t(`${prefix}Benefit3` as any),
      t(`${prefix}Benefit4` as any),
    ],
  };
}

// ─── PlanGate Component ───────────────────────────────────────────────────────

export function PlanGate({
  feature,
  orgSlug,
  tournamentId,
}: {
  feature: string;
  orgSlug?: string;
  tournamentId?: number;
}) {
  const params = useParams();
  const t = useTranslations("planGate");
  const slug = orgSlug ?? (params.orgSlug as string);
  const tid = tournamentId ?? Number(params.tournamentId);

  const meta = useFeatureMeta(feature, t);
  if (!meta) return null;

  const Icon = meta.icon;
  const price = getPlanPrice(meta.requiredPlan);
  const billingUrl = `/org/${slug}/admin/tournament/${tid}/billing`;

  return (
    <div
      className="flex items-center justify-center min-h-[60vh] px-6 py-12"
      style={{ background: "var(--cat-bg)" }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.04 }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `radial-gradient(circle, ${meta.accentColor} 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }} />
      </div>

      <div className="relative w-full max-w-xl">
        {/* Glow */}
        <div style={{
          position: "absolute", top: "-80px", left: "50%", transform: "translateX(-50%)",
          width: "300px", height: "300px",
          background: `radial-gradient(circle, ${meta.accentColor}25 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        {/* Main card */}
        <div
          className="relative rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: "var(--cat-card-bg)",
            border: `1px solid ${meta.accentColor}30`,
          }}
        >
          {/* Top gradient bar */}
          <div style={{
            height: "4px",
            background: `linear-gradient(90deg, ${meta.gradientFrom}, ${meta.gradientTo})`,
          }} />

          <div className="p-8">
            {/* Icon + Badge */}
            <div className="flex items-start justify-between mb-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${meta.gradientFrom}, ${meta.gradientTo})`,
                  boxShadow: `0 8px 24px ${meta.accentColor}40`,
                }}
              >
                <Icon className="w-8 h-8 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" style={{ color: meta.accentColor }} />
                <span
                  className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full"
                  style={{
                    background: `${meta.accentColor}15`,
                    color: meta.accentColor,
                    border: `1px solid ${meta.accentColor}30`,
                  }}
                >
                  {t("featureBadge", { plan: PLAN_NAMES[meta.requiredPlan] })}
                </span>
              </div>
            </div>

            {/* Title & Description */}
            <h2 className="text-2xl font-black mb-2" style={{ color: "var(--cat-text)" }}>
              {meta.title}
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--cat-text-secondary)" }}>
              {meta.description}
            </p>

            {/* Benefits */}
            <div className="space-y-2.5 mb-8">
              {meta.benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${meta.accentColor}15` }}
                  >
                    <Zap className="w-3 h-3" style={{ color: meta.accentColor }} />
                  </div>
                  <span className="text-sm" style={{ color: "var(--cat-text)" }}>{b}</span>
                </div>
              ))}
            </div>

            {/* Price + CTA */}
            <div
              className="rounded-2xl p-5 mb-4"
              style={{
                background: `linear-gradient(135deg, ${meta.gradientFrom}12, ${meta.gradientTo}08)`,
                border: `1px solid ${meta.accentColor}20`,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: meta.accentColor }}>
                    {PLAN_NAMES[meta.requiredPlan]} Plan
                  </p>
                  <p className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>
                    {price}
                    <span className="text-sm font-normal ml-1" style={{ color: "var(--cat-text-muted)" }}>
                      {t("perTournament")}
                    </span>
                  </p>
                </div>
                <Sparkles className="w-8 h-8 opacity-20" style={{ color: meta.accentColor }} />
              </div>
              <a
                href={billingUrl}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${meta.gradientFrom}, ${meta.gradientTo})`,
                  boxShadow: `0 4px 16px ${meta.accentColor}40`,
                }}
              >
                {t("unlockPlan", { plan: PLAN_NAMES[meta.requiredPlan] })}
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <a
              href={billingUrl}
              className="flex items-center justify-center gap-1.5 text-sm hover:opacity-70 transition-opacity"
              style={{ color: "var(--cat-text-muted)" }}
            >
              {t("viewAllPlans")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Plan Limit Modal (compact overlay when limit is hit) ────────────────────

const PLAN_ORDER: TournamentPlan[] = ["free", "starter", "pro", "elite"];
const UPGRADE_PLANS: Record<"maxTeams" | "maxDivisions", { from: TournamentPlan; to: TournamentPlan; color: string }[]> = {
  maxTeams: [
    { from: "free",    to: "starter", color: "#2563EB" },
    { from: "starter", to: "pro",     color: "#059669" },
    { from: "pro",     to: "elite",   color: "#EA580C" },
  ],
  maxDivisions: [
    { from: "free",    to: "pro",     color: "#7C3AED" },
    { from: "starter", to: "pro",     color: "#7C3AED" },
    { from: "pro",     to: "elite",   color: "#EA580C" },
  ],
};

function PlanIcon({ plan, className }: { plan: TournamentPlan; className?: string }) {
  if (plan === "elite") return <Crown className={className ?? "w-4 h-4"} />;
  if (plan === "pro") return <Zap className={className ?? "w-4 h-4"} />;
  if (plan === "starter") return <Rocket className={className ?? "w-4 h-4"} />;
  return <Gift className={className ?? "w-4 h-4"} />;
}

export function PlanLimitModal({
  feature,
  current,
  limit,
  currentPlan,
  orgSlug,
  tournamentId,
  onClose,
}: {
  feature: "maxTeams" | "maxDivisions";
  current: number;
  limit: number;
  currentPlan: TournamentPlan;
  orgSlug: string;
  tournamentId: number;
  onClose: () => void;
}) {
  const t = useTranslations("planGate");
  const billingUrl = `/org/${orgSlug}/admin/tournament/${tournamentId}/billing`;
  const isTeams = feature === "maxTeams";
  const accent = isTeams ? "#059669" : "#7C3AED";

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Upgrade options based on current plan
  const upgrades = UPGRADE_PLANS[feature].filter(u => u.from === currentPlan);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: "var(--cat-card-bg)", border: `1px solid ${accent}30` }}>

        {/* Top bar */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${accent}, ${accent}99)` }} />

        <div className="p-6">
          {/* Close */}
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-70"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
            <X className="w-4 h-4" />
          </button>

          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, boxShadow: `0 8px 24px ${accent}40` }}>
            {isTeams ? <Users className="w-7 h-7 text-white" /> : <Layers className="w-7 h-7 text-white" />}
          </div>

          {/* Title & description */}
          <h3 className="text-lg font-black mb-1" style={{ color: "var(--cat-text)" }}>
            {t(isTeams ? "limitTeamsTitle" : "limitDivisionsTitle")}
          </h3>
          <p className="text-sm mb-4" style={{ color: "var(--cat-text-secondary)" }}>
            {t(isTeams ? "limitTeamsDesc" : "limitDivisionsDesc")}
          </p>

          {/* Usage bar */}
          <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--cat-text-muted)" }}>
                {t("limitUsage")}
              </span>
              <span className="text-xs font-black" style={{ color: accent }}>
                {current} / {limit === 9999 ? "∞" : limit}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--cat-card-border)" }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${limit === 9999 ? 100 : Math.min(100, (current / limit) * 100)}%`, background: `linear-gradient(90deg, ${accent}, ${accent}cc)` }} />
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: `${accent}15`, color: accent }}>
                <PlanIcon plan={currentPlan} className="w-3 h-3" /> {PLAN_NAMES[currentPlan]}
              </span>
              <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                {t("limitCurrentPlan")}
              </span>
            </div>
          </div>

          {/* Upgrade options */}
          <div className="space-y-2 mb-4">
            {upgrades.length > 0 ? upgrades.map(u => {
              const price = (PLAN_PRICES_EUR_CENTS[u.to as keyof typeof PLAN_PRICES_EUR_CENTS] ?? 0) / 100;
              const newLimit = feature === "maxTeams"
                ? (PLAN_LIMITS[u.to].maxTeams === Infinity ? "∞" : String(PLAN_LIMITS[u.to].maxTeams))
                : (PLAN_LIMITS[u.to].maxDivisions === Infinity ? "∞" : String(PLAN_LIMITS[u.to].maxDivisions));
              return (
                <a key={u.to} href={billingUrl}
                  className="flex items-center gap-3 rounded-2xl p-3.5 transition-all hover:opacity-90 w-full"
                  style={{ background: `linear-gradient(135deg, ${u.color}18, ${u.color}08)`, border: `1.5px solid ${u.color}30`, textDecoration: "none" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${u.color}20`, color: u.color }}>
                    <PlanIcon plan={u.to} className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black" style={{ color: "var(--cat-text)" }}>
                      {PLAN_NAMES[u.to]} — {t(isTeams ? "limitUpgradeTeams" : "limitUpgradeDivisions", { n: newLimit })}
                    </p>
                    <p className="text-xs" style={{ color: u.color }}>€{price} {t("perTournament")}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0" style={{ color: u.color }} />
                </a>
              );
            }) : (
              <a href={billingUrl}
                className="flex items-center justify-center gap-2 rounded-2xl p-3.5 text-sm font-bold transition-all hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: "#fff", textDecoration: "none" }}>
                {t("viewAllPlans")} <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Extra teams note for Starter/Pro */}
          {isTeams && (currentPlan === "starter" || currentPlan === "pro") && (
            <p className="text-center text-xs" style={{ color: "var(--cat-text-muted)" }}>
              {t("limitExtraTeamsNote", { price: currentPlan === "starter" ? 1 : 2 })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Inline upgrade hint (for setup page, etc.) ───────────────────────────────

export function UpgradeHint({
  message,
  plan,
  orgSlug,
  tournamentId,
}: {
  message: string;
  plan: TournamentPlan;
  orgSlug: string;
  tournamentId: number;
}) {
  const t = useTranslations("planGate");
  const billingUrl = `/org/${orgSlug}/admin/tournament/${tournamentId}/billing`;

  return (
    <div
      className="rounded-2xl p-5 flex items-start gap-4"
      style={{
        background: `linear-gradient(135deg, #7C3AED12, #6D28D912)`,
        border: "1px solid #7C3AED30",
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}>
        <Lock className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold mb-1" style={{ color: "var(--cat-text)" }}>{message}</p>
        <p className="text-sm mb-3" style={{ color: "var(--cat-text-secondary)" }}>
          {t("upgradeHintCurrentPlan", { plan: PLAN_NAMES[plan] })}{" "}
          {t("upgradeHintNeedPro")}
        </p>
        <a
          href={billingUrl}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
        >
          {t("upgradePlan")} <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
