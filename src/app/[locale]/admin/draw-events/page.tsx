"use client";

/**
 * Superadmin journal of every Draw Show action across the standalone
 * /draw product. Three tracked stages — visited → created → activated
 * — let us measure conversion at a glance, plus filters for the noisy
 * cases (only paying customers, only promo-code activations, etc.).
 *
 * Read-only view. Edits to the underlying tables aren't surfaced
 * here; promo CRUD lives in /admin/draw-promos (next deploy).
 */

import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Eye,
  PenLine,
  Play,
  Mail,
  Filter,
  Download,
  Loader2,
} from "lucide-react";

type DrawEvent = {
  id: number;
  eventType: "visited" | "created" | "activated";
  status: "free_standalone" | "free_plan" | "paid" | "promo";
  drawId: string | null;
  email: string | null;
  promoCode: string | null;
  ip: string | null;
  userAgent: string | null;
  referrer: string | null;
  locale: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
};

type ApiResponse = {
  events: DrawEvent[];
  summary: { visited: number; created: number; activated: number };
  uniqueLeads: number;
};

const EVENT_STYLE: Record<DrawEvent["eventType"], { color: string; bg: string; icon: React.ElementType; label: string }> = {
  visited:   { color: "#6B7280", bg: "rgba(107,114,128,0.1)", icon: Eye,     label: "Visited" },
  created:   { color: "#2563EB", bg: "rgba(37,99,235,0.1)",   icon: PenLine, label: "Created" },
  activated: { color: "#059669", bg: "rgba(5,150,105,0.12)",  icon: Play,    label: "Activated" },
};

const STATUS_STYLE: Record<DrawEvent["status"], { color: string; bg: string; label: string }> = {
  free_standalone: { color: "#6B7280", bg: "rgba(107,114,128,0.12)", label: "Standalone (free)" },
  free_plan:       { color: "#7C3AED", bg: "rgba(124,58,237,0.12)",  label: "Pro/Elite plan" },
  paid:            { color: "#059669", bg: "rgba(5,150,105,0.12)",   label: "Paid €11" },
  promo:           { color: "#EA580C", bg: "rgba(234,88,12,0.12)",   label: "Promo code" },
};

export default function DrawEventsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState<"all" | DrawEvent["eventType"]>("all");
  const [emailFilter, setEmailFilter] = useState("");

  // Debounced fetch on filter change. We re-fetch from the server
  // rather than client-filter so the page is honest about totals
  // (and works for tables larger than the in-memory N).
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams();
      params.set("limit", "300");
      if (eventFilter !== "all") params.set("event", eventFilter);
      if (emailFilter.trim()) params.set("email", emailFilter.trim());
      setLoading(true);
      setError(null);
      fetch(`/api/admin/draw-events?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((d: ApiResponse) => setData(d))
        .catch((e) => setError(typeof e === "number" ? `HTTP ${e}` : "fetch failed"))
        .finally(() => setLoading(false));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [eventFilter, emailFilter]);

  const conversion = useMemo(() => {
    if (!data) return null;
    const v = data.summary.visited || 0;
    const c = data.summary.created || 0;
    const a = data.summary.activated || 0;
    return {
      createdRate: v > 0 ? (c / v) * 100 : 0,
      activatedRate: c > 0 ? (a / c) * 100 : 0,
    };
  }, [data]);

  function exportCsv() {
    if (!data) return;
    const headers = [
      "id",
      "createdAt",
      "eventType",
      "status",
      "email",
      "drawId",
      "promoCode",
      "locale",
      "referrer",
      "ip",
    ];
    const rows = data.events.map((e) =>
      [
        e.id,
        e.createdAt,
        e.eventType,
        e.status,
        e.email ?? "",
        e.drawId ?? "",
        e.promoCode ?? "",
        e.locale ?? "",
        e.referrer ?? "",
        e.ip ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `draw-events-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black mb-1 flex items-center gap-2"
            style={{ color: "var(--cat-text)" }}>
            <Sparkles className="w-6 h-6" style={{ color: "#2BFEBA" }} />
            Draw Show events
          </h1>
          <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
            Every visit, creation and activation across the standalone /draw product. Use this to measure conversion and follow up with leads.
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={!data || data.events.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
          style={{
            background: "var(--cat-accent)",
            color: "var(--cat-accent-text)",
          }}
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* ── Funnel summary cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={<Eye className="w-4 h-4" />}
          label="Visits"
          value={data?.summary.visited ?? "—"}
          color="#6B7280"
        />
        <SummaryCard
          icon={<PenLine className="w-4 h-4" />}
          label="Created"
          value={data?.summary.created ?? "—"}
          color="#2563EB"
          extra={
            conversion
              ? `${conversion.createdRate.toFixed(1)}% of visits`
              : undefined
          }
        />
        <SummaryCard
          icon={<Play className="w-4 h-4" />}
          label="Activated"
          value={data?.summary.activated ?? "—"}
          color="#059669"
          extra={
            conversion
              ? `${conversion.activatedRate.toFixed(1)}% of created`
              : undefined
          }
        />
        <SummaryCard
          icon={<Mail className="w-4 h-4" />}
          label="Unique leads"
          value={data?.uniqueLeads ?? "—"}
          color="#EA580C"
        />
      </div>

      {/* ── Filters ── */}
      <div
        className="flex items-center gap-3 flex-wrap rounded-2xl p-3"
        style={{
          background: "var(--cat-card-bg)",
          border: "1px solid var(--cat-card-border)",
        }}
      >
        <Filter className="w-4 h-4" style={{ color: "var(--cat-text-muted)" }} />
        <div className="inline-flex p-1 rounded-xl"
          style={{ background: "var(--cat-tag-bg)" }}>
          {(["all", "visited", "created", "activated"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setEventFilter(k)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold capitalize"
              style={
                eventFilter === k
                  ? {
                      background: "var(--cat-card-bg)",
                      color: "var(--cat-accent)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                    }
                  : {
                      background: "transparent",
                      color: "var(--cat-text-muted)",
                    }
              }
            >
              {k}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
          placeholder="Filter by email…"
          className="flex-1 min-w-[200px] rounded-lg px-3 py-1.5 text-xs outline-none"
          style={{
            background: "var(--cat-input-bg, var(--cat-card-bg))",
            border: "1px solid var(--cat-card-border)",
            color: "var(--cat-text)",
          }}
        />
      </div>

      {/* ── Events table ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--cat-card-bg)",
          border: "1px solid var(--cat-card-border)",
        }}
      >
        {error && (
          <div className="px-4 py-3 text-sm font-semibold"
            style={{ color: "#ef4444" }}>
            {error}
          </div>
        )}
        {loading && !data && (
          <div className="px-4 py-12 flex items-center justify-center"
            style={{ color: "var(--cat-text-muted)" }}>
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {data && data.events.length === 0 && !loading && (
          <div className="px-4 py-12 text-center text-sm"
            style={{ color: "var(--cat-text-muted)" }}>
            No events match the current filters.
          </div>
        )}
        {data && data.events.length > 0 && (
          <table className="w-full text-sm">
            <thead style={{ background: "var(--cat-tag-bg)" }}>
              <tr style={{ color: "var(--cat-text-muted)" }}>
                <Th>When</Th>
                <Th>Event</Th>
                <Th>Status</Th>
                <Th>Email</Th>
                <Th>Draw</Th>
                <Th>Promo</Th>
                <Th>Locale</Th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((e) => {
                const ev = EVENT_STYLE[e.eventType];
                const st = STATUS_STYLE[e.status];
                return (
                  <tr key={e.id}
                    style={{ borderTop: "1px solid var(--cat-card-border)" }}>
                    <Td muted>{formatTs(e.createdAt)}</Td>
                    <Td>
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-md"
                        style={{ background: ev.bg, color: ev.color }}
                      >
                        <ev.icon className="w-3 h-3" />
                        {ev.label}
                      </span>
                    </Td>
                    <Td>
                      <span
                        className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md"
                        style={{ background: st.bg, color: st.color }}
                      >
                        {st.label}
                      </span>
                    </Td>
                    <Td>{e.email ?? "—"}</Td>
                    <Td>
                      {e.drawId ? (
                        <a
                          href={`/draw/present?s=${e.drawId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs underline-offset-2 hover:underline"
                          style={{ color: "var(--cat-accent)" }}
                        >
                          {e.drawId}
                        </a>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td muted>{e.promoCode ?? "—"}</Td>
                    <Td muted>{e.locale ?? "—"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  extra,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  extra?: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "var(--cat-card-bg)",
        border: "1px solid var(--cat-card-border)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--cat-text-muted)" }}
        >
          {label}
        </span>
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${color}1f`, color }}
        >
          {icon}
        </span>
      </div>
      <p className="text-2xl font-black tabular-nums"
        style={{ color: "var(--cat-text)" }}>
        {value}
      </p>
      {extra && (
        <p className="text-[11px] mt-0.5"
          style={{ color: "var(--cat-text-muted)" }}>
          {extra}
        </p>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-[10px] font-bold uppercase tracking-widest px-3 py-2">
      {children}
    </th>
  );
}

function Td({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <td
      className="px-3 py-2 align-middle"
      style={{ color: muted ? "var(--cat-text-muted)" : "var(--cat-text)" }}
    >
      {children}
    </td>
  );
}

function formatTs(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}
