"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { X, Trophy, Sparkles, Loader2, AlertCircle, Rocket, Zap, Crown, CheckCircle2 } from "lucide-react";

const ACCENT = "#2BFEBA";
const CURRENCIES = ["EUR", "USD", "GBP", "SEK", "NOK", "DKK", "CHF", "PLN", "CZK", "HUF"];

const inputCls = "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all focus:ring-2";
const inputStyle = {
  background: "var(--cat-input-bg, rgba(255,255,255,0.06))",
  borderColor: "var(--cat-card-border, rgba(255,255,255,0.1))",
  color: "var(--cat-text, #fff)",
};

const PLANS = [
  {
    id: "starter" as const,
    icon: Rocket,
    name: "Starter",
    price: "€19",
    color: "#2563EB",
    features: ["16 teams", "1 division", "2 days", "+€1/extra team"],
  },
  {
    id: "pro" as const,
    icon: Zap,
    name: "Pro",
    price: "€49",
    color: "#059669",
    features: ["16 teams", "3 divisions", "Unlimited days", "+€2/extra team"],
  },
  {
    id: "elite" as const,
    icon: Crown,
    name: "Elite",
    price: "€89",
    color: "#EA580C",
    features: ["16 teams", "Unlimited divisions", "All features", "+€2/extra team"],
  },
];

export function TournamentCreateModal({
  orgSlug,
  locale,
  onClose,
  requiresPlan = false,
}: {
  orgSlug: string;
  locale: string;
  onClose: () => void;
  requiresPlan?: boolean;
}) {
  const t = useTranslations("orgAdmin");
  const router = useRouter();

  const [step, setStep] = useState<"plan" | "form">(requiresPlan ? "plan" : "form");
  const [selectedPlan, setSelectedPlan] = useState<"free" | "starter" | "pro" | "elite">(
    requiresPlan ? "starter" : "free"
  );
  const [name, setName] = useState("");
  const [year, setYear] = useState(2026);
  const [currency, setCurrency] = useState("EUR");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/org/${orgSlug}/tournament`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), year, currency, plan: selectedPlan }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create");
      }
      const { id } = await res.json();
      router.push(`/${locale}/org/${orgSlug}/admin/tournament/${id}/setup`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: "var(--cat-card-bg, #1C2121)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Glow top */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}60, transparent)` }} />

        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: `rgba(43,254,186,0.12)`, boxShadow: `0 0 20px rgba(43,254,186,0.25)` }}>
            <Trophy className="w-5 h-5" style={{ color: ACCENT }} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-black" style={{ color: "var(--cat-text, #fff)" }}>
              {t("newTournament")}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted, rgba(255,255,255,0.45))" }}>
              {requiresPlan
                ? step === "plan" ? t("choosePlanForTournament") : `${PLANS.find(p => p.id === selectedPlan)?.name} ${PLANS.find(p => p.id === selectedPlan)?.price}`
                : t("createTournamentHint")
              }
            </p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-xl hover:opacity-70 transition-opacity"
            style={{ color: "var(--cat-text-muted, rgba(255,255,255,0.45))" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── STEP 1: Plan selection ── */}
        {step === "plan" && (
          <div className="px-6 pb-6 space-y-3">
            {/* Free tournament used banner */}
            <div className="rounded-xl px-3 py-2.5 text-xs flex items-start gap-2 mb-1"
              style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#f87171" }}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {t("freeTournamentUsed")}
            </div>

            {/* Plan cards */}
            {PLANS.map(plan => {
              const Icon = plan.icon;
              const isSelected = selectedPlan === plan.id;
              return (
                <button key={plan.id} onClick={() => setSelectedPlan(plan.id)}
                  className="w-full text-left rounded-2xl border-2 p-4 transition-all"
                  style={{
                    borderColor: isSelected ? plan.color : "rgba(255,255,255,0.08)",
                    background: isSelected ? `${plan.color}12` : "rgba(255,255,255,0.03)",
                  }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${plan.color}20` }}>
                      <Icon className="w-4.5 h-4.5" style={{ color: plan.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-black" style={{ color: "var(--cat-text, #fff)" }}>{plan.name}</span>
                        <span className="text-sm font-black" style={{ color: plan.color }}>{plan.price}</span>
                        <span className="text-[10px]" style={{ color: "var(--cat-text-muted, rgba(255,255,255,0.4))" }}>/ {t("perTournament")}</span>
                      </div>
                      <p className="text-[11px]" style={{ color: "var(--cat-text-muted, rgba(255,255,255,0.4))" }}>
                        {plan.features.join(" · ")}
                      </p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: plan.color }} />}
                  </div>
                </button>
              );
            })}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-70"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                {t("cancel")}
              </button>
              <button type="button" onClick={() => setStep("form")}
                className="flex-[2] py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all"
                style={{
                  background: PLANS.find(p => p.id === selectedPlan)?.color ?? ACCENT,
                  color: "#fff",
                }}>
                {t("continueWithPlan")} →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Tournament form ── */}
        {step === "form" && (
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--cat-text-muted, rgba(255,255,255,0.6))" }}>
                {t("tournamentName")} <span style={{ color: ACCENT }}>*</span>
              </label>
              <input
                autoFocus
                type="text"
                className={inputCls}
                style={inputStyle}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t("tournamentNamePlaceholder")}
                required
              />
            </div>

            {/* Year + Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5"
                  style={{ color: "var(--cat-text-muted, rgba(255,255,255,0.6))" }}>
                  {t("year")}
                </label>
                <input
                  type="number"
                  className={inputCls}
                  style={inputStyle}
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  min={2020}
                  max={2035}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5"
                  style={{ color: "var(--cat-text-muted, rgba(255,255,255,0.6))" }}>
                  {t("currency")}
                </label>
                <select
                  className={inputCls}
                  style={inputStyle}
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Hint */}
            {!requiresPlan && (
              <div className="rounded-xl px-3 py-2.5 text-xs flex items-start gap-2"
                style={{ background: "rgba(43,254,186,0.06)", border: "1px solid rgba(43,254,186,0.15)", color: "var(--cat-text-muted, rgba(255,255,255,0.5))" }}>
                <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: ACCENT }} />
                {t("createTournamentSubhint")}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl px-3 py-2.5 text-xs flex items-start gap-2"
                style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", color: "#f87171" }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {requiresPlan ? (
                <button type="button" onClick={() => setStep("plan")}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-70"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                  ← {t("back")}
                </button>
              ) : (
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-70"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                  {t("cancel")}
                </button>
              )}
              <button type="submit" disabled={saving || !name.trim()}
                className="flex-[2] py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: ACCENT, color: "#000", boxShadow: `0 0 20px rgba(43,254,186,0.35)` }}>
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" />{t("creating")}</>
                  : <><Sparkles className="w-4 h-4" />{t("create")}</>
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
