"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Shield, ArrowUpDown, Building2, Trophy } from "lucide-react";

type AuditEntry = {
  id: number;
  entityType: string;
  entityId: number;
  entityName: string;
  adminEmail: string;
  previousPlan: string;
  newPlan: string;
  reason: string;
  ipAddress: string | null;
  createdAt: string;
};

const PLAN_COLORS: Record<string, string> = {
  free:    "#6B7280",
  starter: "#2563EB",
  pro:     "#059669",
  elite:   "#EA580C",
};

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "1px 8px", borderRadius: "9999px",
      fontSize: "11px", fontWeight: 700, color: "#fff",
      background: PLAN_COLORS[plan] ?? "#6B7280",
    }}>
      {plan.toUpperCase()}
    </span>
  );
}

export default function PlanOverridesPage() {
  const t = useTranslations("superAdmin");
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/plan-override")
      .then(r => r.json())
      .then(data => setAudits(Array.isArray(data) ? data.reverse() : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Shield style={{ width: "20px", height: "20px", color: "#DC2626" }} />
        </div>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--cat-text)", margin: 0 }}>
            {t("planOverrides")}
          </h1>
          <p style={{ fontSize: "13px", color: "var(--cat-text-muted)", margin: 0 }}>
            {t("planOverridesSubtitle")}
          </p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--cat-text-muted)", fontSize: "14px" }}>{t("loading")}</p>
      ) : audits.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--cat-text-muted)", fontSize: "14px" }}>
          {t("noOverrides")}
        </div>
      ) : (
        <div style={{ borderRadius: "14px", border: "1px solid var(--cat-card-border)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "var(--cat-tag-bg)", borderBottom: "1px solid var(--cat-card-border)" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", color: "var(--cat-text-muted)", fontWeight: 600 }}>{t("auditColDate")}</th>
                <th style={{ padding: "10px 16px", textAlign: "left", color: "var(--cat-text-muted)", fontWeight: 600 }}>{t("auditColEntity")}</th>
                <th style={{ padding: "10px 16px", textAlign: "left", color: "var(--cat-text-muted)", fontWeight: 600 }}>{t("auditColChange")}</th>
                <th style={{ padding: "10px 16px", textAlign: "left", color: "var(--cat-text-muted)", fontWeight: 600 }}>{t("auditColAdmin")}</th>
                <th style={{ padding: "10px 16px", textAlign: "left", color: "var(--cat-text-muted)", fontWeight: 600 }}>{t("auditColReason")}</th>
                <th style={{ padding: "10px 16px", textAlign: "left", color: "var(--cat-text-muted)", fontWeight: 600 }}>{t("auditColIP")}</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((entry, i) => (
                <tr key={entry.id} style={{ borderTop: i > 0 ? "1px solid var(--cat-card-border)" : "none" }}>
                  <td style={{ padding: "12px 16px", color: "var(--cat-text-muted)", whiteSpace: "nowrap" }}>
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {entry.entityType === "tournament"
                        ? <Trophy style={{ width: "13px", height: "13px", color: "var(--cat-accent)" }} />
                        : <Building2 style={{ width: "13px", height: "13px", color: "var(--cat-text-muted)" }} />}
                      <span style={{ color: "var(--cat-text)", fontWeight: 600 }}>{entry.entityName}</span>
                      <span style={{ color: "var(--cat-text-muted)", fontSize: "11px" }}>#{entry.entityId}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <PlanBadge plan={entry.previousPlan} />
                      <ArrowUpDown style={{ width: "12px", height: "12px", color: "var(--cat-text-muted)" }} />
                      <PlanBadge plan={entry.newPlan} />
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--cat-text-secondary)", fontSize: "12px" }}>
                    {entry.adminEmail}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--cat-text-secondary)", maxWidth: "200px" }}>
                    {entry.reason}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--cat-text-muted)", fontSize: "11px", fontFamily: "monospace" }}>
                    {entry.ipAddress ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
