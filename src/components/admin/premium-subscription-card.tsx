"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Crown, CheckCircle, Zap, Shield } from "lucide-react";

/**
 * Premium subscription card — sells / shows the org-level Premium subscription.
 * Same UI lives on the org billing page; this component lets us drop it in
 * other places (per-tournament billing, etc.) without duplicating the markup.
 *
 * Loads /api/org/{orgSlug}/billing to discover whether Premium is active and
 * fires checkout via /api/billing/subscribe.
 */
export function PremiumSubscriptionCard({ orgSlug }: { orgSlug: string }) {
  const t = useTranslations("orgAdmin");
  const [hasSub, setHasSub] = useState<boolean | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/org/${orgSlug}/billing`, { credentials: "include" });
        if (res.ok) {
          const d = await res.json();
          if (cancelled) return;
          setHasSub(!!d?.org?.hasEliteSub);
          setPeriodEnd(d?.org?.eliteSubPeriodEnd ?? null);
          setStatus(d?.org?.eliteSubStatus ?? null);
        }
      } catch {/* ignore */}
    })();
    return () => { cancelled = true; };
  }, [orgSlug]);

  async function checkout(interval: "monthly" | "yearly") {
    setLoading(interval);
    setError("");
    try {
      const stripeInterval = interval === "monthly" ? "month" : "year";
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: stripeInterval }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.url) {
        window.location.href = d.url;
      } else {
        setError(d.message ?? d.error ?? "Failed to open checkout");
        setLoading(null);
      }
    } catch {
      setError("Network error");
      setLoading(null);
    }
  }

  if (hasSub === null) return null;

  // ── Active subscription ──
  if (hasSub) {
    return (
      <div className="rounded-2xl p-5"
        style={{ background: "linear-gradient(135deg, #0f0e17, #1a1529)", border: "1px solid #EA580C40" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #EA580C, #C2410C)" }}>
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-white">{t("eliteSubActive")}</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
              {t("eliteSubActiveStatus")}: <strong style={{ color: "#10B981" }}>{status}</strong>
              {periodEnd && ` · ${t("eliteSubUntil")} ${new Date(periodEnd).toLocaleDateString()}`}
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-xl text-xs font-black shrink-0"
            style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.3)" }}>
            {t("eliteSubActiveBadge")}
          </span>
        </div>
      </div>
    );
  }

  // ── Sales card ──
  return (
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
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{t("eliteSubDesc")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5 mt-4">
        {[
          t("eliteSubBullet1"), t("eliteSubBullet2"), t("eliteSubBullet3"), t("eliteSubBullet4"),
          t("eliteSubBullet5"), t("eliteSubBullet6"), t("eliteSubBullet7"), t("eliteSubBullet8"),
        ].map(f => (
          <div key={f} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>
            <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#EA580C" }} />
            {f}
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => checkout("monthly")}
          disabled={!!loading}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition-opacity"
          style={{ background: "linear-gradient(135deg, #EA580C, #C2410C)", color: "#fff", border: "none", cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}
        >
          <Zap className="w-4 h-4" />
          {loading === "monthly" ? t("paymentOpening") : t("eliteMonthlyPrice")}
        </button>
        <button
          onClick={() => checkout("yearly")}
          disabled={!!loading}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition-opacity"
          style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}
        >
          <Shield className="w-4 h-4" />
          {loading === "yearly" ? t("paymentOpening") : t("eliteYearlyPrice")}
        </button>
      </div>
      <p className="text-[10px] mt-3" style={{ color: "rgba(255,255,255,0.4)" }}>{t("eliteSubStripeNote")}</p>
      {error && <p className="text-xs mt-2" style={{ color: "#ef4444" }}>{error}</p>}
    </div>
  );
}
