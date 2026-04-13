"use client";

import { useState } from "react";
import { ShoppingCart, Layers, Users, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";

type ExtrasOwed = {
  divisions: number;
  teams: number;
  amountCents: number;          // divisions only (pay now)
  teamsPendingCents?: number;   // teams (pay at registration close)
  displayAmountCents?: number;  // total for UI display
  extraDivisionPriceCents: number;
  extraTeamPriceCents: number;
  paymentDue: string | null;    // "YYYY-MM-DD"
  blocked: boolean;
};

export function ExtrasCart({
  tournamentId,
  extrasOwed,
  locale,
  orgSlug,
}: {
  tournamentId: number;
  extrasOwed: ExtrasOwed;
  locale: string;
  orgSlug: string;
}) {
  const t = useTranslations("orgAdmin");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Show cart when either divisions or teams are owed
  const displayCents = extrasOwed.displayAmountCents ?? extrasOwed.amountCents;
  if (!extrasOwed || displayCents <= 0) return null;

  // Header shows full total (divisions + teams)
  const totalEur    = (displayCents / 100).toFixed(2);
  // Pay button charges divisions only
  const divPayEur   = (extrasOwed.amountCents / 100).toFixed(2);
  const hasTeams    = (extrasOwed.teamsPendingCents ?? 0) > 0;

  // Format due date for display
  const dueDateDisplay = extrasOwed.paymentDue
    ? new Date(extrasOwed.paymentDue + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
    : null;
  const isOverdue = extrasOwed.blocked;

  async function handlePay() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/pay-extras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Error");
      }
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="mx-3 mt-3 rounded-xl overflow-hidden"
      style={{
        background: isOverdue ? "rgba(220,38,38,0.08)" : "rgba(245,158,11,0.08)",
        border: `1px solid ${isOverdue ? "rgba(220,38,38,0.35)" : "rgba(245,158,11,0.3)"}`,
      }}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        <ShoppingCart className="w-3.5 h-3.5 shrink-0" style={{ color: isOverdue ? "#dc2626" : "#f59e0b" }} />
        <span className="flex-1 text-xs font-bold" style={{ color: isOverdue ? "#dc2626" : "#f59e0b" }}>
          {isOverdue ? t("extrasOverdue") : t("extrasOwed")}
        </span>
        <span className="text-xs font-black" style={{ color: isOverdue ? "#dc2626" : "#f59e0b" }}>
          €{totalEur}
        </span>
        {open
          ? <ChevronUp  className="w-3 h-3 shrink-0" style={{ color: isOverdue ? "#dc2626" : "#f59e0b" }} />
          : <ChevronDown className="w-3 h-3 shrink-0" style={{ color: isOverdue ? "#dc2626" : "#f59e0b" }} />
        }
      </button>

      {/* Expandable detail */}
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {extrasOwed.divisions > 0 && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--cat-text-muted)" }}>
              <Layers className="w-3 h-3 shrink-0" />
              <span className="flex-1">{extrasOwed.divisions}× {t("extraDivision")}</span>
              <span>€{(extrasOwed.divisions * extrasOwed.extraDivisionPriceCents / 100).toFixed(0)}</span>
            </div>
          )}

          {hasTeams && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--cat-text-muted)" }}>
              <Users className="w-3 h-3 shrink-0" />
              <span className="flex-1 italic">{extrasOwed.teams}× {t("extraTeam")} *</span>
              <span>€{((extrasOwed.teamsPendingCents ?? 0) / 100).toFixed(0)}</span>
            </div>
          )}
          {hasTeams && (
            <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
              * {t("teamsAtClose")}
            </p>
          )}

          {/* Due date row */}
          {dueDateDisplay && (
            <div className="flex items-center gap-1.5 text-xs"
              style={{ color: isOverdue ? "#dc2626" : "var(--cat-text-muted)" }}>
              <span className="flex-1 font-semibold">
                {isOverdue ? t("extrasPastDue") : `${t("extrasDueDate")} ${dueDateDisplay}`}
              </span>
            </div>
          )}

          {/* Overdue warning */}
          {isOverdue && (
            <div className="rounded-lg px-2.5 py-2 text-xs font-semibold"
              style={{ background: "rgba(220,38,38,0.12)", color: "#dc2626" }}>
              {t("extrasBlockedHint")}
            </div>
          )}

          {extrasOwed.amountCents > 0 && (
            <button
              onClick={handlePay}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold mt-2"
              style={{
                background: loading ? "rgba(245,158,11,0.2)" : (isOverdue ? "#dc2626" : "#f59e0b"),
                color: loading ? "#f59e0b" : "#fff",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <ShoppingCart className="w-3 h-3" />
              }
              {loading ? t("processing") : `${t("payExtras")} €${divPayEur}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
