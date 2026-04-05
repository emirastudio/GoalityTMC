"use client";

import { useState, useEffect, useCallback } from "react";
import { useTournament } from "@/lib/tournament-context";
import { useSearchParams } from "next/navigation";
import {
  Calendar, Grid3x3, Loader2, X, CheckCircle, AlertCircle, Settings2,
  GripVertical, Clock,
} from "lucide-react";

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

interface Field {
  id: number;
  name: string;
  sortOrder: number;
}

interface Stage {
  id: number;
  name: string;
  type: string;
  classId?: number | null;
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
  scheduledAt?: string | null;
  fieldId?: number | null;
  field?: { name: string } | null;
  stage?: { name: string } | null;
  status: string;
}

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────

const STAGE_COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
  "#84cc16", "#14b8a6", "#a855f7", "#fb923c",
];

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

function parseDate(scheduledAt: string): string {
  return scheduledAt.substring(0, 10);
}

function parseTime(scheduledAt: string): string {
  return scheduledAt.substring(11, 16);
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
}

function generateSlots(startHour: number, endHour: number, intervalMins: number): string[] {
  const slots: string[] = [];
  for (let mins = startHour * 60; mins < endHour * 60; mins += intervalMins) {
    const h = Math.floor(mins / 60).toString().padStart(2, "0");
    const m = (mins % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
  }
  return slots;
}

function teamShort(name: string): string {
  if (name.length <= 18) return name;
  // Try to drop common suffixes first
  const cleaned = name.replace(/\s?(FC|JK|FK|SK|BK|AC|SC|CF|IF|IK|United|City|Town|Academy)$/i, "").trim();
  if (cleaned.length <= 18) return cleaned;
  // Abbreviate to initials if multi-word
  const words = cleaned.split(" ");
  if (words.length >= 2) return words.map(w => w[0]).join("").toUpperCase().substring(0, 5);
  return cleaned.substring(0, 15) + "…";
}

/** Extract stadium prefix from field name, e.g. "SP1" → "SP", "NK2" → "NK", "EJL1" → "EJL" */
function getStadium(fieldName: string): string {
  const m = fieldName.match(/^([A-Za-zÀ-ÿ\s]+)/);
  if (!m) return fieldName;
  const prefix = m[1].trim().toUpperCase();
  // Map known abbreviations
  if (prefix.startsWith("SP")) return "Sportland";
  if (prefix.startsWith("NK")) return "NK";
  if (prefix.startsWith("EJL")) return "EJL";
  return prefix;
}

// ─────────────────────────────────────────────
//  MatchChip
// ─────────────────────────────────────────────

function MatchChip({
  match,
  color,
  selected,
  compact = false,
  onClick,
  onUnschedule,
}: {
  match: Match;
  color: string;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onUnschedule?: (e: React.MouseEvent) => void;
}) {
  const home = match.homeTeam?.name ?? "TBD";
  const away = match.awayTeam?.name ?? "TBD";
  const hasBothTeams = match.homeTeamId && match.awayTeamId;

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="relative w-full h-full rounded-lg cursor-pointer select-none transition-all"
        style={{
          background: selected ? `${color}12` : `${color}06`,
          borderTop: "1px solid var(--cat-card-border)",
          borderRight: "1px solid var(--cat-card-border)",
          borderBottom: "1px solid var(--cat-card-border)",
          borderLeft: `4px solid ${color}`,
          borderRadius: "8px",
          boxShadow: selected ? `0 0 0 2px ${color}55` : undefined,
        }}
      >
        <div className="h-full flex flex-col justify-center pl-2 pr-1.5 py-1 gap-[2px]">
          {/* match number + close */}
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] font-black tracking-wide" style={{ color }}>
              #{match.matchNumber}
            </span>
            {onUnschedule && (
              <button
                onClick={onUnschedule}
                className="opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity shrink-0"
                style={{ color: "var(--cat-text-muted)" }}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
          {/* home team */}
          <div className="text-[11px] font-semibold leading-tight truncate" style={{ color: "var(--cat-text)" }}>
            {hasBothTeams ? teamShort(home) : <span className="opacity-40 italic text-[10px]">TBD</span>}
          </div>
          {/* away team — same size, slightly muted */}
          <div className="text-[11px] font-semibold leading-tight truncate" style={{ color: "var(--cat-text)", opacity: 0.65 }}>
            {hasBothTeams ? teamShort(away) : ""}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="relative rounded-lg cursor-pointer transition-all select-none w-full h-full overflow-hidden"
      style={{
        background: selected ? `${color}18` : "var(--cat-card-bg)",
        border: "1px solid var(--cat-card-border)",
        boxShadow: selected ? `0 0 0 2px ${color}55` : undefined,
      }}
    >
      {/* left stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l"
        style={{ background: color }} />

      <div className="pl-3 pr-2 py-2 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black" style={{ color }}>
            #{match.matchNumber} · {match.stage?.name ?? ""}
          </span>
          {onUnschedule && (
            <button
              onClick={onUnschedule}
              className="opacity-40 hover:opacity-100 transition-opacity"
              style={{ color: "var(--cat-text-muted)" }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="font-bold text-sm leading-tight" style={{ color: "var(--cat-text)" }}>
          {hasBothTeams ? home : <span className="opacity-50 italic text-xs">TBD</span>}
        </div>
        {hasBothTeams && (
          <div className="text-xs leading-tight opacity-60" style={{ color: "var(--cat-text)" }}>
            {away}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  GridCell
// ─────────────────────────────────────────────

function GridCell({
  match,
  stageColor,
  selectedMatch,
  onSelectMatch,
  onPlaceMatch,
  onUnschedule,
  cellHeight,
}: {
  match?: Match | null;
  stageColor: (stageId: number) => string;
  selectedMatch?: Match | null;
  onSelectMatch: (m: Match) => void;
  onPlaceMatch: () => void;
  onUnschedule: (m: Match) => void;
  cellHeight: number;
}) {
  const isEmpty = !match;
  const canPlace = !!selectedMatch && isEmpty;
  const isSelected = match ? selectedMatch?.id === match.id : false;
  const color = match ? stageColor(match.stageId ?? 0) : "var(--cat-accent)";

  function handleCellClick() {
    if (!isEmpty) {
      onSelectMatch(match!);
    } else if (canPlace) {
      onPlaceMatch();
    }
  }

  return (
    <div
      onClick={handleCellClick}
      className="group relative rounded border transition-all"
      style={{
        height: cellHeight,
        background: canPlace
          ? "rgba(6,182,212,0.07)"
          : "var(--cat-card-bg)",
        borderColor: canPlace
          ? "var(--cat-accent)"
          : isSelected
          ? color
          : "var(--cat-card-border)",
        cursor: canPlace || match ? "pointer" : "default",
        borderStyle: canPlace ? "dashed" : "solid",
        boxShadow: isSelected ? `0 0 0 2px ${color}55` : undefined,
      }}
    >
      {match ? (
        /* NOTE: MatchChip has NO onClick here — the parent div handles selection */
        <div className="absolute inset-1">
          <MatchChip
            match={match}
            color={color}
            selected={isSelected}
            compact
            onUnschedule={(e) => { e.stopPropagation(); onUnschedule(match); }}
          />
        </div>
      ) : canPlace ? (
        <div className="flex items-center justify-center h-full">
          <span className="text-[10px] font-semibold" style={{ color: "var(--cat-accent)" }}>
            + Поставить
          </span>
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Main Page
// ─────────────────────────────────────────────

export function PlannerPage() {
  const ctx = useTournament();
  const orgSlug = ctx?.orgSlug ?? "";
  const tournamentId = ctx?.tournamentId ?? 0;
  const base = `/api/org/${orgSlug}/tournament/${tournamentId}`;

  // Read classId from URL (e.g. ?classId=11 from Schedule page link)
  const searchParams = useSearchParams();
  const urlClassId = searchParams ? Number(searchParams.get("classId")) || null : null;

  const [fields, setFields] = useState<Field[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // Planner state
  const [activeDay, setActiveDay] = useState<string>("");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(21);
  const [slotMins, setSlotMins] = useState(30);
  const [cellHeight, setCellHeight] = useState(72);

  // Filters — pre-populated from URL classId
  const [filterStage, setFilterStage] = useState<number | null>(null);
  const [filterClass, setFilterClass] = useState<number | null>(urlClassId);
  const [stadiumFilter, setStadiumFilter] = useState<string | null>(null);

  // ── Load data ──────────────────────────────
  const load = useCallback(async () => {
    if (!tournamentId) return;
    setLoading(true);
    try {
      const [stagesRes, matchesRes, fieldsRes] = await Promise.all([
        fetch(`${base}/stages`),
        fetch(`${base}/matches`),
        fetch(`/api/admin/tournament-fields?tournamentId=${tournamentId}`),
      ]);
      const stagesData = await stagesRes.json();
      const matchesData = await matchesRes.json();
      const fieldsData = await fieldsRes.json();

      const stagesArr: Stage[] = Array.isArray(stagesData) ? stagesData : (stagesData.stages ?? []);
      const matchesArr: Match[] = Array.isArray(matchesData) ? matchesData : (matchesData.matches ?? []);
      const fieldsArr: Field[] = Array.isArray(fieldsData) ? fieldsData : (fieldsData.fields ?? []);

      setStages(stagesArr);
      setMatches(matchesArr);
      setFields(fieldsArr.sort((a, b) => a.sortOrder - b.sortOrder));

      const days = getScheduledDays(matchesArr);
      if (days.length > 0 && !activeDay) setActiveDay(days[0]);
    } finally {
      setLoading(false);
    }
  }, [base, tournamentId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // ── Derived ────────────────────────────────
  const stageColorMap = useCallback((stageId: number) => {
    const idx = stages.findIndex(s => s.id === stageId);
    return STAGE_COLORS[idx % STAGE_COLORS.length] ?? "#888";
  }, [stages]);

  function getScheduledDays(ms: Match[]): string[] {
    const set = new Set<string>();
    ms.forEach(m => { if (m.scheduledAt) set.add(parseDate(m.scheduledAt)); });
    return Array.from(set).sort();
  }

  const days = getScheduledDays(matches);

  // Stadium groups from fields
  const stadiums = Array.from(new Set(fields.map(f => getStadium(f.name))));

  // Active fields (filtered by stadium)
  const activeFields = stadiumFilter
    ? fields.filter(f => getStadium(f.name) === stadiumFilter)
    : fields;

  const scheduledOnDay = matches.filter(m =>
    m.scheduledAt && parseDate(m.scheduledAt) === activeDay && m.fieldId
  );

  // Stages belonging to active class filter
  const classStageIds = filterClass
    ? new Set(stages.filter(s => s.classId === filterClass).map(s => s.id))
    : null;

  const unscheduled = matches.filter(m =>
    !m.scheduledAt || !m.fieldId
  ).filter(m => {
    if (filterStage != null) return m.stageId === filterStage;
    if (classStageIds != null) return classStageIds.has(m.stageId ?? -1);
    return true;
  });

  // Build grid index: fieldId → slotKey → Match
  const gridIndex = new Map<number, Map<string, Match>>();
  fields.forEach(f => gridIndex.set(f.id, new Map()));
  scheduledOnDay.forEach(m => {
    if (!m.fieldId || !m.scheduledAt) return;
    const slot = parseTime(m.scheduledAt);
    gridIndex.get(m.fieldId)?.set(slot, m);
  });

  const slots = generateSlots(startHour, endHour, slotMins);

  // ── Actions ────────────────────────────────
  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function patchMatch(matchId: number, updates: Record<string, unknown>) {
    setSaving(matchId);
    try {
      const res = await fetch(`${base}/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, ...updated } : m));
      showToast("Сохранено", "ok");
    } catch {
      showToast("Ошибка сохранения", "err");
    } finally {
      setSaving(null);
    }
  }

  function handlePlaceMatch(fieldId: number, slotKey: string) {
    if (!selectedMatch || !activeDay) return;
    const scheduledAt = `${activeDay} ${slotKey}:00`;
    patchMatch(selectedMatch.id, { fieldId, scheduledAt });
    setSelectedMatch(null);
  }

  function handleUnschedule(match: Match) {
    patchMatch(match.id, { fieldId: null, scheduledAt: null });
  }

  function handleSelectInGrid(match: Match) {
    setSelectedMatch(prev => prev?.id === match.id ? null : match);
  }

  // ── Keyboard: Escape to deselect ───────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedMatch(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ─────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3"
        style={{ color: "var(--cat-text-muted)" }}>
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Загрузка данных…</span>
      </div>
    );
  }

  const statsTotal = matches.length;
  const statsScheduled = matches.filter(m => m.scheduledAt && m.fieldId).length;
  const statsUnscheduled = statsTotal - statsScheduled;

  // Compute stadium span columns for header grouping
  const stadiumGroups: { name: string; fields: Field[] }[] = [];
  for (const f of activeFields) {
    const st = getStadium(f.name);
    const last = stadiumGroups[stadiumGroups.length - 1];
    if (last && last.name === st) {
      last.fields.push(f);
    } else {
      stadiumGroups.push({ name: st, fields: [f] });
    }
  }

  const STADIUM_COLORS: Record<string, string> = {
    "Sportland": "#3b82f6",
    "NK": "#22c55e",
    "EJL": "#f59e0b",
  };

  return (
    <div className="h-full flex flex-col gap-0" style={{ minHeight: "calc(100vh - 120px)" }}>

      {/* ── Toast ──────────────────────────────── */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg text-sm font-semibold"
          style={{
            background: toast.type === "ok" ? "#dcfce7" : "#fee2e2",
            color: toast.type === "ok" ? "#166534" : "#991b1b",
            border: `1px solid currentColor`,
          }}>
          {toast.type === "ok" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ─────────────────────────────── */}
      <div className="flex items-start justify-between mb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>
              Планировщик расписания
            </h1>
            {filterClass && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: "rgba(6,182,212,0.12)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.3)" }}>
                {stages.find(s => s.classId === filterClass)?.name?.replace(/ .*/,"") ?? `Дивизион ${filterClass}`}
                <button onClick={() => setFilterClass(null)} className="ml-1.5 opacity-60 hover:opacity-100">×</button>
              </span>
            )}
          </div>
          <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {filterClass
              ? "Показаны матчи выбранного дивизиона · кликните × чтобы показать все"
              : "Выберите матч слева → кликните на ячейку в сетке"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--cat-text-muted)" }}>
            <span><b style={{ color: "var(--cat-text)" }}>{statsScheduled}</b> запланировано</span>
            <span><b style={{ color: statsUnscheduled > 0 ? "#f59e0b" : "var(--cat-text)" }}>{statsUnscheduled}</b> без времени</span>
            <span><b style={{ color: "var(--cat-text)" }}>{statsTotal}</b> всего</span>
          </div>
          <button
            onClick={() => setShowSettings(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: showSettings ? "var(--cat-accent)" : "var(--cat-tag-bg)",
              color: showSettings ? "#fff" : "var(--cat-text-secondary)",
            }}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Настройки
          </button>
        </div>
      </div>

      {/* ── Settings panel ─────────────────────── */}
      {showSettings && (
        <div className="rounded-xl border p-4 mb-4 shrink-0"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <div className="flex items-center gap-6 flex-wrap">
            <label className="flex items-center gap-2 text-xs" style={{ color: "var(--cat-text-secondary)" }}>
              <span>Начало</span>
              <select value={startHour} onChange={e => setStartHour(+e.target.value)}
                className="rounded px-2 py-1 text-xs"
                style={{ background: "var(--cat-input-bg, var(--cat-card-bg))", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}>
                {Array.from({ length: 16 }, (_, i) => i + 6).map(h => (
                  <option key={h} value={h}>{h}:00</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs" style={{ color: "var(--cat-text-secondary)" }}>
              <span>Конец</span>
              <select value={endHour} onChange={e => setEndHour(+e.target.value)}
                className="rounded px-2 py-1 text-xs"
                style={{ background: "var(--cat-input-bg, var(--cat-card-bg))", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}>
                {Array.from({ length: 16 }, (_, i) => i + 10).map(h => (
                  <option key={h} value={h}>{h}:00</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs" style={{ color: "var(--cat-text-secondary)" }}>
              <span>Интервал</span>
              <select value={slotMins} onChange={e => setSlotMins(+e.target.value)}
                className="rounded px-2 py-1 text-xs"
                style={{ background: "var(--cat-input-bg, var(--cat-card-bg))", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}>
                {[15, 20, 25, 30, 45, 60].map(m => (
                  <option key={m} value={m}>{m} мин</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs" style={{ color: "var(--cat-text-secondary)" }}>
              <span>Высота ячейки</span>
              <select value={cellHeight} onChange={e => setCellHeight(+e.target.value)}
                className="rounded px-2 py-1 text-xs"
                style={{ background: "var(--cat-input-bg, var(--cat-card-bg))", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}>
                {[52, 64, 72, 84, 96].map(h => (
                  <option key={h} value={h}>{h}px</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      {/* ── Day tabs ───────────────────────────── */}
      <div className="flex items-center gap-2 mb-3 shrink-0 flex-wrap">
        <Calendar className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
        <div className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: "var(--cat-tag-bg)" }}>
          {days.length === 0 ? (
            <span className="px-4 py-1.5 text-xs" style={{ color: "var(--cat-text-muted)" }}>
              Нет матчей с датами
            </span>
          ) : (
            days.map(day => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={activeDay === day ? {
                  background: "var(--cat-accent)",
                  color: "#fff",
                } : {
                  color: "var(--cat-text-secondary)",
                }}>
                {fmtDate(day)}
              </button>
            ))
          )}
        </div>

        {/* Stadium filter */}
        {stadiums.length > 1 && (
          <div className="flex items-center gap-1 p-1 rounded-xl ml-2"
            style={{ background: "var(--cat-tag-bg)" }}>
            <button
              onClick={() => setStadiumFilter(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={stadiumFilter === null
                ? { background: "var(--cat-accent)", color: "#fff" }
                : { color: "var(--cat-text-secondary)" }}>
              Все поля
            </button>
            {stadiums.map(st => (
              <button
                key={st}
                onClick={() => setStadiumFilter(prev => prev === st ? null : st)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={stadiumFilter === st
                  ? { background: STADIUM_COLORS[st] ?? "#888", color: "#fff" }
                  : { color: "var(--cat-text-secondary)" }}>
                {st}
              </button>
            ))}
          </div>
        )}

        {selectedMatch && (
          <div className="ml-2 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: "var(--cat-accent)", color: "#fff", animation: "pulse 2s infinite" }}>
            <GripVertical className="w-3.5 h-3.5" />
            Выбран #{selectedMatch.matchNumber} — кликните на ячейку
            <button onClick={() => setSelectedMatch(null)} className="hover:opacity-70">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Main layout: sidebar + grid ────────── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* ── Left sidebar: unscheduled ─────────── */}
        <div className="w-60 shrink-0 flex flex-col gap-2"
          style={{ height: "calc(100vh - 300px)", overflowY: "auto" }}>
          <div className="flex items-center justify-between mb-1 sticky top-0 pb-2"
            style={{ background: "var(--cat-bg, #0f1117)", zIndex: 1 }}>
            <span className="text-xs font-bold" style={{ color: "var(--cat-text-secondary)" }}>
              БЕЗ ВРЕМЕНИ ({unscheduled.length})
            </span>
            <select
              value={filterStage ?? ""}
              onChange={e => setFilterStage(e.target.value ? +e.target.value : null)}
              className="rounded px-1.5 py-0.5 text-[10px]"
              style={{
                background: "var(--cat-input-bg, var(--cat-card-bg))",
                border: "1px solid var(--cat-card-border)",
                color: "var(--cat-text)",
              }}
            >
              <option value="">Все этапы</option>
              {stages.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {unscheduled.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 rounded-xl border border-dashed"
              style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)" }}>
              <CheckCircle className="w-6 h-6 opacity-40" />
              <span className="text-xs">Все матчи запланированы!</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {unscheduled.map(m => (
                <div key={m.id} className="relative">
                  {saving === m.id && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg z-10"
                      style={{ background: "var(--cat-card-bg)80" }}>
                      <Loader2 className="w-3 h-3 animate-spin" />
                    </div>
                  )}
                  <MatchChip
                    match={m}
                    color={stageColorMap(m.stageId ?? 0)}
                    selected={selectedMatch?.id === m.id}
                    onClick={() => setSelectedMatch(prev => prev?.id === m.id ? null : m)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Grid ─────────────────────────────── */}
        <div className="flex-1 min-w-0 overflow-auto rounded-xl border"
          style={{
            borderColor: "var(--cat-card-border)",
            height: "calc(100vh - 300px)",
          }}>
          {activeFields.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm"
              style={{ color: "var(--cat-text-muted)" }}>
              Добавьте поля в настройках турнира
            </div>
          ) : (
            <table className="w-full border-collapse text-xs" style={{ minWidth: activeFields.length * 160 + 60 }}>
              <thead>
                {/* Stadium group header */}
                <tr style={{ background: "var(--cat-tag-bg)" }}>
                  <th className="sticky left-0 z-20 w-14 border-b border-r"
                    style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }} />
                  {stadiumGroups.map(grp => (
                    <th
                      key={grp.name}
                      colSpan={grp.fields.length}
                      className="px-2 py-1.5 text-center font-black text-[10px] uppercase tracking-widest border-b border-r"
                      style={{
                        borderColor: "var(--cat-card-border)",
                        color: STADIUM_COLORS[grp.name] ?? "var(--cat-text-secondary)",
                        letterSpacing: "0.1em",
                      }}>
                      {grp.name}
                    </th>
                  ))}
                </tr>
                {/* Field name header */}
                <tr style={{ background: "var(--cat-card-bg)" }}>
                  <th className="sticky left-0 z-20 w-14 px-2 py-2.5 text-left border-b border-r"
                    style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
                    <Clock className="w-3.5 h-3.5" style={{ color: "var(--cat-text-muted)" }} />
                  </th>
                  {activeFields.map(f => {
                    const stColor = STADIUM_COLORS[getStadium(f.name)] ?? "var(--cat-text-secondary)";
                    return (
                      <th key={f.id}
                        className="px-2 py-2.5 text-center font-bold border-b border-r"
                        style={{
                          borderColor: "var(--cat-card-border)",
                          color: stColor,
                          minWidth: 160,
                        }}>
                        <div className="flex items-center justify-center gap-1">
                          <Grid3x3 className="w-3 h-3 opacity-50" />
                          {f.name}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {slots.map((slot, rowIdx) => {
                  const isHour = slot.endsWith(":00");
                  return (
                    <tr key={slot}
                      style={{
                        background: rowIdx % 2 === 0
                          ? "var(--cat-card-bg)"
                          : "rgba(0,0,0,0.02)",
                      }}>
                      <td className="sticky left-0 z-10 px-2 border-b border-r text-center"
                        style={{
                          borderColor: "var(--cat-card-border)",
                          background: rowIdx % 2 === 0 ? "var(--cat-card-bg)" : "rgba(0,0,0,0.02)",
                          color: isHour ? "var(--cat-text)" : "var(--cat-text-muted)",
                          fontWeight: isHour ? 700 : 400,
                          fontSize: isHour ? "11px" : "10px",
                          paddingTop: 4,
                          paddingBottom: 4,
                        }}>
                        {slot}
                      </td>
                      {activeFields.map(f => {
                        const match = gridIndex.get(f.id)?.get(slot) ?? null;
                        return (
                          <td key={f.id}
                            className="px-1 py-0.5 border-b border-r"
                            style={{ borderColor: "var(--cat-card-border)" }}>
                            <GridCell
                              match={match}
                              stageColor={stageColorMap}
                              selectedMatch={selectedMatch}
                              onSelectMatch={handleSelectInGrid}
                              onPlaceMatch={() => handlePlaceMatch(f.id, slot)}
                              onUnschedule={handleUnschedule}
                              cellHeight={cellHeight}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Legend ─────────────────────────────── */}
      {stages.length > 0 && (
        <div className="flex items-center gap-3 mt-3 flex-wrap shrink-0">
          <span className="text-[10px] font-bold" style={{ color: "var(--cat-text-muted)" }}>ЭТАПЫ:</span>
          {stages.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: STAGE_COLORS[i % STAGE_COLORS.length] }} />
              <span className="text-[10px]" style={{ color: "var(--cat-text-secondary)" }}>{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
