"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Activity,
  Clock,
  Users,
  MapPin,
  Calendar,
  TrendingUp,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Violation {
  type: string;
  severity: "error" | "warning";
  matchIds: number[];
  teamName?: string;
  fieldName?: string;
  message: string;
}

interface FieldDayStats {
  date: string;
  matchCount: number;
  openMinutes: number;
  usedMinutes: number;
  utilizationPct: number;
  idleGapMinutes: number;
}

interface FieldStats {
  fieldId: number;
  fieldName: string;
  stadiumName: string;
  days: FieldDayStats[];
  overallUtilizationPct: number;
}

interface TeamStats {
  teamId: number;
  teamName: string;
  totalScheduled: number;
  groupMatches: number;
  playoffMatches: number;
  matchesPerDay: Record<string, number>;
  homeMatches: number;
  awayMatches: number;
  minRestMinutes: number | null;
  avgRestMinutes: number | null;
  restViolations: number;
  backTobacks: number;
  maxConsecutiveStreak: number;
  consecutiveInstances: number;
}

interface DayLoad {
  date: string;
  matchCount: number;
  activeFields: number;
}

interface AuditReport {
  generatedAt: string;
  overview: {
    totalMatches: number;
    scheduledMatches: number;
    unscheduledMatches: number;
    hardViolations: number;
    warnings: number;
    grade: string;
    gradeScore: number;
  };
  violations: Violation[];
  fieldStats: FieldStats[];
  teamStats: TeamStats[];
  dayLoad: DayLoad[];
  roundOrderOk: boolean;
  roundOrderIssues: string[];
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScheduleAuditPanelProps {
  base: string;        // e.g. "/api/org/acme/tournament/123"
  tournamentId: number;
  onClose?: () => void;
}

// ─── Grade colours ────────────────────────────────────────────────────────────

const GRADE_COLOR: Record<string, string> = {
  "A+": "#2BFEBA",
  "A":  "#10b981",
  "B":  "#3b82f6",
  "C":  "#f59e0b",
  "D":  "#f97316",
  "F":  "#ef4444",
};

function gradeColor(g: string) {
  return GRADE_COLOR[g] ?? "#6b7280";
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function fmtMins(m: number | null, abbrH: string, abbrM: string) {
  if (m === null) return "—";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}${abbrH} ${min}${abbrM}` : `${min}${abbrM}`;
}

function fmtDate(d: string) {
  // "2026-08-14" → "14.08"
  const [, mo, da] = d.split("-");
  return `${da}.${mo}`;
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
  badge,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-xl border mb-3"
      style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
        style={{ color: "var(--cat-text)" }}
      >
        <span style={{ color: "#2BFEBA" }}>{icon}</span>
        <span className="font-semibold text-sm flex-1" style={{ fontSize: 14 }}>{title}</span>
        {badge}
        {open ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ─── Utilisation bar ──────────────────────────────────────────────────────────

function UtilBar({ pct }: { pct: number }) {
  const color = pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: 8, background: "rgba(255,255,255,0.08)" }}
      >
        <div
          style={{
            width: `${Math.min(100, pct)}%`,
            height: "100%",
            background: color,
            borderRadius: "999px",
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <span className="text-xs font-mono w-10 text-right" style={{ color, fontSize: 12 }}>
        {pct}%
      </span>
    </div>
  );
}

// ─── Day mini bar chart ───────────────────────────────────────────────────────

function DayBarChart({ data }: { data: DayLoad[] }) {
  const t = useTranslations("schedule");
  if (data.length === 0) return <p className="text-xs opacity-50">{t("noData")}</p>;
  const maxCount = Math.max(...data.map(d => d.matchCount), 1);
  return (
    <div className="flex items-end gap-1" style={{ height: 72 }}>
      {data.map(d => {
        const h = Math.round((d.matchCount / maxCount) * 60);
        return (
          <div key={d.date} className="flex flex-col items-center gap-0.5 flex-1" title={t("auditDayBarTitle", { date: fmtDate(d.date), matches: d.matchCount, fields: d.activeFields })}>
            <span className="text-xs font-mono" style={{ fontSize: 10, color: "var(--cat-text-muted)" }}>
              {d.matchCount}
            </span>
            <div
              style={{
                height: h || 2,
                width: "100%",
                background: "#2BFEBA",
                borderRadius: "3px 3px 0 0",
                opacity: 0.85,
                minHeight: 2,
              }}
            />
            <span className="text-xs truncate w-full text-center" style={{ fontSize: 9, color: "var(--cat-text-muted)" }}>
              {fmtDate(d.date)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScheduleAuditPanel({
  base,
  tournamentId,
  onClose,
}: ScheduleAuditPanelProps) {
  const t = useTranslations("schedule");
  const locale = useLocale();
  const abbrH = t("abbrHour");
  const abbrM = t("abbrMin");
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAudit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/schedule/audit`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data: AuditReport = await res.json();
      setReport(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("unknownError"));
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="rounded-2xl border mb-4 overflow-hidden"
      style={{
        background: "var(--cat-card-bg)",
        borderColor: "var(--cat-card-border)",
        fontSize: 14,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3 border-b"
        style={{ borderColor: "var(--cat-card-border)" }}
      >
        <Activity className="w-4 h-4" style={{ color: "#2BFEBA" }} />
        <span className="font-semibold flex-1" style={{ color: "var(--cat-text)", fontSize: 14 }}>
          {t("auditTitle")}
        </span>
        {report && (
          <span className="text-xs opacity-40" style={{ color: "var(--cat-text-secondary)", fontSize: 12 }}>
            {new Date(report.generatedAt).toLocaleTimeString(locale)}
          </span>
        )}
        <button
          onClick={runAudit}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
          style={{ background: "rgba(43,254,186,0.15)", color: "#2BFEBA", border: "1px solid rgba(43,254,186,0.3)" }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {report ? t("auditRefresh") : t("auditRun")}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-all hover:opacity-70"
            style={{ color: "var(--cat-text-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4">
        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 py-6 justify-center" style={{ color: "var(--cat-text-secondary)" }}>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">{t("auditAnalyzing")}</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center gap-2 py-4 px-4 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Placeholder */}
        {!loading && !error && !report && (
          <div className="py-8 text-center" style={{ color: "var(--cat-text-muted)" }}>
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t("auditPlaceholder")}</p>
          </div>
        )}

        {/* No scheduled matches */}
        {report && report.overview.scheduledMatches === 0 && (
          <div className="py-6 text-center" style={{ color: "var(--cat-text-muted)" }}>
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t("auditNoScheduled")}</p>
          </div>
        )}

        {/* Main report */}
        {report && report.overview.scheduledMatches > 0 && (
          <>
            {/* ── Overview cards ── */}
            <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
              {/* Grade */}
              <div
                className="rounded-xl p-4 flex flex-col items-center justify-center gap-1 col-span-2 sm:col-span-1"
                style={{
                  background: `${gradeColor(report.overview.grade)}18`,
                  border: `1px solid ${gradeColor(report.overview.grade)}44`,
                }}
              >
                <span
                  className="text-4xl font-black"
                  style={{
                    color: gradeColor(report.overview.grade),
                    textShadow: `0 0 16px ${gradeColor(report.overview.grade)}66`,
                    lineHeight: 1,
                  }}
                >
                  {report.overview.grade}
                </span>
                <span className="text-xs opacity-60" style={{ color: "var(--cat-text-secondary)", fontSize: 11 }}>
                  {report.overview.gradeScore}/100
                </span>
              </div>

              {/* Total */}
              <StatCard
                label={t("auditTotalMatches")}
                value={report.overview.totalMatches}
                sub={t("auditScheduledSub", { count: report.overview.scheduledMatches })}
                icon={<Calendar className="w-4 h-4" />}
                color="#3b82f6"
              />
              {/* Violations */}
              <StatCard
                label={t("auditViolations")}
                value={report.overview.hardViolations}
                sub={t("auditCritical")}
                icon={<XCircle className="w-4 h-4" />}
                color={report.overview.hardViolations > 0 ? "#ef4444" : "#10b981"}
              />
              {/* Warnings */}
              <StatCard
                label={t("auditWarnings")}
                value={report.overview.warnings}
                sub={t("auditSoft")}
                icon={<AlertTriangle className="w-4 h-4" />}
                color={report.overview.warnings > 0 ? "#f59e0b" : "#10b981"}
              />
            </div>

            {/* ── Violations ── */}
            {report.violations.length > 0 && (
              <Section
                title={t("auditViolationsTitle")}
                icon={<AlertTriangle className="w-4 h-4" />}
                badge={
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: "rgba(239,68,68,0.15)",
                      color: "#ef4444",
                      fontSize: 11,
                    }}
                  >
                    {t("auditErrorsCount", { count: report.violations.filter(v => v.severity === "error").length })}
                  </span>
                }
              >
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                  {report.violations.map((v, i) => (
                    <div
                      key={i}
                      className="rounded-lg px-3 py-2 flex items-start gap-2"
                      style={{
                        background: v.severity === "error"
                          ? "rgba(239,68,68,0.08)"
                          : "rgba(245,158,11,0.08)",
                        borderLeft: `3px solid ${v.severity === "error" ? "#ef4444" : "#f59e0b"}`,
                      }}
                    >
                      {v.severity === "error"
                        ? <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#ef4444" }} />
                        : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#f59e0b" }} />
                      }
                      <div className="flex-1">
                        <p className="text-xs leading-snug" style={{ color: "var(--cat-text)", fontSize: 12 }}>
                          {v.message}
                        </p>
                        {v.matchIds.length > 0 && (
                          <p className="text-xs mt-0.5 opacity-50" style={{ fontSize: 11 }}>
                            {t("auditMatchesList", { ids: v.matchIds.join(", ") })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Field utilisation ── */}
            {report.fieldStats.length > 0 && (
              <Section
                title={t("auditFieldLoad")}
                icon={<MapPin className="w-4 h-4" />}
              >
                <div className="flex flex-col gap-4">
                  {report.fieldStats
                    .filter(f => f.days.length > 0)
                    .map(f => (
                      <div key={f.fieldId}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold" style={{ color: "var(--cat-text)", fontSize: 13 }}>
                            {f.stadiumName !== "—" ? `${f.stadiumName} / ` : ""}{f.fieldName}
                          </span>
                          <span className="text-xs opacity-60" style={{ fontSize: 11 }}>
                            {t("matchesPlural", { count: f.days.reduce((s, d) => s + d.matchCount, 0) })}
                          </span>
                        </div>
                        <UtilBar pct={f.overallUtilizationPct} />
                        {f.days.length > 1 && (
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {f.days.map(d => (
                              <span
                                key={d.date}
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{
                                  fontSize: 10,
                                  background: "rgba(255,255,255,0.05)",
                                  color: "var(--cat-text-secondary)",
                                }}
                              >
                                {t("auditDayUtil", { date: fmtDate(d.date), matches: d.matchCount, pct: d.utilizationPct })}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  {report.fieldStats.filter(f => f.days.length === 0).length > 0 && (
                    <p className="text-xs opacity-40" style={{ fontSize: 12 }}>
                      {t("auditFieldsNoMatches", { count: report.fieldStats.filter(f => f.days.length === 0).length })}
                    </p>
                  )}
                </div>
              </Section>
            )}

            {/* ── Team stats ── */}
            {report.teamStats.length > 0 && (
              <Section
                title={t("auditTeamStats")}
                icon={<Users className="w-4 h-4" />}
                defaultOpen={false}
              >
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ fontSize: 13, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ color: "var(--cat-text-secondary)", borderBottom: "1px solid var(--cat-card-border)" }}>
                        <th className="text-left pb-2 pr-3 font-semibold">{t("teamHeader")}</th>
                        <th className="text-center pb-2 px-2 font-semibold" title={t("auditColGroupTitle")}>{t("auditColGroup")}</th>
                        <th className="text-center pb-2 px-2 font-semibold" title={t("auditColPlayoffTitle")}>{t("auditColPlayoff")}</th>
                        <th className="text-center pb-2 px-2 font-semibold" title={t("auditColHomeAwayTitle")}>{t("auditColHomeAway")}</th>
                        <th className="text-center pb-2 px-2 font-semibold" title={t("auditColMinRestTitle")}>{t("auditColMinRest")}</th>
                        <th className="text-center pb-2 px-2 font-semibold" title={t("auditColAvgRestTitle")}>{t("auditColAvgRest")}</th>
                        <th className="text-center pb-2 px-2 font-semibold" title={t("auditColStreakTitle")}>{t("auditColStreak")}</th>
                        <th className="text-center pb-2 px-1 font-semibold" title={t("auditColViolationsTitle")}>⚠</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.teamStats.map(ts => {
                        const streakBad = ts.maxConsecutiveStreak >= 3;
                        const streakWarn = ts.maxConsecutiveStreak === 2;
                        return (
                          <tr
                            key={ts.teamId}
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.04)",
                              color: "var(--cat-text)",
                            }}
                          >
                            <td className="py-2 pr-3 font-medium truncate" style={{ maxWidth: 160 }}>{ts.teamName}</td>
                            <td className="py-2 px-2 text-center">
                              <span style={{ color: "var(--cat-text-secondary)" }}>{ts.groupMatches ?? ts.totalScheduled}</span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              {(ts.playoffMatches ?? 0) > 0
                                ? <span style={{ color: "#6366f1", fontWeight: 600 }}>{ts.playoffMatches}</span>
                                : <span style={{ opacity: 0.3 }}>—</span>
                              }
                            </td>
                            <td className="py-2 px-2 text-center" style={{ color: "var(--cat-text-secondary)" }}>
                              {ts.homeMatches}/{ts.awayMatches}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span style={{
                                color: ts.minRestMinutes !== null && ts.minRestMinutes < 60 ? "#ef4444" : "var(--cat-text-secondary)",
                                fontWeight: ts.minRestMinutes !== null && ts.minRestMinutes < 60 ? 700 : 400,
                              }}>
                                {fmtMins(ts.minRestMinutes, abbrH, abbrM)}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center" style={{ color: "var(--cat-text-secondary)" }}>
                              {fmtMins(ts.avgRestMinutes, abbrH, abbrM)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {(ts.maxConsecutiveStreak ?? 0) >= 2 ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold"
                                  style={{
                                    background: streakBad ? "rgba(239,68,68,0.15)" : streakWarn ? "rgba(245,158,11,0.15)" : "transparent",
                                    color: streakBad ? "#ef4444" : streakWarn ? "#f59e0b" : "var(--cat-text-secondary)",
                                    fontSize: 12,
                                  }}
                                  title={t("auditStreakTimes", { count: ts.consecutiveInstances ?? 0 })}
                                >
                                  {ts.maxConsecutiveStreak}× {ts.consecutiveInstances > 0 && <span style={{ opacity: 0.7 }}>({ts.consecutiveInstances})</span>}
                                </span>
                              ) : (
                                <span style={{ color: "#10b981", fontSize: 16 }}>✓</span>
                              )}
                            </td>
                            <td className="py-2 px-1 text-center">
                              {ts.restViolations > 0 ? (
                                <span
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-full font-bold"
                                  style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 12 }}
                                >
                                  {ts.restViolations}
                                </span>
                              ) : (
                                <CheckCircle className="w-4 h-4 mx-auto" style={{ color: "#10b981" }} />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs mt-2 opacity-50" style={{ fontSize: 12 }}>
                  {t("auditStreakExplain")}
                </p>
              </Section>
            )}

            {/* ── Day load chart ── */}
            {report.dayLoad.length > 0 && (
              <Section
                title={t("auditDayLoad")}
                icon={<TrendingUp className="w-4 h-4" />}
                defaultOpen={false}
              >
                <DayBarChart data={report.dayLoad} />
                <div className="flex flex-wrap gap-3 mt-3">
                  {report.dayLoad.map(d => (
                    <div key={d.date} className="text-xs" style={{ color: "var(--cat-text-secondary)", fontSize: 11 }}>
                      <span className="font-semibold" style={{ color: "var(--cat-text)" }}>{fmtDate(d.date)}</span>
                      {" "}{t("auditDayLoadItem", { matches: d.matchCount, fields: d.activeFields })}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Round order ── */}
            <Section
              title={t("auditRoundOrder")}
              icon={<Clock className="w-4 h-4" />}
              defaultOpen={!report.roundOrderOk}
            >
              {report.roundOrderOk ? (
                <div className="flex items-center gap-2" style={{ color: "#10b981" }}>
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">{t("auditRoundOrderOk")}</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {report.roundOrderIssues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2" style={{ color: "#ef4444" }}>
                      <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span className="text-xs">{issue}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1"
      style={{
        background: `${color}10`,
        border: `1px solid ${color}30`,
      }}
    >
      <div className="flex items-center gap-1.5" style={{ color }}>
        {icon}
        <span className="text-xs opacity-70" style={{ fontSize: 11 }}>{label}</span>
      </div>
      <span className="text-2xl font-bold" style={{ color, lineHeight: 1.1 }}>
        {value}
      </span>
      <span className="text-xs opacity-50" style={{ fontSize: 11, color: "var(--cat-text-secondary)" }}>
        {sub}
      </span>
    </div>
  );
}
