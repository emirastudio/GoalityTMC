"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Bug, Loader2, ExternalLink, X, Save, Trash2, AlertCircle } from "lucide-react";

type BugReport = {
  id: number;
  organizationId: number | null;
  reporterId: number | null;
  reporterEmail: string;
  reporterName: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "new" | "in_progress" | "fixed" | "wont_fix" | "duplicate";
  pageUrl: string;
  pagePath: string;
  userAgent: string | null;
  viewport: string | null;
  locale: string | null;
  consoleSnapshot: { t: number; level: string; msg: string }[] | null;
  screenshotUrl: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

const SEVERITY_STYLE: Record<string, { bg: string; text: string; emoji: string }> = {
  low:      { bg: "bg-emerald-100", text: "text-emerald-700", emoji: "🟢" },
  medium:   { bg: "bg-amber-100",   text: "text-amber-800",   emoji: "🟡" },
  high:     { bg: "bg-orange-100",  text: "text-orange-800",  emoji: "🟠" },
  critical: { bg: "bg-red-100",     text: "text-red-700",     emoji: "🔴" },
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  new:         { bg: "bg-blue-100",    text: "text-blue-700" },
  in_progress: { bg: "bg-violet-100",  text: "text-violet-700" },
  fixed:       { bg: "bg-emerald-100", text: "text-emerald-700" },
  wont_fix:    { bg: "bg-gray-200",    text: "text-gray-600" },
  duplicate:   { bg: "bg-gray-100",    text: "text-gray-500" },
};

const STATUSES = ["new", "in_progress", "fixed", "wont_fix", "duplicate"] as const;
const SEVERITIES = ["low", "medium", "high", "critical"] as const;

export default function BugReportsAdminPage() {
  const t = useTranslations("bugReportsAdmin");
  const [items, setItems] = useState<BugReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [selected, setSelected] = useState<BugReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (statusFilter !== "all") qs.set("status", statusFilter);
    if (severityFilter !== "all") qs.set("severity", severityFilter);
    qs.set("limit", "200");
    try {
      const res = await fetch(`/api/admin/bug-reports?${qs}`);
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      setItems(j.items);
      setTotal(j.total);
    } catch (e) {
      console.error("[bug-reports] load failed", e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter]);

  useEffect(() => { load(); }, [load]);

  const counts = items.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(43,254,186,0.15)" }}>
          <Bug className="w-5 h-5" style={{ color: "#0E9F7A" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>{t("title")}</h1>
          <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
            {t("totalCount", { count: total })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <FilterGroup
          label={t("filterStatus")}
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: t("all") },
            ...STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })),
          ]}
        />
        <FilterGroup
          label={t("filterSeverity")}
          value={severityFilter}
          onChange={setSeverityFilter}
          options={[
            { value: "all", label: t("all") },
            ...SEVERITIES.map((s) => ({ value: s, label: t(`severity.${s}`) })),
          ]}
        />
      </div>

      {/* Quick stats */}
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[12px]">
        {STATUSES.map((s) => (
          <div key={s} className="rounded-lg px-3 py-2 border" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <div className="font-bold text-base" style={{ color: "var(--cat-text)" }}>{counts[s] ?? 0}</div>
            <div style={{ color: "var(--cat-text-muted)" }}>{t(`status.${s}`)}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center" style={{ color: "var(--cat-text-muted)" }}>
          <Bug className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">{t("col.severity")}</th>
                <th className="px-4 py-3 font-semibold">{t("col.title")}</th>
                <th className="px-4 py-3 font-semibold">{t("col.reporter")}</th>
                <th className="px-4 py-3 font-semibold">{t("col.page")}</th>
                <th className="px-4 py-3 font-semibold">{t("col.status")}</th>
                <th className="px-4 py-3 font-semibold">{t("col.date")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => {
                const sev = SEVERITY_STYLE[b.severity];
                const st = STATUS_STYLE[b.status];
                return (
                  <tr
                    key={b.id}
                    onClick={() => setSelected(b)}
                    className="border-t cursor-pointer hover:bg-black/[0.02] transition"
                    style={{ borderColor: "var(--cat-card-border)" }}
                  >
                    <td className="px-4 py-3 font-mono text-[11px]" style={{ color: "var(--cat-text-muted)" }}>#{b.id}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${sev.bg} ${sev.text}`}>
                        {sev.emoji} {t(`severity.${b.severity}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium max-w-[300px] truncate" style={{ color: "var(--cat-text)" }}>{b.title}</td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: "var(--cat-text-muted)" }}>{b.reporterName}</td>
                    <td className="px-4 py-3 text-[11px] font-mono max-w-[200px] truncate" style={{ color: "var(--cat-text-muted)" }}>{b.pagePath}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${st.bg} ${st.text}`}>
                        {t(`status.${b.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <BugDetail
          report={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { load(); setSelected(null); }}
        />
      )}
    </div>
  );
}

function FilterGroup({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide font-bold mb-1.5" style={{ color: "var(--cat-text-muted)" }}>{label}</div>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="rounded-lg px-2.5 py-1 text-[12px] font-medium transition border"
            style={value === o.value
              ? { background: "var(--cat-text)", color: "var(--cat-bg)", borderColor: "transparent" }
              : { background: "transparent", color: "var(--cat-text-muted)", borderColor: "var(--cat-card-border)" }
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BugDetail({ report, onClose, onUpdated }: {
  report: BugReport;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const t = useTranslations("bugReportsAdmin");
  const [status, setStatus] = useState(report.status);
  const [notes, setNotes] = useState(report.internalNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/admin/bug-reports/${report.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, internalNotes: notes }),
      });
      if (!res.ok) throw new Error(await res.text());
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(`/api/admin/bug-reports/${report.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const sev = SEVERITY_STYLE[report.severity];

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4" role="dialog">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative w-full max-w-[720px] max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <div className="sticky top-0 z-10 px-5 py-4 border-b flex items-start justify-between gap-3" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-mono" style={{ color: "var(--cat-text-muted)" }}>#{report.id}</span>
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${sev.bg} ${sev.text}`}>
                {sev.emoji} {t(`severity.${report.severity}`)}
              </span>
            </div>
            <h2 className="text-lg font-bold" style={{ color: "var(--cat-text)" }}>{report.title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Description */}
          <div>
            <div className="text-[10px] uppercase tracking-wide font-bold mb-1.5" style={{ color: "var(--cat-text-muted)" }}>{t("description")}</div>
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--cat-text)" }}>{report.description}</p>
          </div>

          {/* Screenshot */}
          {report.screenshotUrl && (
            <div>
              <div className="text-[10px] uppercase tracking-wide font-bold mb-1.5" style={{ color: "var(--cat-text-muted)" }}>{t("screenshot")}</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={report.screenshotUrl} alt="screenshot" className="max-w-full rounded-xl border" style={{ borderColor: "var(--cat-card-border)" }} />
            </div>
          )}

          {/* Context grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
            <Field label={t("reporter")} value={`${report.reporterName} <${report.reporterEmail}>`} />
            <Field label={t("page")} value={
              <a href={report.pageUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 underline" style={{ color: "var(--cat-accent, #0E9F7A)" }}>
                {report.pagePath} <ExternalLink className="w-3 h-3" />
              </a>
            } />
            <Field label={t("viewport")} value={report.viewport ?? "—"} />
            <Field label={t("locale")} value={report.locale ?? "—"} />
            <Field label={t("userAgent")} value={<span className="font-mono text-[11px] break-all">{report.userAgent ?? "—"}</span>} />
            <Field label={t("created")} value={new Date(report.createdAt).toLocaleString()} />
          </div>

          {/* Console snapshot */}
          {report.consoleSnapshot && report.consoleSnapshot.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide font-bold mb-1.5" style={{ color: "var(--cat-text-muted)" }}>{t("consoleSnapshot")}</div>
              <div className="rounded-lg p-3 font-mono text-[10.5px] leading-snug overflow-x-auto max-h-[180px] overflow-y-auto" style={{ background: "rgba(0,0,0,0.04)", color: "var(--cat-text)" }}>
                {report.consoleSnapshot.map((l, i) => (
                  <div key={i} className="whitespace-pre-wrap break-words">
                    <span style={{ color: l.level === "error" ? "#dc2626" : "#a16207" }}>[{l.level}]</span> {l.msg}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status changer */}
          <div>
            <div className="text-[10px] uppercase tracking-wide font-bold mb-1.5" style={{ color: "var(--cat-text-muted)" }}>{t("changeStatus")}</div>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => {
                const st = STATUS_STYLE[s];
                const active = status === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold uppercase border transition ${active ? st.bg + " " + st.text : ""}`}
                    style={!active ? { color: "var(--cat-text-muted)", borderColor: "var(--cat-card-border)", background: "transparent" } : { borderColor: "transparent" }}
                  >
                    {t(`status.${s}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="text-[10px] uppercase tracking-wide font-bold mb-1.5" style={{ color: "var(--cat-text-muted)" }}>{t("internalNotes")}</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t("internalNotesPlaceholder")}
              maxLength={5000}
              className="w-full px-3 py-2 rounded-xl text-[13px] outline-none border"
              style={{ background: "var(--cat-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-[12px]">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
            <button
              onClick={remove}
              className="px-3 py-2 rounded-xl text-[12px] font-medium text-red-600 hover:bg-red-50 transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> {t("delete")}
            </button>
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-[12px] font-medium border hover:bg-black/[0.03]"
              style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
            >
              {t("close")}
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-[12px] font-bold flex items-center gap-1.5 disabled:opacity-60"
              style={{ background: "var(--cat-accent, #2BFEBA)", color: "#0A0E14" }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {t("save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide font-bold mb-0.5" style={{ color: "var(--cat-text-muted)" }}>{label}</div>
      <div style={{ color: "var(--cat-text)" }}>{value}</div>
    </div>
  );
}
