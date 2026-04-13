"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTournament } from "@/lib/tournament-context";
import {
  Layers, Users, CalendarDays, Trophy,
  Plus, Trash2, ChevronRight, RefreshCw,
  Play, CheckCircle, Clock, Zap, AlertCircle,
  Edit2, Save, X, Loader2, Shield, ChevronDown, LayoutGrid,
  GitBranch, BarChart3, Shuffle, Sparkles, Info, ArrowRight, MapPin, Check,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

type StageType = "group" | "knockout" | "league";
type StageStatus = "pending" | "draft" | "active" | "finished";
type MatchStatus = "scheduled" | "live" | "finished" | "cancelled" | "postponed";

interface Stage {
  id: number;
  name: string;
  nameRu?: string | null;
  type: StageType;
  status: StageStatus;
  order: number;
}

interface Group {
  id: number;
  name: string;
  stageId: number;
  order: number;
  groupTeams?: GroupTeam[];
}

interface GroupTeam {
  teamId: number;
  team?: Team;
}

interface Round {
  id: number;
  name: string;
  shortName?: string | null;
  order: number;
  matchCount: number;
}

interface Team {
  id: number;
  name: string;
  clubName?: string | null;
  clubBadgeUrl?: string | null;
}

interface Match {
  id: number;
  matchNumber?: number | null;
  stageId?: number | null;
  groupId?: number | null;
  roundId?: number | null;
  groupRound?: number | null;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  homeTeam?: { name: string; club?: { badgeUrl?: string | null } | null } | null;
  awayTeam?: { name: string; club?: { badgeUrl?: string | null } | null } | null;
  homeScore?: number | null;
  awayScore?: number | null;
  scheduledAt?: string | null;
  status: MatchStatus;
  fieldId?: number | null;
  field?: { name: string; stadium?: { id: number; name: string } | null } | null;
  stage?: { id: number; name: string; type?: string | null; order?: number | null } | null;
  group?: { id: number; name: string } | null;
  round?: { id: number; name: string } | null;
}

// ─────────────────────────────────────────────
//  Helper UI components
// ─────────────────────────────────────────────

function StatusChip({ status }: { status: StageStatus }) {
  const t = useTranslations("schedule");
  const map: Record<StageStatus, { color: string; bg: string }> = {
    pending:  { color: "var(--badge-warning-text, #f59e0b)", bg: "var(--badge-warning-bg, rgba(245,158,11,0.1))" },
    draft:    { color: "var(--cat-text-muted)",    bg: "var(--cat-tag-bg)" },
    active:   { color: "var(--badge-success-text)", bg: "var(--badge-success-bg)" },
    finished: { color: "var(--cat-text-secondary)", bg: "var(--cat-card-border)" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
      style={{ color: s.color, background: s.bg }}>
      {t(`stageStatus_${status}` as "stageStatus_draft")}
    </span>
  );
}

function MatchStatusChip({ status, hasTime }: { status: MatchStatus; hasTime?: boolean }) {
  const t = useTranslations("schedule");
  // "scheduled" with no time assigned → show "Без даты" (unassigned) instead
  if (status === "scheduled" && !hasTime) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
        style={{ color: "var(--cat-text-muted)", background: "var(--cat-tag-bg)" }}>
        <Clock className="w-3 h-3" />{t("matchStatus_unscheduled")}
      </span>
    );
  }
  const map: Record<MatchStatus, { color: string; bg: string; icon: React.ReactNode }> = {
    scheduled:  { color: "#2BFEBA",                   bg: "rgba(43,254,186,0.12)",      icon: <Clock className="w-3 h-3" /> },
    live:       { color: "var(--badge-warning-text)", bg: "var(--badge-warning-bg)",     icon: <Zap  className="w-3 h-3" /> },
    finished:   { color: "var(--badge-success-text)", bg: "var(--badge-success-bg)",    icon: <CheckCircle className="w-3 h-3" /> },
    cancelled:  { color: "var(--badge-error-text)",   bg: "var(--badge-error-bg)",      icon: <X className="w-3 h-3" /> },
    postponed:  { color: "var(--badge-warning-text)", bg: "var(--badge-warning-bg)",    icon: <AlertCircle className="w-3 h-3" /> },
  };
  const s = map[status] ?? map.scheduled;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
      style={{ color: s.color, background: s.bg }}>
      {s.icon}{t(`matchStatus_${status}` as "matchStatus_scheduled")}
    </span>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
      style={active ? {
        background: "var(--cat-accent)",
        color: "var(--cat-accent-text)",
        boxShadow: "0 0 12px var(--cat-accent-glow, rgba(0,200,150,0.3))",
      } : {
        color: "var(--cat-text-secondary)",
        background: "transparent",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-base font-bold" style={{ color: "var(--cat-text)" }}>{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-xl border p-4 ${className}`}
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", ...style }}
    >
      {children}
    </div>
  );
}

function Btn({
  children, onClick, variant = "primary", size = "sm", loading = false, disabled = false, className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "outline";
  size?: "xs" | "sm" | "md";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "var(--cat-accent)", color: "var(--cat-accent-text)", boxShadow: "0 0 8px var(--cat-accent-glow, rgba(0,200,150,0.25))" },
    ghost:   { background: "transparent", color: "var(--cat-text-secondary)", border: "1px solid var(--cat-card-border)" },
    danger:  { background: "var(--badge-error-bg)", color: "var(--badge-error-text)", border: "1px solid var(--badge-error-text)" },
    outline: { background: "transparent", color: "var(--cat-accent)", border: "1px solid var(--cat-accent)" },
  };
  const sizes = { xs: "px-2 py-1 text-[11px]", sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-1.5 rounded-lg font-semibold transition-opacity hover:opacity-80 disabled:opacity-40 ${sizes[size]} ${className}`}
      style={styles[variant]}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, type = "text", className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 w-full ${className}`}
      style={{
        background: "var(--cat-input-bg, var(--cat-card-bg))",
        border: "1px solid var(--cat-card-border)",
        color: "var(--cat-text)",
      }}
    />
  );
}

function Select({ value, onChange, children, className = "" }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`rounded-lg px-3 py-2 text-sm outline-none w-full ${className}`}
      style={{
        background: "var(--cat-input-bg, var(--cat-card-bg))",
        border: "1px solid var(--cat-card-border)",
        color: "var(--cat-text)",
      }}
    >
      {children}
    </select>
  );
}

// ─────────────────────────────────────────────
//  PillGroup — pill button selector
// ─────────────────────────────────────────────

function PillGroup<T extends string | number>({
  options, value, onChange, suffix = "",
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {options.map(opt => {
        const active = opt === value;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
            style={active ? {
              background: "var(--cat-accent)",
              color: "var(--cat-accent-text)",
              boxShadow: "0 0 8px var(--cat-accent-glow, rgba(0,200,150,0.3))",
            } : {
              background: "var(--cat-tag-bg)",
              color: "var(--cat-text-secondary)",
              border: "1px solid var(--cat-card-border)",
            }}
          >
            {opt}{suffix}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Match settings type
// ─────────────────────────────────────────────

interface StageSettings {
  halves: number;
  halfDuration: number;
  halfBreak: number;
  breakBetweenMatches: number;
}

const DEFAULT_STAGE_SETTINGS: StageSettings = {
  halves: 2,
  halfDuration: 20,
  halfBreak: 10,
  breakBetweenMatches: 5,
};

// ─────────────────────────────────────────────
//  Stats summary bar
// ─────────────────────────────────────────────

interface StatsBarProps {
  totalMatches: number;
  scheduled: number;
  loading: boolean;
}

function StatsBar({ totalMatches, scheduled, loading }: StatsBarProps) {
  const unscheduled = totalMatches - scheduled;

  const stats = [
    { label: "Total matches", value: totalMatches, accent: false },
    { label: "Scheduled", value: scheduled, accent: true },
    { label: "Unscheduled", value: unscheduled, accent: false, warn: unscheduled > 0 },
  ];

  if (loading) {
    return (
      <div className="flex items-center gap-2 h-10" style={{ color: "var(--cat-text-muted)" }}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="text-xs">Loading stats…</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {stats.map(s => (
        <div
          key={s.label}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
          style={{
            background: s.accent
              ? "rgba(43,254,186,0.08)"
              : s.warn && s.value > 0
              ? "rgba(245,158,11,0.08)"
              : "var(--cat-tag-bg)",
            border: s.accent
              ? "1px solid rgba(43,254,186,0.2)"
              : s.warn && s.value > 0
              ? "1px solid rgba(245,158,11,0.2)"
              : "1px solid var(--cat-card-border)",
          }}
        >
          <span style={{ color: "var(--cat-text-muted)" }}>{s.label}:</span>
          <span
            className="font-bold tabular-nums"
            style={{
              color: s.accent
                ? "#2BFEBA"
                : s.warn && s.value > 0
                ? "#f59e0b"
                : "var(--cat-text)",
            }}
          >
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Main SchedulePage component
// ─────────────────────────────────────────────

export function SchedulePage() {
  const t = useTranslations("schedule");
  const ctx = useTournament();
  const orgSlug = ctx?.orgSlug ?? "";
  const tournamentId = ctx?.tournamentId ?? 0;
  const base = `/api/org/${orgSlug}/tournament/${tournamentId}`;

  const searchParams = useSearchParams();
  const classId = searchParams ? Number(searchParams.get("classId")) || null : null;
  const className = searchParams ? searchParams.get("className") || null : null;
  const maxTeamsFromUrl = searchParams ? Number(searchParams.get("maxTeams")) || null : null;

  // resolvedMaxTeams: URL param (fast) or fetched from class DB (direct navigation fallback)
  const [maxTeamsParam, setMaxTeamsParam] = useState<number | null>(maxTeamsFromUrl);

  useEffect(() => {
    if (maxTeamsFromUrl != null || !classId || !orgSlug || !tournamentId) return;
    fetch(`${base}/classes/${classId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((cls: { maxTeams?: number | null } | null) => {
        if (cls?.maxTeams) setMaxTeamsParam(cls.maxTeams);
      })
      .catch(() => {});
  }, [classId, maxTeamsFromUrl, base, orgSlug, tournamentId]);

  const [tab, setTab] = useState<"draw" | "schedule">("draw");

  // Shared stageSettings — lifted so ScheduleTab can read match durations
  const [stageSettings, setStageSettings] = useState<Record<number, StageSettings>>({});
  function patchStageSettings(stageId: number, patch: Partial<StageSettings>) {
    setStageSettings(prev => {
      const cur = prev[stageId] ?? DEFAULT_STAGE_SETTINGS;
      return { ...prev, [stageId]: { ...cur, ...patch } };
    });
  }

  // Global stats state
  const [statsLoading, setStatsLoading] = useState(true);
  const [totalMatches, setTotalMatches] = useState(0);
  const [scheduledCount, setScheduledCount] = useState(0);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const matches: Match[] = await fetch(
        `${base}/matches${classId ? `?classId=${classId}` : ""}`
      ).then(r => r.ok ? r.json() : []).catch(() => []);
      setTotalMatches(Array.isArray(matches) ? matches.length : 0);
      setScheduledCount(Array.isArray(matches) ? matches.filter(m => m.scheduledAt).length : 0);
    } finally {
      setStatsLoading(false);
    }
  }, [base, classId]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const tabs = [
    { key: "draw"      as const, icon: <Users className="w-4 h-4" />,        label: t("tabDraw") },
    { key: "schedule"  as const, icon: <CalendarDays className="w-4 h-4" />, label: t("tabFixtures") },
  ];

  // ── HARD GUARD: classId обязателен — нельзя показывать смешанные данные ──
  if (!classId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <span className="text-2xl">⚠️</span>
        </div>
        <div>
          <p className="text-base font-bold mb-1" style={{ color: "var(--cat-text)" }}>
            Дивизион не выбран
          </p>
          <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
            Откройте расписание через карточку дивизиона — classId обязателен.
          </p>
        </div>
      </div>
    );
  }

  const plannerHref = `/org/${orgSlug}/admin/tournament/${tournamentId}/planner?classId=${classId}`;

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>
            {className ? `${t("scheduleFor")} · ${className}` : t("scheduleTitle")}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {classId ? t("scheduleSubtitleDivision") : t("scheduleSubtitle")}
          </p>
        </div>
        <Link
          href={plannerHref}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all hover:opacity-80"
          style={{
            background: "rgba(6,182,212,0.08)",
            borderColor: "rgba(6,182,212,0.3)",
            color: "#06b6d4",
          }}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          {classId ? t("manualAdjust") : t("openPlanner")}
        </Link>
      </div>

      {/* Stats bar */}
      <StatsBar
        totalMatches={totalMatches}
        scheduled={scheduledCount}
        loading={statsLoading}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-2xl w-fit"
        style={{ background: "var(--cat-tag-bg, rgba(0,0,0,0.05))", border: "1px solid var(--cat-card-border)" }}>
        {tabs.map(tab_ => (
          <TabButton
            key={tab_.key}
            active={tab === tab_.key}
            onClick={() => setTab(tab_.key)}
            icon={tab_.icon}
            label={tab_.label}
          />
        ))}
      </div>

      {/* Tab content */}
      {tab === "draw"     && <DrawTab     base={base} classId={classId} />}
      {tab === "schedule" && <ScheduleTab base={base} classId={classId} stageSettings={stageSettings} />}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Tab 1: Structure (was Stages)
// ─────────────────────────────────────────────

function StructureTab({
  base,
  classId,
  maxTeams,
  onStatsChange,
  onSwitchToSchedule,
  stageSettings,
  onPatchSettings,
}: {
  base: string;
  classId: number | null;
  maxTeams: number | null;
  onStatsChange: () => void;
  onSwitchToSchedule: () => void;
  stageSettings: Record<number, StageSettings>;
  onPatchSettings: (stageId: number, patch: Partial<StageSettings>) => void;
}) {
  const t = useTranslations("schedule");
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // matchCounts per stage, refreshed after generate
  const [matchCounts, setMatchCounts] = useState<Record<number, number>>({});

  const stagesUrl = classId ? `${base}/stages?classId=${classId}` : `${base}/stages`;

  const loadStages = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(stagesUrl);
      if (r.ok) {
        const data: Stage[] = await r.json();
        setStages(data);
        // Load match counts for all stages in parallel
        const counts = await Promise.all(
          data.map(s =>
            fetch(`${base}/matches?stageId=${s.id}`)
              .then(r => r.ok ? r.json() : [])
              .then((m: Match[]) => ({ id: s.id, count: Array.isArray(m) ? m.length : 0 }))
              .catch(() => ({ id: s.id, count: 0 }))
          )
        );
        const map: Record<number, number> = {};
        for (const c of counts) map[c.id] = c.count;
        setMatchCounts(map);
      }
    } finally {
      setLoading(false);
    }
  }, [stagesUrl, base]);

  useEffect(() => { loadStages(); }, [loadStages]);

  function getSettings(stageId: number): StageSettings {
    return stageSettings[stageId] ?? DEFAULT_STAGE_SETTINGS;
  }

  function patchSettings(stageId: number, patch: Partial<StageSettings>) {
    onPatchSettings(stageId, patch);
  }

  async function changeStatus(stage: Stage, status: StageStatus) {
    await fetch(`${base}/stages/${stage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadStages();
    onStatsChange();
  }

  const totalMatchCount = Object.values(matchCounts).reduce((a, b) => a + b, 0);
  const hasNoMatchesAtAll = totalMatchCount === 0 && !loading;

  if (loading) return (
    <div className="flex items-center gap-2 py-8" style={{ color: "var(--cat-text-muted)" }}>
      <Loader2 className="w-4 h-4 animate-spin" /> {t("loading")}
    </div>
  );

  // Format Builder link (with classId so it opens the right division's format)
  const fmtBuilderHref = base.replace(/^\/api\/org\/([^/]+)\/tournament\/(\d+)/, "/org/$1/admin/tournament/$2/format")
    + (classId ? `?classId=${classId}` : "");

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t("stagesTitle")}
        subtitle={t("stagesSubtitle")}
      />

      {/* No stages: prompt to go to Format Builder */}
      {stages.length === 0 && (
        <Card>
          <div className="text-center py-12" style={{ color: "var(--cat-text-muted)" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--cat-tag-bg)" }}>
              <Layers className="w-8 h-8 opacity-30" />
            </div>
            <p className="text-base font-bold mb-1" style={{ color: "var(--cat-text)" }}>{t("noStages")}</p>
            <p className="text-sm mb-5">{t("noStagesHint")}</p>
            <Link
              href={fmtBuilderHref}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
              style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}
            >
              <Sparkles className="w-4 h-4" />
              Format Builder
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Card>
      )}

      {/* Prominent banner when stages exist but no matches generated */}
      {stages.length > 0 && hasNoMatchesAtAll && (
        <div
          className="rounded-2xl border px-5 py-4 flex items-center gap-4"
          style={{
            background: "linear-gradient(135deg, rgba(43,254,186,0.06) 0%, rgba(43,254,186,0.02) 100%)",
            borderColor: "rgba(43,254,186,0.25)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(43,254,186,0.15)" }}
          >
            <Zap className="w-5 h-5" style={{ color: "#2BFEBA" }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
              Generate matches to start scheduling
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
              Open each stage below and click Generate to create match slots.
            </p>
          </div>
          <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
        </div>
      )}

      {/* Stage cards */}
      <div className="space-y-3">
        {stages.map((stage, idx) => {
          const isOpen = expandedId === stage.id;
          const settings = getSettings(stage.id);
          const stageMatchCount = matchCounts[stage.id] ?? 0;

          const typeStyle = stage.type === "group"
            ? { accent: "#3b82f6", bg: "rgba(59,130,246,0.1)", icon: <BarChart3 className="w-3.5 h-3.5" /> }
            : stage.type === "league"
            ? { accent: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: <Layers className="w-3.5 h-3.5" /> }
            : { accent: "var(--cat-accent)", bg: "var(--cat-accent-glow, rgba(0,200,150,0.1))", icon: <GitBranch className="w-3.5 h-3.5" /> };

          return (
            <div
              key={stage.id}
              className="rounded-2xl border overflow-hidden transition-all"
              style={{
                background: "var(--cat-card-bg)",
                borderColor: isOpen ? typeStyle.accent : "var(--cat-card-border)",
                boxShadow: isOpen ? `0 0 0 1px ${typeStyle.accent}30` : undefined,
              }}
            >
              {/* Card header */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer select-none"
                onClick={() => setExpandedId(prev => prev === stage.id ? null : stage.id)}
              >
                {/* Stage number badge */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: typeStyle.bg, color: typeStyle.accent, border: `1.5px solid ${typeStyle.accent}40` }}
                >
                  {idx + 1}
                </div>

                {/* Name + badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm" style={{ color: "var(--cat-text)" }}>
                      {stage.nameRu || stage.name}
                    </span>
                    {stage.nameRu && stage.name !== stage.nameRu && (
                      <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>/ {stage.name}</span>
                    )}
                    <span
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide"
                      style={{ background: typeStyle.bg, color: typeStyle.accent }}
                    >
                      {typeStyle.icon}
                      {stage.type === "group" ? t("stageTypeGroupShort") : stage.type === "league" ? t("stageTypeLeague") : t("stageTypeKnockoutShort")}
                    </span>
                    <StatusChip status={stage.status} />
                  </div>
                  {/* Match count summary */}
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                    {stageMatchCount > 0
                      ? `${stageMatchCount} matches`
                      : "No matches yet"}
                  </p>
                </div>

                {/* Status actions */}
                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  {(stage.status === "pending" || stage.status === "draft") && (
                    <Btn size="xs" variant="outline" onClick={() => changeStatus(stage, "active")}>
                      <Play className="w-3 h-3" /> {t("start")}
                    </Btn>
                  )}
                  {stage.status === "active" && (
                    <Btn size="xs" variant="ghost" onClick={() => changeStatus(stage, "finished")}>
                      <CheckCircle className="w-3 h-3" /> {t("finish")}
                    </Btn>
                  )}
                </div>

                <ChevronDown
                  className="w-4 h-4 shrink-0 transition-transform duration-200"
                  style={{
                    color: isOpen ? typeStyle.accent : "var(--cat-text-muted)",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </div>

              {/* Expanded body */}
              {isOpen && (
                <div
                  className="border-t px-4 pb-5 pt-4 space-y-5"
                  style={{ borderColor: "var(--cat-card-border)" }}
                >
                  {/* Generate matches section */}
                  <GenerateMatchesSection
                    base={base}
                    stage={stage}
                    matchCount={stageMatchCount}
                    maxTeams={maxTeams}
                    onGenerated={() => { loadStages(); onStatsChange(); }}
                    formatPageHref={fmtBuilderHref}
                    onSwitchToSchedule={onSwitchToSchedule}
                  />

                  <div className="h-px" style={{ background: "var(--cat-card-border)" }} />

                  {/* Match settings (collapsible) */}
                  <CollapsibleMatchSettings
                    settings={settings}
                    onChange={patch => patchSettings(stage.id, patch)}
                  />

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Standings Table Component
// ─────────────────────────────────────────────
function StandingsTable({ rows }: { rows: StandingsRow[] }) {
  const cols = ["#", "Команда", "И", "В", "Н", "П", "ГЗ", "ГП", "РГ", "О"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} className="py-1.5 px-2 text-left font-semibold"
                style={{ color: "var(--cat-text-muted)", borderBottom: "1px solid var(--cat-card-border)" }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.teamId} className="transition-colors hover:opacity-80"
              style={{ borderBottom: "1px solid var(--cat-card-border, rgba(255,255,255,0.06))" }}>
              <td className="py-2 px-2 font-bold" style={{ color: i < 2 ? "#2BFEBA" : "var(--cat-text-muted)", width: 28 }}>
                {i + 1}
              </td>
              <td className="py-2 px-2 font-semibold max-w-[140px] truncate" style={{ color: "var(--cat-text)" }}>
                {r.teamName}
              </td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--cat-text-secondary)" }}>{r.played}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--cat-text-secondary)" }}>{r.won}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--cat-text-secondary)" }}>{r.drawn}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--cat-text-secondary)" }}>{r.lost}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--cat-text-secondary)" }}>{r.gf}</td>
              <td className="py-2 px-2 text-center" style={{ color: "var(--cat-text-secondary)" }}>{r.ga}</td>
              <td className="py-2 px-2 text-center font-medium"
                style={{ color: r.gd > 0 ? "#2BFEBA" : r.gd < 0 ? "#f87171" : "var(--cat-text-secondary)" }}>
                {r.gd > 0 ? `+${r.gd}` : r.gd}
              </td>
              <td className="py-2 px-2 text-center font-black" style={{ color: "var(--cat-text)", fontSize: "0.8rem" }}>
                {r.pts}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Generate matches section (inside expanded stage)
// ─────────────────────────────────────────────

function GenerateMatchesSection({
  base,
  stage,
  matchCount,
  maxTeams,
  onGenerated,
  formatPageHref,
  onSwitchToSchedule,
}: {
  base: string;
  stage: Stage;
  matchCount: number;
  maxTeams: number | null;
  onGenerated: () => void;
  formatPageHref: string;
  onSwitchToSchedule: () => void;
}) {
  const t = useTranslations("schedule");
  const isGroup = stage.type === "group" || stage.type === "league";

  const [slotsPerGroup, setSlotsPerGroup] = useState(4);
  const [existingGroups, setExistingGroups] = useState<{ id: number; name: string }[]>([]);
  const [existingRounds, setExistingRounds] = useState<Round[]>([]);
  const [bracketSize, setBracketSize] = useState<4 | 8 | 16 | 32>(8);
  const [thirdPlace, setThirdPlace] = useState(true);
  const [loadingStructure, setLoadingStructure] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Load structure from Format (groups for group stages, rounds for knockout)
  useEffect(() => {
    setLoadingStructure(true);
    const endpoint = isGroup
      ? `${base}/stages/${stage.id}/groups`
      : `${base}/stages/${stage.id}/rounds`;
    fetch(endpoint)
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: number; name: string }[] | Round[]) => {
        if (isGroup) {
          const groups = data as { id: number; name: string }[];
          setExistingGroups(groups);
          // Auto-calculate slotsPerGroup if maxTeams is known
          if (maxTeams && groups.length > 0) {
            setSlotsPerGroup(Math.max(2, Math.round(maxTeams / groups.length)));
          }
        } else {
          setExistingRounds(data as Round[]);
          // Auto-set bracket size based on maxTeams
          if (maxTeams) {
            const sizes: (4 | 8 | 16 | 32)[] = [4, 8, 16, 32];
            const best = sizes.find(s => s >= maxTeams) ?? sizes[sizes.length - 1];
            setBracketSize(best);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingStructure(false));
  }, [base, stage.id, isGroup, maxTeams]);

  const hasGroups = existingGroups.length > 0;
  const hasRounds = existingRounds.length > 0;
  const matchesPerGroup = slotsPerGroup * (slotsPerGroup - 1) / 2;
  const totalGroupMatches = matchesPerGroup * existingGroups.length;

  async function generate() {
    setGenerating(true);
    setResult(null);
    try {
      // Knockout with no rounds → create bracket via template first
      if (!isGroup && !hasRounds) {
        const template = `${bracketSize}team`;
        const rr = await fetch(`${base}/stages/${stage.id}/rounds`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template }),
        });
        if (!rr.ok) {
          const d = await rr.json().catch(() => ({}));
          setResult({ ok: false, message: d.error ?? t("failedToCreateRounds") });
          return;
        }
        const newRounds = await fetch(`${base}/stages/${stage.id}/rounds`).then(r => r.ok ? r.json() : []);
        setExistingRounds(newRounds);
      }

      const body: Record<string, unknown> = { stageId: stage.id };
      if (isGroup) body.slotsPerGroup = slotsPerGroup;

      const r = await fetch(`${base}/matches/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (r.ok) {
        const count = data.generated ?? data.matches?.length ?? "?";
        setResult({ ok: true, message: `✓ ${count} ${t("matchesCreated")}` });
        onGenerated();
      } else {
        setResult({ ok: false, message: data.error ?? t("generationError") });
      }
    } catch {
      setResult({ ok: false, message: t("networkError") });
    } finally {
      setGenerating(false);
    }
  }

  const canGenerate = !loadingStructure && (!isGroup || hasGroups);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
          {t("genTitle")}
        </p>
        {matchCount > 0 && (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "rgba(43,254,186,0.1)", color: "#2BFEBA" }}>
            {matchCount} {t("matchesReady")}
          </span>
        )}
      </div>

      {loadingStructure ? (
        <div className="flex items-center gap-2 py-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--cat-text-muted)" }} />
          <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("loadingStructure")}</span>
        </div>
      ) : isGroup ? (
        /* ── Group stage ── */
        hasGroups ? (
          <div className="rounded-xl border p-3 space-y-3"
            style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
            {/* Existing groups — read-only, managed in Format */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[11px] font-semibold" style={{ color: "var(--cat-text-muted)" }}>{t("groups")}</p>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
                  style={{ background: "rgba(43,254,186,0.1)", color: "#2BFEBA" }}>
                  {t("fromFormat")}
                </span>
                <Link href={formatPageHref}
                  className="text-[9px] ml-auto opacity-60 hover:opacity-100 transition-opacity underline"
                  style={{ color: "var(--cat-text-muted)" }}>
                  {t("editInFormat")}
                </Link>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {existingGroups.map(g => (
                  <span key={g.id} className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}>
                    {t("group")} {g.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Slots per group (scheduling param, not stored in Format) */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[11px] font-semibold" style={{ color: "var(--cat-text-muted)" }}>
                  {t("slotsPerGroupLabel")}
                </p>
                {maxTeams && existingGroups.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(43,254,186,0.1)", color: "#2BFEBA" }}>
                    {maxTeams} ком. ÷ {existingGroups.length} гр.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[2, 3, 4, 5, 6, 7, 8].map(n => {
                  const recommended = maxTeams && existingGroups.length > 0
                    ? Math.round(maxTeams / existingGroups.length) === n
                    : false;
                  return (
                    <button key={n} onClick={() => setSlotsPerGroup(n)}
                      className="w-8 h-8 rounded-lg text-xs font-bold transition-all relative"
                      style={slotsPerGroup === n ? {
                        background: "var(--cat-accent)", color: "#000",
                        boxShadow: "0 0 8px rgba(43,254,186,0.4)",
                      } : {
                        background: recommended ? "rgba(43,254,186,0.08)" : "var(--cat-card-bg)",
                        color: recommended ? "#2BFEBA" : "var(--cat-text-secondary)",
                        border: `1px solid ${recommended ? "rgba(43,254,186,0.3)" : "var(--cat-card-border)"}`,
                      }}>
                      {n}
                    </button>
                  );
                })}
                <span className="text-xs ml-2" style={{ color: "var(--cat-text-muted)" }}>
                  → {matchesPerGroup} {t("matchesPerGroupInfo")} · {totalGroupMatches} {t("matchesTotal")}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* No groups — redirect to Format to configure */
          <div className="rounded-xl border p-3 flex items-center gap-3"
            style={{ background: "rgba(245,158,11,0.05)", borderColor: "rgba(245,158,11,0.3)" }}>
            <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "#f59e0b" }} />
            <div className="flex-1">
              <p className="text-xs font-bold" style={{ color: "var(--cat-text)" }}>{t("noGroupsConfigured")}</p>
              <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                {t("noGroupsHint")}
              </p>
            </div>
            <Link href={formatPageHref}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
              style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
              {t("goToFormat")}
            </Link>
          </div>
        )
      ) : (
        /* ── Knockout stage ── */
        hasRounds ? (
          /* Rounds from Format — read-only */
          <div className="rounded-xl border p-3"
            style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-[11px] font-semibold" style={{ color: "var(--cat-text-muted)" }}>{t("playoffRounds")}</p>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
                style={{ background: "rgba(43,254,186,0.1)", color: "#2BFEBA" }}>
                {t("fromFormat")}
              </span>
              <Link href={formatPageHref}
                className="text-[9px] ml-auto opacity-60 hover:opacity-100 transition-opacity underline"
                style={{ color: "var(--cat-text-muted)" }}>
                {t("editInFormat")}
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[...existingRounds].sort((a, b) => b.order - a.order).map(r => (
                <span key={r.id} className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: "var(--cat-card-bg)", color: "var(--cat-text)", border: "1px solid var(--cat-card-border)" }}>
                  {r.shortName ?? r.name}
                  <span className="ml-1 font-normal text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                    {r.matchCount}м
                  </span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          /* No rounds → show bracket size picker, rounds created on generate */
          <div className="rounded-xl border p-3 space-y-3"
            style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
            <div>
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
                {t("bracketSizeLabel")}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {([4, 8, 16, 32] as const).map(n => {
                  const tooLarge = maxTeams !== null && n > maxTeams * 2;
                  return (
                    <button key={n} onClick={() => { if (!tooLarge) setBracketSize(n); }}
                      disabled={tooLarge}
                      className="px-3 h-8 rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      style={bracketSize === n ? {
                        background: "var(--cat-accent)", color: "#000",
                      } : {
                        background: "var(--cat-card-bg)", color: "var(--cat-text-secondary)",
                        border: "1px solid var(--cat-card-border)",
                      }}>
                      {n} {t("teamsCount")}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={thirdPlace} onChange={e => setThirdPlace(e.target.checked)}
                className="rounded" style={{ accentColor: "var(--cat-accent)" }} />
              <span className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>{t("thirdPlaceMatch")}</span>
            </label>
          </div>
        )
      )}

      {/* Generate button */}
      <div className="flex items-center gap-3 flex-wrap">
        <Btn onClick={generate} loading={generating} variant="primary" size="md" disabled={!canGenerate}>
          <Zap className="w-3.5 h-3.5" />
          {matchCount > 0
            ? t("regenerate")
            : isGroup
              ? `${t("createBracket")} (${totalGroupMatches || "?"})`
              : hasRounds
                ? t("createBracket")
                : `${t("createBracket")} (${bracketSize})`
          }
        </Btn>
        {matchCount > 0 && (
          <span className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
            {t("willReplace")}
          </span>
        )}
      </div>

      {result && (
        <div className="space-y-2">
          <div className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2"
            style={result.ok ? {
              background: "var(--badge-success-bg)", color: "var(--badge-success-text)",
            } : {
              background: "var(--badge-error-bg)", color: "var(--badge-error-text)",
            }}>
            {result.ok
              ? <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
            {result.message}
          </div>

          {/* Hint to go to Schedule tab after successful generation */}
          {result.ok && (
            <div className="rounded-xl border px-4 py-3 flex items-center gap-3"
              style={{
                background: "linear-gradient(135deg, rgba(43,254,186,0.06), rgba(43,254,186,0.02))",
                borderColor: "rgba(43,254,186,0.2)",
              }}>
              <Sparkles className="w-4 h-4 shrink-0" style={{ color: "#2BFEBA" }} />
              <p className="text-xs flex-1" style={{ color: "var(--cat-text-muted)" }}>
                {t("generatedHint")}
              </p>
              <button
                onClick={onSwitchToSchedule}
                className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 transition-all hover:opacity-80"
                style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}>
                {t("goToScheduleTab")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Collapsible match settings
// ─────────────────────────────────────────────

function CollapsibleMatchSettings({
  settings,
  onChange,
}: {
  settings: StageSettings;
  onChange: (patch: Partial<StageSettings>) => void;
}) {
  const t = useTranslations("schedule");
  const [open, setOpen] = useState(false);
  const [customDuration, setCustomDuration] = useState("");
  const totalMatchMinutes = settings.halves * settings.halfDuration + (settings.halves > 1 ? settings.halfBreak : 0);
  const totalSlotMinutes = totalMatchMinutes + settings.breakBetweenMatches;

  const PRESET_DURATIONS = [10, 12, 15, 20, 25, 30, 40, 45];

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide transition-opacity hover:opacity-70"
        style={{ color: "var(--cat-text-muted)" }}
      >
        <ChevronRight
          className="w-3.5 h-3.5 transition-transform duration-150"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        />
        {t("matchSettings")}
        {!open && (
          <span className="normal-case font-normal ml-1">
            · {settings.halves}×{settings.halfDuration}{t("minSuffix")}
            {settings.halves > 1 && settings.halfBreak > 0 && `, перерыв ${settings.halfBreak}${t("minSuffix")}`}
            {settings.breakBetweenMatches > 0 && `, +${settings.breakBetweenMatches}${t("minSuffix")} ${t("break")}`}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-3 pl-1">
          {/* Halves count */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs w-44 shrink-0" style={{ color: "var(--cat-text-secondary)" }}>{t("halves")}</span>
            <PillGroup<number>
              options={[1, 2]}
              value={settings.halves}
              onChange={v => onChange({ halves: v })}
              suffix={` ${t("halfSuffix")}`}
            />
          </div>

          {/* Half duration — presets + custom input */}
          <div className="flex items-start gap-3 flex-wrap">
            <span className="text-xs w-44 shrink-0 pt-1" style={{ color: "var(--cat-text-secondary)" }}>{t("halfDuration")}</span>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1 flex-wrap">
                {PRESET_DURATIONS.map(n => (
                  <button key={n} onClick={() => { onChange({ halfDuration: n }); setCustomDuration(""); }}
                    className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                    style={settings.halfDuration === n && !customDuration ? {
                      background: "var(--cat-accent)", color: "var(--cat-accent-text)",
                      boxShadow: "0 0 8px var(--cat-accent-glow, rgba(0,200,150,0.3))",
                    } : {
                      background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)",
                      border: "1px solid var(--cat-card-border)",
                    }}>
                    {n}{t("minSuffix")}
                  </button>
                ))}
              </div>
              {/* Custom value input */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1} max={90}
                  value={customDuration}
                  onChange={e => {
                    setCustomDuration(e.target.value);
                    const v = parseInt(e.target.value);
                    if (v >= 1 && v <= 90) onChange({ halfDuration: v });
                  }}
                  placeholder={t("customMinutes")}
                  className="rounded-lg px-2 py-1 text-xs outline-none w-24"
                  style={{
                    background: "var(--cat-input-bg, var(--cat-card-bg))",
                    border: `1px solid ${customDuration ? "var(--cat-accent)" : "var(--cat-card-border)"}`,
                    color: "var(--cat-text)",
                  }}
                />
                <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("minSuffix")}</span>
              </div>
            </div>
          </div>

          {/* Half-time break (only if 2 halves) */}
          {settings.halves > 1 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs w-44 shrink-0" style={{ color: "var(--cat-text-secondary)" }}>{t("halfBreak")}</span>
              <PillGroup<number>
                options={[0, 5, 10, 15, 20]}
                value={settings.halfBreak}
                onChange={v => onChange({ halfBreak: v })}
                suffix={` ${t("minSuffix")}`}
              />
            </div>
          )}

          {/* Break between matches */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs w-44 shrink-0" style={{ color: "var(--cat-text-secondary)" }}>{t("breakBetweenMatches")}</span>
            <PillGroup<number>
              options={[0, 5, 10, 15, 20]}
              value={settings.breakBetweenMatches}
              onChange={v => onChange({ breakBetweenMatches: v })}
              suffix={` ${t("minSuffix")}`}
            />
          </div>

          {/* Total summary */}
          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
            style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}>
            <span style={{ color: "var(--cat-text-muted)" }}>{t("total")}:</span>
            <span className="font-bold" style={{ color: "var(--cat-accent)" }}>
              {totalMatchMinutes}{t("minSuffix")} {t("match")}
            </span>
            <span style={{ color: "var(--cat-text-muted)" }}>
              + {settings.breakBetweenMatches}{t("minSuffix")} {t("break")} =
            </span>
            <span className="font-black" style={{ color: "var(--cat-text)" }}>
              {totalSlotMinutes} {t("minPerSlot")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Groups summary (read-only inside Structure tab)
// ─────────────────────────────────────────────

function GroupsSummary({ base, stage }: { base: string; stage: Stage }) {
  const t = useTranslations("schedule");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${base}/stages/${stage.id}/groups`)
      .then(r => r.ok ? r.json() : [])
      .then(setGroups)
      .finally(() => setLoading(false));
  }, [base, stage.id]);

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--cat-text-muted)" }}>
        {t("groups")}
      </p>
      {loading && <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("loading")}</p>}
      {!loading && groups.length === 0 && (
        <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("noGroups")}</p>
      )}
      {!loading && groups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {groups.map(g => (
            <div
              key={g.id}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "var(--badge-info-bg, rgba(59,130,246,0.1))", color: "var(--badge-info-text, #3b82f6)" }}
            >
              {t("group")} {g.name}
              {g.groupTeams && (
                <span className="ml-1 font-normal" style={{ color: "var(--cat-text-muted)" }}>
                  · {g.groupTeams.length} {t("teamsCount")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Rounds summary (read-only inside Structure tab)
// ─────────────────────────────────────────────

function RoundsSummary({ base, stage }: { base: string; stage: Stage }) {
  const t = useTranslations("schedule");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${base}/stages/${stage.id}/rounds`)
      .then(r => r.ok ? r.json() : [])
      .then(setRounds)
      .finally(() => setLoading(false));
  }, [base, stage.id]);

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--cat-text-muted)" }}>
        {t("rounds")}
      </p>
      {loading && <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("loading")}</p>}
      {!loading && rounds.length === 0 && (
        <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("noRounds")}</p>
      )}
      {!loading && rounds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[...rounds].sort((a, b) => b.order - a.order).map(r => (
            <div key={r.id} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)" }}>
              {r.shortName ?? r.name}
              <span className="ml-1 font-normal" style={{ color: "var(--cat-text-muted)" }}>
                ({r.matchCount} matches)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Tab 2: Draw
// ─────────────────────────────────────────────

interface DrawBasket {
  id: string;
  name: string;
  teamIds: number[];
}

const BASKET_COLORS = [
  { bg: "rgba(234,179,8,0.15)",  border: "rgba(234,179,8,0.45)",  text: "#ca8a04",  pill: "rgba(234,179,8,0.25)"  },
  { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.4)",  text: "#3b82f6",  pill: "rgba(59,130,246,0.2)"  },
  { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.4)",  text: "#10b981",  pill: "rgba(16,185,129,0.2)"  },
  { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.4)",  text: "#8b5cf6",  pill: "rgba(139,92,246,0.2)"  },
  { bg: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.4)",  text: "#ec4899",  pill: "rgba(236,72,153,0.2)"  },
];

const GROUP_COLORS = [
  { bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.3)",  text: "#3b82f6" },
  { bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)",  text: "#10b981" },
  { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)",  text: "#f59e0b" },
  { bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.3)",   text: "#ef4444" },
  { bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.3)",  text: "#8b5cf6" },
  { bg: "rgba(236,72,153,0.12)",  border: "rgba(236,72,153,0.3)",  text: "#ec4899" },
  { bg: "rgba(20,184,166,0.12)",  border: "rgba(20,184,166,0.3)",  text: "#14b8a6" },
  { bg: "rgba(249,115,22,0.12)",  border: "rgba(249,115,22,0.3)",  text: "#f97316" },
];

function DrawTab({ base, classId }: { base: string; classId: number | null }) {
  const t = useTranslations("schedule");
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [autoDrawing, setAutoDrawing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [applyingDraw, setApplyingDraw] = useState(false);
  const [applyDrawResult, setApplyDrawResult] = useState<string | null>(null);
  const [assignMap, setAssignMap] = useState<Record<number, number[]>>({});

  // Baskets (корзины посева)
  const [baskets, setBaskets] = useState<DrawBasket[]>([]);
  const [showBaskets, setShowBaskets] = useState(false);
  const [basketPopover, setBasketPopover] = useState<string | null>(null);
  const [groupPopover, setGroupPopover] = useState<number | null>(null);

  // Drag & drop — groups system (pool → groups, group → group, group → pool)
  const [groupDrag, setGroupDrag] = useState<{ teamId: number; fromGroupId: number | null } | null>(null);
  const groupDragRef = useRef<{ teamId: number; fromGroupId: number | null } | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<number | null>(null);
  const [dragOverPool, setDragOverPool] = useState(false);

  // Drag & drop — baskets system (unbasketed → basket, basket → basket, basket → unbasketed)
  const [basketDrag, setBasketDrag] = useState<{ teamId: number; fromBasketId: string | null } | null>(null);
  const basketDragRef = useRef<{ teamId: number; fromBasketId: string | null } | null>(null);
  const [dragOverBasketId, setDragOverBasketId] = useState<string | null>(null);
  const [dragOverUnbasketed, setDragOverUnbasketed] = useState(false);

  useEffect(() => {
    const stagesUrl = classId ? `${base}/stages?classId=${classId}` : `${base}/stages`;
    Promise.all([
      fetch(stagesUrl).then(r => r.ok ? r.json() : []),
      fetch(`${base}/teams${classId ? `?classId=${classId}` : ""}`).then(r => r.ok ? r.json() : []),
    ]).then(([s, tm]) => {
      const groupStages = (s as Stage[]).filter(st => st.type === "group" || st.type === "league");
      setStages(groupStages);
      setAllTeams(tm);
      if (groupStages.length > 0) setSelectedStageId(groupStages[0].id);
      setLoading(false);
    });
  }, [base, classId]);

  useEffect(() => {
    if (!selectedStageId) return;
    fetch(`${base}/stages/${selectedStageId}/groups`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Group[]) => {
        setGroups(data);
        const map: Record<number, number[]> = {};
        for (const g of data) {
          map[g.id] = (g.groupTeams ?? []).map(gt => gt.teamId);
        }
        setAssignMap(map);
      });
  }, [base, selectedStageId]);

  const assignedTeamIds = new Set(Object.values(assignMap).flat());
  const unassignedTeams = allTeams.filter(tm => !assignedTeamIds.has(tm.id));
  const basketedTeamIds = new Set(baskets.flatMap(b => b.teamIds));
  const unbasketedTeams = allTeams.filter(tm => !basketedTeamIds.has(tm.id));

  function addTeamToGroup(groupId: number, teamId: number) {
    setGroupPopover(null);
    setAssignMap(prev => ({
      ...prev,
      [groupId]: [...(prev[groupId] ?? []), teamId],
    }));
  }

  function removeTeamFromGroup(groupId: number, teamId: number) {
    setAssignMap(prev => ({
      ...prev,
      [groupId]: (prev[groupId] ?? []).filter(id => id !== teamId),
    }));
  }

  async function saveGroupTeams(groupId: number) {
    setSaving(groupId);
    try {
      await fetch(`${base}/stages/${selectedStageId}/groups/${groupId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamIds: assignMap[groupId] ?? [], mode: "replace" }),
      });
    } finally {
      setSaving(null);
    }
  }

  // Basket helpers
  function addBasket() {
    const id = `b${Date.now()}`;
    setBaskets(prev => [...prev, { id, name: `Корзина ${prev.length + 1}`, teamIds: [] }]);
    setShowBaskets(true);
  }

  function removeBasket(basketId: string) {
    setBaskets(prev => prev.filter(b => b.id !== basketId));
  }

  function addTeamToBasket(basketId: string, teamId: number) {
    setBasketPopover(null);
    setBaskets(prev => prev.map(b =>
      b.id === basketId ? { ...b, teamIds: [...b.teamIds, teamId] } : b
    ));
  }

  function removeTeamFromBasket(basketId: string, teamId: number) {
    setBaskets(prev => prev.map(b =>
      b.id === basketId ? { ...b, teamIds: b.teamIds.filter(id => id !== teamId) } : b
    ));
  }

  // ── Group drag handlers ──
  function onGroupDragStart(e: React.DragEvent, teamId: number, fromGroupId: number | null) {
    // setData is required for Firefox + prevents browser from blocking drag
    e.dataTransfer.setData("text/plain", `group:${teamId}:${fromGroupId ?? "pool"}`);
    e.dataTransfer.effectAllowed = "move";
    const val = { teamId, fromGroupId };
    groupDragRef.current = val;
    setGroupDrag(val);
  }
  function onGroupDragEnd() {
    groupDragRef.current = null;
    setGroupDrag(null);
    setDragOverGroupId(null);
    setDragOverPool(false);
  }
  function onDropToGroup(e: React.DragEvent, targetGroupId: number) {
    e.preventDefault();
    const drag = groupDragRef.current;
    if (!drag) return;
    const { teamId, fromGroupId } = drag;
    if (fromGroupId === targetGroupId) { onGroupDragEnd(); return; }
    setAssignMap(prev => {
      const next = { ...prev };
      if (fromGroupId !== null) {
        next[fromGroupId] = (next[fromGroupId] ?? []).filter(id => id !== teamId);
      }
      next[targetGroupId] = [...(next[targetGroupId] ?? []), teamId];
      return next;
    });
    onGroupDragEnd();
  }
  function onDropToPool(e: React.DragEvent) {
    e.preventDefault();
    const drag = groupDragRef.current;
    if (!drag || drag.fromGroupId === null) { onGroupDragEnd(); return; }
    removeTeamFromGroup(drag.fromGroupId, drag.teamId);
    onGroupDragEnd();
  }

  // ── Basket drag handlers ──
  function onBasketDragStart(e: React.DragEvent, teamId: number, fromBasketId: string | null) {
    e.dataTransfer.setData("text/plain", `basket:${teamId}:${fromBasketId ?? "none"}`);
    e.dataTransfer.effectAllowed = "move";
    const val = { teamId, fromBasketId };
    basketDragRef.current = val;
    setBasketDrag(val);
  }
  function onBasketDragEnd() {
    basketDragRef.current = null;
    setBasketDrag(null);
    setDragOverBasketId(null);
    setDragOverUnbasketed(false);
  }
  function onDropToBasket(e: React.DragEvent, targetBasketId: string) {
    e.preventDefault();
    const drag = basketDragRef.current;
    if (!drag) return;
    const { teamId, fromBasketId } = drag;
    if (fromBasketId === targetBasketId) { onBasketDragEnd(); return; }
    setBaskets(prev => prev.map(b => {
      if (b.id === fromBasketId) return { ...b, teamIds: b.teamIds.filter(id => id !== teamId) };
      if (b.id === targetBasketId) return { ...b, teamIds: [...b.teamIds, teamId] };
      return b;
    }));
    onBasketDragEnd();
  }
  function onDropToUnbasketed(e: React.DragEvent) {
    e.preventDefault();
    const drag = basketDragRef.current;
    if (!drag || drag.fromBasketId === null) { onBasketDragEnd(); return; }
    removeTeamFromBasket(drag.fromBasketId, drag.teamId);
    onBasketDragEnd();
  }

  function shuffleArr<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  async function autoDraw() {
    if (groups.length === 0 || allTeams.length === 0) return;
    setAutoDrawing(true);
    try {
      const newMap: Record<number, number[]> = {};
      const gIds = groups.map(g => g.id);
      for (const gId of gIds) newMap[gId] = [];

      // Always adds to the smallest group (among tied groups picks randomly).
      // Guarantees max difference between any two groups is always ≤ 1.
      const addBalanced = (teamId: number) => {
        const minSize = Math.min(...gIds.map(g => newMap[g].length));
        const eligible = gIds.filter(g => newMap[g].length === minSize);
        const target = eligible[Math.floor(Math.random() * eligible.length)];
        newMap[target].push(teamId);
      };

      const hasBaskets = baskets.length > 0 && baskets.some(b => b.teamIds.length > 0);

      if (hasBaskets) {
        // Seeded draw (FIFA/UEFA style):
        // Each basket: assign 1 team per group in random group-order (standard seeding).
        // Extra basket teams (basket.length > numGroups) go to smallest group.
        for (const basket of baskets) {
          if (basket.teamIds.length === 0) continue;
          const shuffledTeams = shuffleArr(basket.teamIds);
          const shuffledGIds = shuffleArr([...gIds]);
          shuffledTeams.forEach((teamId, i) => {
            if (i < shuffledGIds.length) {
              newMap[shuffledGIds[i]].push(teamId);
            } else {
              addBalanced(teamId);
            }
          });
        }
        // Remaining unbasketted teams → always fill smallest group first
        shuffleArr(unbasketedTeams).forEach(team => addBalanced(team.id));
      } else {
        // Plain balanced random draw: shuffle all teams, always put in smallest group
        shuffleArr(allTeams).forEach(team => addBalanced(team.id));
      }

      setAssignMap(newMap);
      await Promise.all(groups.map(g =>
        fetch(`${base}/stages/${selectedStageId}/groups/${g.id}/teams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamIds: newMap[g.id], mode: "replace" }),
        })
      ));
    } finally {
      setAutoDrawing(false);
    }
  }

  async function clearDraw() {
    if (!selectedStageId || groups.length === 0) return;
    setClearing(true);
    try {
      const emptyMap: Record<number, number[]> = {};
      for (const g of groups) emptyMap[g.id] = [];
      setAssignMap(emptyMap);
      await Promise.all(groups.map(g =>
        fetch(`${base}/stages/${selectedStageId}/groups/${g.id}/teams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamIds: [], mode: "replace" }),
        })
      ));
    } finally {
      setClearing(false);
    }
  }

  async function applyDraw() {
    if (!selectedStageId) return;
    setApplyingDraw(true);
    setApplyDrawResult(null);
    try {
      const res = await fetch(`${base}/stages/${selectedStageId}/apply-draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setApplyDrawResult(`✓ Жеребьёвка применена: ${data.updated} матчей обновлено`);
      } else {
        setApplyDrawResult(`Ошибка: ${data.error ?? "неизвестная ошибка"}`);
      }
    } catch {
      setApplyDrawResult("Ошибка сети");
    } finally {
      setApplyingDraw(false);
    }
  }

  if (loading) return (
    <div className="flex items-center gap-2 py-12 justify-center" style={{ color: "var(--cat-text-muted)" }}>
      <Loader2 className="w-5 h-5 animate-spin" /> {t("loading")}
    </div>
  );

  if (stages.length === 0) {
    return (
      <Card>
        <div className="text-center py-10" style={{ color: "var(--cat-text-muted)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--cat-tag-bg)" }}>
            <Shuffle className="w-8 h-8 opacity-40" />
          </div>
          <p className="font-semibold mb-1" style={{ color: "var(--cat-text)" }}>{t("noGroupStages")}</p>
          <p className="text-sm">{t("noGroupStagesHint")}</p>
        </div>
      </Card>
    );
  }

  const noTeamsRegistered = allTeams.length === 0;

  return (
    <div className="space-y-5" onClick={() => { setBasketPopover(null); setGroupPopover(null); }}>
      {/* ── Header ── */}
      <SectionHeader
        title={t("drawTitle")}
        subtitle={t("drawSubtitle")}
        action={
          <div className="flex items-center gap-2">
            {allTeams.length > 0 && groups.length > 0 && (
              <Btn variant="outline" size="sm" onClick={autoDraw} loading={autoDrawing}>
                <Shuffle className="w-3.5 h-3.5" />
                {baskets.some(b => b.teamIds.length > 0) ? "Жеребьёвка по корзинам" : "Авто-жеребьёвка"}
              </Btn>
            )}
            {Object.values(assignMap).some(ids => ids.length > 0) && (
              <Btn variant="ghost" size="sm" onClick={clearDraw} loading={clearing}>
                <Trash2 className="w-3.5 h-3.5" /> Очистить
              </Btn>
            )}
            {selectedStageId && (
              <Btn variant="primary" size="sm" onClick={applyDraw} loading={applyingDraw}>
                <Check className="w-3.5 h-3.5" /> Применить жеребьёвку
              </Btn>
            )}
            {stages.length > 1 && (
              <Select value={String(selectedStageId)} onChange={v => setSelectedStageId(parseInt(v))} className="w-48">
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            )}
          </div>
        }
      />

      {applyDrawResult && (
        <div className="rounded-2xl border px-4 py-3 flex items-center gap-3"
          style={{
            background: applyDrawResult.startsWith("✓") ? "rgba(43,254,186,0.06)" : "rgba(239,68,68,0.06)",
            borderColor: applyDrawResult.startsWith("✓") ? "rgba(43,254,186,0.25)" : "rgba(239,68,68,0.25)",
          }}>
          <p className="text-sm font-semibold"
            style={{ color: applyDrawResult.startsWith("✓") ? "#2BFEBA" : "#ef4444" }}>
            {applyDrawResult}
          </p>
          <button onClick={() => setApplyDrawResult(null)} className="ml-auto opacity-50 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {noTeamsRegistered && (
        <div className="rounded-2xl border px-4 py-3 flex items-start gap-3"
          style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.25)" }}>
          <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#f59e0b" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#f59e0b" }}>{t("drawNoTeamsTitle")}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{t("drawNoTeamsHint")}</p>
          </div>
        </div>
      )}

      {/* ── Baskets (корзины посева) ── */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Basket header row */}
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: showBaskets ? "1px solid var(--cat-card-border)" : undefined }}>
          <button
            className="flex items-center gap-2 group"
            onClick={() => setShowBaskets(p => !p)}
          >
            <ChevronDown
              className="w-4 h-4 transition-transform"
              style={{
                transform: showBaskets ? "rotate(0deg)" : "rotate(-90deg)",
                color: "var(--cat-text-muted)",
              }}
            />
            <span className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>
              Корзины посева
            </span>
            {baskets.length > 0 && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                {baskets.length}
              </span>
            )}
            <span className="text-xs opacity-0 group-hover:opacity-60 transition-opacity ml-1"
              style={{ color: "var(--cat-text-muted)" }}>
              FIFA/UEFA стиль
            </span>
          </button>
          <Btn size="xs" variant="outline" onClick={addBasket}>
            <Plus className="w-3 h-3" /> Добавить корзину
          </Btn>
        </div>

        {showBaskets && (
          <div className="p-4 space-y-3">
            {baskets.length === 0 ? (
              <div className="text-center py-5" style={{ color: "var(--cat-text-muted)" }}>
                <p className="text-xs">
                  Корзины позволяют распределить команды по уровню (посеять)
                  перед жеребьёвкой, чтобы сильные команды попали в разные группы.
                </p>
              </div>
            ) : (
              baskets.map((basket, bi) => {
                const bc = BASKET_COLORS[bi % BASKET_COLORS.length];
                const basketTeams = allTeams.filter(tm => basket.teamIds.includes(tm.id));
                // Teams available to add: not in any basket yet
                const availForBasket = unbasketedTeams;

                const isBasketOver = dragOverBasketId === basket.id;
                return (
                  <div key={basket.id}
                    className="rounded-2xl border p-3 transition-all"
                    style={{
                      background: isBasketOver ? `${bc.bg}` : bc.bg,
                      borderColor: isBasketOver ? bc.text : bc.border,
                      boxShadow: isBasketOver ? `0 0 0 2px ${bc.border}, 0 4px 16px rgba(0,0,0,0.2)` : undefined,
                      transform: isBasketOver ? "scale(1.01)" : "scale(1)",
                    }}
                    onDragOver={e => { if (!basketDragRef.current) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverBasketId(basket.id); }}
                    onDragLeave={e => { const rt = e.relatedTarget as Node | null; if (!rt || !e.currentTarget.contains(rt)) setDragOverBasketId(null); }}
                    onDrop={e => onDropToBasket(e, basket.id)}
                  >
                    {/* Basket title row */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0"
                        style={{ background: bc.text, color: "#fff" }}>
                        {bi + 1}
                      </div>
                      <input
                        className="flex-1 text-sm font-bold bg-transparent outline-none border-none"
                        style={{ color: bc.text }}
                        value={basket.name}
                        onChange={e => setBaskets(prev => prev.map(b =>
                          b.id === basket.id ? { ...b, name: e.target.value } : b
                        ))}
                      />
                      <span className="text-[11px] font-semibold" style={{ color: bc.text, opacity: 0.7 }}>
                        {basketTeams.length} команд
                      </span>
                      <button onClick={() => removeBasket(basket.id)}
                        className="opacity-40 hover:opacity-90 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--badge-error-text)" }} />
                      </button>
                    </div>

                    {/* Team chips — draggable */}
                    <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                      {basketTeams.length === 0 && isBasketOver && (
                        <span className="text-xs font-semibold" style={{ color: bc.text }}>
                          Отпустите здесь
                        </span>
                      )}
                      {basketTeams.map(team => (
                        <span key={team.id}
                          draggable
                          onDragStart={e => onBasketDragStart(e, team.id, basket.id)}
                          onDragEnd={onBasketDragEnd}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-xl font-semibold select-none"
                          style={{
                            background: "var(--cat-card-bg)",
                            color: "var(--cat-text)",
                            border: `1px solid ${bc.border}`,
                            cursor: basketDrag?.teamId === team.id ? "grabbing" : "grab",
                            opacity: basketDrag?.teamId === team.id ? 0.4 : 1,
                          }}>
                          {team.clubBadgeUrl
                            ? <img src={team.clubBadgeUrl} alt="" className="w-3.5 h-3.5 rounded object-cover shrink-0" />
                            : <div className="w-3.5 h-3.5 rounded shrink-0 flex items-center justify-center text-[8px] font-black"
                                style={{ background: bc.pill, color: bc.text }}>
                                {(team.name ?? "?")[0].toUpperCase()}
                              </div>
                          }
                          {team.name}
                          <button
                            onMouseDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); removeTeamFromBasket(basket.id, team.id); }}
                            className="opacity-40 hover:opacity-90 transition-opacity ml-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {/* Add team popover trigger */}
                      {availForBasket.length > 0 && (
                        <div className="relative" onClick={e => e.stopPropagation()}>
                          <button
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-xl font-semibold transition-opacity hover:opacity-70"
                            style={{
                              background: "var(--cat-card-bg)",
                              color: "var(--cat-text-muted)",
                              border: `1px dashed ${bc.border}`,
                            }}
                            onClick={() => setBasketPopover(basketPopover === basket.id ? null : basket.id)}
                          >
                            <Plus className="w-3 h-3" /> Добавить
                          </button>
                          {basketPopover === basket.id && (
                            <div
                              className="absolute z-30 top-full mt-1 left-0 rounded-2xl shadow-2xl border py-1.5 min-w-[200px] max-h-56 overflow-y-auto"
                              style={{ background: "var(--cat-dropdown-bg, var(--cat-card-bg))", borderColor: "var(--cat-card-border)" }}>
                              {availForBasket.map(team => (
                                <button key={team.id}
                                  className="w-full text-left px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-60 flex items-center gap-2"
                                  style={{ color: "var(--cat-text)" }}
                                  onClick={() => addTeamToBasket(basket.id, team.id)}>
                                  {team.clubBadgeUrl
                                    ? <img src={team.clubBadgeUrl} alt="" className="w-4 h-4 rounded object-cover shrink-0" />
                                    : <div className="w-4 h-4 rounded shrink-0 flex items-center justify-center text-[8px] font-black"
                                        style={{ background: bc.pill, color: bc.text }}>
                                        {(team.name ?? "?")[0].toUpperCase()}
                                      </div>
                                  }
                                  {team.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Teams not in any basket — drag source + drop zone to return */}
            {baskets.length > 0 && (unbasketedTeams.length > 0 || basketDrag?.fromBasketId !== null) && (
              <div
                className="rounded-xl border px-3 py-2.5 transition-all"
                style={{
                  borderColor: dragOverUnbasketed ? "rgba(148,163,184,0.6)" : "var(--cat-card-border)",
                  background: dragOverUnbasketed ? "rgba(148,163,184,0.08)" : "rgba(0,0,0,0.05)",
                  boxShadow: dragOverUnbasketed ? "0 0 0 2px rgba(148,163,184,0.25)" : undefined,
                }}
                onDragOver={e => { const d = basketDragRef.current; if (!d || d.fromBasketId === null) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverUnbasketed(true); }}
                onDragLeave={e => { const rt = e.relatedTarget as Node | null; if (!rt || !e.currentTarget.contains(rt)) setDragOverUnbasketed(false); }}
                onDrop={onDropToUnbasketed}
              >
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
                  Не в корзинах: {unbasketedTeams.length}
                  {dragOverUnbasketed && <span className="ml-2" style={{ color: "#94a3b8" }}>← вернуть сюда</span>}
                </p>
                <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                  {unbasketedTeams.map(tm => (
                    <span key={tm.id}
                      draggable
                      onDragStart={e => onBasketDragStart(e, tm.id, null)}
                      onDragEnd={onBasketDragEnd}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg font-semibold select-none"
                      style={{
                        background: "var(--cat-tag-bg)",
                        color: "var(--cat-text-muted)",
                        border: "1px solid var(--cat-card-border)",
                        cursor: basketDrag?.teamId === tm.id ? "grabbing" : "grab",
                        opacity: basketDrag?.teamId === tm.id ? 0.4 : 1,
                      }}>
                      {tm.name}
                    </span>
                  ))}
                  {unbasketedTeams.length === 0 && (
                    <span className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                      {dragOverUnbasketed ? "Отпустите чтобы убрать из корзины" : "Все команды в корзинах"}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Unassigned teams pool — ABOVE groups so drag goes downward ── */}
      {unassignedTeams.length > 0 && (
        <div
          className="rounded-2xl border px-4 py-4 transition-all"
          style={{
            background: dragOverPool ? "rgba(245,158,11,0.08)" : "var(--cat-card-bg)",
            borderColor: dragOverPool ? "rgba(245,158,11,0.6)" : "var(--cat-card-border)",
            boxShadow: dragOverPool ? "0 0 0 2px rgba(245,158,11,0.3)" : undefined,
          }}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverPool(true); }}
          onDragLeave={() => setDragOverPool(false)}
          onDrop={onDropToPool}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
              style={{ background: "var(--badge-warning-bg)", color: "var(--badge-warning-text)" }}>
              {unassignedTeams.length}
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>
              {t("unassignedTeams", { count: unassignedTeams.length })}
            </p>
            <span className="text-xs ml-1" style={{ color: "var(--cat-text-muted)" }}>
              — перетащите в группу ↓
            </span>
            {dragOverPool && (
              <span className="text-xs font-semibold ml-2" style={{ color: "#f59e0b" }}>← вернуть сюда</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 min-h-[32px]">
            {unassignedTeams.map(team_ => (
              <span key={team_.id}
                draggable
                onDragStart={e => onGroupDragStart(e, team_.id, null)}
                onDragEnd={onGroupDragEnd}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-semibold select-none"
                style={{
                  background: "var(--badge-warning-bg)",
                  color: "var(--badge-warning-text)",
                  border: "1px solid var(--cat-card-border)",
                  cursor: groupDrag?.teamId === team_.id ? "grabbing" : "grab",
                  opacity: groupDrag?.teamId === team_.id ? 0.4 : 1,
                  transition: "opacity 0.1s",
                }}>
                {team_.clubBadgeUrl
                  ? <img src={team_.clubBadgeUrl} alt="" className="w-3.5 h-3.5 rounded object-cover shrink-0" />
                  : <div className="w-3.5 h-3.5 rounded shrink-0 flex items-center justify-center text-[8px] font-black"
                      style={{ background: "rgba(245,158,11,0.35)", color: "var(--badge-warning-text)" }}>
                      {(team_.name ?? "?")[0].toUpperCase()}
                    </div>
                }
                {team_.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Groups grid ── */}
      {groups.length === 0 && (
        <Card>
          <div className="text-center py-8" style={{ color: "var(--cat-text-muted)" }}>
            <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-25" />
            <p className="font-semibold text-sm mb-1" style={{ color: "var(--cat-text)" }}>{t("noGroupsForDraw")}</p>
            <p className="text-xs">{t("noGroupsForDrawHint")}</p>
          </div>
        </Card>
      )}

      {/* Drag hint banner */}
      {groupDrag && (
        <div className="rounded-2xl px-4 py-2.5 flex items-center gap-2 text-xs font-semibold"
          style={{ background: "rgba(43,254,186,0.08)", borderColor: "rgba(43,254,186,0.25)", border: "1px solid" }}>
          <ArrowRight className="w-3.5 h-3.5" style={{ color: "#2BFEBA" }} />
          <span style={{ color: "#2BFEBA" }}>Отпустите над группой</span>
        </div>
      )}

      {groups.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          onClick={e => e.stopPropagation()}>
          {groups.map((group, gIdx) => {
            const teamIds = assignMap[group.id] ?? [];
            const groupTeams = allTeams.filter(tm => teamIds.includes(tm.id));
            const gc = GROUP_COLORS[gIdx % GROUP_COLORS.length];
            const isOver = dragOverGroupId === group.id;

            return (
              <div key={group.id}
                className="rounded-2xl border flex flex-col overflow-hidden"
                style={{
                  background: isOver ? gc.bg : "var(--cat-card-bg)",
                  borderColor: isOver ? gc.text : "var(--cat-card-border)",
                  boxShadow: isOver ? `0 0 0 2px ${gc.border}, 0 8px 32px rgba(0,0,0,0.25)` : undefined,
                  transform: isOver ? "scale(1.025)" : "scale(1)",
                  transition: "all 0.12s ease",
                }}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverGroupId(group.id); }}
                onDragLeave={() => setDragOverGroupId(null)}
                onDrop={e => onDropToGroup(e, group.id)}
              >
                {/* Group header */}
                <div className="px-4 pt-4 pb-3 flex items-center justify-between"
                  style={{ borderBottom: `2px solid ${isOver ? gc.text : gc.border}` }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                      style={{ background: gc.bg, color: gc.text }}>
                      {group.name.split(" ").pop()}
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--cat-text)" }}>
                        {group.name}
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                        {groupTeams.length} {t("teamsCount")}
                      </p>
                    </div>
                  </div>
                  <Btn size="xs" variant="outline" onClick={() => saveGroupTeams(group.id)} loading={saving === group.id}>
                    <Save className="w-3 h-3" /> {t("save")}
                  </Btn>
                </div>

                {/* Team list */}
                <div className="flex-1 p-3 space-y-1.5 min-h-[80px]">
                  {groupTeams.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-4 rounded-xl transition-all"
                      style={{
                        color: "var(--cat-text-muted)",
                        background: isOver ? `${gc.border}22` : "transparent",
                        border: isOver ? `2px dashed ${gc.border}` : "2px dashed transparent",
                      }}>
                      <Shield className="w-6 h-6 mb-1 opacity-25" />
                      <p className="text-[11px]">{isOver ? "Отпустите здесь" : t("noTeams")}</p>
                    </div>
                  )}
                  {groupTeams.map(team => (
                    <div key={team.id}
                      draggable
                      onDragStart={e => onGroupDragStart(e, team.id, group.id)}
                      onDragEnd={onGroupDragEnd}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-xl transition-opacity"
                      style={{
                        background: gc.bg,
                        cursor: groupDrag?.teamId === team.id ? "grabbing" : "grab",
                        opacity: groupDrag?.teamId === team.id ? 0.4 : 1,
                      }}>
                      {team.clubBadgeUrl
                        ? <img src={team.clubBadgeUrl} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                        : <div className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-[9px] font-black"
                            style={{ background: gc.text, color: "#fff" }}>
                            {(team.name ?? "?")[0].toUpperCase()}
                          </div>
                      }
                      <span className="flex-1 text-xs font-semibold truncate" style={{ color: "var(--cat-text)" }}>
                        {team.name}
                      </span>
                      <button
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); removeTeamFromGroup(group.id, team.id); }}
                        className="hover:opacity-70 transition-opacity shrink-0"
                        style={{ color: "var(--badge-error-text)" }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add team — custom dropdown */}
                {unassignedTeams.length > 0 && (
                  <div className="px-3 pb-3 relative">
                    <button
                      className="rounded-xl px-3 py-2 text-xs w-full text-left flex items-center gap-1.5 font-semibold transition-opacity hover:opacity-70"
                      style={{
                        background: "var(--cat-input-bg, var(--cat-tag-bg))",
                        border: `1px dashed ${gc.border}`,
                        color: "var(--cat-text-muted)",
                      }}
                      onClick={() => setGroupPopover(groupPopover === group.id ? null : group.id)}
                    >
                      <Plus className="w-3.5 h-3.5" style={{ color: gc.text }} />
                      {t("addTeam")}
                    </button>
                    {groupPopover === group.id && (
                      <div
                        className="absolute z-30 bottom-full mb-1 left-3 right-3 rounded-2xl shadow-2xl border py-1.5 max-h-52 overflow-y-auto"
                        style={{ background: "var(--cat-dropdown-bg, var(--cat-card-bg))", borderColor: "var(--cat-card-border)" }}>
                        {unassignedTeams.map(team_ => (
                          <button key={team_.id}
                            className="w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center gap-2 transition-opacity hover:opacity-60"
                            style={{ color: "var(--cat-text)" }}
                            onClick={() => addTeamToGroup(group.id, team_.id)}>
                            {team_.clubBadgeUrl
                              ? <img src={team_.clubBadgeUrl} alt="" className="w-4 h-4 rounded object-cover shrink-0" />
                              : <div className="w-4 h-4 rounded-md shrink-0 flex items-center justify-center text-[8px] font-black"
                                  style={{ background: gc.text, color: "#fff" }}>
                                  {(team_.name ?? "?")[0].toUpperCase()}
                                </div>
                            }
                            {team_.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Return-to-pool drop zone — shown at bottom only when dragging from a group */}
      {groupDrag?.fromGroupId !== null && groupDrag !== null && (
        <div
          className="rounded-2xl border border-dashed px-4 py-3 flex items-center gap-2 transition-all"
          style={{
            borderColor: dragOverPool ? "rgba(245,158,11,0.8)" : "rgba(245,158,11,0.35)",
            background: dragOverPool ? "rgba(245,158,11,0.1)" : "transparent",
          }}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverPool(true); }}
          onDragLeave={() => setDragOverPool(false)}
          onDrop={onDropToPool}
        >
          <ArrowRight className="w-4 h-4" style={{ color: "#f59e0b", transform: "rotate(180deg)" }} />
          <span className="text-xs font-semibold" style={{ color: "#f59e0b" }}>
            {dragOverPool ? "Отпустите — вернуть в пул" : "↩ Перетащите сюда чтобы убрать из группы"}
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Auto-scheduler panel (inside Schedule tab)
// ─────────────────────────────────────────────

type DayWindow = { id: string; date: string; startTime: string; endTime: string };
type FieldConfig = { fieldId: number; enabled: boolean; customTime: boolean; startTime: string; endTime: string };

// Площадка с привязкой к стадиону
interface ScheduleField {
  id: number;
  name: string;           // "A", "B", "Main"
  stadiumId: number | null;
  stadiumName?: string;   // "Infonet Arena"
  displayName: string;    // "Infonet Arena — A" or just "Main"
}

function buildDaysFromRange(startDate: string, endDate: string): DayWindow[] {
  const result: DayWindow[] = [];
  const cur = new Date(startDate + "T12:00:00Z");
  const end = new Date(endDate + "T12:00:00Z");
  let i = 1;
  while (cur <= end && i <= 14) {
    result.push({ id: `d${i}`, date: cur.toISOString().slice(0, 10), startTime: "10:00", endTime: "20:00" });
    cur.setUTCDate(cur.getUTCDate() + 1);
    i++;
  }
  return result.length > 0 ? result : [{ id: "d1", date: startDate, startTime: "10:00", endTime: "20:00" }];
}

function AutoSchedulerPanel({
  base,
  stageId,
  fields,
  stadiums,
  onFieldCreated,
  onScheduled,
  suggestedDuration,
  tournamentDates,
}: {
  base: string;
  stageId: number;
  fields: ScheduleField[];
  stadiums: { id: number; name: string }[];
  onFieldCreated: () => void;
  onScheduled: () => void;
  suggestedDuration?: number;
  tournamentDates?: { startDate: string; endDate: string } | null;
}) {
  const t = useTranslations("schedule");

  // Days — init from tournament dates, fallback to today
  const today = new Date().toISOString().slice(0, 10);
  const [days, setDays] = useState<DayWindow[]>(() =>
    tournamentDates?.startDate && tournamentDates?.endDate
      ? buildDaysFromRange(tournamentDates.startDate, tournamentDates.endDate)
      : [{ id: "d1", date: today, startTime: "10:00", endTime: "20:00" }]
  );

  // Re-sync when tournament dates arrive (async fetch)
  useEffect(() => {
    if (tournamentDates?.startDate && tournamentDates?.endDate) {
      setDays(buildDaysFromRange(tournamentDates.startDate, tournamentDates.endDate));
    }
  }, [tournamentDates?.startDate, tournamentDates?.endDate]);

  // Field configs (initialized from fields prop)
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  useEffect(() => {
    setFieldConfigs(fields.map(f => ({
      fieldId: f.id, enabled: true, customTime: false,
      startTime: "10:00", endTime: "20:00",
    })));
  }, [fields]);

  // Quick-add field form
  const [showAddField, setShowAddField] = useState(false);
  const [addFieldMode, setAddFieldMode] = useState<"existing" | "new">("existing");
  const [addFieldStadiumId, setAddFieldStadiumId] = useState<string>("");
  const [addFieldNewStadium, setAddFieldNewStadium] = useState("");
  const [addFieldName, setAddFieldName] = useState("");
  const [addFieldSaving, setAddFieldSaving] = useState(false);
  const [addFieldError, setAddFieldError] = useState("");

  const handleAddField = async () => {
    if (!addFieldName.trim()) { setAddFieldError("Введите название площадки"); return; }
    setAddFieldSaving(true);
    setAddFieldError("");
    try {
      let stadiumId: number | null = null;
      if (addFieldMode === "existing" && addFieldStadiumId) {
        stadiumId = parseInt(addFieldStadiumId);
      } else if (addFieldMode === "new" && addFieldNewStadium.trim()) {
        // Create stadium first
        const sRes = await fetch(`${base}/stadiums`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: addFieldNewStadium.trim() }),
        });
        if (!sRes.ok) { setAddFieldError("Ошибка создания стадиона"); setAddFieldSaving(false); return; }
        const stadium = await sRes.json();
        stadiumId = stadium.id;
      }
      if (stadiumId) {
        const fRes = await fetch(`${base}/stadiums/${stadiumId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: addFieldName.trim() }),
        });
        if (!fRes.ok) { setAddFieldError("Ошибка создания площадки"); setAddFieldSaving(false); return; }
      } else {
        setAddFieldError("Выберите или создайте стадион"); setAddFieldSaving(false); return;
      }
      // Success → reset form, reload fields
      setAddFieldName("");
      setAddFieldNewStadium("");
      setAddFieldStadiumId("");
      setShowAddField(false);
      onFieldCreated();
    } catch {
      setAddFieldError("Ошибка сети");
    } finally {
      setAddFieldSaving(false);
    }
  };

  // Group → field assignment
  const [groups, setGroups] = useState<{ id: number; name: string }[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupFieldMap, setGroupFieldMap] = useState<Record<number, number | "">>({});

  useEffect(() => {
    setLoadingGroups(true);
    fetch(`${base}/stages/${stageId}/groups`)
      .then(r => r.ok ? r.json() : [])
      .then((gs: { id: number; name: string }[]) => {
        setGroups(gs);
        const map: Record<number, number | ""> = {};
        for (const g of gs) map[g.id] = "";
        setGroupFieldMap(map);
      })
      .catch(() => {})
      .finally(() => setLoadingGroups(false));
  }, [base, stageId]);

  // Schedule params — suggestedDuration pre-fills matchDuration from CollapsibleMatchSettings
  const [matchDuration, setMatchDuration] = useState(suggestedDuration ?? 40);

  // Sync matchDuration when suggestedDuration changes (e.g., user changed settings in Structure tab)
  useEffect(() => {
    if (suggestedDuration && suggestedDuration > 0) setMatchDuration(suggestedDuration);
  }, [suggestedDuration]);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [maxPerDay, setMaxPerDay] = useState(2);
  const [overwrite, setOverwrite] = useState(false);

  const [scheduling, setScheduling] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; count?: number } | null>(null);
  const [animCount, setAnimCount] = useState(0);

  const enabledFields = fieldConfigs.filter(fc => fc.enabled);

  function addDay() {
    const lastDate = days[days.length - 1]?.date ?? today;
    const next = new Date(lastDate);
    next.setDate(next.getDate() + 1);
    const nextDate = next.toISOString().slice(0, 10);
    setDays(prev => [...prev, {
      id: `d${Date.now()}`, date: nextDate,
      startTime: days[0]?.startTime ?? "10:00",
      endTime: days[0]?.endTime ?? "20:00",
    }]);
  }

  function removeDay(id: string) {
    setDays(prev => prev.filter(d => d.id !== id));
  }

  function updateDay(id: string, patch: Partial<DayWindow>) {
    setDays(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
  }

  function updateField(fieldId: number, patch: Partial<FieldConfig>) {
    setFieldConfigs(prev => prev.map(fc => fc.fieldId === fieldId ? { ...fc, ...patch } : fc));
  }

  async function runSchedule() {
    if (days.length === 0) { setResult({ ok: false, message: t("noDays") }); return; }
    if (enabledFields.length === 0) { setResult({ ok: false, message: t("noFields") }); return; }

    setScheduling(true);
    setResult(null);

    try {
      const apiDays = days.map(d => ({ date: d.date, startTime: d.startTime, endTime: d.endTime }));
      const defaultFieldIds = enabledFields.map(fc => fc.fieldId);

      // Build groupFieldMap: groupId → fieldIds (only for groups with an explicit field assignment)
      const apiGroupFieldMap: Record<number, number[]> = {};
      for (const g of groups) {
        const assigned = groupFieldMap[g.id];
        if (assigned !== "" && assigned !== undefined) {
          apiGroupFieldMap[g.id] = [assigned as number];
        }
      }

      // Build fieldTimeOverrides: fieldId → {startTime, endTime} for fields with custom time
      const apiFieldTimeOverrides: Record<number, { startTime: string; endTime: string }> = {};
      for (const fc of fieldConfigs) {
        if (fc.enabled && fc.customTime) {
          apiFieldTimeOverrides[fc.fieldId] = { startTime: fc.startTime, endTime: fc.endTime };
        }
      }

      // Single API call — backend handles all groups with global slot state
      const r = await fetch(`${base}/matches/auto-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageId,
          fieldIds: defaultFieldIds,
          days: apiDays,
          groupFieldMap: Object.keys(apiGroupFieldMap).length > 0 ? apiGroupFieldMap : undefined,
          fieldTimeOverrides: Object.keys(apiFieldTimeOverrides).length > 0 ? apiFieldTimeOverrides : undefined,
          matchDurationMinutes: matchDuration,
          breakBetweenMatchesMinutes: breakMinutes,
          maxMatchesPerTeamPerDay: maxPerDay,
          overwriteScheduled: overwrite,
        }),
      });

      const data = await r.json();

      if (!r.ok) {
        setResult({ ok: false, message: data.error ?? t("scheduleFail") });
      } else {
        const totalUpdated = data.updated ?? 0;
        setResult({ ok: true, message: `${t("scheduleSuccess")}`, count: totalUpdated });
        // Animate counter 0 → totalUpdated
        setAnimCount(0);
        const step = Math.max(1, Math.ceil(totalUpdated / 30));
        let cur = 0;
        const timer = setInterval(() => {
          cur = Math.min(cur + step, totalUpdated);
          setAnimCount(cur);
          if (cur >= totalUpdated) clearInterval(timer);
        }, 30);
        onScheduled();
      }
    } catch {
      setResult({ ok: false, message: t("networkError") });
    } finally {
      setScheduling(false);
    }
  }

  const iStyle: React.CSSProperties = {
    background: "var(--cat-input-bg, var(--cat-card-bg))",
    border: "1px solid var(--cat-card-border)",
    color: "var(--cat-text)",
    borderRadius: "8px",
    padding: "6px 10px",
    fontSize: "13px",
  };

  return (
    <div className="rounded-2xl border p-5 space-y-5"
      style={{ background: "rgba(43,254,186,0.03)", borderColor: "rgba(43,254,186,0.2)" }}>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(43,254,186,0.12)" }}>
          <Zap className="w-4 h-4" style={{ color: "#2BFEBA" }} />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{t("autoSchedulerTitle")}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{t("autoSchedulerHint")}</p>
        </div>
      </div>

      {/* ── 1. Дни проведения ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
            📅 {t("days")}
          </p>
          <button onClick={addDay}
            className="text-[11px] font-bold px-2 py-1 rounded-lg transition-all hover:opacity-80"
            style={{ background: "rgba(43,254,186,0.1)", color: "#2BFEBA" }}>
            {t("addDay")}
          </button>
        </div>
        <div className="space-y-2">
          {days.map(day => (
            <div key={day.id} className="flex items-center gap-2 flex-wrap rounded-xl p-2"
              style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}>
              <input type="date" value={day.date} onChange={e => updateDay(day.id, { date: e.target.value })}
                style={iStyle} />
              <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("from")}</span>
              <input type="time" value={day.startTime} onChange={e => updateDay(day.id, { startTime: e.target.value })}
                style={{ ...iStyle, width: "110px" }} />
              <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("to")}</span>
              <input type="time" value={day.endTime} onChange={e => updateDay(day.id, { endTime: e.target.value })}
                style={{ ...iStyle, width: "110px" }} />
              {days.length > 1 && (
                <button onClick={() => removeDay(day.id)}
                  className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
                  style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)" }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. Поля ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
            🏟️ {t("fieldsSection")}
          </p>
          <button
            onClick={() => { setShowAddField(v => !v); setAddFieldError(""); }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all"
            style={{
              background: showAddField ? "rgba(43,254,186,0.15)" : "var(--cat-tag-bg)",
              color: showAddField ? "#2BFEBA" : "var(--cat-text-secondary)",
              border: `1px solid ${showAddField ? "rgba(43,254,186,0.3)" : "var(--cat-card-border)"}`,
            }}>
            <Plus className="w-3 h-3" /> Добавить
          </button>
        </div>

        {/* Quick Add Field Form */}
        {showAddField && (
          <div className="rounded-xl p-3 mb-3 space-y-2"
            style={{ background: "rgba(43,254,186,0.04)", border: "1px solid rgba(43,254,186,0.2)" }}>
            <p className="text-[11px] font-semibold" style={{ color: "#2BFEBA" }}>Новая площадка</p>

            {/* Stadium mode toggle */}
            <div className="flex gap-1.5">
              {stadiums.length > 0 && (
                <button onClick={() => setAddFieldMode("existing")}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    background: addFieldMode === "existing" ? "rgba(43,254,186,0.15)" : "var(--cat-tag-bg)",
                    color: addFieldMode === "existing" ? "#2BFEBA" : "var(--cat-text-muted)",
                    border: `1px solid ${addFieldMode === "existing" ? "rgba(43,254,186,0.3)" : "var(--cat-card-border)"}`,
                  }}>
                  Существующий стадион
                </button>
              )}
              <button onClick={() => setAddFieldMode("new")}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background: addFieldMode === "new" ? "rgba(43,254,186,0.15)" : "var(--cat-tag-bg)",
                  color: addFieldMode === "new" ? "#2BFEBA" : "var(--cat-text-muted)",
                  border: `1px solid ${addFieldMode === "new" ? "rgba(43,254,186,0.3)" : "var(--cat-card-border)"}`,
                }}>
                + Новый стадион
              </button>
            </div>

            {/* Existing stadium select */}
            {addFieldMode === "existing" && stadiums.length > 0 && (
              <select value={addFieldStadiumId} onChange={e => setAddFieldStadiumId(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                style={{ background: "var(--cat-input-bg, #1a1f2e)", color: "var(--cat-text)", border: "1px solid var(--cat-card-border)" }}>
                <option value="">— выберите стадион —</option>
                {stadiums.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}

            {/* New stadium name */}
            {addFieldMode === "new" && (
              <input
                placeholder="Название стадиона..."
                value={addFieldNewStadium}
                onChange={e => setAddFieldNewStadium(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                style={{ background: "var(--cat-input-bg, #1a1f2e)", color: "var(--cat-text)", border: "1px solid var(--cat-card-border)" }}
              />
            )}

            {/* Field name */}
            <input
              placeholder="Название площадки (A, B, Поле 1...)"
              value={addFieldName}
              onChange={e => setAddFieldName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddField()}
              className="w-full rounded-lg px-3 py-2 text-xs outline-none"
              style={{ background: "var(--cat-input-bg, #1a1f2e)", color: "var(--cat-text)", border: "1px solid var(--cat-card-border)" }}
            />

            {addFieldError && (
              <p className="text-[11px]" style={{ color: "#ef4444" }}>{addFieldError}</p>
            )}

            <div className="flex gap-2">
              <button onClick={handleAddField} disabled={addFieldSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all disabled:opacity-50"
                style={{ background: "var(--cat-accent)", color: "#0A0E14" }}>
                {addFieldSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Создать
              </button>
              <button onClick={() => { setShowAddField(false); setAddFieldError(""); }}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all hover:opacity-70"
                style={{ color: "var(--cat-text-muted)", background: "var(--cat-tag-bg)" }}>
                Отмена
              </button>
            </div>
          </div>
        )}

        {fields.length === 0 ? (
          <div className="rounded-xl px-4 py-3 text-xs"
            style={{ background: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
            ⚠️ {t("noFieldsWarning")}
          </div>
        ) : (() => {
          // Group fields by stadium for display
          const stadiumGroups: { stadiumName: string | null; stadiumId: number | null; fields: ScheduleField[] }[] = [];
          for (const field of fields) {
            const key = field.stadiumId ?? null;
            const existing = stadiumGroups.find(g => g.stadiumId === key);
            if (existing) existing.fields.push(field);
            else stadiumGroups.push({ stadiumName: field.stadiumName ?? null, stadiumId: key, fields: [field] });
          }
          return (
            <div className="space-y-3">
              {stadiumGroups.map(group => (
                <div key={group.stadiumId ?? "standalone"}>
                  {/* Stadium header (if fields belong to a stadium) */}
                  {group.stadiumName && (
                    <div className="flex items-center gap-1.5 mb-1.5 px-1">
                      <MapPin className="w-3 h-3" style={{ color: "#ec4899" }} />
                      <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#ec4899" }}>
                        {group.stadiumName}
                      </span>
                    </div>
                  )}
                  <div className="space-y-1">
                    {group.fields.map(field => {
                      const fc = fieldConfigs.find(c => c.fieldId === field.id);
                      if (!fc) return null;
                      return (
                        <div key={fc.fieldId} className="rounded-xl border overflow-hidden"
                          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                          <div className="flex items-center gap-3 px-3 py-2.5">
                            <input type="checkbox" checked={fc.enabled}
                              onChange={e => updateField(fc.fieldId, { enabled: e.target.checked })}
                              style={{ accentColor: "#2BFEBA", width: "16px", height: "16px" }} />
                            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: fc.enabled ? "#ec4899" : "var(--cat-text-muted)" }} />
                            <span className="text-sm font-semibold flex-1" style={{ color: fc.enabled ? "var(--cat-text)" : "var(--cat-text-muted)" }}>
                              {field.displayName}
                            </span>
                            {fc.enabled && (
                              <button onClick={() => updateField(fc.fieldId, { customTime: !fc.customTime })}
                                className="text-[10px] px-2 py-0.5 rounded font-semibold transition-all"
                                style={{
                                  background: fc.customTime ? "rgba(43,254,186,0.12)" : "var(--cat-tag-bg)",
                                  color: fc.customTime ? "#2BFEBA" : "var(--cat-text-muted)",
                                  border: `1px solid ${fc.customTime ? "rgba(43,254,186,0.3)" : "var(--cat-card-border)"}`,
                                }}>
                                {t("ownTimeWindow")}
                              </button>
                            )}
                          </div>
                          {fc.enabled && fc.customTime && (() => {
                            const timeInvalid = fc.endTime <= fc.startTime;
                            return (
                              <div className="flex items-center gap-2 px-3 pb-2.5 flex-wrap">
                                <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("from")}</span>
                                <input type="time" value={fc.startTime}
                                  onChange={e => updateField(fc.fieldId, { startTime: e.target.value })}
                                  style={{ ...iStyle, width: "110px", borderColor: timeInvalid ? "#ef4444" : undefined }} />
                                <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("to")}</span>
                                <input type="time" value={fc.endTime}
                                  onChange={e => updateField(fc.fieldId, { endTime: e.target.value })}
                                  style={{ ...iStyle, width: "110px", borderColor: timeInvalid ? "#ef4444" : undefined }} />
                                {timeInvalid && (
                                  <span className="text-[11px] font-semibold" style={{ color: "#ef4444" }}>
                                    ⚠ конец раньше начала
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ── 3. Группы → Поля ── */}
      {fields.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--cat-text-muted)" }}>
            🗂️ {t("groupFieldAssignment")}
          </p>
          <p className="text-[11px] mb-2" style={{ color: "var(--cat-text-secondary)" }}>
            {t("groupFieldHint")}
          </p>
          {loadingGroups ? (
            <div className="flex items-center gap-2 py-2" style={{ color: "var(--cat-text-muted)" }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-xs">{t("groupsLoading")}</span>
            </div>
          ) : groups.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>{t("noGroupsForMapping")}</p>
          ) : (
            <div className="space-y-1.5">
              {groups.map(group => (
                <div key={group.id} className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg min-w-[80px]"
                    style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>
                    {group.name}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
                  <select value={String(groupFieldMap[group.id] ?? "")}
                    onChange={e => setGroupFieldMap(prev => ({ ...prev, [group.id]: e.target.value ? parseInt(e.target.value) : "" }))}
                    style={{ ...iStyle, flex: 1 }}>
                    <option value="">{t("allFields")}</option>
                    {enabledFields.map(fc => {
                      const field = fields.find(f => f.id === fc.fieldId);
                      return field ? <option key={fc.fieldId} value={fc.fieldId}>{field.displayName}</option> : null;
                    })}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 4. Параметры матча ── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--cat-text-muted)" }}>
          ⚙️ Параметры
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="text-[10px] block mb-1" style={{ color: "var(--cat-text-muted)" }}>
              {t("matchDuration")}, мин
              {suggestedDuration && suggestedDuration === matchDuration && (
                <span className="ml-1 text-[9px] font-semibold" style={{ color: "#2BFEBA" }}>← из настроек</span>
              )}
            </label>
            <input type="number" min={10} max={180} value={matchDuration}
              onChange={e => setMatchDuration(parseInt(e.target.value) || 40)}
              style={{ ...iStyle, width: "100%" }} />
          </div>
          <div>
            <label className="text-[10px] block mb-1" style={{ color: "var(--cat-text-muted)" }}>{t("breakBetween")}, мин</label>
            <input type="number" min={0} max={60} value={breakMinutes}
              onChange={e => setBreakMinutes(parseInt(e.target.value) || 0)}
              style={{ ...iStyle, width: "100%" }} />
          </div>
          <div>
            <label className="text-[10px] block mb-1" style={{ color: "var(--cat-text-muted)" }}>{t("maxPerDay")}</label>
            <input type="number" min={1} max={10} value={maxPerDay}
              onChange={e => setMaxPerDay(parseInt(e.target.value) || 1)}
              style={{ ...iStyle, width: "100%" }} />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs"
              style={{ color: "var(--cat-text-secondary)" }}>
              <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)}
                style={{ accentColor: "#2BFEBA" }} />
              {t("overwrite")}
            </label>
          </div>
        </div>
      </div>

      {/* Run button + Clear */}
      <div className="flex items-center gap-3 flex-wrap">
        <Btn onClick={runSchedule} loading={scheduling} variant="primary" size="md" disabled={days.length === 0 || enabledFields.length === 0}>
          <Zap className="w-4 h-4" />
          {t("runSchedule")} ({enabledFields.length} {t("fieldsSection").toLowerCase()} · {days.length} {t("days").toLowerCase()})
        </Btn>
        <Btn onClick={async () => {
          if (!confirm("Очистить всё расписание? Матчи останутся, только время и поле будут сброшены.")) return;
          setClearing(true);
          try {
            await fetch(`${base}/matches/clear-schedule`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stageId }) });
            setResult(null);
            onScheduled();
          } finally { setClearing(false); }
        }} loading={clearing} variant="ghost" size="md">
          <X className="w-4 h-4" /> Очистить расписание
        </Btn>
        {result && (
          result.ok ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "linear-gradient(135deg, rgba(43,254,186,0.15), rgba(16,185,129,0.1))",
              border: "1px solid rgba(43,254,186,0.4)",
              borderRadius: 12, padding: "8px 16px",
              animation: "scheduleSuccessPop 0.4s cubic-bezier(0.175,0.885,0.32,1.275)",
            }}>
              <CheckCircle style={{ color: "#2BFEBA", width: 18, height: 18, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, color: "rgba(43,254,186,0.7)", fontWeight: 600, letterSpacing: "0.05em" }}>
                  {result.message}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#2BFEBA", lineHeight: 1.1 }}>
                  {animCount} <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>матчей расставлено</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg"
              style={{ background: "var(--badge-error-bg)", color: "var(--badge-error-text)" }}>
              <AlertCircle className="w-3.5 h-3.5" />
              {result.message}
            </div>
          )
        )}
      </div>
      <style>{`
        @keyframes scheduleSuccessPop {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Tab 3: Schedule (was Fixtures)
// ─────────────────────────────────────────────

function PlannerBanner({ base, classId }: { base: string; classId: number | null }) {
  // Extract /org/X/admin/tournament/Y prefix from base API path
  const match = base.match(/\/api\/org\/([^/]+)\/tournament\/(\d+)/);
  const orgSlug = match?.[1] ?? "";
  const tid = match?.[2] ?? "";
  // Use absolute path to avoid relative-URL bugs when tournamentId is a path segment
  const plannerHref = tid
    ? `/org/${orgSlug}/admin/tournament/${tid}/planner${classId ? `?classId=${classId}` : ""}`
    : `planner${classId ? `?classId=${classId}` : ""}`;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border mb-3"
      style={{ background: "rgba(43,254,186,0.04)", borderColor: "rgba(43,254,186,0.2)" }}>
      <Zap className="w-4 h-4 shrink-0" style={{ color: "#2BFEBA" }} />
      <p className="text-sm" style={{ color: "var(--cat-text-secondary)" }}>
        Расписание создаётся в <b>Планировщике</b> — здесь только просмотр и ручное редактирование
      </p>
      <a href={plannerHref}
        className="ml-auto flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 transition-all hover:opacity-80 whitespace-nowrap"
        style={{ background: "var(--cat-accent)", color: "#0A0E14" }}>
        <Zap className="w-3.5 h-3.5" /> Открыть Планировщик
      </a>
    </div>
  );
}

function ScheduleTab({ base, classId, stageSettings }: { base: string; classId: number | null; stageSettings: Record<number, StageSettings> }) {
  const t = useTranslations("schedule");
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [fields, setFields] = useState<ScheduleField[]>([]);
  const [stadiums, setStadiums] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<number | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editFieldId, setEditFieldId] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [clearing, setClearing] = useState(false);
  // showAutoScheduler removed — scheduling moved to Planner page
  const [tournamentDates, setTournamentDates] = useState<{ startDate: string; endDate: string } | null>(null);

  // Load tournament dates
  useEffect(() => {
    const tidMatch = base.match(/tournament\/(\d+)/);
    const tidParam = tidMatch ? `?tournamentId=${tidMatch[1]}` : "";
    fetch(`/api/admin/tournaments${tidParam}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((d: { startDate?: string | null; endDate?: string | null } | null) => {
        if (d?.startDate && d?.endDate) {
          setTournamentDates({
            startDate: d.startDate.slice(0, 10),
            endDate: d.endDate.slice(0, 10),
          });
        }
      }).catch(() => {});
  }, [base]);

  // Stage load
  useEffect(() => {
    const url = classId ? `${base}/stages?classId=${classId}` : `${base}/stages`;
    fetch(url).then(r => r.ok ? r.json() : []).then((s: Stage[]) => {
      setStages(s);
      // Don't auto-select — show all stages grouped
      setLoading(false);
    });
  }, [base, classId]);

  // Load fields from stadiums API (grouped stadium → fields)
  const loadFields = useCallback(() => {
    fetch(`${base}/stadiums`, { credentials: "include" })
      .then(r => r.ok ? r.json() : { stadiums: [], standaloneFields: [] })
      .then((d: {
        stadiums: { id: number; name: string; fields: { id: number; name: string }[] }[];
        standaloneFields: { id: number; name: string; address?: string | null; mapUrl?: string | null }[];
      }) => {
        setStadiums((d.stadiums ?? []).map(s => ({ id: s.id, name: s.name })));
        const result: ScheduleField[] = [];
        for (const stadium of (d.stadiums ?? [])) {
          for (const field of (stadium.fields ?? [])) {
            result.push({
              id: field.id,
              name: field.name,
              stadiumId: stadium.id,
              stadiumName: stadium.name,
              displayName: `${stadium.name} — ${field.name}`,
            });
          }
        }
        for (const f of (d.standaloneFields ?? [])) {
          result.push({ id: f.id, name: f.name, stadiumId: null, displayName: f.name });
        }
        setFields(result);
      })
      .catch(() => {});
  }, [base]);

  useEffect(() => { loadFields(); }, [loadFields]);

  const loadMatches = useCallback(async () => {
    const url = classId
      ? `${base}/matches?classId=${classId}`
      : `${base}/matches`;
    const r = await fetch(url, { credentials: "include", cache: "no-store" });
    if (r.ok) {
      const data: Match[] = await r.json();
      setMatches(data);
    }
  }, [base, classId]);

  useEffect(() => { loadMatches(); }, [loadMatches]);

  // Available dates from scheduled matches (for pill navigation)
  const availableDates: string[] = Array.from(
    new Set(
      matches
        .filter(m => m.scheduledAt)
        .map(m => new Date(m.scheduledAt!).toISOString().slice(0, 10))
    )
  ).sort();

  // Filtered matches
  const filteredMatches = matches.filter(m => {
    if (selectedStageId && m.stageId !== selectedStageId) return false;
    if (dateFilter) {
      const d = m.scheduledAt ? new Date(m.scheduledAt).toISOString().slice(0, 10) : null;
      if (d !== dateFilter) return false;
    }
    if (fieldFilter) {
      if (!m.fieldId || String(m.fieldId) !== fieldFilter) return false;
    }
    return true;
  });

  const scheduledCount = filteredMatches.filter(m => m.scheduledAt).length;
  const unscheduledCount = filteredMatches.filter(m => !m.scheduledAt).length;

  // Build sections: grouped by stage → groupRound (group/league) or stage name (knockout)
  type MatchSection = { key: string; label: string; subLabel?: string; matches: Match[] };
  function buildMatchSections(ms: Match[]): MatchSection[] {
    const stageMap = new Map(stages.map(s => [s.id, s]));
    const byStage = new Map<number, Match[]>();
    for (const m of ms) {
      const sid = m.stageId ?? 0;
      if (!byStage.has(sid)) byStage.set(sid, []);
      byStage.get(sid)!.push(m);
    }
    const sortedStages = [...byStage.entries()].sort(([sidA], [sidB]) => {
      return (stageMap.get(sidA)?.order ?? 0) - (stageMap.get(sidB)?.order ?? 0);
    });
    const sections: MatchSection[] = [];
    for (const [sid, stageMatches] of sortedStages) {
      const stage = stageMap.get(sid);
      const stageType = stage?.type;
      if (stageType === "group" || stageType === "league") {
        const byRound = new Map<number, Match[]>();
        for (const m of stageMatches) {
          const r = m.groupRound ?? 0;
          if (!byRound.has(r)) byRound.set(r, []);
          byRound.get(r)!.push(m);
        }
        const sortedRounds = [...byRound.entries()].sort(([a], [b]) => a - b);
        for (const [round, roundMatches] of sortedRounds) {
          sections.push({
            key: `g:${sid}:${round}`,
            label: round > 0 ? `Тур ${round}` : (stage?.name ?? "Группа"),
            subLabel: stage?.name,
            matches: roundMatches,
          });
        }
      } else {
        sections.push({
          key: `k:${sid}`,
          label: stage?.name ?? "Плей-офф",
          matches: stageMatches,
        });
      }
    }
    return sections;
  }
  const matchSections = buildMatchSections(filteredMatches);

  // Map groupId → color (consistent across all matches, ordered by first appearance)
  const groupColorMap = (() => {
    const map = new Map<number, typeof GROUP_COLORS[0]>();
    let idx = 0;
    for (const m of matches) {
      if (m.groupId != null && !map.has(m.groupId)) {
        map.set(m.groupId, GROUP_COLORS[idx++ % GROUP_COLORS.length]);
      }
    }
    return map;
  })();

  async function saveMatchEdit(matchId: number) {
    setSavingEdit(true);
    try {
      await fetch(`${base}/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: editDate ? new Date(editDate).toISOString() : null,
          fieldId: editFieldId ? parseInt(editFieldId) : null,
        }),
      });
      setEditingMatch(null);
      await loadMatches();
    } finally {
      setSavingEdit(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--cat-input-bg, var(--cat-card-bg))",
    border: "1px solid var(--cat-card-border)",
    color: "var(--cat-text)",
  };

  if (loading) return (
    <div className="flex items-center gap-2 py-8" style={{ color: "var(--cat-text-muted)" }}>
      <Loader2 className="w-4 h-4 animate-spin" /> {t("loading")}
    </div>
  );

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t("fixturesTitle")}
        subtitle={t("fixturesSubtitle")}
        action={
          <div className="flex items-center gap-2">
            {scheduledCount > 0 && (
              <Btn variant="ghost" size="sm" loading={clearing} onClick={async () => {
                if (!confirm("Очистить всё расписание? Матчи останутся, только время и поле будут сброшены.")) return;
                setClearing(true);
                try {
                  const body = classId ? { classId } : { all: true };
                  await fetch(`${base}/matches/clear-schedule`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(body),
                  });
                  await loadMatches();
                } finally { setClearing(false); }
              }}>
                <Trash2 className="w-3.5 h-3.5" /> Очистить
              </Btn>
            )}
            <Btn onClick={loadMatches} variant="ghost" size="sm">
              <RefreshCw className="w-3.5 h-3.5" />
            </Btn>
          </div>
        }
      />

      {/* Planner banner — scheduling is done in the Planner */}
      <PlannerBanner base={base} classId={classId} />

      {/* Stage filter pills (if multiple stages) */}
      {stages.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold" style={{ color: "var(--cat-text-muted)" }}>Этап:</span>
          {stages.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStageId(selectedStageId === s.id ? null : s.id)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={
                selectedStageId === s.id
                  ? { background: "var(--cat-accent)", color: "var(--cat-accent-text)" }
                  : { background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }
              }
            >
              {s.name}
            </button>
          ))}
          {selectedStageId && (
            <button onClick={() => setSelectedStageId(null)} className="text-[11px] hover:opacity-70 underline"
              style={{ color: "var(--cat-text-muted)" }}>
              Все этапы
            </button>
          )}
        </div>
      )}

      {/* Day pills navigation */}
      {(availableDates.length > 0 || (tournamentDates?.startDate)) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <CalendarDays className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
          {/* "All days" pill */}
          <button
            onClick={() => setDateFilter("")}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
            style={
              !dateFilter
                ? { background: "var(--cat-accent)", color: "var(--cat-accent-text)" }
                : { background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }
            }
          >
            Все дни
          </button>
          {/* Day pills from actual match dates */}
          {availableDates.map(d => {
            const label = new Date(d + "T12:00:00").toLocaleDateString("ru", { day: "numeric", month: "short", weekday: "short" });
            const isActive = dateFilter === d;
            const dayScheduled = matches.filter(m => m.scheduledAt && new Date(m.scheduledAt).toISOString().slice(0, 10) === d).length;
            return (
              <button
                key={d}
                onClick={() => setDateFilter(isActive ? "" : d)}
                className="flex flex-col items-center px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={
                  isActive
                    ? { background: "var(--cat-accent)", color: "var(--cat-accent-text)" }
                    : { background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }
                }
              >
                <span>{label}</span>
                {dayScheduled > 0 && (
                  <span className="text-[9px] opacity-60 font-normal">{dayScheduled} матч.</span>
                )}
              </button>
            );
          })}
          {/* If no matches scheduled yet, show tournament start date */}
          {availableDates.length === 0 && tournamentDates?.startDate && (
            <span className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
              Матчи без дат · Турнир с {new Date(tournamentDates.startDate + "T12:00:00").toLocaleDateString("ru", { day: "numeric", month: "long" })}
            </span>
          )}
        </div>
      )}

      {/* Field filter */}
      {fields.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
          <button
            onClick={() => setFieldFilter("")}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
            style={!fieldFilter ? { background: "var(--cat-accent)", color: "var(--cat-accent-text)" } : { background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}
          >
            Все поля
          </button>
          {fields.map(f => (
            <button key={f.id}
              onClick={() => setFieldFilter(fieldFilter === String(f.id) ? "" : String(f.id))}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={
                fieldFilter === String(f.id)
                  ? { background: "var(--cat-accent)", color: "var(--cat-accent-text)" }
                  : { background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }
              }
            >
              {f.displayName}
            </button>
          ))}
        </div>
      )}

      {/* Stats row */}
      {matches.length > 0 && (
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--cat-text-muted)" }}>
          <span>Всего: <strong style={{ color: "var(--cat-text)" }}>{filteredMatches.length}</strong></span>
          {scheduledCount > 0 && <span style={{ color: "#2BFEBA" }} className="font-semibold">✓ {scheduledCount} запланировано</span>}
          {unscheduledCount > 0 && <span style={{ color: "#f59e0b" }} className="font-semibold">⏰ {unscheduledCount} без времени</span>}
        </div>
      )}

      {/* No matches */}
      {matches.length === 0 && (
        <Card>
          <div className="text-center py-10" style={{ color: "var(--cat-text-muted)" }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "var(--cat-tag-bg)" }}>
              <CalendarDays className="w-7 h-7 opacity-40" />
            </div>
            <p className="font-semibold mb-1" style={{ color: "var(--cat-text)" }}>{t("noMatches")}</p>
            <p className="text-xs">{t("noMatchesHint")}</p>
          </div>
        </Card>
      )}

      {/* Match list — grouped by tour/round */}
      {filteredMatches.length > 0 && (
        <div className="space-y-4">
          {matchSections.map(section => (
            <div key={section.key}>
              {/* Section header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full"
                  style={{ background: "var(--cat-tag-bg)" }}>
                  <span className="text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: "var(--cat-accent)" }}>
                    {section.label}
                  </span>
                  {section.subLabel && section.subLabel !== section.label && (
                    <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                      · {section.subLabel}
                    </span>
                  )}
                  <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                    {section.matches.length} матч.
                  </span>
                </div>
                <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
              </div>

              {/* Matches in this section */}
              <div className="space-y-1.5">
                {section.matches.map(match => {
                  const gc = match.groupId != null ? groupColorMap.get(match.groupId) : undefined;
                  return (
                  <div
                    key={match.id}
                    className="rounded-xl border overflow-hidden transition-all"
                    style={{
                      background: "var(--cat-card-bg)",
                      borderColor: match.scheduledAt ? (gc?.border ?? "var(--cat-card-border)") : "rgba(245,158,11,0.35)",
                      borderLeftColor: gc?.text ?? (match.scheduledAt ? "var(--cat-card-border)" : "rgba(245,158,11,0.6)"),
                      borderLeftWidth: "3px",
                    }}
                  >
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      {/* Match number */}
                      <span className="w-7 text-center text-[11px] font-bold shrink-0 tabular-nums"
                        style={{ color: gc?.text ?? "var(--cat-text-muted)" }}>
                        {match.matchNumber ?? "—"}
                      </span>

                      {/* Teams */}
                      <div className="flex-1 flex items-center gap-1.5 min-w-0 overflow-hidden">
                        {/* Home team: badge + name (right-aligned) */}
                        <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                          <span className="text-xs font-semibold truncate"
                            style={{ color: match.homeTeam ? "var(--cat-text)" : "var(--cat-text-muted)" }}>
                            {match.homeTeam?.name ?? "TBD"}
                          </span>
                          {match.homeTeam?.club?.badgeUrl
                            ? <img src={match.homeTeam.club.badgeUrl} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                            : match.homeTeam
                              ? <div className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-[9px] font-black"
                                  style={{ background: gc?.bg ?? "var(--cat-tag-bg)", color: gc?.text ?? "var(--cat-text-muted)" }}>
                                  {(match.homeTeam.name[0] ?? "?").toUpperCase()}
                                </div>
                              : <div className="w-5 h-5 rounded-md shrink-0" style={{ background: "var(--cat-tag-bg)", opacity: 0.5 }} />
                          }
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black shrink-0 tabular-nums"
                          style={{ background: gc?.bg ?? "var(--cat-tag-bg)", color: gc?.text ?? "var(--cat-text-secondary)" }}>
                          vs
                        </span>
                        {/* Away team: badge + name (left-aligned) */}
                        <div className="flex-1 flex items-center gap-1.5 min-w-0">
                          {match.awayTeam?.club?.badgeUrl
                            ? <img src={match.awayTeam.club.badgeUrl} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                            : match.awayTeam
                              ? <div className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-[9px] font-black"
                                  style={{ background: gc?.bg ?? "var(--cat-tag-bg)", color: gc?.text ?? "var(--cat-text-muted)" }}>
                                  {(match.awayTeam.name[0] ?? "?").toUpperCase()}
                                </div>
                              : <div className="w-5 h-5 rounded-md shrink-0" style={{ background: "var(--cat-tag-bg)", opacity: 0.5 }} />
                          }
                          <span className="text-xs font-semibold truncate"
                            style={{ color: match.awayTeam ? "var(--cat-text)" : "var(--cat-text-muted)" }}>
                            {match.awayTeam?.name ?? "TBD"}
                          </span>
                        </div>
                      </div>

                      {/* Field */}
                      <span className="text-[11px] shrink-0 hidden sm:block w-24 truncate text-right"
                        style={{ color: "var(--cat-text-muted)" }}>
                        {match.field?.name ?? "—"}
                      </span>

                      {/* Time: inline edit */}
                      <div className="shrink-0">
                        {editingMatch === match.id ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            <input
                              type="datetime-local"
                              value={editDate}
                              onChange={e => setEditDate(e.target.value)}
                              className="rounded-lg px-2 py-1 text-xs outline-none"
                              style={{ ...inputStyle, borderColor: "var(--cat-accent)" }}
                            />
                            {fields.length > 0 && (
                              <select
                                value={editFieldId}
                                onChange={e => setEditFieldId(e.target.value)}
                                className="rounded-lg px-2 py-1 text-xs outline-none"
                                style={inputStyle}
                              >
                                <option value="">{t("noField")}</option>
                                {fields.map(f => <option key={f.id} value={f.id}>{f.displayName}</option>)}
                              </select>
                            )}
                            <button
                              onClick={() => saveMatchEdit(match.id)}
                              className="p-1 rounded-lg hover:opacity-70 transition-opacity"
                              style={{ color: "var(--cat-accent)" }}
                            >
                              {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => setEditingMatch(null)}
                              className="p-1 rounded-lg hover:opacity-70 transition-opacity"
                              style={{ color: "var(--badge-error-text)" }}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:opacity-70 transition-opacity text-[11px]"
                            style={{
                              background: match.scheduledAt ? "var(--cat-tag-bg)" : "rgba(245,158,11,0.1)",
                              color: match.scheduledAt ? "var(--cat-text-secondary)" : "#f59e0b",
                            }}
                            onClick={() => {
                              setEditingMatch(match.id);
                              setEditDate(match.scheduledAt ? new Date(match.scheduledAt).toISOString().slice(0, 16) : "");
                              setEditFieldId(match.fieldId ? String(match.fieldId) : "");
                            }}
                          >
                            <Clock className="w-3 h-3 shrink-0" />
                            {match.scheduledAt
                              ? new Date(match.scheduledAt).toLocaleString("ru", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
                              : "—"
                            }
                            <Edit2 className="w-3 h-3 opacity-40" />
                          </button>
                        )}
                      </div>

                      {/* Status */}
                      <MatchStatusChip status={match.status} hasTime={!!match.scheduledAt && !!match.fieldId} />
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtered but no results */}
      {matches.length > 0 && filteredMatches.length === 0 && (
        <Card>
          <div className="text-center py-6" style={{ color: "var(--cat-text-muted)" }}>
            <p className="text-sm">No matches match the current filters.</p>
            <button onClick={() => { setDateFilter(""); setFieldFilter(""); }} className="text-xs mt-2 underline hover:opacity-70">
              Clear filters
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Tab 4: Results
// ─────────────────────────────────────────────

type StandingsRow = {
  teamId: number;
  teamName: string;
  groupId: number | null;
  played: number; won: number; drawn: number; lost: number;
  gf: number; ga: number; gd: number; pts: number;
};

function computeStandings(finishedMatches: Match[]): StandingsRow[] {
  const stats: Record<number, StandingsRow> = {};
  function getRow(m: Match, teamId: number, teamName: string, groupId: number | null): StandingsRow {
    if (!stats[teamId]) {
      stats[teamId] = { teamId, teamName, groupId, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    }
    return stats[teamId];
  }
  for (const m of finishedMatches) {
    if (m.homeScore == null || m.awayScore == null) continue;
    if (!m.homeTeamId || !m.awayTeamId) continue;
    const homeName = m.homeTeam?.name ?? `Team ${m.homeTeamId}`;
    const awayName = m.awayTeam?.name ?? `Team ${m.awayTeamId}`;
    const home = getRow(m, m.homeTeamId, homeName, m.groupId ?? null);
    const away = getRow(m, m.awayTeamId, awayName, m.groupId ?? null);
    home.played++; away.played++;
    home.gf += m.homeScore; home.ga += m.awayScore;
    away.gf += m.awayScore; away.ga += m.homeScore;
    if (m.homeScore > m.awayScore) { home.won++; home.pts += 3; away.lost++; }
    else if (m.homeScore < m.awayScore) { away.won++; away.pts += 3; home.lost++; }
    else { home.drawn++; home.pts++; away.drawn++; away.pts++; }
  }
  for (const r of Object.values(stats)) r.gd = r.gf - r.ga;
  return Object.values(stats).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

function ResultsTab({ base, classId }: { base: string; classId: number | null }) {
  const t = useTranslations("schedule");
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"matches" | "standings">("matches");
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "live" | "finished">("all");
  const [matches, setMatches] = useState<Match[]>([]);
  const [allFinished, setAllFinished] = useState<Match[]>([]);
  const [groups, setGroups] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<number, { home: string; away: string }>>({});
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    const url = classId ? `${base}/stages?classId=${classId}` : `${base}/stages`;
    fetch(url).then(r => r.ok ? r.json() : []).then((s: Stage[]) => {
      setStages(s);
      if (s.length > 0) setSelectedStageId(s[0].id);
      setLoading(false);
    });
  }, [base, classId]);

  const loadMatches = useCallback(async () => {
    if (!selectedStageId) return;
    const params = new URLSearchParams({ stageId: String(selectedStageId) });
    if (statusFilter !== "all") params.set("status", statusFilter);
    const r = await fetch(`${base}/matches?${params}`, { credentials: "include", cache: "no-store" });
    if (r.ok) {
      const data: Match[] = await r.json();
      setMatches(data);
      const s: Record<number, { home: string; away: string }> = {};
      for (const m of data) {
        s[m.id] = {
          home: m.homeScore != null ? String(m.homeScore) : "",
          away: m.awayScore != null ? String(m.awayScore) : "",
        };
      }
      setScores(s);
    }
  }, [base, selectedStageId, statusFilter]);

  useEffect(() => { loadMatches(); }, [loadMatches]);

  // Load all finished matches + groups for standings view
  useEffect(() => {
    if (!selectedStageId) return;
    // Always load all finished for standings computation (not affected by statusFilter)
    fetch(`${base}/matches?stageId=${selectedStageId}&status=finished`)
      .then(r => r.ok ? r.json() : [])
      .then((d: Match[]) => setAllFinished(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetch(`${base}/stages/${selectedStageId}/groups`)
      .then(r => r.ok ? r.json() : [])
      .then((g: { id: number; name: string }[]) => setGroups(Array.isArray(g) ? g : []))
      .catch(() => {});
  }, [base, selectedStageId]);

  async function saveResult(match: Match) {
    const s = scores[match.id];
    if (!s) return;
    setSaving(match.id);
    try {
      const homeScore = s.home !== "" ? parseInt(s.home) : null;
      const awayScore = s.away !== "" ? parseInt(s.away) : null;
      const status = homeScore != null && awayScore != null ? "finished" : match.status;
      await fetch(`${base}/matches/${match.id}/result`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeScore, awayScore, status }),
      });
      await loadMatches();
    } finally {
      setSaving(null);
    }
  }

  async function setLive(match: Match) {
    setSaving(match.id);
    try {
      await fetch(`${base}/matches/${match.id}/result`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "live" }),
      });
      await loadMatches();
    } finally {
      setSaving(null);
    }
  }

  if (loading) return (
    <div className="flex items-center gap-2 py-8" style={{ color: "var(--cat-text-muted)" }}>
      <Loader2 className="w-4 h-4 animate-spin" /> {t("loading")}
    </div>
  );

  const filteredMatches = matches.filter(m =>
    statusFilter === "all" ? true : m.status === statusFilter
  );

  const standings = computeStandings(allFinished);
  const selectedStage = stages.find(s => s.id === selectedStageId);
  const isGroupStage = selectedStage?.type === "group" || selectedStage?.type === "league";

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t("resultsTitle")}
        subtitle={t("resultsSubtitle")}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            {stages.length > 1 && (
              <Select value={String(selectedStageId)} onChange={v => setSelectedStageId(parseInt(v))} className="w-40">
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            )}
            {/* View mode toggle */}
            {isGroupStage && (
              <div className="flex items-center rounded-xl overflow-hidden border"
                style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>
                <button
                  onClick={() => setViewMode("matches")}
                  className="px-3 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    background: viewMode === "matches" ? "var(--cat-accent, #2BFEBA)" : "transparent",
                    color: viewMode === "matches" ? "#0a0a0a" : "var(--cat-text-secondary)",
                  }}
                >
                  <BarChart3 className="w-3 h-3 inline mr-1" /> {t("viewMatches")}
                </button>
                <button
                  onClick={() => setViewMode("standings")}
                  className="px-3 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    background: viewMode === "standings" ? "var(--cat-accent, #2BFEBA)" : "transparent",
                    color: viewMode === "standings" ? "#0a0a0a" : "var(--cat-text-secondary)",
                  }}
                >
                  <Trophy className="w-3 h-3 inline mr-1" /> {t("viewStandings")}
                </button>
              </div>
            )}
            {viewMode === "matches" && (
              <Select value={statusFilter} onChange={v => setStatusFilter(v as typeof statusFilter)} className="w-36">
                <option value="all">{t("allMatches")}</option>
                <option value="scheduled">{t("matchStatus_scheduled")}</option>
                <option value="live">{t("matchStatus_live")}</option>
                <option value="finished">{t("matchStatus_finished")}</option>
              </Select>
            )}
            <Btn onClick={loadMatches} variant="ghost" size="sm">
              <RefreshCw className="w-3.5 h-3.5" />
            </Btn>
          </div>
        }
      />

      {/* STANDINGS VIEW */}
      {viewMode === "standings" && isGroupStage && (
        <div className="space-y-4">
          {groups.length > 0 ? groups.map(grp => {
            const rows = standings.filter(r => r.groupId === grp.id);
            if (rows.length === 0) return null;
            return (
              <Card key={grp.id}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--cat-accent, #2BFEBA)" }}>
                  Группа {grp.name}
                </p>
                <StandingsTable rows={rows} />
              </Card>
            );
          }) : standings.length > 0 ? (
            <Card>
              <StandingsTable rows={standings} />
            </Card>
          ) : (
            <Card>
              <div className="text-center py-8" style={{ color: "var(--cat-text-muted)" }}>
                <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Нет завершённых матчей</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* MATCHES VIEW */}
      {viewMode === "matches" && filteredMatches.length === 0 && (
        <Card>
          <div className="text-center py-8" style={{ color: "var(--cat-text-muted)" }}>
            <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t("noMatchesToShow")}</p>
          </div>
        </Card>
      )}

      {viewMode === "matches" && <div className="space-y-2">
        {filteredMatches.map(match => {
          const score = scores[match.id] ?? { home: "", away: "" };
          const isLive = match.status === "live";
          const isFinished = match.status === "finished";

          return (
            <Card
              key={match.id}
              className={isLive ? "ring-1" : ""}
              style={isLive ? { boxShadow: "0 0 12px var(--badge-warning-bg)", outline: "1px solid var(--badge-warning-text)" } : {}}
            >
              <div className="flex items-center gap-3">
                <div className="shrink-0"><MatchStatusChip status={match.status} hasTime={!!match.scheduledAt && !!match.fieldId} /></div>
                <span className="text-xs font-bold w-6 text-center shrink-0" style={{ color: "var(--cat-text-muted)" }}>
                  #{match.matchNumber ?? "—"}
                </span>
                <div className="flex-1 text-right">
                  <span className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>
                    {match.homeTeam?.name ?? "TBD"}
                  </span>
                </div>

                {/* Score inputs */}
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number" min={0} max={99}
                    value={score.home}
                    onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...prev[match.id], home: e.target.value } }))}
                    placeholder="—"
                    className="w-10 text-center rounded-lg py-1.5 text-sm font-bold outline-none"
                    style={{ background: "var(--cat-input-bg, var(--cat-card-bg))", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}
                    disabled={isFinished}
                  />
                  <span className="text-base font-bold px-0.5" style={{ color: "var(--cat-text-muted)" }}>:</span>
                  <input
                    type="number" min={0} max={99}
                    value={score.away}
                    onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...prev[match.id], away: e.target.value } }))}
                    placeholder="—"
                    className="w-10 text-center rounded-lg py-1.5 text-sm font-bold outline-none"
                    style={{ background: "var(--cat-input-bg, var(--cat-card-bg))", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}
                    disabled={isFinished}
                  />
                </div>

                <div className="flex-1">
                  <span className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>
                    {match.awayTeam?.name ?? "TBD"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isFinished && !isLive && (
                    <Btn size="xs" variant="outline" onClick={() => setLive(match)} loading={saving === match.id}>
                      <Play className="w-3 h-3" /> {t("matchStatus_live")}
                    </Btn>
                  )}
                  {!isFinished && (
                    <Btn
                      size="xs" variant="primary"
                      onClick={() => saveResult(match)}
                      loading={saving === match.id}
                      disabled={score.home === "" || score.away === ""}
                    >
                      <Save className="w-3 h-3" /> {t("save")}
                    </Btn>
                  )}
                  {isFinished && (
                    <span style={{ color: "var(--badge-success-text)" }}>
                      <CheckCircle className="w-4 h-4" />
                    </span>
                  )}
                </div>
              </div>

              {(match.scheduledAt || match.field) && (
                <div className="flex items-center gap-3 mt-2 pt-2 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
                  {match.scheduledAt && (
                    <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(match.scheduledAt).toLocaleString("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}
                    </span>
                  )}
                  {match.field && (
                    <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                      {match.field.name}
                    </span>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>}
    </div>
  );
}
