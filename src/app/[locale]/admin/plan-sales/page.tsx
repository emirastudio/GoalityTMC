"use client";

import { useEffect, useState } from "react";
import {
  CreditCard, CheckCircle, Clock, XCircle, RotateCcw,
  TrendingUp, Euro, Zap, Rocket, Crown, Gift,
} from "lucide-react";

type Sale = {
  id: number;
  plan: string;
  extraTeams: number;
  extraDivisions: number;
  amountEurCents: number;
  status: "pending" | "completed" | "refunded" | "expired";
  createdAt: string;
  completedAt: string | null;
  stripeCheckoutSessionId: string | null;
  tournamentId: number;
  tournamentName: string | null;
  orgName: string | null;
  orgSlug: string | null;
};

const PLAN_STYLE: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  starter: { color: "#2563EB", bg: "rgba(37,99,235,0.1)",  icon: Rocket },
  pro:     { color: "#059669", bg: "rgba(5,150,105,0.1)",  icon: Zap },
  elite:   { color: "#EA580C", bg: "rgba(234,88,12,0.1)",  icon: Crown },
  free:    { color: "#6B7280", bg: "rgba(107,114,128,0.1)", icon: Gift },
};

const STATUS_STYLE = {
  completed: { color: "#059669", bg: "rgba(5,150,105,0.1)",  icon: CheckCircle, label: "Completed" },
  pending:   { color: "#D97706", bg: "rgba(217,119,6,0.1)",  icon: Clock,        label: "Pending" },
  expired:   { color: "#6B7280", bg: "rgba(107,114,128,0.1)", icon: XCircle,      label: "Expired" },
  refunded:  { color: "#7C3AED", bg: "rgba(124,58,237,0.1)", icon: RotateCcw,    label: "Refunded" },
};

export default function PlanSalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/plan-sales", { credentials: "include" })
      .then(r => r.json())
      .then(setSales)
      .finally(() => setLoading(false));
  }, []);

  const completed = sales.filter(s => s.status === "completed");
  const totalEur = completed.reduce((sum, s) => sum + s.amountEurCents, 0) / 100;
  const pending = sales.filter(s => s.status === "pending").length;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>Plan Sales</h1>
        <p className="text-sm mt-1" style={{ color: "var(--cat-text-muted)" }}>
          All tournament plan purchases via Stripe
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total revenue", value: `€${totalEur.toFixed(2)}`, icon: Euro, color: "#059669", bg: "rgba(5,150,105,0.1)" },
          { label: "Completed", value: String(completed.length), icon: CheckCircle, color: "#059669", bg: "rgba(5,150,105,0.1)" },
          { label: "Pending", value: String(pending), icon: Clock, color: "#D97706", bg: "rgba(217,119,6,0.1)" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>{value}</p>
              <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--cat-card-border)" }}>
        <div className="px-5 py-3 flex items-center gap-2"
          style={{ background: "var(--cat-tag-bg)", borderBottom: "1px solid var(--cat-card-border)" }}>
          <CreditCard className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--cat-text-muted)" }}>
            Purchases ({sales.length})
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm" style={{ color: "var(--cat-text-muted)" }}>
            Loading...
          </div>
        ) : sales.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: "var(--cat-text-muted)" }}>
            No purchases yet
          </div>
        ) : (
          <div style={{ background: "var(--cat-card-bg)" }}>
            {sales.map((s, i) => {
              const plan = PLAN_STYLE[s.plan] ?? PLAN_STYLE.free;
              const status = STATUS_STYLE[s.status] ?? STATUS_STYLE.pending;
              const PlanIcon = plan.icon;
              const StatusIcon = status.icon;
              const date = new Date(s.createdAt).toLocaleDateString("ru-RU", {
                day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
              });

              return (
                <div key={s.id}
                  className="px-5 py-4 flex items-center gap-4"
                  style={{
                    borderBottom: i < sales.length - 1 ? "1px solid var(--cat-card-border)" : "none",
                  }}>
                  {/* Plan badge */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: plan.bg }}>
                    <PlanIcon className="w-4.5 h-4.5" style={{ color: plan.color }} />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black capitalize" style={{ color: plan.color }}>
                        {s.plan}
                      </span>
                      {s.extraTeams > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                          +{s.extraTeams} teams
                        </span>
                      )}
                      {s.extraDivisions > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                          +{s.extraDivisions} div
                        </span>
                      )}
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                      <span className="font-semibold" style={{ color: "var(--cat-text)" }}>{s.orgName}</span>
                      {" · "}{s.tournamentName}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{date}</p>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className="text-base font-black" style={{ color: "var(--cat-text)" }}>
                      €{(s.amountEurCents / 100).toFixed(2)}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="shrink-0">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: status.bg, color: status.color }}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </div>
                  </div>

                  {/* Stripe link */}
                  {s.stripeCheckoutSessionId && (
                    <a
                      href={`https://dashboard.stripe.com/payments/${s.stripeCheckoutSessionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg hover:opacity-80"
                      style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)", textDecoration: "none" }}
                    >
                      Stripe ↗
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
