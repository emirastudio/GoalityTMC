"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Building2, Trophy, Users, Gift, X } from "lucide-react";

type Org = {
  id: number;
  name: string;
  slug: string;
  country: string | null;
  city: string | null;
  plan: string;
  eliteSubStatus: string | null;
  eliteSubPeriodEnd: string | null; // serialized
  eliteSubId: string | null;
  tournamentsCount: number;
  teamsCount: number;
};

const DURATIONS = [
  { months: 1,  labelKey: "giftDuration1m" },
  { months: 3,  labelKey: "giftDuration3m" },
  { months: 6,  labelKey: "giftDuration6m" },
  { months: 12, labelKey: "giftDuration12m" },
] as const;

export function OrganizationsListClient({ initialOrgs }: { initialOrgs: Org[] }) {
  const t = useTranslations("superAdmin");
  const [orgs, setOrgs] = useState(initialOrgs);
  const [giftTarget, setGiftTarget] = useState<Org | null>(null);

  function refreshLocal(updated: Partial<Org> & { id: number }) {
    setOrgs(prev => prev.map(o => (o.id === updated.id ? { ...o, ...updated } : o)));
  }

  return (
    <>
      {orgs.length === 0 ? (
        <div className="th-card rounded-xl border th-border p-12 text-center">
          <Building2 className="w-12 h-12 text-text-secondary/30 mx-auto mb-4" />
          <p className="th-text-2">{t("noOrganizations")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.map((org) => {
            const giftActive = org.eliteSubStatus === "active" || org.eliteSubStatus === "trialing";
            const isGift = giftActive && !org.eliteSubId; // sub_id=null → gift
            const periodEnd = org.eliteSubPeriodEnd ? new Date(org.eliteSubPeriodEnd) : null;
            const periodLabel = periodEnd ? periodEnd.toLocaleDateString() : null;

            return (
              <div
                key={org.id}
                className="flex items-center justify-between th-card rounded-xl border th-border p-5 hover:border-navy/30 transition-colors"
              >
                <Link href={`/org/${org.slug}/admin`} className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-navy/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-navy" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold th-text truncate">{org.name}</h3>
                    <p className="text-sm th-text-2 truncate">
                      /{org.slug} &middot; {org.country ?? ""}{org.city ? `, ${org.city}` : ""}
                    </p>
                    {giftActive && (
                      <p className="text-xs mt-1" style={{ color: "var(--cat-accent, #1e3a5f)" }}>
                        {isGift ? "🎁 " : "💳 "}
                        {t("eliteSubActiveUntil", { date: periodLabel ?? "—" })}
                      </p>
                    )}
                  </div>
                </Link>
                <div className="flex items-center gap-4 text-sm th-text-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4" />
                    <span>{org.tournamentsCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>{org.teamsCount}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    org.plan === "elite"   ? "bg-gold/20 text-gold" :
                    org.plan === "pro"     ? "bg-navy/10 text-navy" :
                    org.plan === "starter" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {org.plan}
                  </span>
                  <button
                    onClick={() => setGiftTarget(org)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{ background: "var(--cat-accent, #1e3a5f)", color: "white" }}
                    title={t("giftEliteTooltip")}
                  >
                    <Gift className="w-3.5 h-3.5" />
                    {t("giftEliteButton")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {giftTarget && (
        <GiftEliteModal
          org={giftTarget}
          onClose={() => setGiftTarget(null)}
          onSuccess={(updated) => {
            refreshLocal(updated);
            setGiftTarget(null);
          }}
        />
      )}
    </>
  );
}

function GiftEliteModal({
  org,
  onClose,
  onSuccess,
}: {
  org: Org;
  onClose: () => void;
  onSuccess: (updated: Partial<Org> & { id: number }) => void;
}) {
  const t = useTranslations("superAdmin");
  const [months, setMonths] = useState<number>(12);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"gift" | "revoke">("gift");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError(t("overrideReasonRequired"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/plan-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "organization",
          entityId: org.id,
          newPlan: mode === "gift" ? "elite" : "free",
          reason: reason.trim(),
          durationMonths: mode === "gift" ? months : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("overrideError"));
      } else {
        const end = new Date();
        end.setMonth(end.getMonth() + months);
        onSuccess({
          id: org.id,
          plan: mode === "gift" ? "elite" : "free",
          eliteSubStatus: mode === "gift" ? "active" : "cancelled",
          eliteSubPeriodEnd: mode === "gift" ? end.toISOString() : null,
          eliteSubId: null,
        });
      }
    } catch {
      setError(t("overrideNetworkError"));
    } finally {
      setLoading(false);
    }
  }

  const giftActive = org.eliteSubStatus === "active" || org.eliteSubStatus === "trialing";
  const isGift = giftActive && !org.eliteSubId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl shadow-2xl" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--cat-card-border)" }}>
          <div>
            <h3 className="font-bold text-base" style={{ color: "var(--cat-text)" }}>
              {t("giftEliteModalTitle")}
            </h3>
            <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-secondary)" }}>{org.name}</p>
            {giftActive && (
              <p className="text-xs mt-1" style={{ color: "var(--cat-text-muted)" }}>
                {isGift ? "🎁 " : "💳 "}
                {t("eliteSubActiveUntil", {
                  date: org.eliteSubPeriodEnd ? new Date(org.eliteSubPeriodEnd).toLocaleDateString() : "—",
                })}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: "var(--cat-text-muted)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {giftActive && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("gift")}
                className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                  mode === "gift" ? "border-blue-500 bg-blue-50 text-blue-700" : "hover:opacity-80"
                }`}
                style={mode !== "gift" ? { borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)", background: "transparent" } : {}}
              >
                {t("giftExtend")}
              </button>
              <button
                type="button"
                onClick={() => setMode("revoke")}
                className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                  mode === "revoke" ? "border-red-500 bg-red-50 text-red-700" : "hover:opacity-80"
                }`}
                style={mode !== "revoke" ? { borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)", background: "transparent" } : {}}
              >
                {t("giftRevoke")}
              </button>
            </div>
          )}

          {mode === "gift" && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--cat-text)" }}>
                {t("giftDuration")}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.months}
                    type="button"
                    onClick={() => setMonths(d.months)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                      months === d.months ? "border-blue-500 bg-blue-50 text-blue-700" : "hover:opacity-80"
                    }`}
                    style={months !== d.months ? { borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)", background: "transparent" } : {}}
                  >
                    {t(d.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--cat-text)" }}>
              {t("overrideReason")} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={mode === "gift" ? t("giftReasonPlaceholder") : t("giftRevokeReasonPlaceholder")}
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none"
              style={{
                background: "var(--cat-input-bg, var(--cat-bg))",
                border: "1px solid var(--cat-card-border)",
                color: "var(--cat-text)",
              }}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm font-medium hover:opacity-80"
              style={{ border: "1px solid var(--cat-card-border)", color: "var(--cat-text-secondary)" }}
            >
              {t("overrideCancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: mode === "revoke" ? "#dc2626" : "var(--cat-accent, #1e3a5f)" }}
            >
              {loading
                ? t("overrideSaving")
                : mode === "gift"
                  ? t("giftApply")
                  : t("giftRevokeApply")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
