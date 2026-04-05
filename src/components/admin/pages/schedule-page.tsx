"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTournament } from "@/lib/tournament-context";
import {
  Layers, Users, CalendarDays, Trophy,
  Plus, Trash2, ChevronRight, RefreshCw,
  Play, CheckCircle, Clock, Zap, AlertCircle,
  Edit2, Save, X, Loader2, Shield, ChevronDown, LayoutGrid,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

type StageType = "group" | "knockout" | "league";
type StageStatus = "draft" | "active" | "finished";
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
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  homeTeam?: { name: string; club?: { badgeUrl?: string | null } | null } | null;
  awayTeam?: { name: string; club?: { badgeUrl?: string | null } | null } | null;
  homeScore?: number | null;
  awayScore?: number | null;
  scheduledAt?: string | null;
  status: MatchStatus;
  fieldId?: number | null;
  field?: { name: string } | null;
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

function statusChip(status: StageStatus) {
  const map: Record<StageStatus, { label: string; color: string; bg: string }> = {
    draft:    { label: "Черновик",  color: "var(--cat-text-muted)",    bg: "var(--cat-tag-bg)" },
    active:   { label: "Активен",   color: "var(--badge-success-text)", bg: "var(--badge-success-bg)" },
    finished: { label: "Завершён",  color: "var(--cat-text-secondary)", bg: "var(--cat-card-border)" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
      style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

function matchStatusChip(status: MatchStatus) {
  const map: Record<MatchStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    scheduled:  { label: "Запланирован", color: "var(--cat-text-secondary)", bg: "var(--cat-tag-bg)",          icon: <Clock className="w-3 h-3" /> },
    live:       { label: "Live",          color: "var(--badge-warning-text)", bg: "var(--badge-warning-bg)",     icon: <Zap  className="w-3 h-3" /> },
    finished:   { label: "Завершён",      color: "var(--badge-success-text)", bg: "var(--badge-success-bg)",    icon: <CheckCircle className="w-3 h-3" /> },
    cancelled:  { label: "Отменён",       color: "var(--badge-error-text)",   bg: "var(--badge-error-bg)",      icon: <X className="w-3 h-3" /> },
    postponed:  { label: "Перенесён",     color: "var(--badge-warning-text)", bg: "var(--badge-warning-bg)",    icon: <AlertCircle className="w-3 h-3" /> },
  };
  const s = map[status] ?? map.scheduled;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
      style={{ color: s.color, background: s.bg }}>
      {s.icon}{s.label}
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
//  Main Component
// ─────────────────────────────────────────────

export function SchedulePage() {
  const ctx = useTournament();
  const orgSlug = ctx?.orgSlug ?? "";
  const tournamentId = ctx?.tournamentId ?? 0;
  const base = `/api/org/${orgSlug}/tournament/${tournamentId}`;

  const searchParams = useSearchParams();
  const classId = searchParams ? Number(searchParams.get("classId")) || null : null;
  const className = searchParams ? searchParams.get("className") || null : null;

  const [tab, setTab] = useState<"stages" | "draw" | "fixtures" | "results">("stages");

  const tabs = [
    { key: "stages"   as const, icon: <Layers className="w-4 h-4" />,       label: "Этапы" },
    { key: "draw"     as const, icon: <Users className="w-4 h-4" />,        label: "Жеребьёвка" },
    { key: "fixtures" as const, icon: <CalendarDays className="w-4 h-4" />, label: "Расписание" },
    { key: "results"  as const, icon: <Trophy className="w-4 h-4" />,       label: "Результаты" },
  ];

  const plannerHref = classId
    ? `/org/${orgSlug}/admin/tournament/${tournamentId}/planner?classId=${classId}`
    : `/org/${orgSlug}/admin/tournament/${tournamentId}/planner`;

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>
            {className ? `Расписание · ${className}` : "Расписание турнира"}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {classId
              ? "Этапы, жеребьёвка и матчи этого дивизиона"
              : "Управление этапами, жеребьёвкой, матчами и результатами"}
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
          {classId ? "Ручная корректировка" : "Открыть планировщик"}
        </Link>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit"
        style={{ background: "var(--cat-tag-bg, rgba(0,0,0,0.05))" }}>
        {tabs.map(t => (
          <TabButton
            key={t.key}
            active={tab === t.key}
            onClick={() => setTab(t.key)}
            icon={t.icon}
            label={t.label}
          />
        ))}
      </div>

      {/* Tab content */}
      {tab === "stages"   && <StagesTab   base={base} classId={classId} />}
      {tab === "draw"     && <DrawTab     base={base} classId={classId} />}
      {tab === "fixtures" && <FixturesTab base={base} classId={classId} />}
      {tab === "results"  && <ResultsTab  base={base} classId={classId} />}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Stage settings type (frontend-only)
// ─────────────────────────────────────────────

interface StageSettings {
  halves: number;
  halfDuration: number;
  breakBetweenMatches: number;
}

const DEFAULT_STAGE_SETTINGS: StageSettings = {
  halves: 2,
  halfDuration: 20,
  breakBetweenMatches: 5,
};

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
//  Tab 1: Stages
// ─────────────────────────────────────────────

function StagesTab({ base, classId }: { base: string; classId: number | null }) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Per-stage match settings (frontend-only)
  const [stageSettings, setStageSettings] = useState<Record<number, StageSettings>>({});

  // Create form state
  const [newName, setNewName] = useState("");
  const [newNameRu, setNewNameRu] = useState("");
  const [newType, setNewType] = useState<StageType>("group");

  const stagesUrl = classId ? `${base}/stages?classId=${classId}` : `${base}/stages`;

  const loadStages = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(stagesUrl);
      if (r.ok) setStages(await r.json());
    } finally {
      setLoading(false);
    }
  }, [stagesUrl]);

  useEffect(() => { loadStages(); }, [loadStages]);

  function getSettings(stageId: number): StageSettings {
    return stageSettings[stageId] ?? DEFAULT_STAGE_SETTINGS;
  }

  function patchSettings(stageId: number, patch: Partial<StageSettings>) {
    setStageSettings(prev => ({
      ...prev,
      [stageId]: { ...getSettings(stageId), ...patch },
    }));
  }

  function toggleExpand(id: number) {
    setExpandedId(prev => prev === id ? null : id);
  }

  async function createStage() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`${base}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, nameRu: newNameRu || null, type: newType, order: stages.length + 1, classId }),
      });
      if (r.ok) {
        setNewName(""); setNewNameRu(""); setNewType("group");
        setCreating(false);
        await loadStages();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteStage(id: number) {
    if (!confirm("Удалить этап?")) return;
    await fetch(`${base}/stages/${id}`, { method: "DELETE" });
    if (expandedId === id) setExpandedId(null);
    await loadStages();
  }

  async function changeStatus(stage: Stage, status: StageStatus) {
    await fetch(`${base}/stages/${stage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadStages();
  }

  if (loading) return (
    <div className="flex items-center gap-2 py-8" style={{ color: "var(--cat-text-muted)" }}>
      <Loader2 className="w-4 h-4 animate-spin" /> Загрузка...
    </div>
  );

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Этапы турнира"
        subtitle="Добавьте групповые или плей-офф этапы"
        action={
          <Btn onClick={() => setCreating(v => !v)} variant={creating ? "ghost" : "primary"}>
            {creating ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {creating ? "Отмена" : "Добавить этап"}
          </Btn>
        }
      />

      {/* Create form */}
      {creating && (
        <Card className="border-dashed" style={{ borderColor: "var(--cat-accent)", borderStyle: "dashed" }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <Input value={newName}   onChange={setNewName}   placeholder="Название (EN)" />
            <Input value={newNameRu} onChange={setNewNameRu} placeholder="Название (RU)" />
            <Select value={newType} onChange={v => setNewType(v as StageType)}>
              <option value="group">Групповой этап</option>
              <option value="knockout">Плей-офф</option>
            </Select>
          </div>
          <div className="flex gap-2">
            <Btn onClick={createStage} loading={saving}><Save className="w-3.5 h-3.5" /> Сохранить</Btn>
            <Btn onClick={() => setCreating(false)} variant="ghost">Отмена</Btn>
          </div>
        </Card>
      )}

      {/* Stages list */}
      {stages.length === 0 && !creating && (
        <Card>
          <div className="text-center py-8" style={{ color: "var(--cat-text-muted)" }}>
            <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Нет этапов. Добавьте первый этап.</p>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {stages.map((stage, idx) => {
          const isOpen = expandedId === stage.id;
          const settings = getSettings(stage.id);

          return (
            <div
              key={stage.id}
              className="rounded-xl border overflow-hidden transition-all"
              style={{ background: "var(--cat-card-bg)", borderColor: isOpen ? "var(--cat-accent)" : "var(--cat-card-border)" }}
            >
              {/* ── Collapsed header row (always visible) ── */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer select-none"
                onClick={() => toggleExpand(stage.id)}
              >
                {/* Order badge */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}
                >
                  {idx + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: "var(--cat-text)" }}>
                      {stage.nameRu || stage.name}
                    </span>
                    {stage.nameRu && stage.name !== stage.nameRu && (
                      <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>/ {stage.name}</span>
                    )}
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
                      style={{
                        background: stage.type === "group"
                          ? "var(--badge-info-bg, rgba(59,130,246,0.1))"
                          : stage.type === "league"
                          ? "rgba(251,191,36,0.12)"
                          : "var(--cat-accent-glow, rgba(0,200,150,0.1))",
                        color: stage.type === "group"
                          ? "var(--badge-info-text, #3b82f6)"
                          : stage.type === "league"
                          ? "#f59e0b"
                          : "var(--cat-accent)",
                      }}
                    >
                      {stage.type === "group" ? "Группы" : stage.type === "league" ? "Лига" : "Плей-офф"}
                    </span>
                    {statusChip(stage.status)}
                  </div>
                </div>

                {/* Action buttons (stop propagation so they don't toggle accordion) */}
                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  {stage.status === "draft" && (
                    <Btn size="xs" variant="outline" onClick={() => changeStatus(stage, "active")}>
                      <Play className="w-3 h-3" /> Запустить
                    </Btn>
                  )}
                  {stage.status === "active" && (
                    <Btn size="xs" variant="ghost" onClick={() => changeStatus(stage, "finished")}>
                      <CheckCircle className="w-3 h-3" /> Завершить
                    </Btn>
                  )}
                  <button
                    onClick={() => deleteStage(stage.id)}
                    className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                    style={{ color: "var(--badge-error-text)", background: "var(--badge-error-bg)" }}
                    title="Удалить этап"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Chevron */}
                <ChevronDown
                  className="w-4 h-4 shrink-0 transition-transform duration-200"
                  style={{
                    color: "var(--cat-text-muted)",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </div>

              {/* ── Expanded body ── */}
              {isOpen && (
                <div
                  className="border-t px-4 pb-5 pt-4 space-y-5"
                  style={{ borderColor: "var(--cat-card-border)" }}
                >
                  {/* Section A — Match Settings */}
                  <StageMatchSettings
                    settings={settings}
                    onChange={patch => patchSettings(stage.id, patch)}
                  />

                  {/* Divider */}
                  <div className="h-px" style={{ background: "var(--cat-card-border)" }} />

                  {/* Section B — Auto-schedule */}
                  <StageAutoSchedule
                    base={base}
                    stageId={stage.id}
                    settings={settings}
                  />

                  {/* Divider */}
                  <div className="h-px" style={{ background: "var(--cat-card-border)" }} />

                  {/* Section C/D — Groups or Rounds */}
                  {stage.type === "group" ? (
                    <StageGroupsSection base={base} stage={stage} />
                  ) : (
                    <StageRoundsSection base={base} stage={stage} />
                  )}
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
//  Section A: Match Settings (inside expanded stage)
// ─────────────────────────────────────────────

function StageMatchSettings({
  settings,
  onChange,
}: {
  settings: StageSettings;
  onChange: (patch: Partial<StageSettings>) => void;
}) {
  const totalMinutes = settings.halves * settings.halfDuration;

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--cat-text-muted)" }}>
        Настройки матчей
      </p>
      <div className="space-y-3">
        {/* Halves */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs w-44 shrink-0" style={{ color: "var(--cat-text-secondary)" }}>Таймы</span>
          <PillGroup<number>
            options={[1, 2]}
            value={settings.halves}
            onChange={v => onChange({ halves: v })}
            suffix=" тайм"
          />
        </div>

        {/* Half duration */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs w-44 shrink-0" style={{ color: "var(--cat-text-secondary)" }}>Длительность тайма</span>
          <PillGroup<number>
            options={[15, 20, 25, 30, 40, 45]}
            value={settings.halfDuration}
            onChange={v => onChange({ halfDuration: v })}
            suffix=" мин"
          />
        </div>

        {/* Break between matches */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs w-44 shrink-0" style={{ color: "var(--cat-text-secondary)" }}>Перерыв между матчами</span>
          <PillGroup<number>
            options={[0, 5, 10, 15]}
            value={settings.breakBetweenMatches}
            onChange={v => onChange({ breakBetweenMatches: v })}
            suffix=" мин"
          />
        </div>

        {/* Summary */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>Итого:</span>
          <span className="text-sm font-bold" style={{ color: "var(--cat-accent)" }}>
            Матч: {totalMinutes} мин
          </span>
          {settings.breakBetweenMatches > 0 && (
            <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
              + {settings.breakBetweenMatches} мин перерыв = {totalMinutes + settings.breakBetweenMatches} мин/слот
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Section B: Auto-schedule (inside expanded stage)
// ─────────────────────────────────────────────

function StageAutoSchedule({
  base,
  stageId,
  settings,
}: {
  base: string;
  stageId: number;
  settings: StageSettings;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("10:00");
  const [scheduling, setScheduling] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function runAutoSchedule() {
    if (!date || !time) return;
    setScheduling(true);
    setResult(null);
    try {
      const startAt = new Date(`${date}T${time}:00`).toISOString();
      const r = await fetch(`${base}/matches/auto-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageId,
          startAt,
          fieldId: null,
          halfDuration: settings.halfDuration,
          halves: settings.halves,
          breakBetweenMatches: settings.breakBetweenMatches,
        }),
      });
      const data = await r.json();
      if (r.ok) {
        setResult({ ok: true, message: `Готово! Обновлено матчей: ${data.updated}` });
      } else {
        setResult({ ok: false, message: data.error ?? "Ошибка генерации расписания" });
      }
    } catch {
      setResult({ ok: false, message: "Сетевая ошибка" });
    } finally {
      setScheduling(false);
    }
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--cat-text-muted)" }}>
        Авто-расписание
      </p>
      <div className="flex items-end gap-3 flex-wrap">
        {/* Date */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>Дата начала</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: "var(--cat-input-bg, var(--cat-card-bg))",
              border: "1px solid var(--cat-card-border)",
              color: "var(--cat-text)",
            }}
          />
        </div>

        {/* Time */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>Время</label>
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: "var(--cat-input-bg, var(--cat-card-bg))",
              border: "1px solid var(--cat-card-border)",
              color: "var(--cat-text)",
            }}
          />
        </div>

        {/* Field selector (placeholder — "Все поля") */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>Поле</label>
          <select
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: "var(--cat-input-bg, var(--cat-card-bg))",
              border: "1px solid var(--cat-card-border)",
              color: "var(--cat-text)",
            }}
            defaultValue=""
          >
            <option value="">Все поля</option>
          </select>
        </div>

        {/* Generate button */}
        <Btn
          onClick={runAutoSchedule}
          loading={scheduling}
          disabled={!date || !time}
          variant="primary"
          size="md"
        >
          <Zap className="w-3.5 h-3.5" />
          Сгенерировать расписание
        </Btn>
      </div>

      {/* Result message */}
      {result && (
        <div
          className="mt-3 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2"
          style={result.ok ? {
            background: "var(--badge-success-bg)",
            color: "var(--badge-success-text)",
          } : {
            background: "var(--badge-error-bg)",
            color: "var(--badge-error-text)",
          }}
        >
          {result.ok
            ? <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            : <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          }
          {result.message}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Section C: Groups (inside expanded group stage)
// ─────────────────────────────────────────────

function StageGroupsSection({ base, stage }: { base: string; stage: Stage }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupCount, setGroupCount] = useState("4");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${base}/stages/${stage.id}/groups`)
      .then(r => r.ok ? r.json() : [])
      .then(setGroups)
      .finally(() => setLoading(false));
  }, [base, stage.id]);

  async function createGroups() {
    setSaving(true);
    try {
      const r = await fetch(`${base}/stages/${stage.id}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: parseInt(groupCount) }),
      });
      if (r.ok) {
        setGroups(await r.json());
        setCreating(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
          Группы
        </p>
        {!loading && groups.length === 0 && (
          <Btn size="xs" onClick={() => setCreating(v => !v)} variant={creating ? "ghost" : "outline"}>
            <Plus className="w-3 h-3" /> Создать группы
          </Btn>
        )}
      </div>

      {creating && (
        <div className="flex items-center gap-2 mb-3">
          <select
            value={groupCount}
            onChange={e => setGroupCount(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs outline-none"
            style={{
              background: "var(--cat-input-bg, var(--cat-card-bg))",
              border: "1px solid var(--cat-card-border)",
              color: "var(--cat-text)",
            }}
          >
            {[2, 3, 4, 5, 6, 8].map(n => (
              <option key={n} value={n}>Групп: {n}</option>
            ))}
          </select>
          <Btn size="xs" onClick={createGroups} loading={saving}>
            <Save className="w-3 h-3" /> Создать
          </Btn>
          <Btn size="xs" variant="ghost" onClick={() => setCreating(false)}>Отмена</Btn>
        </div>
      )}

      {loading && (
        <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>Загрузка...</p>
      )}

      {!loading && groups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {groups.map(g => (
            <div
              key={g.id}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "var(--badge-info-bg, rgba(59,130,246,0.1))", color: "var(--badge-info-text, #3b82f6)" }}
            >
              Группа {g.name}
              {g.groupTeams && (
                <span className="ml-1 font-normal" style={{ color: "var(--cat-text-muted)" }}>
                  · {g.groupTeams.length} команд
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && groups.length === 0 && !creating && (
        <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
          Нет групп. Нажмите «Создать группы».
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Section D: Rounds (inside expanded knockout stage)
// ─────────────────────────────────────────────

function StageRoundsSection({ base, stage }: { base: string; stage: Stage }) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState("8team");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${base}/stages/${stage.id}/rounds`)
      .then(r => r.ok ? r.json() : [])
      .then(setRounds)
      .finally(() => setLoading(false));
  }, [base, stage.id]);

  async function createFromTemplate() {
    setSaving(true);
    try {
      const r = await fetch(`${base}/stages/${stage.id}/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      if (r.ok) {
        setRounds(await r.json());
        setCreating(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
          Раунды
        </p>
        {!loading && rounds.length === 0 && (
          <Btn size="xs" onClick={() => setCreating(v => !v)} variant={creating ? "ghost" : "outline"}>
            <Plus className="w-3 h-3" /> Создать раунды
          </Btn>
        )}
      </div>

      {creating && (
        <div className="flex items-center gap-2 mb-3">
          <select
            value={template}
            onChange={e => setTemplate(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs outline-none"
            style={{
              background: "var(--cat-input-bg, var(--cat-card-bg))",
              border: "1px solid var(--cat-card-border)",
              color: "var(--cat-text)",
            }}
          >
            <option value="4team">4 команды</option>
            <option value="8team">8 команд</option>
            <option value="16team">16 команд</option>
            <option value="32team">32 команды</option>
          </select>
          <Btn size="xs" onClick={createFromTemplate} loading={saving}>
            <Save className="w-3 h-3" /> Создать
          </Btn>
          <Btn size="xs" variant="ghost" onClick={() => setCreating(false)}>Отмена</Btn>
        </div>
      )}

      {loading && (
        <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>Загрузка...</p>
      )}

      {!loading && rounds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {rounds.map(r => (
            <div
              key={r.id}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)" }}
            >
              {r.shortName ?? r.name}
              <span className="ml-1 font-normal" style={{ color: "var(--cat-text-muted)" }}>
                ({r.matchCount} матч.)
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && rounds.length === 0 && !creating && (
        <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
          Нет раундов. Нажмите «Создать раунды».
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Tab 2: Draw (Жеребьевка)
// ─────────────────────────────────────────────

function DrawTab({ base, classId }: { base: string; classId: number | null }) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [assignMap, setAssignMap] = useState<Record<number, number[]>>({}); // groupId → teamIds[]

  useEffect(() => {
    const stagesUrl = classId ? `${base}/stages?classId=${classId}` : `${base}/stages`;
    Promise.all([
      fetch(stagesUrl).then(r => r.ok ? r.json() : []),
      fetch(`${base}/teams`).then(r => r.ok ? r.json() : []),
    ]).then(([s, t]) => {
      // Include both "group" and "league" stages (league also has groups/teams)
      const groupStages = (s as Stage[]).filter(st => st.type === "group" || st.type === "league");
      setStages(groupStages);
      setAllTeams(t);
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
        // Init assign map from existing groupTeams
        const map: Record<number, number[]> = {};
        for (const g of data) {
          map[g.id] = (g.groupTeams ?? []).map(gt => gt.teamId);
        }
        setAssignMap(map);
      });
  }, [base, selectedStageId]);

  const assignedTeamIds = new Set(Object.values(assignMap).flat());
  const unassignedTeams = allTeams.filter(t => !assignedTeamIds.has(t.id));

  function addTeamToGroup(groupId: number, teamId: number) {
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

  if (loading) return <div className="flex items-center gap-2 py-8" style={{ color: "var(--cat-text-muted)" }}><Loader2 className="w-4 h-4 animate-spin" /> Загрузка...</div>;

  if (stages.length === 0) {
    return (
      <Card>
        <div className="text-center py-8" style={{ color: "var(--cat-text-muted)" }}>
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Нет групповых этапов. Создайте групповой этап на вкладке «Этапы».</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Жеребьевка"
        subtitle="Распределите команды по группам"
        action={
          stages.length > 1 ? (
            <Select value={String(selectedStageId)} onChange={v => setSelectedStageId(parseInt(v))} className="w-48">
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          ) : undefined
        }
      />

      {groups.length === 0 && (
        <Card>
          <div className="text-center py-6" style={{ color: "var(--cat-text-muted)" }}>
            <p className="text-sm">Нет групп. Создайте группы на вкладке «Этапы».</p>
          </div>
        </Card>
      )}

      {groups.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {groups.map(group => {
            const teamIds = assignMap[group.id] ?? [];
            const groupTeams = allTeams.filter(t => teamIds.includes(t.id));

            return (
              <Card key={group.id} className="flex flex-col">
                {/* Group header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, var(--cat-accent), var(--cat-accent-2, var(--cat-accent)))", color: "var(--cat-accent-text)" }}>
                    {group.name}
                  </div>
                  <Btn size="xs" variant="outline" onClick={() => saveGroupTeams(group.id)} loading={saving === group.id}>
                    <Save className="w-3 h-3" /> Сохранить
                  </Btn>
                </div>

                {/* Team list */}
                <div className="flex-1 space-y-1.5 mb-3 min-h-[60px]">
                  {groupTeams.length === 0 && (
                    <p className="text-xs text-center py-3" style={{ color: "var(--cat-text-muted)" }}>Нет команд</p>
                  )}
                  {groupTeams.map(team => (
                    <div key={team.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                      style={{ background: "var(--cat-tag-bg)" }}>
                      <Shield className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-accent)" }} />
                      <span className="flex-1 text-xs truncate" style={{ color: "var(--cat-text)" }}>{team.name}</span>
                      <button onClick={() => removeTeamFromGroup(group.id, team.id)}
                        className="text-xs hover:opacity-70" style={{ color: "var(--badge-error-text)" }}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add team dropdown */}
                {unassignedTeams.length > 0 && (
                  <select
                    className="rounded-lg px-2 py-1.5 text-xs outline-none w-full"
                    style={{ background: "var(--cat-input-bg, var(--cat-card-bg))", border: "1px solid var(--cat-card-border)", color: "var(--cat-text-muted)" }}
                    value=""
                    onChange={e => { if (e.target.value) addTeamToGroup(group.id, parseInt(e.target.value)); }}
                  >
                    <option value="">+ Добавить команду</option>
                    {unassignedTeams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Unassigned teams */}
      {unassignedTeams.length > 0 && (
        <Card>
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--cat-text-muted)" }}>
            Нераспределённые команды ({unassignedTeams.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {unassignedTeams.map(t => (
              <span key={t.id} className="text-xs px-2 py-1 rounded-lg"
                style={{ background: "var(--badge-warning-bg)", color: "var(--badge-warning-text)" }}>
                {t.name}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Tab 3: Fixtures (Расписание)
// ─────────────────────────────────────────────

function FixturesTab({ base, classId }: { base: string; classId: number | null }) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState<number | null>(null);
  const [editDate, setEditDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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
    const r = await fetch(`${base}/matches?stageId=${selectedStageId}`);
    if (r.ok) setMatches(await r.json());
  }, [base, selectedStageId]);

  useEffect(() => { loadMatches(); }, [loadMatches]);

  async function generate() {
    if (!selectedStageId) return;
    setGenerating(true);
    try {
      const r = await fetch(`${base}/matches/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: selectedStageId }),
      });
      if (r.ok) {
        setShowGenModal(false);
        await loadMatches();
      }
    } finally {
      setGenerating(false);
    }
  }

  async function saveMatchEdit(matchId: number) {
    setSavingEdit(true);
    try {
      await fetch(`${base}/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: editDate ? new Date(editDate).toISOString() : null }),
      });
      setEditingMatch(null);
      await loadMatches();
    } finally {
      setSavingEdit(false);
    }
  }

  if (loading) return <div className="flex items-center gap-2 py-8" style={{ color: "var(--cat-text-muted)" }}><Loader2 className="w-4 h-4 animate-spin" /> Загрузка...</div>;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Расписание матчей"
        subtitle="Просмотр и редактирование расписания"
        action={
          <div className="flex items-center gap-2">
            {stages.length > 1 && (
              <Select value={String(selectedStageId)} onChange={v => setSelectedStageId(parseInt(v))} className="w-44">
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            )}
            <Btn onClick={() => setShowGenModal(true)} variant="primary">
              <Zap className="w-3.5 h-3.5" /> Сгенерировать
            </Btn>
          </div>
        }
      />

      {/* Generate confirmation */}
      {showGenModal && (
        <Card style={{ borderColor: "var(--cat-accent)", borderStyle: "solid" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--cat-text)" }}>Сгенерировать матчи для этапа?</p>
          <p className="text-xs mb-3" style={{ color: "var(--cat-text-muted)" }}>
            Для группового / лига-фазы будет применён алгоритм Бергера (round-robin). Для плей-офф — пустые слоты для жеребьёвки.
          </p>
          <div className="flex gap-2">
            <Btn onClick={generate} loading={generating}><Zap className="w-3.5 h-3.5" /> Сгенерировать</Btn>
            <Btn onClick={() => setShowGenModal(false)} variant="ghost">Отмена</Btn>
          </div>
        </Card>
      )}

      {matches.length === 0 && (
        <Card>
          <div className="text-center py-8" style={{ color: "var(--cat-text-muted)" }}>
            <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Нет матчей. Нажмите «Сгенерировать» или добавьте матчи вручную.</p>
          </div>
        </Card>
      )}

      {matches.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--cat-text-muted)" }}>
            <span className="w-8 text-center">#</span>
            <span>Матч</span>
            <span>Поле</span>
            <span>Время</span>
            <span>Статус</span>
          </div>

          {matches.map(match => (
            <Card key={match.id} className="!p-3">
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 items-center">
                {/* Number */}
                <span className="w-8 text-center text-xs font-bold" style={{ color: "var(--cat-text-muted)" }}>
                  {match.matchNumber ?? "—"}
                </span>

                {/* Teams */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold truncate" style={{ color: "var(--cat-text)" }}>
                    {match.homeTeam?.name ?? "TBD"}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded font-bold shrink-0"
                    style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)" }}>
                    vs
                  </span>
                  <span className="text-sm font-semibold truncate" style={{ color: "var(--cat-text)" }}>
                    {match.awayTeam?.name ?? "TBD"}
                  </span>
                </div>

                {/* Field */}
                <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                  {match.field?.name ?? "—"}
                </span>

                {/* Time */}
                <div className="text-xs shrink-0" style={{ color: "var(--cat-text-secondary)" }}>
                  {editingMatch === match.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="datetime-local"
                        value={editDate}
                        onChange={e => setEditDate(e.target.value)}
                        className="rounded px-1.5 py-1 text-xs outline-none"
                        style={{ background: "var(--cat-input-bg, var(--cat-card-bg))", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}
                      />
                      <button onClick={() => saveMatchEdit(match.id)} className="hover:opacity-70">
                        {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />}
                      </button>
                      <button onClick={() => setEditingMatch(null)} className="hover:opacity-70">
                        <X className="w-3.5 h-3.5" style={{ color: "var(--badge-error-text)" }} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1 hover:opacity-70 transition-opacity"
                      onClick={() => {
                        setEditingMatch(match.id);
                        setEditDate(match.scheduledAt ? new Date(match.scheduledAt).toISOString().slice(0, 16) : "");
                      }}
                    >
                      {match.scheduledAt
                        ? new Date(match.scheduledAt).toLocaleString("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                        : <span style={{ color: "var(--cat-text-muted)" }}>—</span>
                      }
                      <Edit2 className="w-3 h-3 opacity-50" />
                    </button>
                  )}
                </div>

                {/* Status */}
                {matchStatusChip(match.status)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Tab 4: Results (Результаты)
// ─────────────────────────────────────────────

function ResultsTab({ base, classId }: { base: string; classId: number | null }) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "live" | "finished">("all");
  const [matches, setMatches] = useState<Match[]>([]);
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
    const r = await fetch(`${base}/matches?${params}`);
    if (r.ok) {
      const data: Match[] = await r.json();
      setMatches(data);
      // Init scores
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

  if (loading) return <div className="flex items-center gap-2 py-8" style={{ color: "var(--cat-text-muted)" }}><Loader2 className="w-4 h-4 animate-spin" /> Загрузка...</div>;

  const filteredMatches = matches.filter(m =>
    statusFilter === "all" ? true : m.status === statusFilter
  );

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Результаты матчей"
        subtitle="Ввод счёта и изменение статуса матчей"
        action={
          <div className="flex items-center gap-2">
            {stages.length > 1 && (
              <Select value={String(selectedStageId)} onChange={v => setSelectedStageId(parseInt(v))} className="w-40">
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            )}
            <Select value={statusFilter} onChange={v => setStatusFilter(v as typeof statusFilter)} className="w-36">
              <option value="all">Все матчи</option>
              <option value="scheduled">Запланированные</option>
              <option value="live">Live</option>
              <option value="finished">Завершённые</option>
            </Select>
            <Btn onClick={loadMatches} variant="ghost" size="sm">
              <RefreshCw className="w-3.5 h-3.5" />
            </Btn>
          </div>
        }
      />

      {filteredMatches.length === 0 && (
        <Card>
          <div className="text-center py-8" style={{ color: "var(--cat-text-muted)" }}>
            <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Нет матчей для отображения.</p>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {filteredMatches.map(match => {
          const score = scores[match.id] ?? { home: "", away: "" };
          const isLive = match.status === "live";
          const isFinished = match.status === "finished";

          return (
            <Card key={match.id} className={isLive ? "ring-1" : ""} style={isLive ? { boxShadow: "0 0 12px var(--badge-warning-bg)", outline: "1px solid var(--badge-warning-text)" } : {}}>
              <div className="flex items-center gap-3">
                {/* Status chip */}
                <div className="shrink-0">{matchStatusChip(match.status)}</div>

                {/* Match number */}
                <span className="text-xs font-bold w-6 text-center shrink-0" style={{ color: "var(--cat-text-muted)" }}>
                  #{match.matchNumber ?? "—"}
                </span>

                {/* Home team */}
                <div className="flex-1 text-right">
                  <span className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>
                    {match.homeTeam?.name ?? "TBD"}
                  </span>
                </div>

                {/* Score input */}
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={score.home}
                    onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...prev[match.id], home: e.target.value } }))}
                    placeholder="—"
                    className="w-10 text-center rounded-lg py-1.5 text-sm font-bold outline-none"
                    style={{
                      background: "var(--cat-input-bg, var(--cat-card-bg))",
                      border: "1px solid var(--cat-card-border)",
                      color: "var(--cat-text)",
                    }}
                    disabled={isFinished}
                  />
                  <span className="text-base font-bold px-0.5" style={{ color: "var(--cat-text-muted)" }}>:</span>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={score.away}
                    onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...prev[match.id], away: e.target.value } }))}
                    placeholder="—"
                    className="w-10 text-center rounded-lg py-1.5 text-sm font-bold outline-none"
                    style={{
                      background: "var(--cat-input-bg, var(--cat-card-bg))",
                      border: "1px solid var(--cat-card-border)",
                      color: "var(--cat-text)",
                    }}
                    disabled={isFinished}
                  />
                </div>

                {/* Away team */}
                <div className="flex-1">
                  <span className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>
                    {match.awayTeam?.name ?? "TBD"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {!isFinished && !isLive && (
                    <Btn size="xs" variant="outline" onClick={() => setLive(match)} loading={saving === match.id}>
                      <Play className="w-3 h-3" /> Live
                    </Btn>
                  )}
                  {!isFinished && (
                    <Btn
                      size="xs"
                      variant="primary"
                      onClick={() => saveResult(match)}
                      loading={saving === match.id}
                      disabled={score.home === "" || score.away === ""}
                    >
                      <Save className="w-3 h-3" /> Сохранить
                    </Btn>
                  )}
                  {isFinished && (
                    <span className="text-xs" style={{ color: "var(--badge-success-text)" }}>
                      <CheckCircle className="w-4 h-4" />
                    </span>
                  )}
                </div>
              </div>

              {/* Date + field */}
              {(match.scheduledAt || match.field) && (
                <div className="flex items-center gap-3 mt-2 pt-2 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
                  {match.scheduledAt && (
                    <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(match.scheduledAt).toLocaleString("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
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
      </div>
    </div>
  );
}
