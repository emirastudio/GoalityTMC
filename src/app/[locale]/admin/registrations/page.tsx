"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Monitor, Smartphone, Download } from "lucide-react";

type Attempt = {
  id: number;
  clubName: string | null;
  contactEmail: string | null;
  contactName: string | null;
  country: string | null;
  city: string | null;
  teamsCount: number | null;
  teamsJson: string | null;
  hasLogo: boolean | null;
  status: string;
  failReason: string | null;
  clubId: number | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "success")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/10 rounded-full px-2 py-0.5">
        <CheckCircle className="w-3 h-3" /> Success
      </span>
    );
  if (status === "duplicate_email")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
        <AlertCircle className="w-3 h-3" /> Duplicate email
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-error bg-error/10 rounded-full px-2 py-0.5">
      <XCircle className="w-3 h-3" /> {status.replace("fail_", "").replace(/_/g, " ")}
    </span>
  );
}

function DeviceIcon({ ua }: { ua: string | null }) {
  if (!ua) return null;
  const mobile = /mobile|android|iphone|ipad/i.test(ua);
  return mobile
    ? <Smartphone className="w-3.5 h-3.5 text-text-secondary" />
    : <Monitor className="w-3.5 h-3.5 text-text-secondary" />;
}

function parseBrowser(ua: string | null): string {
  if (!ua) return "—";
  if (/CriOS/i.test(ua)) return "Chrome iOS";
  if (/FxiOS/i.test(ua)) return "Firefox iOS";
  if (/EdgA/i.test(ua)) return "Edge Android";
  if (/SamsungBrowser/i.test(ua)) return "Samsung";
  if (/OPR|Opera/i.test(ua)) return "Opera";
  if (/Edg/i.test(ua)) return "Edge";
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Safari/i.test(ua)) return "Safari";
  return "Other";
}

function parseOS(ua: string | null): string {
  if (!ua) return "";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS/i.test(ua)) return "Mac";
  if (/Linux/i.test(ua)) return "Linux";
  return "";
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function RegistrationsPage() {
  const [rows, setRows] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "success" | "fail">("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/registration-log");
    if (res.ok) setRows(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const visible = rows.filter((r) => {
    if (filter === "success") return r.status === "success";
    if (filter === "fail") return r.status !== "success";
    return true;
  });

  const successCount = rows.filter((r) => r.status === "success").length;
  const failCount = rows.filter((r) => r.status !== "success").length;

  function exportCsv() {
    const headers = ["Date", "Club", "Email", "Name", "Country", "Teams", "Status", "Reason", "Browser", "OS", "IP"];
    const csvRows = visible.map((r) => [
      fmtDate(r.createdAt),
      r.clubName ?? "",
      r.contactEmail ?? "",
      r.contactName ?? "",
      r.country ?? "",
      r.teamsCount ?? "",
      r.status,
      r.failReason ?? "",
      parseBrowser(r.userAgent),
      parseOS(r.userAgent),
      r.ip ?? "",
    ]);
    const csv = [headers, ...csvRows]
      .map((row) => row.map((c) => typeof c === "string" && c.includes(",") ? `"${String(c).replace(/"/g, '""')}"` : c).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Registration Log</h1>
          <p className="text-sm text-text-secondary">
            <span className="text-success font-semibold">{successCount}</span> successful ·{" "}
            <span className="text-error font-semibold">{failCount}</span> failed · {rows.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-surface transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-surface transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-surface rounded-lg p-1 w-fit">
        {(["all", "success", "fail"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === f ? "bg-white text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {f === "all" ? `All (${rows.length})` : f === "success" ? `✓ Success (${successCount})` : `✗ Failed (${failCount})`}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12 text-text-secondary">Loading…</div>
      )}

      {!loading && visible.length === 0 && (
        <div className="text-center py-12 text-text-secondary">No records yet</div>
      )}

      {/* Table */}
      {!loading && visible.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-navy">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-white/70 uppercase tracking-wide">Time</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-white/70 uppercase tracking-wide">Club</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-white/70 uppercase tracking-wide">Email</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-white/70 uppercase tracking-wide">Country</th>
                <th className="px-3 py-2 text-center text-[11px] font-semibold text-white/70 uppercase tracking-wide">Teams</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-white/70 uppercase tracking-wide">Status</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-white/70 uppercase tracking-wide">Device</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-white/70 uppercase tracking-wide">IP</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row, i) => (
                <>
                  <tr
                    key={row.id}
                    onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                    className={`border-b border-border last:border-0 cursor-pointer hover:bg-navy/3 transition-colors ${
                      i % 2 === 0 ? "bg-white" : "bg-surface/40"
                    } ${row.status !== "success" ? "border-l-2 border-l-error/40" : ""}`}
                  >
                    <td className="px-3 py-2 text-xs text-text-secondary whitespace-nowrap font-mono">
                      {fmtDate(row.createdAt)}
                    </td>
                    <td className="px-3 py-2 font-medium text-text-primary max-w-[150px] truncate">
                      {row.clubName ?? <span className="text-text-secondary/40 italic">—</span>}
                    </td>
                    <td className="px-3 py-2 text-text-secondary max-w-[180px] truncate text-xs">
                      {row.contactEmail ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-text-secondary">
                      {row.country ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums text-xs">
                      {row.teamsCount ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <DeviceIcon ua={row.userAgent} />
                        <span>{parseBrowser(row.userAgent)}</span>
                        <span className="text-text-secondary/50">{parseOS(row.userAgent)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-text-secondary/70">
                      {row.ip?.split(",")[0]?.trim() ?? "—"}
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {expanded === row.id && (
                    <tr key={`${row.id}-detail`} className="bg-navy/5 border-b border-border">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <p className="text-text-secondary font-semibold uppercase tracking-wide mb-1">Contact</p>
                            <p className="font-medium">{row.contactName ?? "—"}</p>
                            <p className="text-text-secondary">{row.contactEmail ?? "—"}</p>
                          </div>
                          <div>
                            <p className="text-text-secondary font-semibold uppercase tracking-wide mb-1">Location</p>
                            <p>{row.country}{row.city ? `, ${row.city}` : ""}</p>
                            {row.clubId && (
                              <p className="text-success">Club ID: #{row.clubId}</p>
                            )}
                          </div>
                          {row.failReason && (
                            <div>
                              <p className="text-text-secondary font-semibold uppercase tracking-wide mb-1">Fail reason</p>
                              <p className="text-error">{row.failReason}</p>
                            </div>
                          )}
                          {row.teamsJson && (() => {
                            try {
                              const t = JSON.parse(row.teamsJson) as { name: string; classId: string }[];
                              return (
                                <div>
                                  <p className="text-text-secondary font-semibold uppercase tracking-wide mb-1">Teams</p>
                                  {t.map((tm, idx) => (
                                    <p key={idx}>{tm.name || "(no name)"} <span className="text-text-secondary">class {tm.classId || "?"}</span></p>
                                  ))}
                                </div>
                              );
                            } catch { return null; }
                          })()}
                          <div className="col-span-2 md:col-span-4">
                            <p className="text-text-secondary font-semibold uppercase tracking-wide mb-1">User Agent</p>
                            <p className="font-mono text-[10px] text-text-secondary break-all">{row.userAgent ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
