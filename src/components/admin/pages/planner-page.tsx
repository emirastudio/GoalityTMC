"use client";

import { useTranslations } from "next-intl";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { TeamBadge } from "@/components/ui/team-badge";
import { useTournament } from "@/lib/tournament-context";
import { useSearchParams } from "next/navigation";
import {
  Calendar, Grid3x3, Loader2, X, CheckCircle, AlertCircle, Settings2,
  GripVertical, Clock, RefreshCw, Zap, Move, ArrowLeftRight, Edit2,
  CalendarOff, ChevronDown, ChevronRight, Plus, Trash2, Save,
  Lock, Sparkles, ArrowRight, Building2, Shield, Activity, Users,
} from "lucide-react";
import ScheduleAuditPanel from "@/components/admin/schedule-audit-panel";
import { TeamScheduleView } from "@/components/admin/team-schedule-view";
import type { ScheduleConfig } from "@/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Field { id: number; name: string; sortOrder: number; stadium?: { id: number; name: string } | null; }
interface Stage { id: number; name: string; type: string; classId?: number | null; }
interface TournamentClass {
  id: number;
  name: string;
  scheduleConfig: ScheduleConfig | null;
  startDate?: string | null;
  endDate?: string | null;
}
interface Group { id: number; name: string; }
interface StadiumObject { id: number; name: string; }
interface StadiumScheduleEntry {
  stadiumId: number;
  date: string;
  startTime: string | null;
  endTime: string | null;
}

interface Match {
  id: number;
  matchNumber?: number | null;
  groupRound?: number | null;
  stageId?: number | null;
  groupId?: number | null;
  roundId?: number | null;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  homeTeam?: { name: string; club?: { badgeUrl?: string | null } | null } | null;
  awayTeam?: { name: string; club?: { badgeUrl?: string | null } | null } | null;
  scheduledAt?: string | null;
  fieldId?: number | null;
  field?: { name: string; stadium?: { id: number; name: string } | null } | null;
  stage?: { name: string; type?: string | null } | null;
  group?: Group | null;
  round?: { name: string; shortName?: string | null; order?: number | null; matchCount?: number | null } | null;
  status: string;
  lockedAt?: string | null;
}

/** "error" = team plays same time two fields; "warning" = too many games/day; "back2back" = <60 min rest */
type ConflictLevel = "error" | "warning" | "back2back";
type ConflictMap = Map<number, ConflictLevel>;
type DropValidity = "valid" | "conflict" | "occupied";

interface DragState {
  matchId: number;
  fromFieldId: number | null;
  fromSlot: string | null;
  fromDay: string | null;
}

interface DragOverCell { fieldId: number; slot: string; validity: DropValidity; topPx: number; }
interface CtxMenu { matchId: number; x: number; y: number; }
interface EditState { match: Match; date: string; time: string; fieldId: number; }

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
  "#84cc16", "#14b8a6", "#a855f7", "#fb923c",
];

// Stadium colors by stadium name (will be populated dynamically too)
const STADIUM_COLORS_PRESET: Record<string, string> = {
  Sportland: "#3b82f6", NK: "#22c55e", EJL: "#f59e0b",
};

const STADIUM_PALETTE = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

const MAX_DAILY_MATCHES = 3;
/** Default minimum rest. Overridden per-call by the division config value. */
const DEFAULT_MIN_REST_MINUTES = 30;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(s: string) { return s.substring(0, 10); }
function parseTime(s: string) { return s.substring(11, 16); }

/** Convert matchRound to display label: 1/4, 1/2, Финал, 3-е место, etc.
 *
 * Priority: shortName from DB (most reliable) → matchCount-based fallback.
 * DB shortNames: "F"=Final, "3P"=3rd place, "SF"=semi, "QF"=quarter,
 *                "R16"=1/8, "R32"=1/16, "R64"=1/32.
 * NOTE: DB uses ascending order (1=earliest round, highest=Final), so we
 * cannot rely on order===1 to detect the Final.
 */
function knockoutLabel(round: { order?: number | null; matchCount?: number | null; shortName?: string | null; name?: string } | null | undefined, t: (key: string) => string): string | null {
  if (!round) return null;
  // Prefer shortName — it's the canonical source from the format builder
  const sn = (round.shortName ?? "").toUpperCase().trim();
  if (sn === "F" || sn === "FINAL" || sn === "FIN") return t("planner.final");
  if (sn === "3P" || sn === "3RD" || sn === "BRONZE" || sn === "THIRD") return t("planner.thirdPlace");
  if (sn === "SF") return "1/2";
  if (sn === "QF") return "1/4";
  if (sn === "R16") return "1/8";
  if (sn === "R32") return "1/16";
  if (sn === "R64" || sn === "R128") return "1/32";
  // Fallback: derive from matchCount when shortName is absent/unknown
  const mc = round.matchCount;
  if (mc === 1) return t("planner.final");  // best guess when shortName absent
  if (mc === 2) return "1/2";
  if (mc === 4) return "1/4";
  if (mc === 8) return "1/8";
  if (mc === 16) return "1/16";
  if (mc === 32) return "1/32";
  return round.shortName ?? null;
}

/** True if this is the grand final match (shortName="F" or first matchCount=1 match). */
function isFinalMatch(match: Match): boolean {
  if (match.stage?.type !== "knockout") return false;
  const sn = (match.round?.shortName ?? "").toUpperCase().trim();
  if (sn === "F" || sn === "FINAL" || sn === "FIN") return true;
  // Fallback when no shortName: matchCount=1 and not explicitly 3rd place
  if (match.round?.matchCount === 1 && sn !== "3P" && sn !== "3RD" && sn !== "BRONZE") return true;
  return false;
}
function fmtDate(d: string) {
  return new Date(d + "T12:00:00Z").toLocaleDateString("ru-RU", {
    weekday: "short", day: "numeric", month: "short",
  });
}
function generateSlots(startH: number, endH: number, stepMins: number): string[] {
  const out: string[] = [];
  for (let m = startH * 60; m < endH * 60; m += stepMins)
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  return out;
}
/** Pixels per minute for the calendar-style grid. */
const PX_PER_MIN = 2.0;
/** Convert "HH:MM" to minutes since midnight. */
function slotToMins(slot: string): number {
  const [h, m] = slot.split(":").map(Number);
  return h * 60 + m;
}
/** Convert minutes since midnight to "HH:MM". */
function minsToSlot(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function teamShort(name: string): string {
  if (name.length <= 18) return name;
  const c = name.replace(/\s?(FC|JK|FK|SK|BK|AC|SC|CF|IF|IK|United|City|Town|Academy)$/i, "").trim();
  if (c.length <= 18) return c;
  const words = c.split(" ");
  return words.length >= 2 ? words.map(w => w[0]).join("").toUpperCase().slice(0, 5) : c.slice(0, 15) + "…";
}
/** Returns the stadium display name for a field (uses stadium relation if available) */
function getFieldStadiumName(field: Field): string {
  return field.stadium?.name ?? "";
}

/** Legacy: parse stadium from field name string (fallback only) */
function getStadium(name: string): string {
  const m = name.match(/^([A-Za-zÀ-ÿ\s]+)/);
  if (!m) return name;
  const p = m[1].trim().toUpperCase();
  if (p.startsWith("SP")) return "Sportland";
  if (p.startsWith("NK")) return "NK";
  if (p.startsWith("EJL")) return "EJL";
  return p;
}

// ─── Conflict Detection ───────────────────────────────────────────────────────

function computeConflicts(matches: Match[], slotMins: number, minRestMinutes = DEFAULT_MIN_REST_MINUTES): ConflictMap {
  const out = new Map<number, ConflictLevel>();
  const scheduled = matches.filter(m => m.scheduledAt);

  // Error: two matches with a common team overlap in time on DIFFERENT fields
  for (let i = 0; i < scheduled.length; i++) {
    const A = scheduled[i];
    const aStart = new Date(A.scheduledAt!).getTime();
    const aEnd = aStart + slotMins * 60_000;
    const aTeams = new Set([A.homeTeamId, A.awayTeamId].filter(Boolean));
    if (aTeams.size === 0) continue;

    for (let j = i + 1; j < scheduled.length; j++) {
      const B = scheduled[j];
      // Same field + same slot = normal (detected as grid occupation, not a conflict)
      if (A.fieldId === B.fieldId) continue;

      const bStart = new Date(B.scheduledAt!).getTime();
      const bEnd = bStart + slotMins * 60_000;
      if (aStart >= bEnd || aEnd <= bStart) continue; // no overlap

      const bTeams = new Set([B.homeTeamId, B.awayTeamId].filter(Boolean));
      let shared = false;
      for (const t of aTeams) { if (bTeams.has(t)) { shared = true; break; } }
      if (shared) {
        out.set(A.id, "error");
        out.set(B.id, "error");
      }
    }
  }

  // Warning: team plays more than MAX_DAILY_MATCHES in one day
  const teamDay = new Map<string, number[]>(); // `teamId:day` → matchIds
  for (const m of scheduled) {
    const day = parseDate(m.scheduledAt!);
    for (const tid of [m.homeTeamId, m.awayTeamId]) {
      if (!tid) continue;
      const k = `${tid}:${day}`;
      if (!teamDay.has(k)) teamDay.set(k, []);
      teamDay.get(k)!.push(m.id);
    }
  }
  for (const [, ids] of teamDay) {
    if (ids.length > MAX_DAILY_MATCHES) {
      for (const id of ids) { if (!out.has(id)) out.set(id, "warning"); }
    }
  }

  // Back-to-back: same team plays two matches with < MIN_REST_MINUTES gap
  // Collect per-team sorted list of (startMs, endMs, matchId)
  const teamMatches = new Map<number, Array<{ startMs: number; endMs: number; matchId: number }>>();
  for (const m of scheduled) {
    const startMs = new Date(m.scheduledAt!).getTime();
    const endMs = startMs + slotMins * 60_000;
    for (const tid of [m.homeTeamId, m.awayTeamId]) {
      if (!tid) continue;
      if (!teamMatches.has(tid)) teamMatches.set(tid, []);
      teamMatches.get(tid)!.push({ startMs, endMs, matchId: m.id });
    }
  }
  for (const [, arr] of teamMatches) {
    arr.sort((a, b) => a.startMs - b.startMs);
    for (let i = 1; i < arr.length; i++) {
      const restMs = arr[i].startMs - arr[i - 1].endMs;
      if (restMs >= 0 && restMs < minRestMinutes * 60_000) {
        // Only set back2back if no higher-priority conflict already set
        if (!out.has(arr[i - 1].matchId)) out.set(arr[i - 1].matchId, "back2back");
        if (!out.has(arr[i].matchId)) out.set(arr[i].matchId, "back2back");
      }
    }
  }

  return out;
}

// ─── Drop Validity ────────────────────────────────────────────────────────────

function getDropValidity(
  targetFieldId: number,
  targetSlot: string,
  targetDay: string,
  dragMatch: Match,
  gridIndex: Map<number, Map<string, Match[]>>,
  slotMins: number,
): DropValidity {
  // Check if cell is already occupied by another match (not the dragged one)
  const existingArr = gridIndex.get(targetFieldId)?.get(targetSlot) ?? [];
  const occupied = existingArr.some(m => m.id !== dragMatch.id);
  if (occupied) return "occupied";

  // Check team conflict: same teams on different field at same time
  const dragTeams = new Set([dragMatch.homeTeamId, dragMatch.awayTeamId].filter(Boolean));
  if (dragTeams.size === 0) return "valid";

  const targetMs = new Date(`${targetDay}T${targetSlot}:00Z`).getTime();
  const targetEnd = targetMs + slotMins * 60_000;

  for (const [fId, fieldMap] of gridIndex) {
    if (fId === targetFieldId) continue;
    for (const [slot, matchArr] of fieldMap) {
      for (const m of matchArr) {
        if (m.id === dragMatch.id) continue;
        const mMs = new Date(`${targetDay}T${slot}:00Z`).getTime();
        const mEnd = mMs + slotMins * 60_000;
        if (targetMs >= mEnd || targetEnd <= mMs) continue; // no overlap
        const mTeams = new Set([m.homeTeamId, m.awayTeamId].filter(Boolean));
        for (const t of dragTeams) { if (mTeams.has(t)) return "conflict"; }
      }
    }
  }

  return "valid";
}

// ─── MatchCard ────────────────────────────────────────────────────────────────

function MatchCard({
  match, color, conflict, selected, compact, isDragging, divisionName,
  onDragStart, onDragEnd, onContextMenu, onClick, onUnschedule, saving,
}: {
  match: Match; color: string; conflict?: ConflictLevel; selected?: boolean;
  compact?: boolean; isDragging?: boolean; divisionName?: string;
  onDragStart: () => void; onDragEnd: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onClick?: () => void; onUnschedule?: (e: React.MouseEvent) => void;
  saving?: boolean;
}) {
  const t = useTranslations("admin");
  const home = match.homeTeam?.name ?? "TBD";
  const away = match.awayTeam?.name ?? "TBD";
  const hasBoth = !!(match.homeTeamId && match.awayTeamId);
  const isErr = conflict === "error";
  const isWarn = conflict === "warning";
  const isB2B = conflict === "back2back";
  const isFinal = isFinalMatch(match);
  const isKnockout = match.stage?.type === "knockout";
  const roundLabel = isKnockout ? knockoutLabel(match.round, t) : null;

  const borderColor = isErr ? "#ef4444" : isWarn ? "#f59e0b" : isB2B ? "#f97316"
    : isFinal ? "#fbbf24"
    : selected ? color : "var(--cat-card-border)";
  const bg = isErr
    ? `rgba(239,68,68,0.08)`
    : isWarn
    ? `rgba(245,158,11,0.06)`
    : isB2B
    ? `rgba(249,115,22,0.07)`
    : isFinal
    ? `rgba(251,191,36,0.10)`
    : selected ? `${color}18` : compact ? `${color}06` : "var(--cat-card-bg)";

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData("matchId", String(match.id));
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onContextMenu={e => { e.preventDefault(); onContextMenu?.(e); }}
      className="relative w-full h-full rounded-lg select-none transition-all"
      style={{
        background: bg,
        borderTop: `1px solid ${borderColor}`,
        borderRight: `1px solid ${borderColor}`,
        borderBottom: `1px solid ${borderColor}`,
        borderLeft: `4px solid ${isErr || isWarn || isB2B ? borderColor : isFinal ? "#fbbf24" : color}`,
        borderRadius: "8px",
        cursor: "grab",
        opacity: isDragging ? 0.4 : 1,
        boxShadow: isFinal
          ? `0 0 0 1px rgba(251,191,36,0.5), 0 0 8px rgba(251,191,36,0.25)`
          : selected ? `0 0 0 2px ${color}55`
          : isErr ? "0 0 0 1px rgba(239,68,68,0.4)"
          : undefined,
        transition: "opacity 0.15s, box-shadow 0.15s",
      }}
    >
      {saving && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg z-10"
          style={{ background: "rgba(0,0,0,0.4)", borderRadius: 8 }}>
          <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#fff" }} />
        </div>
      )}

      {/* Top-right indicators: conflict / back-to-back / final crown */}
      <div className="absolute top-0.5 right-1 z-10 flex items-center gap-0.5">
        {match.lockedAt && (
          <span title={t("planner.matchLocked")} style={{ fontSize: 9, lineHeight: 1 }}>🔒</span>
        )}
        {isFinal && (
          <span style={{ fontSize: 10, lineHeight: 1 }} title={t("planner.final")}>👑</span>
        )}
        {isErr && <AlertCircle className="w-3 h-3" style={{ color: "#ef4444" }} />}
        {isWarn && !isErr && <AlertCircle className="w-3 h-3" style={{ color: "#f59e0b" }} />}
        {isB2B && !isErr && !isWarn && (
          <span title={t("planner.lowRest")}><Clock className="w-3 h-3" style={{ color: "#f97316" }} /></span>
        )}
      </div>

      <div className="h-full flex flex-col justify-center pl-2 pr-4 py-1 gap-[3px]">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0 flex-wrap">
            <span className="text-[11px] font-black tracking-wide shrink-0" style={{ color }}>
              #{match.matchNumber}
              {match.group?.name ? ` · ${match.group.name}` : ""}
              {match.scheduledAt && (
                <span className="opacity-75"> | {parseTime(match.scheduledAt)}</span>
              )}
            </span>
            {/* Knockout round badge */}
            {roundLabel && (
              <span
                className="shrink-0 rounded px-1 text-[10px] font-black tracking-wider leading-tight"
                style={{
                  background: isFinal ? "rgba(251,191,36,0.25)" : `${color}22`,
                  color: isFinal ? "#fbbf24" : color,
                  border: `1px solid ${isFinal ? "rgba(251,191,36,0.5)" : color + "44"}`,
                  letterSpacing: "0.04em",
                }}
              >
                {roundLabel}
              </span>
            )}
            {/* Division badge — only shown when multiple divisions exist */}
            {divisionName && (
              <span
                className="shrink-0 rounded px-1 text-[9px] font-bold leading-tight"
                style={{
                  background: `${color}18`,
                  color,
                  border: `1px solid ${color}33`,
                  letterSpacing: "0.02em",
                  opacity: 0.85,
                }}
              >
                {divisionName}
              </span>
            )}
          </div>
          {onUnschedule && (
            <button
              onClick={e => { e.stopPropagation(); onUnschedule(e); }}
              className="opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity absolute right-1 top-1"
              style={{ color: "var(--cat-text-muted)" }}>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {compact ? (
          <>
            <div className="flex items-center gap-1">
              <TeamBadge team={match.homeTeam ?? null} size={14} />
              <div className="text-[13px] font-bold leading-tight truncate" style={{ color: "var(--cat-text)" }}>
                {match.homeTeamId ? teamShort(home) : <span className="opacity-40 italic text-xs">TBD</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <TeamBadge team={match.awayTeam ?? null} size={14} />
              <div className="text-[13px] font-semibold leading-tight truncate" style={{ color: "var(--cat-text)", opacity: 0.65 }}>
                {match.awayTeamId ? teamShort(away) : <span className="opacity-40 italic text-xs">TBD</span>}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 mt-0.5">
              <TeamBadge team={match.homeTeam ?? null} size={18} />
              <div className="font-bold text-[15px] leading-tight truncate" style={{ color: "var(--cat-text)" }}>
                {match.homeTeamId ? home : <span className="opacity-50 italic text-sm">TBD</span>}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <TeamBadge team={match.awayTeam ?? null} size={18} />
              <div className="text-sm leading-tight opacity-65 truncate" style={{ color: "var(--cat-text)" }}>
                {match.awayTeamId ? away : <span className="opacity-50 italic">TBD</span>}
              </div>
            </div>
            <div className="text-[11px] mt-0.5 opacity-50 truncate" style={{ color: "var(--cat-text)" }}>
              {match.round?.name
                ? `${match.stage?.name ?? ""} · ${match.round.shortName ?? match.round.name}`
                : match.stage?.name}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── GridCell ─────────────────────────────────────────────────────────────────

function GridCell({
  match, fieldId, slot, activeDay, slotMins,
  stageColor, getDivName, conflict, selected, selectedMatch,
  dragState, dragOverCell,
  onSelectMatch, onPlaceMatch, onUnschedule,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
  onContextMenu, saving, cellHeight,
}: {
  match?: Match | null; fieldId: number; slot: string; activeDay: string; slotMins: number;
  stageColor: (id: number) => string; getDivName?: (stageId: number) => string;
  conflict?: ConflictLevel; selected?: boolean;
  selectedMatch?: Match | null; dragState: DragState | null; dragOverCell: DragOverCell | null;
  onSelectMatch: (m: Match) => void; onPlaceMatch: () => void;
  onUnschedule: (m: Match) => void;
  onDragStart: (m: Match) => void; onDragEnd: () => void;
  onDragOver: (fieldId: number, slot: string, e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (fieldId: number, slot: string, e: React.DragEvent) => void;
  onContextMenu: (m: Match, e: React.MouseEvent) => void;
  saving: number | null; cellHeight: number;
}) {
  const t = useTranslations("admin");
  const isEmpty = !match;
  const canPlace = !!selectedMatch && isEmpty;
  const isHovered = dragOverCell?.fieldId === fieldId && dragOverCell?.slot === slot;
  const isDraggingThis = dragState?.matchId === match?.id;
  const validity = isHovered ? dragOverCell!.validity : null;
  const color = match ? stageColor(match.stageId ?? 0) : "var(--cat-accent)";
  const divisionName = match && getDivName ? getDivName(match.stageId ?? 0) : undefined;

  let bg = "var(--cat-card-bg)";
  let borderColor = "var(--cat-card-border)";
  let borderStyle: "solid" | "dashed" = "solid";
  let cursor: string = "default";
  let dropLabel: React.ReactNode = null;

  if (isHovered) {
    if (validity === "valid") {
      bg = "rgba(43,254,186,0.10)";
      borderColor = "#2BFEBA";
      borderStyle = "dashed";
      dropLabel = <span className="text-[9px] font-bold" style={{ color: "#2BFEBA" }}>{t("planner.dropHere")}</span>;
      cursor = "copy";
    } else if (validity === "conflict") {
      bg = "rgba(239,68,68,0.10)";
      borderColor = "#ef4444";
      borderStyle = "dashed";
      dropLabel = <span className="text-[9px] font-bold" style={{ color: "#ef4444" }}>{t("planner.dropConflict")}</span>;
      cursor = "no-drop";
    } else if (validity === "occupied") {
      bg = "rgba(255,255,255,0.03)";
      borderColor = "var(--cat-card-border)";
      cursor = "not-allowed";
    }
  } else if (canPlace) {
    bg = "rgba(6,182,212,0.07)";
    borderColor = "var(--cat-accent)";
    borderStyle = "dashed";
    cursor = "pointer";
  } else if (match) {
    cursor = "grab";
  }

  return (
    <div
      onClick={() => {
        if (!isEmpty) onSelectMatch(match!);
        else if (canPlace) onPlaceMatch();
      }}
      onDragOver={e => onDragOver(fieldId, slot, e)}
      onDragLeave={onDragLeave}
      onDrop={e => onDrop(fieldId, slot, e)}
      className="group relative rounded border transition-all duration-100"
      style={{
        height: cellHeight,
        background: bg,
        borderColor,
        borderStyle,
        cursor,
        boxShadow: selected && match ? `0 0 0 2px ${color}55` : undefined,
      }}
    >
      {match ? (
        <div className="absolute inset-0.5">
          <MatchCard
            match={match}
            color={color}
            conflict={conflict}
            selected={selected}
            compact
            isDragging={isDraggingThis}
            divisionName={divisionName}
            onDragStart={() => onDragStart(match)}
            onDragEnd={onDragEnd}
            onContextMenu={e => onContextMenu(match, e)}
            onClick={() => onSelectMatch(match)}
            onUnschedule={() => onUnschedule(match)}
            saving={saving === match.id}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-full gap-1">
          {dropLabel}
          {canPlace && !dropLabel && (
            <span className="text-[9px] font-semibold" style={{ color: "var(--cat-accent)" }}>
              {t("planner.placeHere")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ContextMenu ──────────────────────────────────────────────────────────────

function ContextMenuPanel({
  ctx, match, fields,
  onClose, onUnschedule, onSwap, onEdit,
}: {
  ctx: CtxMenu; match: Match; fields: Field[];
  onClose: () => void; onUnschedule: () => void;
  onSwap: () => void; onEdit: () => void;
}) {
  const t = useTranslations("admin");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("keydown", esc); };
  }, [onClose]);

  const item = (icon: React.ReactNode, label: string, action: () => void, danger = false) => (
    <button
      onClick={() => { action(); onClose(); }}
      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all hover:opacity-80"
      style={{
        color: danger ? "#ef4444" : "var(--cat-text)",
        background: "transparent",
      }}
      onMouseEnter={e => { (e.target as HTMLElement).style.background = danger ? "rgba(239,68,68,0.1)" : "var(--cat-tag-bg)"; }}
      onMouseLeave={e => { (e.target as HTMLElement).style.background = "transparent"; }}
    >
      {icon}{label}
    </button>
  );

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-xl border shadow-2xl py-1"
      style={{
        left: Math.min(ctx.x, window.innerWidth - 200),
        top: Math.min(ctx.y, window.innerHeight - 160),
        background: "var(--cat-card-bg)",
        borderColor: "var(--cat-card-border)",
        minWidth: 180,
      }}
    >
      <div className="px-3 py-1.5 border-b text-[10px] font-black tracking-wide"
        style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)" }}>
        {t("planner.matchNumber", { num: match.matchNumber ?? "—" })}
      </div>
      {item(<Edit2 className="w-3.5 h-3.5" />, t("planner.editTimeField"), onEdit)}
      {match.homeTeamId && match.awayTeamId &&
        item(<ArrowLeftRight className="w-3.5 h-3.5" />, t("planner.swapTeams"), onSwap)}
      {item(<CalendarOff className="w-3.5 h-3.5" />, t("planner.unschedule"), onUnschedule, true)}
    </div>
  );
}

// ─── EditPopover ──────────────────────────────────────────────────────────────

function EditPopover({
  edit, fields, onSave, onClose,
}: {
  edit: EditState; fields: Field[];
  onSave: (date: string, time: string, fieldId: number) => void;
  onClose: () => void;
}) {
  const t = useTranslations("admin");
  const [date, setDate] = useState(edit.date);
  const [time, setTime] = useState(edit.time);
  const [fieldId, setFieldId] = useState(edit.fieldId);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const iStyle = {
    background: "var(--cat-input-bg, var(--cat-card-bg))",
    border: "1px solid var(--cat-card-border)",
    color: "var(--cat-text)",
    borderRadius: 8, padding: "6px 10px", fontSize: 12,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="rounded-2xl border p-5 space-y-4 shadow-2xl"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", minWidth: 300 }}>
        <div className="flex items-center justify-between">
          <p className="font-bold text-sm" style={{ color: "var(--cat-text)" }}>
            {t("planner.editMatch", { num: edit.match.matchNumber ?? "—" })}
          </p>
          <button onClick={onClose} style={{ color: "var(--cat-text-muted)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-[11px] font-semibold mb-1 block" style={{ color: "var(--cat-text-muted)" }}>{t("planner.date")}</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={iStyle} className="w-full outline-none" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold mb-1 block" style={{ color: "var(--cat-text-muted)" }}>{t("planner.time")}</span>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={iStyle} className="w-full outline-none" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold mb-1 block" style={{ color: "var(--cat-text-muted)" }}>{t("planner.field")}</span>
            <select value={fieldId} onChange={e => setFieldId(+e.target.value)} style={{ ...iStyle, width: "100%" }} className="outline-none">
              {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => { onSave(date, time, fieldId); onClose(); }}
            className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: "var(--cat-accent)", color: "#0A0E14" }}>
            {t("planner.save")}
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
            {t("planner.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── StadiumScheduleModal ─────────────────────────────────────────────────────

const STADIUM_COLORS = [
  { bg: "#0f2420", border: "rgba(43,254,186,0.3)",  accent: "#2BFEBA" },
  { bg: "#131228", border: "rgba(99,102,241,0.3)",  accent: "#6366f1" },
  { bg: "#201a0e", border: "rgba(245,158,11,0.3)",  accent: "#f59e0b" },
  { bg: "#1f1010", border: "rgba(239,68,68,0.3)",   accent: "#ef4444" },
  { bg: "#1a1020", border: "rgba(168,85,247,0.3)",  accent: "#a855f7" },
  { bg: "#0e1820", border: "rgba(14,165,233,0.3)",  accent: "#0ea5e9" },
];

const TIME_PRESETS = [
  { label: "9–18", start: "09:00", end: "18:00" },
  { label: "8–20", start: "08:00", end: "20:00" },
  { label: "10–17", start: "10:00", end: "17:00" },
];

function calcOpenHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
}

function StadiumScheduleModal({
  stadiums,
  tournamentDays,
  schedules,
  base,
  onClose,
  onSaved,
}: {
  stadiums: StadiumObject[];
  tournamentDays: string[];
  schedules: StadiumScheduleEntry[];
  base: string;
  onClose: () => void;
  onSaved: (entries: StadiumScheduleEntry[]) => void;
}) {
  // Build local editable state: Map<"stadiumId:date", {open, startTime, endTime}>
  const buildLocalState = useCallback(() => {
    const m = new Map<string, { open: boolean; startTime: string; endTime: string }>();
    for (const s of stadiums) {
      for (const d of tournamentDays) {
        const key = `${s.id}:${d}`;
        const saved = schedules.find(e => e.stadiumId === s.id && e.date === d);
        if (saved) {
          m.set(key, {
            open: saved.startTime !== null,
            startTime: saved.startTime ?? "09:00",
            endTime: saved.endTime ?? "18:00",
          });
        } else {
          m.set(key, { open: true, startTime: "09:00", endTime: "18:00" });
        }
      }
    }
    return m;
  }, [stadiums, tournamentDays, schedules]);

  const t = useTranslations("admin");
  const [localState, setLocalState] = useState(() => buildLocalState());
  const [saving, setSaving] = useState(false);
  const [copyFromStadium, setCopyFromStadium] = useState<number | null>(null);

  useEffect(() => {
    setLocalState(buildLocalState());
  }, [buildLocalState]);

  function setEntry(stadiumId: number, date: string, patch: Partial<{ open: boolean; startTime: string; endTime: string }>) {
    const key = `${stadiumId}:${date}`;
    setLocalState(prev => {
      const copy = new Map(prev);
      const cur = copy.get(key) ?? { open: true, startTime: "09:00", endTime: "18:00" };
      copy.set(key, { ...cur, ...patch });
      return copy;
    });
  }

  // Apply same time to all days for a stadium
  function applyToAllDays(stadiumId: number, startTime: string, endTime: string, open: boolean) {
    setLocalState(prev => {
      const copy = new Map(prev);
      for (const d of tournamentDays) {
        copy.set(`${stadiumId}:${d}`, { open, startTime, endTime });
      }
      return copy;
    });
  }

  // Copy schedule from one stadium to another
  function doCopyFrom(targetStadiumId: number, sourceStadiumId: number) {
    setLocalState(prev => {
      const copy = new Map(prev);
      for (const d of tournamentDays) {
        const src = prev.get(`${sourceStadiumId}:${d}`);
        if (src) copy.set(`${targetStadiumId}:${d}`, { ...src });
      }
      return copy;
    });
    setCopyFromStadium(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const scheduleEntries: StadiumScheduleEntry[] = [];
      for (const s of stadiums) {
        for (const d of tournamentDays) {
          const key = `${s.id}:${d}`;
          const entry = localState.get(key);
          if (!entry) continue;
          scheduleEntries.push({
            stadiumId: s.id,
            date: d,
            startTime: entry.open ? entry.startTime : null,
            endTime: entry.open ? entry.endTime : null,
          });
        }
      }

      const res = await fetch(`${base}/stadium-schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules: scheduleEntries }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onSaved(scheduleEntries);
      onClose();
    } catch {
      // silence — caller shows toast
    } finally {
      setSaving(false);
    }
  }

  function fmtDay(d: string) {
    return new Date(d + "T12:00:00Z").toLocaleDateString("ru-RU", {
      weekday: "short", day: "numeric", month: "short",
    });
  }

  if (stadiums.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="rounded-2xl border p-6" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", minWidth: 320 }}>
          <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
            {t("planner.noStadiums")}
          </p>
          <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>{t("planner.close")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-3 pb-4"
      style={{ background: "rgba(0,0,0,0.75)", overflowY: "auto" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl border shadow-2xl w-full"
        style={{ background: "var(--cat-dropdown-bg, #141920)", borderColor: "var(--cat-card-border)", maxWidth: 900 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--cat-card-border)" }}>
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4" style={{ color: "#2BFEBA" }} />
            <span className="font-black text-sm" style={{ color: "var(--cat-text)" }}>{t("planner.stadiumScheduleTitle")}</span>
            {tournamentDays.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-lg"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                {t("planner.dayCount", { count: tournamentDays.length })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {stadiums.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setCopyFromStadium(prev => prev === -1 ? null : -1)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)", border: "1px solid var(--cat-card-border)" }}>
                  {t("planner.copyFromStadium")}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {copyFromStadium === -1 && (
                  <div className="absolute right-0 top-full mt-1 rounded-xl border shadow-xl z-10 min-w-[200px]"
                    style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                    <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
                      {t("planner.chooseSource")}
                    </p>
                    {stadiums.map((s, si) => (
                      <button key={s.id}
                        onClick={() => setCopyFromStadium(s.id)}
                        className="w-full text-left px-3 py-2 text-xs font-semibold transition-all hover:opacity-80"
                        style={{ color: STADIUM_COLORS[si % STADIUM_COLORS.length].accent }}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
                {copyFromStadium !== null && copyFromStadium !== -1 && (
                  <div className="absolute right-0 top-full mt-1 rounded-xl border shadow-xl z-10 min-w-[220px]"
                    style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                    <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
                      {t("planner.copyToStadium")}
                    </p>
                    {stadiums.filter(s => s.id !== copyFromStadium).map((s, si) => (
                      <button key={s.id}
                        onClick={() => doCopyFrom(s.id, copyFromStadium)}
                        className="w-full text-left px-3 py-2 text-xs font-semibold transition-all hover:opacity-80"
                        style={{ color: STADIUM_COLORS[si % STADIUM_COLORS.length].accent }}>
                        → {s.name}
                      </button>
                    ))}
                    <button onClick={() => setCopyFromStadium(null)}
                      className="w-full text-left px-3 py-2 text-[11px] border-t"
                      style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)" }}>
                      {t("planner.cancel")}
                    </button>
                  </div>
                )}
              </div>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg transition-all hover:opacity-70"
              style={{ color: "var(--cat-text-muted)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto" style={{ maxHeight: "65vh" }}>
          {tournamentDays.length === 0 && (
            <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
              {t("planner.noMatchesWithDatesBody")}
            </p>
          )}

          {stadiums.map((stadium, si) => {
            const color = STADIUM_COLORS[si % STADIUM_COLORS.length];

            // Stats: open days and total hours
            let openDays = 0;
            let totalHours = 0;
            for (const d of tournamentDays) {
              const e = localState.get(`${stadium.id}:${d}`);
              if (e?.open) {
                openDays++;
                totalHours += calcOpenHours(e.startTime, e.endTime);
              }
            }
            const allOpen = openDays === tournamentDays.length && tournamentDays.length > 0;
            const noneOpen = openDays === 0;

            // Pick a representative entry for "apply to all" quick action
            const firstOpen = tournamentDays
              .map(d => localState.get(`${stadium.id}:${d}`))
              .find(e => e?.open);

            return (
              <div key={stadium.id} className="rounded-2xl border overflow-hidden"
                style={{ borderColor: color.border, background: color.bg }}>

                {/* Stadium header row */}
                <div className="px-4 py-3 flex items-center gap-3 flex-wrap"
                  style={{ borderBottom: `1px solid ${color.border}` }}>
                  <Building2 className="w-4 h-4 shrink-0" style={{ color: color.accent }} />
                  <span className="font-black text-sm tracking-wide" style={{ color: color.accent }}>
                    {stadium.name.toUpperCase()}
                  </span>

                  {/* Status badge */}
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{
                      background: allOpen ? "rgba(43,254,186,0.15)" : noneOpen ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                      color: allOpen ? "#2BFEBA" : noneOpen ? "#ef4444" : "#f59e0b",
                    }}>
                    {allOpen ? t("planner.stadiumAllOpen") : noneOpen ? t("planner.stadiumAllClosed") : t("planner.stadiumPartOpen", { open: openDays, total: tournamentDays.length })}
                  </span>

                  {/* Hours summary */}
                  {openDays > 0 && (
                    <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                      {t("planner.dayCount", { count: openDays })} · {t("planner.hourCount", { count: totalHours.toFixed(0) })}
                    </span>
                  )}

                  {/* Quick actions */}
                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        const st = firstOpen?.startTime ?? "09:00";
                        const et = firstOpen?.endTime ?? "18:00";
                        applyToAllDays(stadium.id, st, et, true);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                      style={{ background: `${color.accent}18`, color: color.accent, border: `1px solid ${color.border}` }}>
                      {t("planner.openAll")}
                    </button>
                    <button
                      onClick={() => applyToAllDays(stadium.id, "09:00", "18:00", false)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                      style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                      {t("planner.closeAll")}
                    </button>
                  </div>
                </div>

                {/* Days grid — days as columns */}
                {tournamentDays.length > 0 && (
                  <div className="px-4 py-3">
                    {/* Column headers */}
                    <div className="grid gap-2 mb-2"
                      style={{ gridTemplateColumns: `repeat(${Math.min(tournamentDays.length, 4)}, minmax(0, 1fr))` }}>
                      {tournamentDays.map(date => (
                        <div key={date} className="text-center text-[10px] font-bold uppercase tracking-wide py-1"
                          style={{ color: "var(--cat-text-muted)" }}>
                          {fmtDay(date)}
                        </div>
                      ))}
                    </div>

                    {/* Day cards */}
                    <div className="grid gap-2"
                      style={{ gridTemplateColumns: `repeat(${Math.min(tournamentDays.length, 4)}, minmax(0, 1fr))` }}>
                      {tournamentDays.map(date => {
                        const entry = localState.get(`${stadium.id}:${date}`) ?? { open: true, startTime: "09:00", endTime: "18:00" };
                        return (
                          <div key={date}
                            className="rounded-xl p-2.5 flex flex-col gap-2 transition-all"
                            style={entry.open ? {
                              background: `${color.accent}0F`,
                              border: `1px solid ${color.border}`,
                            } : {
                              background: "rgba(239,68,68,0.04)",
                              border: "1px dashed rgba(239,68,68,0.2)",
                              opacity: 0.65,
                            }}>

                            {/* Open/Closed toggle */}
                            <button
                              onClick={() => setEntry(stadium.id, date, { open: !entry.open })}
                              className="flex items-center justify-center gap-1.5 w-full py-1 rounded-lg text-[11px] font-bold transition-all"
                              style={entry.open ? {
                                background: `${color.accent}18`,
                                color: color.accent,
                                border: `1px solid ${color.border}`,
                              } : {
                                background: "rgba(239,68,68,0.10)",
                                color: "#ef4444",
                                border: "1px solid rgba(239,68,68,0.25)",
                              }}>
                              {entry.open
                                ? <><CheckCircle className="w-3 h-3" /> {t("planner.stadiumOpen")}</>
                                : <><X className="w-3 h-3" /> {t("planner.stadiumClosed")}</>}
                            </button>

                            {/* Time inputs */}
                            {entry.open && (
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="time"
                                    value={entry.startTime}
                                    onChange={e => setEntry(stadium.id, date, { startTime: e.target.value })}
                                    className="flex-1 rounded-lg px-1.5 py-1 text-[11px] text-center outline-none min-w-0"
                                    style={{
                                      background: "var(--cat-input-bg, var(--cat-card-bg))",
                                      border: "1px solid var(--cat-card-border)",
                                      color: "var(--cat-text)",
                                    }}
                                  />
                                  <span className="text-[10px] shrink-0" style={{ color: "var(--cat-text-muted)" }}>—</span>
                                  <input
                                    type="time"
                                    value={entry.endTime}
                                    onChange={e => setEntry(stadium.id, date, { endTime: e.target.value })}
                                    className="flex-1 rounded-lg px-1.5 py-1 text-[11px] text-center outline-none min-w-0"
                                    style={{
                                      background: "var(--cat-input-bg, var(--cat-card-bg))",
                                      border: "1px solid var(--cat-card-border)",
                                      color: "var(--cat-text)",
                                    }}
                                  />
                                </div>

                                {/* Time presets */}
                                <div className="flex gap-1 justify-center">
                                  {TIME_PRESETS.map(p => {
                                    const active = entry.startTime === p.start && entry.endTime === p.end;
                                    return (
                                      <button key={p.label}
                                        onClick={() => setEntry(stadium.id, date, { startTime: p.start, endTime: p.end })}
                                        className="px-1.5 py-0.5 rounded-md text-[9px] font-bold transition-all"
                                        style={{
                                          background: active ? `${color.accent}25` : "var(--cat-tag-bg)",
                                          color: active ? color.accent : "var(--cat-text-muted)",
                                          border: `1px solid ${active ? color.border : "transparent"}`,
                                        }}>
                                        {p.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
            {t("planner.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #2BFEBA, #06b6d4)", color: "#0A0E14" }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {t("planner.saveSchedule")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FieldAllocationOverview ─────────────────────────────────────────────────
/**
 * Cross-division visual timeline. Shows every field as a horizontal bar
 * with coloured segments per division. Makes it instantly obvious:
 *   - Which divisions share a field
 *   - When they play (coloured window within the day bar)
 *   - If two divisions have overlapping windows on the same field
 *   - How many match slots are available vs needed
 */

const DIV_COLORS = [
  "#2BFEBA", // teal
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f97316", // orange
];

function FieldAllocationOverview({
  fields,
  classes,
  divConfigs,
}: {
  fields: Field[];
  classes: TournamentClass[];
  divConfigs: Record<number, ScheduleConfig>;
}) {
  const t = useTranslations("admin");
  // Build map: fieldId → list of (classId, name, startTime, endTime, matchSlot, color)
  type DivWindow = {
    classId: number;
    name: string;
    startTime: string;
    endTime: string;
    matchSlotMin: number;
    color: string;
  };
  const fieldWindows = new Map<number, DivWindow[]>();
  for (const f of fields) fieldWindows.set(f.id, []);

  classes.forEach((cls, idx) => {
    const cfg = divConfigs[cls.id];
    if (!cfg) return;
    const fieldIds = cfg.fieldIds ?? [];
    const color = DIV_COLORS[idx % DIV_COLORS.length];
    const startTime = cfg.dailyStartTime ?? "09:00";
    const endTime   = cfg.dailyEndTime   ?? "18:00";
    const slot = matchSlotMinutes(cfg) + (cfg.breakBetweenMatchesMinutes ?? 0);
    for (const fid of fieldIds) {
      if (!fieldWindows.has(fid)) continue;
      fieldWindows.get(fid)!.push({ classId: cls.id, name: cls.name, startTime, endTime, matchSlotMin: slot, color });
    }
  });

  // Global day span = earliest start / latest end across all divisions
  let globalStart = 540; // 09:00
  let globalEnd   = 1080; // 18:00
  for (const cls of classes) {
    const cfg = divConfigs[cls.id];
    if (!cfg) continue;
    const s = (cfg.dailyStartTime ?? "09:00").split(":").map(Number);
    const e = (cfg.dailyEndTime   ?? "18:00").split(":").map(Number);
    globalStart = Math.min(globalStart, s[0] * 60 + s[1]);
    globalEnd   = Math.max(globalEnd,   e[0] * 60 + e[1]);
  }
  const totalSpan = Math.max(1, globalEnd - globalStart);

  // Find fields with >1 division (shared fields)
  const sharedFields = fields.filter(f => (fieldWindows.get(f.id)?.length ?? 0) > 1);
  const unassignedFields = fields.filter(f => (fieldWindows.get(f.id)?.length ?? 0) === 0);

  function toPercent(min: number) {
    return ((min - globalStart) / totalSpan) * 100;
  }

  function parseMin(t: string) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  if (fields.length === 0) return null;

  return (
    <div className="rounded-xl border p-3 mb-2" style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
          {t("planner.fieldAllocationTitle")}
        </p>
        {sharedFields.length > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "rgba(99,102,241,0.2)", color: "#6366f1" }}>
            {t("planner.sharedFields", { count: sharedFields.length })}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {fields.map(f => {
          const windows = fieldWindows.get(f.id) ?? [];
          const label = f.stadium ? `${f.stadium.name} · ${f.name}` : f.name;

          // Check for full-window overlap (two divisions with identical time windows)
          let overlapWarning = false;
          for (let i = 0; i < windows.length; i++) {
            for (let j = i + 1; j < windows.length; j++) {
              if (windows[i].startTime === windows[j].startTime && windows[i].endTime === windows[j].endTime) {
                overlapWarning = true;
              }
            }
          }

          return (
            <div key={f.id} className="flex items-center gap-2">
              {/* Field label */}
              <span className="text-[10px] font-semibold shrink-0 w-32 truncate" style={{ color: "var(--cat-text-secondary)" }} title={label}>
                {label}
              </span>

              {/* Timeline bar */}
              <div className="flex-1 relative rounded overflow-hidden" style={{ height: 18, background: "rgba(255,255,255,0.04)", border: "1px solid var(--cat-card-border)" }}>
                {windows.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[9px]" style={{ color: "var(--cat-text-muted)" }}>{t("planner.fieldUnassigned")}</span>
                  </div>
                ) : (
                  windows.map((w, i) => {
                    const startPct = toPercent(parseMin(w.startTime));
                    const endPct   = toPercent(parseMin(w.endTime));
                    const width = Math.max(2, endPct - startPct);
                    return (
                      <div key={i} title={`${w.name}: ${w.startTime}–${w.endTime} (${t("planner.min")} ${w.matchSlotMin})`}
                        className="absolute top-0 bottom-0 rounded-sm"
                        style={{
                          left: `${startPct}%`,
                          width: `${width}%`,
                          background: w.color + (windows.length > 1 ? "99" : "cc"),
                          border: `1px solid ${w.color}`,
                          zIndex: i,
                        }}
                      >
                        {width > 15 && (
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black truncate px-1"
                            style={{ color: "#0a0e14" }}>
                            {w.name.length > 8 ? w.name.slice(0, 7) + "…" : w.name}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Hour grid lines */}
                {Array.from({ length: Math.floor(totalSpan / 60) + 1 }, (_, h) => {
                  const pct = toPercent(globalStart + h * 60);
                  if (pct < 0 || pct > 100) return null;
                  return <div key={h} className="absolute top-0 bottom-0 w-px" style={{ left: `${pct}%`, background: "rgba(255,255,255,0.08)", zIndex: 10 }} />;
                })}
              </div>

              {/* Warnings / info */}
              <div className="flex items-center gap-1 shrink-0">
                {overlapWarning && (
                  <span title={t("planner.sharedFieldWarning")}
                    className="text-[9px] font-bold px-1 rounded"
                    style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}>
                    {t("planner.fieldOverlap")}
                  </span>
                )}
                {windows.length === 0 && (
                  <span className="text-[9px]" style={{ color: "var(--cat-text-muted)" }}>—</span>
                )}
                {windows.length > 0 && (
                  <span className="text-[9px] font-semibold" style={{ color: "var(--cat-text-muted)" }}>
                    {windows.map(w => w.startTime.slice(0, 5) + "–" + w.endTime.slice(0, 5)).join(" / ")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {classes.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
          {classes.map((cls, idx) => {
            const cfg = divConfigs[cls.id];
            const slot = cfg ? matchSlotMinutes(cfg) : 0;
            return (
              <div key={cls.id} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: DIV_COLORS[idx % DIV_COLORS.length] }} />
                <span className="text-[10px]" style={{ color: "var(--cat-text-secondary)" }}>
                  {cls.name}
                  {slot > 0 && <span className="ml-1 opacity-60">{slot}{t("planner.min")}</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Helpful hints */}
      <div className="mt-2 space-y-1">
        {unassignedFields.length > 0 && (
          <p className="text-[10px]" style={{ color: "#f59e0b" }}>
            {t("planner.fieldUnassignedWarning", { count: unassignedFields.length })}
          </p>
        )}
        {sharedFields.length > 0 && (
          <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
            {t("planner.sharedFieldsHint")}
          </p>
        )}
        {classes.filter(c => !(divConfigs[c.id]?.fieldIds?.length ?? 0)).length > 0 && (
          <p className="text-[10px]" style={{ color: "#ef4444" }}>
            {t("planner.noFieldsForDiv")}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── DivisionConfigPanel ──────────────────────────────────────────────────────

function getDefaultWeight(key: string): number {
  const defaults: Record<string, number> = {
    fieldUtilization: 0.5,
    teamRestComfort: 0.8,
    homeAwayBalance: 0.3,
    primetimeForBigMatches: 0.2,
    groupFieldAffinity: 0.6,
    refereeWorkloadBalance: 0.5,
    travelMinimization: 0.2,
    dayLoadBalance: 0.3,
  };
  return defaults[key] ?? 0.5;
}

function matchSlotMinutes(cfg: ScheduleConfig): number {
  // Total match slot = halves + break between halves (not between games)
  const halvesCount = cfg.halvesCount ?? 2;
  const halfDur     = cfg.halfDurationMinutes ?? (cfg.matchDurationMinutes ?? 45) / halvesCount;
  const halfBreak   = cfg.breakBetweenHalvesMinutes ?? 5;
  return halvesCount * halfDur + (halvesCount > 1 ? halfBreak : 0);
}

function defaultConfig(fields: Field[]): ScheduleConfig {
  return {
    fieldIds: fields.map(f => f.id),
    dailyStartTime: "09:00",
    dailyEndTime: "18:00",
    halvesCount: 2,
    halfDurationMinutes: 20,
    breakBetweenHalvesMinutes: 5,
    breakBetweenMatchesMinutes: 10,
    maxMatchesPerTeamPerDay: 3,
    minRestBetweenTeamMatchesMinutes: 60,
  };
}

function countDays(startDate?: string | null, endDate?: string | null): number {
  if (!startDate || !endDate) return 1;
  const s = new Date(startDate + "T12:00:00Z");
  const e = new Date(endDate + "T12:00:00Z");
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}

function DivisionConfigPanel({
  cls, config, fields, stages, saving, generating, clearing,
  onChange, onSave, onGenerate, onClear, onDatesChange,
}: {
  cls: TournamentClass;
  config: ScheduleConfig;
  fields: Field[];
  stages: Stage[];
  saving: boolean;
  generating: boolean;
  clearing: boolean;
  onChange: (cfg: ScheduleConfig) => void;
  onSave: () => void;
  onGenerate: () => void;
  onClear: () => void;
  onDatesChange: (startDate: string | null, endDate: string | null) => void;
}) {
  const t = useTranslations("admin");
  const [expanded, setExpanded] = useState(false);
  const [showWeights, setShowWeights] = useState(false);
  const [fieldStagePopover, setFieldStagePopover] = useState<number | null>(null); // fieldId with open popover
  // Local editable dates (initialised from cls, kept in sync)
  const [localStart, setLocalStart] = useState(cls.startDate ?? "");
  const [localEnd,   setLocalEnd]   = useState(cls.endDate   ?? "");

  // Sync when cls prop changes (e.g. after external save)
  useEffect(() => { setLocalStart(cls.startDate ?? ""); }, [cls.startDate]);
  useEffect(() => { setLocalEnd(cls.endDate     ?? ""); }, [cls.endDate]);

  const iStyle: React.CSSProperties = {
    background: "var(--cat-input-bg, var(--cat-card-bg))",
    border: "1px solid var(--cat-card-border)",
    color: "var(--cat-text)",
    borderRadius: 8, padding: "5px 8px", fontSize: 14,
  };

  function toggleField(fid: number) {
    const current = config.fieldIds;
    const next = current.includes(fid) ? current.filter(id => id !== fid) : [...current, fid];
    onChange({ ...config, fieldIds: next });
  }

  // Build list of dates for this division
  function buildDateRange(start: string, end: string): string[] {
    const dates: string[] = [];
    const cur = new Date(start + "T12:00:00Z");
    const endD = new Date(end + "T12:00:00Z");
    while (cur <= endD) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return dates;
  }

  function getDaySchedule(date: string): { startTime: string; endTime: string } {
    const entry = config.daySchedule?.find(d => d.date === date);
    return {
      startTime: entry?.startTime ?? config.dailyStartTime ?? "09:00",
      endTime:   entry?.endTime   ?? config.dailyEndTime   ?? "18:00",
    };
  }

  function setDaySchedule(date: string, startTime: string, endTime: string) {
    const existing = config.daySchedule?.filter(d => d.date !== date) ?? [];
    onChange({ ...config, daySchedule: [...existing, { date, startTime, endTime }] });
  }

  // ── Stadium-level schedule helpers (ONE TRUTH: stadiumDaySchedule) ──────────
  // All reads/writes go directly to cfg.stadiumDaySchedule; fieldDaySchedule is legacy and ignored.

  function getSdSchedule(stadiumId: number, date: string): { startTime: string | null; endTime: string | null } | null {
    return config.stadiumDaySchedule?.find(e => e.stadiumId === stadiumId && e.date === date) ?? null;
  }

  function setSdSchedule(stadiumId: number, date: string, startTime: string | null, endTime: string | null) {
    const filtered = config.stadiumDaySchedule?.filter(e => !(e.stadiumId === stadiumId && e.date === date)) ?? [];
    onChange({ ...config, stadiumDaySchedule: [...filtered, { stadiumId, date, startTime, endTime }] });
  }

  function clearSdSchedule(stadiumId: number, date: string) {
    const filtered = config.stadiumDaySchedule?.filter(e => !(e.stadiumId === stadiumId && e.date === date)) ?? [];
    onChange({ ...config, stadiumDaySchedule: filtered });
  }

  function getFieldStageIds(fieldId: number): number[] {
    return config.fieldStageIds?.[String(fieldId)] ?? [];
  }

  function setFieldStageIds(fieldId: number, stageIds: number[]) {
    const current = { ...(config.fieldStageIds ?? {}) };
    if (stageIds.length === 0) {
      delete current[String(fieldId)];
    } else {
      current[String(fieldId)] = stageIds;
    }
    onChange({ ...config, fieldStageIds: current });
  }

  const numDays = countDays(localStart || null, localEnd || null);
  const dailyStart = config.dailyStartTime ?? "09:00";
  const dailyEnd   = config.dailyEndTime   ?? "18:00";
  const startMins  = parseInt(dailyStart) * 60 + parseInt(dailyStart.slice(3));
  const endMins    = parseInt(dailyEnd)   * 60 + parseInt(dailyEnd.slice(3));
  const matchSlot   = matchSlotMinutes(config);
  const slotsPerDay = Math.max(0, Math.floor((endMins - startMins) / (matchSlot + config.breakBetweenMatchesMinutes)));
  const matchCount  = config.fieldIds.length * numDays * slotsPerDay;

  const divisionDates = (localStart && localEnd) ? buildDateRange(localStart, localEnd) : [];

  // Build unique stadiums from selected fields (preserve insertion order)
  const selectedStadiums = (() => {
    const map = new Map<number, { id: number; name: string }>();
    for (const f of fields) {
      if (!config.fieldIds.includes(f.id)) continue;
      if (f.stadium && !map.has(f.stadium.id)) map.set(f.stadium.id, f.stadium);
    }
    return [...map.values()];
  })();

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--cat-card-border)" }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 transition-all"
        style={{ background: expanded ? "rgba(43,254,186,0.05)" : "var(--cat-card-bg)", textAlign: "left" }}>
        {expanded ? <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "#2BFEBA" }} />
          : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />}
        <span className="font-bold text-base" style={{ color: "var(--cat-text)" }}>{cls.name}</span>
        <span className="text-sm ml-1" style={{ color: "var(--cat-text-muted)" }}>
          {t("planner.divisionSummary", { fields: config.fieldIds.length, days: numDays, slot: matchSlot })}
        </span>
        <span className="ml-auto text-sm font-semibold" style={{ color: "var(--cat-accent)" }}>
          {t("planner.divisionSlots", { count: matchCount })}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 space-y-4 border-t" style={{ borderColor: "var(--cat-card-border)", fontSize: 15 }}>

          {/* Fields + Stage Assignment */}
          <div>
            <p className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: "var(--cat-text-muted)" }}>
              {t("planner.fieldsSection")}
            </p>
            <div className="flex flex-wrap gap-2">
              {fields.map(f => {
                const active = config.fieldIds.includes(f.id);
                const label = f.stadium ? `${f.stadium.name} · ${f.name}` : f.name;
                const assignedStages = getFieldStageIds(f.id);
                const hasAssignment = assignedStages.length > 0;
                return (
                  <div key={f.id} className="relative">
                    <div className="flex items-stretch rounded-lg overflow-hidden"
                      style={{ border: `1px solid ${active ? "rgba(43,254,186,0.4)" : "var(--cat-card-border)"}` }}>
                      <button onClick={() => toggleField(f.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-sm font-semibold transition-all"
                        style={{
                          background: active ? "rgba(43,254,186,0.15)" : "var(--cat-tag-bg)",
                          color: active ? "#2BFEBA" : "var(--cat-text-muted)",
                        }}>
                        {active && <CheckCircle className="w-3 h-3" />}
                        {label}
                      </button>
                      {active && stages.length > 1 && (
                        <button
                          onClick={() => setFieldStagePopover(fieldStagePopover === f.id ? null : f.id)}
                          title={t("planner.stagesForField", { field: f.name })}
                          className="flex items-center px-1.5 border-l transition-all hover:opacity-80"
                          style={{
                            background: hasAssignment ? "rgba(99,102,241,0.2)" : "var(--cat-tag-bg)",
                            borderColor: "rgba(43,254,186,0.4)",
                            color: hasAssignment ? "#6366f1" : "var(--cat-text-muted)",
                          }}>
                          <Shield className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {/* Stage assignment popover */}
                    {fieldStagePopover === f.id && (
                      <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border shadow-xl p-3 min-w-[200px]"
                        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                        <p className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: "var(--cat-text-muted)" }}>
                          {t("planner.stagesForField", { field: f.name })}
                        </p>
                        <p className="text-sm mb-2" style={{ color: "var(--cat-text-muted)" }}>
                          {assignedStages.length === 0 ? t("planner.allStagesOption") : t("planner.stagesCount", { count: assignedStages.length })}
                        </p>
                        <div className="space-y-1">
                          <button
                            onClick={() => setFieldStageIds(f.id, [])}
                            className="w-full text-left text-sm px-2 py-1 rounded-lg transition-all"
                            style={{
                              background: assignedStages.length === 0 ? "rgba(43,254,186,0.15)" : "var(--cat-tag-bg)",
                              color: assignedStages.length === 0 ? "#2BFEBA" : "var(--cat-text-secondary)",
                            }}>
                            ✓ {t("planner.allStagesOption")}
                          </button>
                          {stages.map(s => {
                            const isAssigned = assignedStages.includes(s.id);
                            return (
                              <button key={s.id}
                                onClick={() => {
                                  const next = isAssigned
                                    ? assignedStages.filter(id => id !== s.id)
                                    : [...assignedStages, s.id];
                                  setFieldStageIds(f.id, next);
                                }}
                                className="w-full text-left text-sm px-2 py-1 rounded-lg transition-all"
                                style={{
                                  background: isAssigned ? "rgba(99,102,241,0.15)" : "var(--cat-tag-bg)",
                                  color: isAssigned ? "#6366f1" : "var(--cat-text-secondary)",
                                }}>
                                {isAssigned ? "✓ " : "○ "}{s.name}
                              </button>
                            );
                          })}
                        </div>
                        <button onClick={() => setFieldStagePopover(null)}
                          className="mt-2 w-full text-sm text-center hover:opacity-70"
                          style={{ color: "var(--cat-text-muted)" }}>
                          {t("planner.close")}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {Object.keys(config.fieldStageIds ?? {}).length > 0 && (
              <p className="text-sm mt-1.5" style={{ color: "#6366f1" }}>
                {t("planner.fieldSomeStagesOnly")}
              </p>
            )}
          </div>

          {/* Division dates — editable, saved with "Сохранить настройки" */}
          <div>
            <p className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: "var(--cat-text-muted)" }}>
              {t("planner.divDatesSection")}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="date" value={localStart}
                onChange={e => { setLocalStart(e.target.value); onDatesChange(e.target.value || null, localEnd || null); }}
                style={{ ...iStyle, width: 150 }} className="outline-none" />
              <span className="text-sm" style={{ color: "var(--cat-text-muted)" }}>—</span>
              <input type="date" value={localEnd}
                onChange={e => { setLocalEnd(e.target.value); onDatesChange(localStart || null, e.target.value || null); }}
                style={{ ...iStyle, width: 150 }} className="outline-none" />
              {localStart && localEnd && (
                <span className="text-sm px-2 py-0.5 rounded-lg"
                  style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                  {t("planner.dayCount", { count: numDays })}
                </span>
              )}
            </div>
            {(!localStart || !localEnd) && (
              <p className="text-sm mt-1" style={{ color: "#f59e0b" }}>
                {t("planner.divDatesRequired")}
              </p>
            )}
          </div>

          {/* Match params */}
          <div>
            <p className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: "var(--cat-text-muted)" }}>
              {t("planner.matchFormatSection")}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Halves count toggle */}
              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--cat-text-secondary)" }}>
                <span>{t("planner.halvesCount")}</span>
                <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--cat-card-border)" }}>
                  {([1, 2] as const).map(n => (
                    <button key={n} type="button"
                      onClick={() => onChange({ ...config, halvesCount: n })}
                      className="px-3 py-1 text-sm font-bold transition-all"
                      style={{
                        background: (config.halvesCount ?? 2) === n ? "rgba(43,254,186,0.2)" : "var(--cat-input-bg, var(--cat-card-bg))",
                        color: (config.halvesCount ?? 2) === n ? "#2BFEBA" : "var(--cat-text-muted)",
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
              </label>

              {/* Half duration */}
              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--cat-text-secondary)" }}>
                <span>{t("planner.halfDuration")}</span>
                <input type="number" min={5} max={90} value={config.halfDurationMinutes ?? 20}
                  onChange={e => onChange({ ...config, halfDurationMinutes: +e.target.value })}
                  style={{ ...iStyle, width: 55 }} className="outline-none" />
                <span>{t("planner.min")}</span>
              </label>

              {/* Break between halves (only if 2 halves) */}
              {(config.halvesCount ?? 2) === 2 && (
                <label className="flex items-center gap-2 text-sm" style={{ color: "var(--cat-text-secondary)" }}>
                  <span>{t("planner.halfBreak")}</span>
                  <input type="number" min={0} max={30} value={config.breakBetweenHalvesMinutes ?? 5}
                    onChange={e => onChange({ ...config, breakBetweenHalvesMinutes: +e.target.value })}
                    style={{ ...iStyle, width: 50 }} className="outline-none" />
                  <span>{t("planner.min")}</span>
                </label>
              )}

              {/* Break between games */}
              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--cat-text-secondary)" }}>
                <span>{t("planner.gameBreak")}</span>
                <input type="number" min={0} max={60} value={config.breakBetweenMatchesMinutes}
                  onChange={e => onChange({ ...config, breakBetweenMatchesMinutes: +e.target.value })}
                  style={{ ...iStyle, width: 50 }} className="outline-none" />
                <span>{t("planner.min")}</span>
              </label>

              {/* Max games per team */}
              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--cat-text-secondary)" }}>
                <span>{t("planner.maxGamesPerDay")}</span>
                <input type="number" min={1} max={10} value={config.maxMatchesPerTeamPerDay}
                  onChange={e => onChange({ ...config, maxMatchesPerTeamPerDay: +e.target.value })}
                  style={{ ...iStyle, width: 50 }} className="outline-none" />
              </label>
            </div>

            {/* Summary */}
            <p className="text-sm mt-1.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("planner.slotSummary", { match: matchSlot, break: config.breakBetweenMatchesMinutes, total: matchSlot + config.breakBetweenMatchesMinutes, slots: slotsPerDay })}
            </p>

            {/* Отдых команды */}
            <div className="rounded-xl border p-3 mt-2" style={{ borderColor: "rgba(99,102,241,0.2)", background: "rgba(99,102,241,0.04)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-3.5 h-3.5" style={{ color: "#6366f1" }} />
                <span className="text-sm font-bold" style={{ color: "#6366f1" }}>{t("planner.restRulesTitle")}</span>
                {/* Toggle */}
                <button
                  onClick={() => onChange({ ...config, enableTeamRestRule: !(config.enableTeamRestRule ?? true) })}
                  className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full text-sm font-semibold transition-all"
                  style={{
                    background: (config.enableTeamRestRule ?? true) ? "rgba(99,102,241,0.2)" : "var(--cat-tag-bg)",
                    color: (config.enableTeamRestRule ?? true) ? "#6366f1" : "var(--cat-text-muted)",
                    border: `1px solid ${(config.enableTeamRestRule ?? true) ? "rgba(99,102,241,0.4)" : "transparent"}`,
                  }}>
                  {(config.enableTeamRestRule ?? true) ? t("planner.restRulesEnabled") : t("planner.restRulesDisabled")}
                </button>
              </div>
              {(config.enableTeamRestRule ?? true) && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("planner.minRestBetween")}</span>
                    <input type="number" min={0} max={300} step={5}
                      value={config.minRestBetweenTeamMatchesMinutes ?? 60}
                      onChange={e => onChange({ ...config, minRestBetweenTeamMatchesMinutes: +e.target.value })}
                      className="w-16 rounded-lg px-2 py-1 text-sm text-center outline-none"
                      style={{ background: "var(--cat-input-bg, var(--cat-card-bg))", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}
                    />
                    <span className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("planner.min")}</span>
                  </div>
                  {[30, 60, 90, 120].map(v => (
                    <button key={v}
                      onClick={() => onChange({ ...config, minRestBetweenTeamMatchesMinutes: v })}
                      className="px-2 py-0.5 rounded-md text-sm font-semibold transition-all"
                      style={{
                        background: (config.minRestBetweenTeamMatchesMinutes ?? 60) === v ? "rgba(99,102,241,0.2)" : "var(--cat-tag-bg)",
                        color: (config.minRestBetweenTeamMatchesMinutes ?? 60) === v ? "#6366f1" : "var(--cat-text-muted)",
                        border: `1px solid ${(config.minRestBetweenTeamMatchesMinutes ?? 60) === v ? "rgba(99,102,241,0.4)" : "transparent"}`,
                      }}>
                      {v}{t("planner.min")}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-sm mt-2" style={{ color: "var(--cat-text-muted)" }}>
                {(config.enableTeamRestRule ?? true)
                  ? t("planner.restRuleDesc", { min: config.minRestBetweenTeamMatchesMinutes ?? 60 })
                  : t("planner.noRestLimit")}
              </p>
            </div>

          </div>

          {/* AI Weights */}
          <div>
            <button
              onClick={() => setShowWeights(v => !v)}
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide"
              style={{ color: "var(--cat-text-muted)" }}
            >
              {showWeights ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {t("planner.aiWeightsTitle")}
              <span className="text-sm font-normal normal-case ml-1" style={{ color: "var(--cat-text-muted)", opacity: 0.6 }}>
                {t("planner.aiWeightsHint")}
              </span>
            </button>
            {showWeights && (
              <div className="mt-2 space-y-2 pl-1">
                {([
                  { key: "fieldUtilization" as const, label: t("planner.weightFieldUtil"), hint: t("planner.weightFieldUtilHint") },
                  { key: "teamRestComfort" as const, label: t("planner.weightTeamRest"), hint: t("planner.weightTeamRestHint") },
                  { key: "homeAwayBalance" as const, label: t("planner.weightHomeAway"), hint: t("planner.weightHomeAwayHint") },
                  { key: "primetimeForBigMatches" as const, label: t("planner.weightPrimetime"), hint: t("planner.weightPrimetimeHint") },
                  { key: "groupFieldAffinity" as const, label: t("planner.weightGroupField"), hint: t("planner.weightGroupFieldHint") },
                  { key: "dayLoadBalance" as const, label: t("planner.weightDayBalance"), hint: t("planner.weightDayBalanceHint") },
                ] as const).map(({ key, label, hint }) => {
                  const val = (config.weights as Record<string, number> | undefined)?.[key] ?? getDefaultWeight(key);
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-sm w-44 shrink-0" style={{ color: "var(--cat-text-secondary)" }} title={hint}>
                        {label}
                      </span>
                      <input
                        type="range" min={0} max={1} step={0.05}
                        value={val}
                        onChange={e => {
                          const w = { ...(config.weights as Record<string, number> | undefined ?? {}) };
                          w[key] = parseFloat(e.target.value);
                          onChange({ ...config, weights: w as ScheduleConfig["weights"] });
                        }}
                        className="flex-1 h-1.5 rounded-full accent-[#2BFEBA]"
                        style={{ accentColor: "#2BFEBA" }}
                      />
                      <span className="text-sm w-10 text-right shrink-0 font-mono" style={{ color: "#2BFEBA" }}>
                        {val.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button onClick={onSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px] font-bold transition-all disabled:opacity-50"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)", border: "1px solid var(--cat-card-border)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t("planner.saveSettings")}
            </button>
            <button onClick={onGenerate} disabled={generating || clearing || config.fieldIds.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px] font-bold transition-all disabled:opacity-50"
              style={{ background: "rgba(43,254,186,0.15)", color: "#2BFEBA", border: "1px solid rgba(43,254,186,0.3)" }}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {t("planner.generateFor", { name: cls.name })}
            </button>
            <button onClick={onClear} disabled={generating || clearing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px] font-bold transition-all disabled:opacity-50"
              style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
              {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {t("planner.clearDiv")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AddMatchModal ────────────────────────────────────────────────────────────

interface TeamOption { id: number; name: string; classId: number; }

function AddMatchModal({
  base, stages, classes, onClose, onCreated,
}: {
  base: string;
  stages: Stage[];
  classes: TournamentClass[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useTranslations("admin");
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [stageId, setStageId] = useState<number | "">(stages[0]?.id ?? "");
  const [homeTeamId, setHomeTeamId] = useState<number | "">("");
  const [awayTeamId, setAwayTeamId] = useState<number | "">("");
  const [label, setLabel] = useState(""); // optional notes / match label

  // Load all tournament teams once on mount
  useEffect(() => {
    fetch(`${base}/teams`)
      .then(r => r.json())
      .then(d => {
        const arr: TeamOption[] = (Array.isArray(d) ? d : d.teams ?? []).map((t: { id: number; name?: string; displayName?: string; classId?: number }) => ({
          id: t.id,
          name: t.displayName ?? t.name ?? `Team ${t.id}`,
          classId: t.classId ?? 0,
        }));
        setTeams(arr.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => setTeams([]))
      .finally(() => setLoadingTeams(false));
  }, [base]);

  // Show all teams — cross-division friendlies are valid
  const filteredTeams = teams;

  async function handleCreate() {
    if (!stageId) { setError(t("planner.selectStageError")); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${base}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageId,
          homeTeamId: homeTeamId || null,
          awayTeamId: awayTeamId || null,
          matchNumber: null,
          groupId: null,
          roundId: null,
          notes: label || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? t("planner.matchCreateError"));
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError(t("planner.matchCreateNetworkError"));
    } finally {
      setSaving(false);
    }
  }

  const iStyle: React.CSSProperties = {
    background: "var(--cat-input-bg, var(--cat-card-bg))",
    border: "1px solid var(--cat-card-border)",
    color: "var(--cat-text)",
    borderRadius: 8, padding: "6px 10px", fontSize: 13, width: "100%",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl border shadow-2xl w-full max-w-md"
        style={{ background: "#161b25", borderColor: "var(--cat-card-border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--cat-card-border)" }}>
          <div>
            <h2 className="font-black text-base" style={{ color: "var(--cat-text)" }}>
              {t("planner.addMatchTitle")}
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("planner.addMatchSubtitle")}
            </p>
          </div>
          <button onClick={onClose} className="hover:opacity-70" style={{ color: "var(--cat-text-muted)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">

          {/* Stage */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("planner.stageRequired")}
            </label>
            <select value={stageId} onChange={e => { setStageId(+e.target.value); setHomeTeamId(""); setAwayTeamId(""); }}
              style={iStyle} className="outline-none">
              {stages.map(s => {
                const cls = classes.find(c => c.id === s.classId);
                return (
                  <option key={s.id} value={s.id}>
                    {cls ? `${cls.name} · ` : ""}{s.name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Teams */}
          {loadingTeams ? (
            <div className="flex items-center gap-2 py-2" style={{ color: "var(--cat-text-muted)" }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t("planner.loadingTeams")}</span>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
                  {t("planner.homeTeam")} <span className="font-normal opacity-60">{t("planner.tbdOptional")}</span>
                </label>
                <select value={homeTeamId} onChange={e => setHomeTeamId(e.target.value ? +e.target.value : "")}
                  style={iStyle} className="outline-none">
                  <option value="">— TBD —</option>
                  {filteredTeams.map(t => (
                    <option key={t.id} value={t.id} disabled={t.id === awayTeamId}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
                  {t("planner.awayTeam")} <span className="font-normal opacity-60">{t("planner.tbdOptional")}</span>
                </label>
                <select value={awayTeamId} onChange={e => setAwayTeamId(e.target.value ? +e.target.value : "")}
                  style={iStyle} className="outline-none">
                  <option value="">— TBD —</option>
                  {filteredTeams.map(t => (
                    <option key={t.id} value={t.id} disabled={t.id === homeTeamId}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Optional label */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("planner.matchNote")} <span className="font-normal opacity-60">{t("planner.matchNoteOptional")}</span>
            </label>
            <input
              type="text"
              placeholder={t("planner.matchNoteAdd")}
              value={label}
              onChange={e => setLabel(e.target.value)}
              style={iStyle}
              className="outline-none placeholder:opacity-40"
            />
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t"
          style={{ borderColor: "var(--cat-card-border)" }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
            {t("planner.cancel")}
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !stageId}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all disabled:opacity-50"
            style={{ background: "rgba(43,254,186,0.15)", color: "#2BFEBA", border: "1px solid rgba(43,254,186,0.35)" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t("planner.createMatch")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PlannerPage ──────────────────────────────────────────────────────────────

export function PlannerPage() {
  const t = useTranslations("admin");
  const ctx = useTournament();
  const orgSlug = ctx?.orgSlug ?? "";
  const tournamentId = ctx?.tournamentId ?? 0;
  const base = `/api/org/${orgSlug}/tournament/${tournamentId}`;

  const searchParams = useSearchParams();
  const urlClassId = searchParams ? Number(searchParams.get("classId")) || null : null;

  // ── Data ─────────────────────────────────────────────────────────────────
  const [fields, setFields] = useState<Field[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // ── Board state ───────────────────────────────────────────────────────────
  const [activeDay, setActiveDay] = useState("");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragOverCell, setDragOverCell] = useState<DragOverCell | null>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  // ── Settings ──────────────────────────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showTeamView, setShowTeamView] = useState(false);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(21);
  const [slotMins, setSlotMins] = useState(45);
  // cellHeight: null = auto-computed from slotMins; number = manual override
  const [cellHeightOverride, setCellHeightOverride] = useState<number | null>(null);
  const cellHeight = cellHeightOverride ?? Math.max(80, Math.round(slotMins * 1.55));
  const [gridAutoSynced, setGridAutoSynced] = useState(false);

  // ── Calendar-grid derived values (after divConfigs state below) ──────────
  const dayStartMins = startHour * 60;
  const dayEndMins   = endHour   * 60;
  const calTotalPx   = (dayEndMins - dayStartMins) * PX_PER_MIN;

  // ── Filters ───────────────────────────────────────────────────────────────
  const [filterStage, setFilterStage] = useState<number | null>(null);

  // ── Stadium schedule ──────────────────────────────────────────────────────
  const [stadiumObjects, setStadiumObjects] = useState<StadiumObject[]>([]);
  const [stadiumSchedules, setStadiumSchedules] = useState<StadiumScheduleEntry[]>([]);
  const [showStadiumSchedule, setShowStadiumSchedule] = useState(false);

  // ── Division configuration ─────────────────────────────────────────────────
  const [classes, setClasses] = useState<TournamentClass[]>([]);
  const [divConfigs, setDivConfigs] = useState<Record<number, ScheduleConfig>>({});
  const [showDivConfig, setShowDivConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState<number | null>(null);
  const [generatingDiv, setGeneratingDiv] = useState<number | "all" | null>(null);
  const [clearingDiv,   setClearingDiv]   = useState<number | "all" | null>(null);
  const [schedResult, setSchedResult] = useState<{ updated: number; unassigned: number; msg: string } | null>(null);
  const [schedulePublishedAt, setSchedulePublishedAt] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [partialRegen, setPartialRegen] = useState(false); // preserve already-scheduled matches
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [filterClass, setFilterClass] = useState<number | null>(urlClassId);
  const [stadiumFilter, setStadiumFilter] = useState<string | null>(null);
  const [effectivePlan, setEffectivePlan] = useState<string>("free");

  /** Actual play duration (minutes) for a match, from its division config. */
  const getMatchDurationMins = useCallback((m: Match): number => {
    const classId = stages.find(s => s.id === m.stageId)?.classId;
    const cfg = classId ? divConfigs[classId] : undefined;
    if (cfg) {
      const halvesCount = cfg.halvesCount ?? 2;
      const halfDur     = cfg.halfDurationMinutes ?? 20;
      const brk         = halvesCount === 2 ? (cfg.breakBetweenHalvesMinutes ?? 0) : 0;
      return halvesCount * halfDur + brk;
    }
    return slotMins;
  }, [stages, divConfigs, slotMins]);

  // Fetch plan once
  useEffect(() => {
    if (!orgSlug || !tournamentId) return;
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/billing-info`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.effectivePlan) setEffectivePlan(d.effectivePlan); })
      .catch(() => {});
  }, [orgSlug, tournamentId]);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!tournamentId) return;
    setLoading(true);
    try {
      const [mR, fR, clR, stR, ssR, pubR] = await Promise.all([
        fetch(`${base}/matches`),
        fetch(`/api/admin/tournament-fields?tournamentId=${tournamentId}`),
        fetch(`${base}/classes`),
        fetch(`${base}/stadiums`),
        fetch(`${base}/stadium-schedule`),
        fetch(`${base}/schedule/publish`),
      ]);
      if (pubR.ok) {
        const pubData = await pubR.json();
        setSchedulePublishedAt(pubData.publishedAt ?? null);
      }
      const mArr: Match[] = (await mR.json().then(d => Array.isArray(d) ? d : d.matches ?? []));
      const fArr: Field[] = (await fR.json().then(d => Array.isArray(d) ? d : d.fields ?? []));
      const clArr: TournamentClass[] = (await clR.json().then(d => Array.isArray(d) ? d : []));

      // Load stadium objects (with id+name)
      const stData = stR.ok ? await stR.json() : {};
      const stObjs: StadiumObject[] = (stData.stadiums ?? []).map((s: { id: number; name: string }) => ({ id: s.id, name: s.name }));
      setStadiumObjects(stObjs);

      // Load per-stadium schedule
      const ssData = ssR.ok ? await ssR.json() : {};
      setStadiumSchedules(ssData.schedules ?? []);

      // Fetch stages per class (API requires ?classId)
      const stageResults = await Promise.all(
        clArr.map(c => fetch(`${base}/stages?classId=${c.id}`).then(r => r.json()).catch(() => []))
      );
      const stArr: Stage[] = stageResults.flatMap(d => Array.isArray(d) ? d : d.stages ?? []);

      setStages(stArr);
      setMatches(mArr);
      const sortedFields = fArr.sort((a, b) => a.sortOrder - b.sortOrder);
      setFields(sortedFields);
      setClasses(clArr);

      // Init divConfigs from saved scheduleConfig (or build default)
      setDivConfigs(prev => {
        const next = { ...prev };
        for (const cls of clArr) {
          if (!next[cls.id]) {
            next[cls.id] = cls.scheduleConfig ?? defaultConfig(sortedFields);
          }
        }
        return next;
      });

      // Auto-sync grid params from the first (or URL-selected) division config
      setGridAutoSynced(prev => {
        if (prev) return prev; // already synced, don't override user settings
        const targetCls = urlClassId ? clArr.find(c => c.id === urlClassId) : clArr[0];
        const cfg = targetCls?.scheduleConfig;
        if (cfg) {
          const [h] = (cfg.dailyStartTime ?? "08:00").split(":").map(Number);
          const [eh] = (cfg.dailyEndTime ?? "21:00").split(":").map(Number);
          const slot = matchSlotMinutes(cfg) + (cfg.breakBetweenMatchesMinutes ?? 0);
          setStartHour(h);
          setEndHour(Math.min(23, eh + 1)); // show 1 extra hour after end
          if (slot > 0) setSlotMins(slot);
        }
        return true;
      });

      const days = getScheduledDays(mArr);
      if (days.length > 0) setActiveDay(prev => prev && days.includes(prev) ? prev : days[0]);
    } finally {
      setLoading(false);
    }
  }, [base, tournamentId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // ESC → deselect / close
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedMatch(null);
        setCtxMenu(null);
        setEditState(null);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  function getScheduledDays(ms: Match[]): string[] {
    const s = new Set<string>();
    ms.forEach(m => { if (m.scheduledAt) s.add(parseDate(m.scheduledAt)); });
    return Array.from(s).sort();
  }

  const days = useMemo(() => getScheduledDays(matches), [matches]);
  const slots = useMemo(() => generateSlots(startHour, endHour, slotMins), [startHour, endHour, slotMins]);

  const stageColorMap = useCallback((id: number) => {
    const idx = stages.findIndex(s => s.id === id);
    return STAGE_COLORS[idx % STAGE_COLORS.length] ?? "#888";
  }, [stages]);

  // Show division name on cards only when there are multiple divisions
  const getDivName = useCallback((stageId: number): string => {
    if (classes.length <= 1) return "";
    const stage = stages.find(s => s.id === stageId);
    if (!stage?.classId) return "";
    return classes.find(c => c.id === stage.classId)?.name ?? "";
  }, [classes, stages]);

  // Build stadium name → color map dynamically from actual stadium data
  const stadiumColorMap = useMemo(() => {
    const names = Array.from(new Set(fields.map(f => getFieldStadiumName(f)).filter(Boolean)));
    const map: Record<string, string> = {};
    names.forEach((name, i) => {
      map[name] = STADIUM_COLORS_PRESET[name] ?? STADIUM_PALETTE[i % STADIUM_PALETTE.length];
    });
    return map;
  }, [fields]);

  const stadiums = useMemo(() => {
    const names = Array.from(new Set(fields.map(f => getFieldStadiumName(f)).filter(Boolean)));
    return names;
  }, [fields]);

  const activeFields = useMemo(
    () => stadiumFilter ? fields.filter(f => getFieldStadiumName(f) === stadiumFilter) : fields,
    [fields, stadiumFilter]
  );

  const classStageIds = useMemo(
    () => filterClass ? new Set(stages.filter(s => s.classId === filterClass).map(s => s.id)) : null,
    [filterClass, stages]
  );

  const scheduledOnDay = useMemo(
    () => matches.filter(m => {
      if (!m.scheduledAt || parseDate(m.scheduledAt) !== activeDay || !m.fieldId) return false;
      return true;
    }),
    [matches, activeDay]
  );

  const unscheduled = useMemo(
    () => matches
      // All matches (including knockout shells) are schedulable — admins pre-assign
      // time+field slots before teams are known (slot-mode for both groups and playoffs).
      .filter(m => !m.scheduledAt || !m.fieldId)
      .filter(m => {
        if (filterStage != null) return m.stageId === filterStage;
        if (classStageIds != null) return classStageIds.has(m.stageId ?? -1);
        return true;
      }),
    [matches, filterStage, classStageIds]
  );

  // Grid index: fieldId → slotKey → Match[]
  // Each match is placed in the nearest slot that starts at or before the match time.
  // Multiple matches can share a visual slot (e.g. when schedule step ≠ visual step).
  const gridIndex = useMemo(() => {
    const idx = new Map<number, Map<string, Match[]>>();
    activeFields.forEach(f => idx.set(f.id, new Map()));
    scheduledOnDay.forEach(m => {
      if (!m.fieldId || !m.scheduledAt) return;
      const matchTime = parseTime(m.scheduledAt); // "HH:MM" UTC
      if (!slots.length) return;

      // Find the last slot whose start is ≤ matchTime (floor snap).
      // This prevents two matches at e.g. 09:35 and 10:10 from both snapping
      // to the same 09:55 row when the grid step (U14: 55 min) is larger than
      // the match step (U12: 35 min). Floor snap keeps them in distinct rows.
      const [mh, mm] = matchTime.split(":").map(Number);
      const matchMins = mh * 60 + mm;
      let targetSlot = slots[0];
      for (const slot of slots) {
        const [sh, sm] = slot.split(":").map(Number);
        if (sh * 60 + sm <= matchMins) targetSlot = slot;
        else break;
      }

      const fieldMap = idx.get(m.fieldId);
      if (!fieldMap) return;
      const existing = fieldMap.get(targetSlot);
      if (!existing) {
        fieldMap.set(targetSlot, [m]);
      } else {
        // Sort by actual time so primary match (closest to slot start) is first
        existing.push(m);
        existing.sort((a, b) => parseTime(a.scheduledAt!).localeCompare(parseTime(b.scheduledAt!)));
      }
    });
    return idx;
  }, [scheduledOnDay, activeFields, slots]);

  // Min rest = minimum across all configured divisions (so we flag violations
  // at the strictest threshold any division uses).
  const minRestMinutes = useMemo(() => {
    const vals = Object.values(divConfigs).map(c => c.minRestBetweenTeamMatchesMinutes ?? DEFAULT_MIN_REST_MINUTES);
    return vals.length > 0 ? Math.min(...vals) : DEFAULT_MIN_REST_MINUTES;
  }, [divConfigs]);

  // Conflict map (all scheduled matches)
  const conflictMap: ConflictMap = useMemo(
    () => computeConflicts(matches, slotMins, minRestMinutes),
    [matches, slotMins, minRestMinutes]
  );

  const conflictCount = useMemo(() => {
    let errors = 0, warnings = 0, back2back = 0;
    for (const [, v] of conflictMap) {
      if (v === "error") errors++;
      else if (v === "warning") warnings++;
      else if (v === "back2back") back2back++;
    }
    return { errors: errors / 2 | 0, warnings, back2back: back2back / 2 | 0 }; // errors counted twice (both matches)
  }, [conflictMap]);

  // Stadium groups for header (group by stadium id so fields without stadium each get their own column)
  const stadiumGroups = useMemo(() => {
    const groups: { name: string; stadiumId: number | null; fields: Field[] }[] = [];
    for (const f of activeFields) {
      const stadiumId = f.stadium?.id ?? null;
      const stadiumName = f.stadium?.name ?? null;
      const last = groups[groups.length - 1];
      if (last && last.stadiumId !== null && last.stadiumId === stadiumId) {
        last.fields.push(f);
      } else {
        groups.push({ name: stadiumName ?? f.name, stadiumId, fields: [f] });
      }
    }
    return groups;
  }, [activeFields]);

  // ── Actions ───────────────────────────────────────────────────────────────
  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function patchMatch(matchId: number, updates: Record<string, unknown>) {
    setSaving(matchId);
    // Optimistic update
    setMatches(prev => prev.map(m => {
      if (m.id !== matchId) return m;
      const next = { ...m, ...updates };
      if (updates.fieldId === null) next.fieldId = null;
      if (updates.scheduledAt === null) next.scheduledAt = null;
      return next;
    }));
    try {
      const res = await fetch(`${base}/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("err");
      const updated = await res.json();
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, ...updated } : m));
      showToast(t("planner.saved"), "ok");
    } catch {
      // Rollback
      showToast(t("planner.saveError"), "err");
      await load();
    } finally {
      setSaving(null);
    }
  }

  // DnD handlers
  function handleDragStart(m: Match) {
    setSelectedMatch(null);
    setDragState({
      matchId: m.id,
      fromFieldId: m.fieldId ?? null,
      fromSlot: m.scheduledAt ? parseTime(m.scheduledAt) : null,
      fromDay: m.scheduledAt ? parseDate(m.scheduledAt) : null,
    });
  }

  function handleDragEnd() {
    setDragState(null);
    setDragOverCell(null);
  }

  function handleDragOver(fieldId: number, slot: string, e: React.DragEvent) {
    e.preventDefault();
    if (!dragState) return;
    const dragMatch = matches.find(m => m.id === dragState.matchId);
    if (!dragMatch) return;

    const validity = getDropValidity(fieldId, slot, activeDay, dragMatch, gridIndex, slotMins);
    e.dataTransfer.dropEffect = validity === "valid" ? "move" : "none";
    setDragOverCell(prev =>
      prev?.fieldId === fieldId && prev?.slot === slot && prev?.validity === validity
        ? prev : { fieldId, slot, validity, topPx: slotToMins(slot) * PX_PER_MIN }
    );
  }

  function handleDragLeave() {
    setDragOverCell(null);
  }

  // ── Calendar-grid drag handlers ────────────────────────────────────────────

  /** Compute a 5-minute-snapped "HH:MM" from a drag/mouse event Y within a column div. */
  function calYToSlot(e: React.DragEvent | React.MouseEvent): string {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const rawMins = offsetY / PX_PER_MIN + dayStartMins;
    const snapped = Math.round(rawMins / 5) * 5;
    const clamped = Math.max(dayStartMins, Math.min(dayEndMins - 5, snapped));
    return minsToSlot(clamped);
  }

  /** Exact-time drop validity for the calendar grid (no gridIndex snapping). */
  function getCalDropValidity(
    fieldId: number, slot: string, dragMatch: Match, duration: number,
  ): DropValidity {
    const tStart = new Date(`${activeDay}T${slot}:00Z`).getTime();
    const tEnd   = tStart + duration * 60_000;
    for (const m of matches) {
      if (m.id === dragMatch.id || !m.scheduledAt || !m.fieldId) continue;
      if (m.scheduledAt.slice(0, 10) !== activeDay) continue;
      const mStart = new Date(m.scheduledAt).getTime();
      const mDur   = getMatchDurationMins(m);
      const mEnd   = mStart + mDur * 60_000;
      if (tStart >= mEnd || tEnd <= mStart) continue; // no overlap
      if (m.fieldId === fieldId) return "occupied";
      // Different field — check team clash
      const dragTeams = new Set([dragMatch.homeTeamId, dragMatch.awayTeamId].filter(Boolean) as number[]);
      if ((m.homeTeamId && dragTeams.has(m.homeTeamId)) || (m.awayTeamId && dragTeams.has(m.awayTeamId))) {
        return "conflict";
      }
    }
    return "valid";
  }

  function handleCalDragOver(fieldId: number, e: React.DragEvent) {
    e.preventDefault();
    if (!dragState) return;
    const dragMatch = matches.find(m => m.id === dragState.matchId);
    if (!dragMatch) return;
    const slot = calYToSlot(e);
    const duration = getMatchDurationMins(dragMatch);
    const validity = getCalDropValidity(fieldId, slot, dragMatch, duration);
    e.dataTransfer.dropEffect = validity === "valid" ? "move" : "none";
    const rect  = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const topPx = Math.max(0, (e.clientY - rect.top) - ((e.clientY - rect.top) % (5 * PX_PER_MIN)));
    // snap topPx to 5-min grid
    const snappedTopPx = Math.round((e.clientY - rect.top) / (5 * PX_PER_MIN)) * (5 * PX_PER_MIN);
    setDragOverCell(prev =>
      prev?.fieldId === fieldId && prev?.slot === slot && prev?.validity === validity
        ? prev : { fieldId, slot, validity, topPx: Math.max(0, snappedTopPx) }
    );
    void topPx;
  }

  async function handleCalDrop(fieldId: number, e: React.DragEvent) {
    e.preventDefault();
    setDragOverCell(null);
    const matchId = parseInt(e.dataTransfer.getData("matchId"), 10);
    if (!matchId) return;
    const dragMatch = matches.find(m => m.id === matchId);
    if (!dragMatch) return;
    const slot     = calYToSlot(e);
    const duration = getMatchDurationMins(dragMatch);
    const validity = getCalDropValidity(fieldId, slot, dragMatch, duration);
    if (validity !== "valid") {
      if (validity === "conflict") showToast(t("planner.conflictDrop"), "err");
      setDragState(null);
      return;
    }
    await patchMatch(matchId, { fieldId, scheduledAt: `${activeDay}T${slot}:00` });
    setDragState(null);
  }

  function handleCalClick(fieldId: number, e: React.MouseEvent) {
    if (!selectedMatch || !activeDay) return;
    const slot = calYToSlot(e as unknown as React.DragEvent);
    handlePlaceMatch(fieldId, slot);
  }

  async function handleDrop(fieldId: number, slot: string, e: React.DragEvent) {
    e.preventDefault();
    setDragOverCell(null);
    const matchId = parseInt(e.dataTransfer.getData("matchId"), 10);
    if (!matchId) return;

    const dragMatch = matches.find(m => m.id === matchId);
    if (!dragMatch) return;

    const validity = getDropValidity(fieldId, slot, activeDay, dragMatch, gridIndex, slotMins);
    if (validity !== "valid") {
      if (validity === "conflict") showToast(t("planner.conflictDrop"), "err");
      setDragState(null);
      return;
    }

    const scheduledAt = `${activeDay}T${slot}:00`;
    await patchMatch(matchId, { fieldId, scheduledAt });
    setDragState(null);
  }

  function handlePlaceMatch(fieldId: number, slot: string) {
    if (!selectedMatch || !activeDay) return;
    patchMatch(selectedMatch.id, { fieldId, scheduledAt: `${activeDay}T${slot}:00` });
    setSelectedMatch(null);
  }

  function handleUnschedule(m: Match) {
    patchMatch(m.id, { fieldId: null, scheduledAt: null });
  }

  function handleSelectInGrid(m: Match) {
    setSelectedMatch(prev => prev?.id === m.id ? null : m);
  }

  // Context menu
  function handleContextMenu(m: Match, e: React.MouseEvent) {
    setCtxMenu({ matchId: m.id, x: e.clientX, y: e.clientY });
  }

  function handleSwapTeams(m: Match) {
    patchMatch(m.id, { homeTeamId: m.awayTeamId, awayTeamId: m.homeTeamId });
  }

  function handleOpenEdit(m: Match) {
    const sa = m.scheduledAt ?? "";
    setEditState({
      match: m,
      date: sa ? parseDate(sa) : activeDay,
      time: sa ? parseTime(sa) : "10:00",
      fieldId: m.fieldId ?? (fields[0]?.id ?? 0),
    });
  }

  async function handleEditSave(date: string, time: string, fieldId: number) {
    if (!editState) return;
    await patchMatch(editState.match.id, {
      scheduledAt: `${date}T${time}:00`,
      fieldId,
    });
    setEditState(null);
  }

  // ── Division dates update (from DivisionConfigPanel) ────────────────────
  function updateClassDates(classId: number, startDate: string | null, endDate: string | null) {
    setClasses(prev => prev.map(c => c.id === classId ? { ...c, startDate, endDate } : c));
  }

  // ── Division config save/generate ────────────────────────────────────────
  async function saveConfig(classId: number) {
    setSavingConfig(classId);
    try {
      const cls = classes.find(c => c.id === classId);
      await fetch(`${base}/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleConfig: divConfigs[classId],
          startDate: cls?.startDate ?? null,
          endDate:   cls?.endDate   ?? null,
        }),
      });
      showToast(t("planner.configSaved"), "ok");
    } catch {
      showToast(t("planner.saveError"), "err");
    } finally {
      setSavingConfig(null);
    }
  }

  async function runScheduleAll(divisionIds?: number[]) {
    const targetClasses = divisionIds
      ? classes.filter(c => divisionIds.includes(c.id))
      : classes;

    // ── Auto-save configs before generating so settings are always persisted ──
    await Promise.all(
      targetClasses.map(async c => {
        const cls = classes.find(cl => cl.id === c.id);
        try {
          await fetch(`${base}/classes/${c.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scheduleConfig: divConfigs[c.id],
              startDate: cls?.startDate ?? null,
              endDate:   cls?.endDate   ?? null,
            }),
          });
        } catch {
          // non-fatal: generation will still proceed with in-memory config
        }
      })
    );

    // ── Auto-sync grid to the (first) division being scheduled ──
    const firstCls = targetClasses.find(c => divConfigs[c.id]?.fieldIds?.length > 0);
    if (firstCls) {
      const cfg = divConfigs[firstCls.id];
      if (cfg) {
        const [h]  = (cfg.dailyStartTime ?? "08:00").split(":").map(Number);
        const [eh] = (cfg.dailyEndTime   ?? "21:00").split(":").map(Number);
        const slot = matchSlotMinutes(cfg) + (cfg.breakBetweenMatchesMinutes ?? 0);
        setStartHour(h);
        setEndHour(Math.min(23, eh + 1));
        if (slot > 0) setSlotMins(slot);
      }
    }

    const divisions = targetClasses
      .filter(c => divConfigs[c.id]?.fieldIds?.length > 0)
      .map(c => {
        const cfg = divConfigs[c.id];
        const defaultStart = cfg.dailyStartTime ?? "09:00";
        const defaultEnd   = cfg.dailyEndTime   ?? "18:00";

        // Build day-by-day array from division date range
        // Respects per-day overrides from cfg.daySchedule
        const days: { date: string; startTime: string; endTime: string }[] = [];
        if (c.startDate && c.endDate) {
          const cur = new Date(c.startDate + "T12:00:00Z");
          const end = new Date(c.endDate   + "T12:00:00Z");
          while (cur <= end) {
            const dateStr = cur.toISOString().slice(0, 10);
            const dayOverride = cfg.daySchedule?.find(d => d.date === dateStr);
            days.push({
              date: dateStr,
              startTime: dayOverride?.startTime ?? defaultStart,
              endTime:   dayOverride?.endTime   ?? defaultEnd,
            });
            cur.setUTCDate(cur.getUTCDate() + 1);
          }
        }

        // ONE TRUTH: build fieldDaySchedule from cfg.stadiumDaySchedule + day defaults.
        // No legacy fieldDaySchedule involved — clean, no stale data possible.
        const completeFieldDaySchedule: Array<{
          fieldId: number; date: string; startTime: string | null; endTime: string | null;
        }> = [];

        for (const fieldId of cfg.fieldIds) {
          const fieldInfo = fields.find(f => f.id === fieldId);
          const stadiumId = fieldInfo?.stadium?.id ?? null;

          for (const day of days) {
            let startTime: string | null = day.startTime;
            let endTime:   string | null = day.endTime;

            if (stadiumId !== null) {
              const sdEntry = cfg.stadiumDaySchedule?.find(
                e => e.stadiumId === stadiumId && e.date === day.date
              );
              if (sdEntry !== undefined) {
                startTime = sdEntry.startTime; // null = closed
                endTime   = sdEntry.endTime;
              }
            }

            completeFieldDaySchedule.push({ fieldId, date: day.date, startTime, endTime });
          }
        }

        // If team rest rule is disabled, use 0 rest time
        const effectiveMinRest = (cfg.enableTeamRestRule ?? true)
          ? (cfg.minRestBetweenTeamMatchesMinutes ?? 60)
          : 0;

        return {
          classId:                 c.id,
          fieldIds:                cfg.fieldIds,
          days,
          matchDurationMinutes:    matchSlotMinutes(cfg),
          breakBetweenMatchesMinutes: cfg.breakBetweenMatchesMinutes,
          maxMatchesPerTeamPerDay: cfg.maxMatchesPerTeamPerDay,
          minRestBetweenTeamMatchesMinutes: effectiveMinRest,
          fieldDaySchedule:        completeFieldDaySchedule,
          fieldStageIds:           cfg.fieldStageIds,
          overwriteScheduled:      !partialRegen, // false = keep existing, true = overwrite all
        };
      });

    if (divisions.length === 0) {
      showToast(t("planner.noConfigs"), "err");
      return;
    }

    setGeneratingDiv(divisionIds?.length === 1 ? divisionIds[0] : "all");
    setSchedResult(null);
    try {
      const res = await fetch(`${base}/schedule-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ divisions }),
      });
      const data = await res.json();
      setSchedResult({ updated: data.updated, unassigned: data.unassigned, msg: data.message ?? "" });
      showToast(t("planner.scheduledToast", { count: data.updated }), "ok");
      await load();
    } catch {
      showToast(t("planner.generateError"), "err");
    } finally {
      setGeneratingDiv(null);
    }
  }

  async function clearSchedule(classId?: number) {
    const label = classId
      ? classes.find(c => c.id === classId)?.name ?? ""
      : t("planner.clearAllLabel");
    if (!confirm(t("planner.clearConfirm", { label }))) return;

    setClearingDiv(classId ?? "all");
    try {
      const body = classId ? { classId } : { all: true };
      const res = await fetch(`${base}/matches/clear-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      showToast(t("planner.cleared", { count: data.cleared }), "ok");
      setSchedResult(null);
      await load();
    } catch {
      showToast(t("planner.clearError"), "err");
    } finally {
      setClearingDiv(null);
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const statsScheduled = useMemo(() => matches.filter(m => m.scheduledAt && m.fieldId).length, [matches]);
  const statsUnscheduled = matches.length - statsScheduled;

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3" style={{ color: "var(--cat-text-muted)" }}>
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">{t("planner.loadingData")}</span>
      </div>
    );
  }

  const ctxMatch = ctxMenu ? matches.find(m => m.id === ctxMenu.matchId) : null;

  return (
    <div className="h-full flex flex-col gap-0" style={{ minHeight: "calc(100vh - 120px)" }}>

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg text-sm font-semibold"
          style={{
            background: toast.type === "ok" ? "#dcfce7" : "#fee2e2",
            color: toast.type === "ok" ? "#166534" : "#991b1b",
            border: "1px solid currentColor",
          }}>
          {toast.type === "ok" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-4 shrink-0 gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>{t("planner.plannerTitle")}</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {t("planner.plannerHint")}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Conflict badges */}
          {conflictCount.errors > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
              <AlertCircle className="w-3.5 h-3.5" />
              {t("planner.conflictsCount", { count: conflictCount.errors })}
            </div>
          )}
          {conflictCount.warnings > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
              <AlertCircle className="w-3.5 h-3.5" />
              {t("planner.manyPerDay", { count: conflictCount.warnings })}
            </div>
          )}
          {conflictCount.back2back > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: "rgba(249,115,22,0.1)", color: "#f97316", border: "1px solid rgba(249,115,22,0.3)" }}>
              <Clock className="w-3.5 h-3.5" />
              {t("planner.backToBack", { count: conflictCount.back2back })}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs" style={{ color: "var(--cat-text-muted)" }}>
            <span><b style={{ color: "var(--cat-text)" }}>{statsScheduled}</b> {t("planner.statsScheduled")}</span>
            <span><b style={{ color: statsUnscheduled > 0 ? "#f59e0b" : "var(--cat-text)" }}>{statsUnscheduled}</b> {t("planner.statsUnscheduled")}</span>
          </div>

          <button onClick={load} className="p-1.5 rounded-lg transition-all hover:opacity-70"
            style={{ color: "var(--cat-text-muted)" }}>
            <RefreshCw className="w-4 h-4" />
          </button>
          {stadiumObjects.length > 0 && (
            <button
              onClick={() => setShowStadiumSchedule(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}>
              <Building2 className="w-3.5 h-3.5" /> {t("planner.stadiumsButton")}
            </button>
          )}
          <button onClick={() => setShowSettings(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: showSettings ? "var(--cat-accent)" : "var(--cat-tag-bg)", color: showSettings ? "#0A0E14" : "var(--cat-text-secondary)" }}>
            <Settings2 className="w-3.5 h-3.5" /> {t("planner.settingsButton")}
          </button>
          <button onClick={() => setShowAudit(a => !a)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: showAudit ? "rgba(43,254,186,0.2)" : "var(--cat-tag-bg)", color: showAudit ? "#2BFEBA" : "var(--cat-text-secondary)", border: showAudit ? "1px solid rgba(43,254,186,0.4)" : "1px solid transparent" }}>
            <Activity className="w-3.5 h-3.5" /> {t("planner.auditButton")}
          </button>
          {/* ── Publish / Unpublish schedule ── */}
          <button
            disabled={publishing}
            onClick={async () => {
              setPublishing(true);
              try {
                const method = schedulePublishedAt ? "DELETE" : "POST";
                const res = await fetch(`${base}/schedule/publish`, { method });
                if (res.ok) {
                  const data = await res.json();
                  setSchedulePublishedAt(data.publishedAt ?? null);
                  showToast(data.published ? t("planner.publishedToast") : t("planner.hiddenToast"), "ok");
                }
              } finally {
                setPublishing(false);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            style={schedulePublishedAt
              ? { background: "rgba(43,254,186,0.15)", color: "#2BFEBA", border: "1px solid rgba(43,254,186,0.4)" }
              : { background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.4)" }
            }>
            {publishing
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : schedulePublishedAt
                ? <CheckCircle className="w-3.5 h-3.5" />
                : <Shield className="w-3.5 h-3.5" />}
            {schedulePublishedAt ? t("planner.published") : t("planner.publish")}
          </button>
          <button onClick={() => setShowTeamView(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: showTeamView ? "rgba(99,102,241,0.2)" : "var(--cat-tag-bg)", color: showTeamView ? "#6366f1" : "var(--cat-text-secondary)", border: showTeamView ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent" }}>
            <Users className="w-3.5 h-3.5" /> {t("planner.byTeams")}
          </button>
        </div>
      </div>

      {/* ── Settings ─────────────────────────────────────────────────────── */}
      {showSettings && (
        <div className="rounded-xl border p-4 mb-4 shrink-0"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <div className="flex items-center gap-6 flex-wrap">
            {[
              { label: t("planner.start"), val: startHour, set: setStartHour, opts: Array.from({length:16},(_,i)=>i+6), fmt: (h:number)=>`${h}:00` },
              { label: t("planner.end"), val: endHour, set: setEndHour, opts: Array.from({length:16},(_,i)=>i+10), fmt: (h:number)=>`${h}:00` },
            ].map(({ label, val, set, opts, fmt }) => (
              <label key={label} className="flex items-center gap-2 text-xs" style={{ color: "var(--cat-text-secondary)" }}>
                <span>{label}</span>
                <select value={val} onChange={e => set(+e.target.value)} className="rounded px-2 py-1 text-xs outline-none"
                  style={{ background: "var(--cat-input-bg, var(--cat-card-bg))", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}>
                  {opts.map(o => <option key={o} value={o}>{fmt(o)}</option>)}
                </select>
              </label>
            ))}
            <label className="flex items-center gap-2 text-xs" style={{ color: "var(--cat-text-secondary)" }}>
              <span>{t("planner.interval")}</span>
              <select value={slotMins} onChange={e => { setSlotMins(+e.target.value); setCellHeightOverride(null); }}
                className="rounded px-2 py-1 text-xs outline-none"
                style={{ background: "var(--cat-input-bg, var(--cat-card-bg))", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}>
                {[5, 10, 15, 20, 25, 30, 40, 45, 50, 55, 60, 70, 80, 90].map(m => <option key={m} value={m}>{m} {t("planner.min")}</option>)}
              </select>
            </label>
            {/* Sync grid from division config */}
            <button
              onClick={() => {
                const cid = filterClass ?? classes[0]?.id;
                const cfg = cid ? divConfigs[cid] : null;
                if (cfg) {
                  const [h] = (cfg.dailyStartTime ?? "08:00").split(":").map(Number);
                  const [eh] = (cfg.dailyEndTime ?? "21:00").split(":").map(Number);
                  const slot = matchSlotMinutes(cfg) + (cfg.breakBetweenMatchesMinutes ?? 0);
                  setStartHour(h);
                  setEndHour(Math.min(23, eh + 1));
                  if (slot > 0) setSlotMins(slot);
                }
              }}
              className="px-2 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{ background: "rgba(43,254,186,0.15)", color: "#2BFEBA", border: "1px solid rgba(43,254,186,0.3)" }}
              title={t("planner.syncGrid")}>
              {t("planner.fromDivision")}
            </button>
            <label className="flex items-center gap-2 text-xs" style={{ color: "var(--cat-text-secondary)" }}>
              <span>{t("planner.cellHeight")}</span>
              <select value={cellHeightOverride ?? ""} onChange={e => setCellHeightOverride(e.target.value ? +e.target.value : null)}
                className="rounded px-2 py-1 text-xs outline-none"
                style={{ background: "var(--cat-input-bg, var(--cat-card-bg))", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}>
                <option value="">{t("planner.autoHeight", { height: cellHeight })}</option>
                {[12, 16, 20, 28, 40, 52, 64, 72, 84, 96].map(h => <option key={h} value={h}>{h}px</option>)}
              </select>
            </label>
          </div>
        </div>
      )}

      {/* ── Schedule Audit Panel ─────────────────────────────────────────── */}
      {showAudit && orgSlug && tournamentId && (
        <div className="shrink-0">
          <ScheduleAuditPanel
            base={`/api/org/${orgSlug}/tournament/${tournamentId}`}
            tournamentId={Number(tournamentId)}
            onClose={() => setShowAudit(false)}
          />
        </div>
      )}

      {/* ── Team Schedule View ───────────────────────────────────────────── */}
      {showTeamView && (
        <div className="shrink-0 mb-4">
          <TeamScheduleView
            matches={matches}
            classes={classes}
          />
        </div>
      )}

      {/* ── Auto-Schedule Premium Banner ─────────────────────────────────── */}
      {classes.length > 0 && (() => {
        const isFree    = effectivePlan === "free";
        const planLabel = effectivePlan === "elite" ? "ELITE" : effectivePlan === "pro" ? "PRO" : effectivePlan === "starter" ? "STARTER" : "FREE";
        const planColor = isFree ? "#6b7280" : effectivePlan === "elite" ? "#a78bfa" : effectivePlan === "pro" ? "#f59e0b" : "#2BFEBA";
        const billingUrl = `/org/${orgSlug}/admin/tournament/${tournamentId}/billing`;

        return (
          <div className="rounded-2xl border mb-4 shrink-0 overflow-hidden relative"
            style={{
              borderColor: isFree ? "rgba(107,114,128,0.2)" : showDivConfig ? "rgba(43,254,186,0.4)" : "rgba(43,254,186,0.2)",
              background: isFree
                ? "var(--cat-card-bg)"
                : "linear-gradient(135deg, rgba(43,254,186,0.06) 0%, rgba(43,254,186,0.02) 60%, transparent 100%)",
              boxShadow: isFree ? "none" : showDivConfig ? "0 0 32px rgba(43,254,186,0.08)" : "none",
            }}>

            {/* Glow spot (non-free only) */}
            {!isFree && (
              <div className="absolute top-0 left-0 w-48 h-20 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at 0% 0%, rgba(43,254,186,0.12), transparent 70%)" }} />
            )}

            {/* Header row */}
            <button
              onClick={() => !isFree && setShowDivConfig(v => !v)}
              className="relative w-full flex items-center gap-3 px-5 py-4 transition-all"
              style={{ textAlign: "left", cursor: isFree ? "default" : "pointer" }}>

              {/* Icon */}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: isFree ? "rgba(107,114,128,0.12)" : "rgba(43,254,186,0.15)",
                  boxShadow: isFree ? "none" : "0 0 16px rgba(43,254,186,0.2)",
                }}>
                {isFree
                  ? <Lock className="w-4 h-4" style={{ color: "#6b7280" }} />
                  : <Sparkles className="w-4 h-4" style={{ color: "#2BFEBA" }} />}
              </div>

              {/* Title */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm" style={{ color: isFree ? "var(--cat-text-muted)" : "var(--cat-text)" }}>
                    {t("planner.autoSchedule")}
                  </span>
                  {/* Plan badge */}
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest"
                    style={{ background: `${planColor}18`, color: planColor, border: `1px solid ${planColor}35` }}>
                    {isFree ? t("planner.freePlanBadge") : planLabel}
                  </span>
                  {/* Result badge */}
                  {!isFree && schedResult && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: schedResult.unassigned > 0 ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.15)", color: schedResult.unassigned > 0 ? "#f59e0b" : "#22c55e" }}>
                      {schedResult.unassigned > 0
                        ? t("planner.scheduleResultBadgePartial", { updated: schedResult.updated, unassigned: schedResult.unassigned })
                        : t("planner.scheduleResultBadge", { updated: schedResult.updated })}
                    </span>
                  )}
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                  {isFree
                    ? t("planner.autoScheduleUpsell")
                    : t("planner.autoScheduleHint", { count: classes.length })}
                </p>
              </div>

              {/* Right side actions */}
              <div className="flex items-center gap-2 shrink-0">
                {isFree ? (
                  <a
                    href={billingUrl}
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                    style={{ background: "rgba(43,254,186,0.15)", color: "#2BFEBA", border: "1px solid rgba(43,254,186,0.3)" }}>
                    Upgrade
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <>
                    {showDivConfig && (
                      <div className="flex items-center gap-2">
                        {/* Partial regen toggle */}
                        <button
                          onClick={e => { e.stopPropagation(); setPartialRegen(v => !v); }}
                          title={partialRegen ? t("planner.appendMode") : t("planner.overwriteMode")}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                          style={{
                            background: partialRegen ? "rgba(99,102,241,0.15)" : "var(--cat-tag-bg)",
                            color: partialRegen ? "#6366f1" : "var(--cat-text-muted)",
                            border: `1px solid ${partialRegen ? "rgba(99,102,241,0.35)" : "var(--cat-card-border)"}`,
                          }}>
                          {partialRegen ? t("planner.preserveMode") : t("planner.overwriteMode2")}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); runScheduleAll(); }}
                          disabled={generatingDiv !== null || clearingDiv !== null}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-50 hover:opacity-90"
                          style={{
                            background: "linear-gradient(135deg, #2BFEBA, #06b6d4)",
                            color: "#0A0E14",
                            boxShadow: "0 0 16px rgba(43,254,186,0.3)",
                          }}>
                          {generatingDiv === "all"
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Zap className="w-3.5 h-3.5" />}
                          {t("planner.generateAll")}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); clearSchedule(); }}
                          disabled={generatingDiv !== null || clearingDiv !== null}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 hover:opacity-80"
                          style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                          {clearingDiv === "all"
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                          {t("planner.clearAll")}
                        </button>
                      </div>
                    )}
                    {showDivConfig
                      ? <ChevronDown className="w-4 h-4" style={{ color: "#2BFEBA" }} />
                      : <ChevronRight className="w-4 h-4" style={{ color: "var(--cat-text-muted)" }} />}
                  </>
                )}
              </div>
            </button>

            {/* Expanded body */}
            {!isFree && showDivConfig && (
              <div className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: "rgba(43,254,186,0.15)" }}>
                <div className="pt-3" />
                {/* Cross-division field overview — shows shared fields, time windows, warnings */}
                {classes.length > 1 && (
                  <FieldAllocationOverview
                    fields={fields}
                    classes={classes}
                    divConfigs={divConfigs}
                  />
                )}
                {classes.map(cls => (
                  <DivisionConfigPanel
                    key={cls.id}
                    cls={cls}
                    config={divConfigs[cls.id] ?? defaultConfig(fields)}
                    fields={fields}
                    stages={stages.filter(s => s.classId === cls.id)}
                    saving={savingConfig === cls.id}
                    generating={generatingDiv === cls.id}
                    clearing={clearingDiv === cls.id}
                    onChange={cfg => setDivConfigs(prev => ({ ...prev, [cls.id]: cfg }))}
                    onSave={() => saveConfig(cls.id)}
                    onGenerate={() => runScheduleAll([cls.id])}
                    onClear={() => clearSchedule(cls.id)}
                    onDatesChange={(s, e) => updateClassDates(cls.id, s, e)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Smart Hints Panel ───────────────────────────────────────────── */}
      {schedResult && schedResult.unassigned > 0 && (
        <div className="mb-3 rounded-xl border px-4 py-3 shrink-0"
          style={{ borderColor: "rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.06)" }}>
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold mb-1" style={{ color: "#f59e0b" }}>
                {t("planner.unscheduledHintsTitle", { count: schedResult.unassigned })}
              </p>
              <div className="text-[11px] space-y-1" style={{ color: "var(--cat-text-muted)" }}>
                <p>{t("planner.hintsReasons")}</p>
                <ul className="list-disc list-inside space-y-0.5 pl-1">
                  <li>{t("planner.hintSlots")}</li>
                  <li>{t("planner.hintRest")}</li>
                  <li>{t("planner.hintPlayoff")}</li>
                  <li>{t("planner.hintAppend")}</li>
                </ul>
                {schedResult.msg && schedResult.msg !== "" && (
                  <p className="mt-1 font-mono text-[10px] opacity-60">{schedResult.msg}</p>
                )}
              </div>
            </div>
            <button onClick={() => setSchedResult(null)} className="shrink-0 hover:opacity-70" style={{ color: "var(--cat-text-muted)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Day tabs + filters ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3 shrink-0 flex-wrap">
        <Calendar className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />

        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "var(--cat-tag-bg)" }}>
          {days.length === 0 ? (
            <span className="px-4 py-1.5 text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("planner.noMatchesWithDatesTabs")}</span>
          ) : days.map(day => (
            <button key={day} onClick={() => setActiveDay(day)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={activeDay === day ? { background: "var(--cat-accent)", color: "#0A0E14" } : { color: "var(--cat-text-secondary)" }}>
              {fmtDate(day)}
            </button>
          ))}
        </div>

        {stadiums.length > 1 && (
          <div className="flex items-center gap-1 p-1 rounded-xl ml-2" style={{ background: "var(--cat-tag-bg)" }}>
            <button onClick={() => setStadiumFilter(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={stadiumFilter === null ? { background: "var(--cat-accent)", color: "#0A0E14" } : { color: "var(--cat-text-secondary)" }}>
              {t("planner.allFilter")}
            </button>
            {stadiums.map(st => (
              <button key={st} onClick={() => setStadiumFilter(prev => prev === st ? null : st)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={stadiumFilter === st ? { background: stadiumColorMap[st] ?? "#888", color: "#fff" } : { color: "var(--cat-text-secondary)" }}>
                {st}
              </button>
            ))}
          </div>
        )}

        {filterClass && (
          <span className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-bold ml-2"
            style={{ background: "rgba(6,182,212,0.12)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.3)" }}>
            {classes.find(c => c.id === filterClass)?.name ?? `#${filterClass}`}
            <button onClick={() => setFilterClass(null)} className="opacity-60 hover:opacity-100">×</button>
          </span>
        )}

        {selectedMatch && (
          <div className="ml-2 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold animate-pulse"
            style={{ background: "var(--cat-accent)", color: "#0A0E14" }}>
            <Move className="w-3.5 h-3.5" />
            {t("planner.selectedMatchHint", { num: selectedMatch.matchNumber ?? "—" })}
            <button onClick={() => setSelectedMatch(null)}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {dragState && (
          <div className="ml-2 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(43,254,186,0.1)", color: "#2BFEBA", border: "1px solid rgba(43,254,186,0.3)" }}>
            <Zap className="w-3.5 h-3.5" />
            {t("planner.draggingHint")}
          </div>
        )}
      </div>

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* ── Unscheduled sidebar ──────────────────────────────────────────── */}
        <div className="w-56 shrink-0 flex flex-col gap-1.5"
          style={{ height: "calc(100vh - 320px)", overflowY: "auto" }}>

          <div className="flex items-center justify-between mb-1 sticky top-0 pb-2 z-10"
            style={{ background: "var(--cat-bg, #0f1117)" }}>
            <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
              {t("planner.withoutTime")}
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px]"
                style={{ background: unscheduled.length > 0 ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.2)", color: unscheduled.length > 0 ? "#f59e0b" : "#22c55e" }}>
                {unscheduled.length}
              </span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAddMatch(true)}
                title={t("planner.addMatch")}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
                style={{ background: "rgba(43,254,186,0.12)", color: "#2BFEBA", border: "1px solid rgba(43,254,186,0.25)" }}>
                <Plus className="w-3 h-3" />
              </button>
              <select value={filterStage ?? ""} onChange={e => setFilterStage(e.target.value ? +e.target.value : null)}
                className="rounded px-1 py-0.5 text-[10px] outline-none"
                style={{ background: "var(--cat-input-bg, var(--cat-card-bg))", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}>
                <option value="">{t("planner.allFilter")}</option>
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {unscheduled.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 rounded-xl border border-dashed"
              style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)" }}>
              <CheckCircle className="w-6 h-6 opacity-40" />
              <span className="text-xs text-center px-2">{t("planner.allScheduled")}</span>
            </div>
          ) : (() => {
            // Group by stageId + groupRound
            // Group/League stages → split by Тур N (groupRound)
            // Knockout/Playoff stages → one section per stage (not per round)
            type SectionKey = string;
            const sections = new Map<SectionKey, {
              label: string; subLabel?: string; color: string;
              isGroup: boolean; roundNum: number; stageOrder: number;
              matches: typeof unscheduled;
            }>();

            let stageOrderIdx = 0;
            const stageOrderMap = new Map<number, number>();

            for (const m of unscheduled) {
              const sid = m.stageId ?? 0;
              if (!stageOrderMap.has(sid)) stageOrderMap.set(sid, stageOrderIdx++);
              const stageOrder = stageOrderMap.get(sid)!;

              const stageType = m.stage?.type;
              const isGroup = stageType === "group" || stageType === "league";
              const roundNum = isGroup ? (m.groupRound ?? 0) : 0;

              // Key: group stages split by tour, knockout stages kept together
              const key: SectionKey = isGroup
                ? `g:${sid}:${roundNum}`
                : `k:${sid}`;

              if (!sections.has(key)) {
                const stageName = m.stage?.name ?? "";
                let label: string;
                let subLabel: string | undefined;
                if (isGroup) {
                  if (roundNum > 0) {
                    label = t("planner.tourNumber", { num: roundNum });
                    subLabel = stageName; // e.g. "Group Stage"
                  } else {
                    label = stageName; // no round info yet
                  }
                } else {
                  // Knockout: show stage name directly (Playoffs A, Playoffs B, etc.)
                  label = stageName;
                }
                sections.set(key, { label, subLabel, color: stageColorMap(sid), isGroup, roundNum, stageOrder, matches: [] });
              }
              sections.get(key)!.matches.push(m);
            }

            // Sort: group stages by roundNum, knockout stages after group, preserve stage order within same type
            const sorted = [...sections.entries()].sort(([, a], [, b]) => {
              if (a.isGroup && b.isGroup) return a.roundNum !== b.roundNum ? a.roundNum - b.roundNum : a.stageOrder - b.stageOrder;
              if (a.isGroup) return -1;
              if (b.isGroup) return 1;
              return a.stageOrder - b.stageOrder; // knockout: by stage order
            });

            return (
              <div className="space-y-3">
                {sorted.map(([key, section]) => (
                  <div key={key}>
                    {/* Section header */}
                    <div className="px-1 mb-1.5 sticky top-10 z-[5]"
                      style={{ background: "var(--cat-bg, #0f1117)" }}>
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1" style={{ background: section.color + "40" }} />
                        <span className="text-[9px] font-black uppercase tracking-widest shrink-0"
                          style={{ color: section.color }}>
                          {section.label}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: section.color + "20", color: section.color }}>
                          {section.matches.length}
                        </span>
                        <div className="h-px flex-1" style={{ background: section.color + "40" }} />
                      </div>
                      {section.subLabel && (
                        <div className="text-center mt-0.5">
                          <span className="text-[9px]" style={{ color: "var(--cat-text-muted)" }}>
                            {section.subLabel}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Matches in section */}
                    <div className="space-y-1.5">
                      {section.matches.map(m => (
                        <div key={m.id} className="relative" style={{ height: 78 }}>
                          <MatchCard
                            match={m}
                            color={section.color}
                            conflict={conflictMap.get(m.id)}
                            selected={selectedMatch?.id === m.id}
                            isDragging={dragState?.matchId === m.id}
                            divisionName={getDivName(m.stageId ?? 0)}
                            onDragStart={() => handleDragStart(m)}
                            onDragEnd={handleDragEnd}
                            onClick={() => setSelectedMatch(prev => prev?.id === m.id ? null : m)}
                            onContextMenu={e => handleContextMenu(m, e)}
                            saving={saving === m.id}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* ── Calendar Grid (Google/Apple style) ──────────────────────────── */}
        <div className="flex-1 min-w-0 overflow-auto rounded-xl border text-xs"
          style={{ borderColor: "var(--cat-card-border)", height: "calc(100vh - 320px)" }}>

          {activeFields.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm" style={{ color: "var(--cat-text-muted)" }}>
              {t("planner.addFieldsHint")}
            </div>
          ) : (
            <div style={{ minWidth: activeFields.length * 200 + 56 }}>

              {/* ── Sticky two-row header ───────────────────────────────────── */}
              <div className="sticky top-0 z-30 flex"
                style={{
                  background: "var(--cat-bg, #0f1117)",
                  borderBottom: "2px solid var(--cat-card-border)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                }}>
                {/* time-gutter placeholder */}
                <div className="shrink-0 border-r"
                  style={{ width: 56, borderColor: "var(--cat-card-border)", background: "var(--cat-bg, #0f1117)" }} />
                <div className="flex-1 flex flex-col">
                  {/* Row 1 — stadium group labels */}
                  <div className="flex border-b" style={{ borderColor: "var(--cat-card-border)" }}>
                    {stadiumGroups.map(grp => {
                      const grpColor = grp.stadiumId ? (stadiumColorMap[grp.name] ?? "var(--cat-text-secondary)") : "var(--cat-text-secondary)";
                      return (
                        <div key={grp.stadiumId ?? grp.name}
                          className="px-2 py-1.5 text-center font-black text-[10px] uppercase tracking-widest border-r"
                          style={{
                            flex: grp.fields.length,
                            minWidth: grp.fields.length * 200,
                            borderColor: "var(--cat-card-border)",
                            color: grpColor,
                            background: `${grpColor}0a`,
                            letterSpacing: "0.1em",
                          }}>
                          {grp.name}
                        </div>
                      );
                    })}
                  </div>
                  {/* Row 2 — field names + utilization */}
                  <div className="flex">
                    {activeFields.map(f => {
                      const stadiumName = getFieldStadiumName(f);
                      const fieldColor = stadiumName ? (stadiumColorMap[stadiumName] ?? "var(--cat-text-secondary)") : "var(--cat-text-secondary)";
                      const matchCount = scheduledOnDay.filter(m => m.fieldId === f.id).length;
                      const maxSlots = Math.floor((dayEndMins - dayStartMins) / slotMins);
                      const utilPct = maxSlots > 0 ? Math.round((matchCount / maxSlots) * 100) : 0;
                      const utilColor = utilPct >= 80 ? "#22c55e" : utilPct >= 50 ? "#f59e0b" : "var(--cat-text-muted)";
                      return (
                        <div key={f.id}
                          className="flex flex-col items-center justify-center gap-1 px-2 py-2.5 text-center font-bold border-r"
                          style={{ flex: 1, minWidth: 200, borderColor: "var(--cat-card-border)", color: fieldColor }}>
                          <div className="flex items-center gap-1.5">
                            <Grid3x3 className="w-3 h-3 opacity-40" />
                            <span className="text-[13px] font-black">{f.name}</span>
                          </div>
                          {stadiumName && (
                            <span className="text-[9px] font-medium truncate max-w-[150px]"
                              style={{ color: "var(--cat-text-muted)", opacity: 0.7 }}>{stadiumName}</span>
                          )}
                          {matchCount > 0 && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: `${utilColor}20`, color: utilColor, border: `1px solid ${utilColor}40` }}>
                              {t("planner.matchUtilization", { count: matchCount, pct: utilPct })}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Scrollable body: time ruler + field columns ─────────────── */}
              <div className="flex" style={{ height: calTotalPx, position: "relative" }}>

                {/* Sticky time ruler */}
                <div className="sticky left-0 z-20 shrink-0 border-r"
                  style={{ width: 56, borderColor: "var(--cat-card-border)", background: "var(--cat-bg, #0f1117)" }}>
                  {Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i).map(h => (
                    <div key={h}
                      className="absolute w-full flex items-center justify-end pr-2 select-none"
                      style={{
                        top: (h - startHour) * 60 * PX_PER_MIN - 9,
                        height: 18,
                        fontSize: 10,
                        fontWeight: 600,
                        color: h % 2 === 0 ? "var(--cat-text-secondary)" : "var(--cat-text-muted)",
                        letterSpacing: "0.02em",
                      }}>
                      {String(h).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>

                {/* Field columns */}
                {activeFields.map(f => {
                  const fieldMatches = scheduledOnDay.filter(m => m.fieldId === f.id);
                  const isDropTarget = dragOverCell?.fieldId === f.id;
                  const dragMatchObj = dragState ? matches.find(m => m.id === dragState.matchId) : null;
                  const dragDurPx = dragMatchObj
                    ? Math.max(getMatchDurationMins(dragMatchObj) * PX_PER_MIN, 24)
                    : slotMins * PX_PER_MIN;
                  const ghostColor = dragOverCell?.validity === "valid"   ? "#2BFEBA"
                    : dragOverCell?.validity === "conflict" ? "#ef4444" : "#f59e0b";

                  return (
                    <div key={f.id}
                      className="flex-1 relative border-r"
                      style={{
                        minWidth: 200,
                        borderColor: "var(--cat-card-border)",
                        cursor: selectedMatch && !dragState ? "crosshair" : "default",
                      }}
                      onDragOver={e => handleCalDragOver(f.id, e)}
                      onDragLeave={handleDragLeave}
                      onDrop={e => handleCalDrop(f.id, e)}
                      onClick={e => handleCalClick(f.id, e)}>

                      {/* Alternating hour bands + grid lines */}
                      {Array.from({ length: endHour - startHour }, (_, i) => startHour + i).map(h => (
                        <React.Fragment key={h}>
                          {/* Alternating hour background */}
                          <div className="absolute left-0 right-0 pointer-events-none"
                            style={{
                              top: (h - startHour) * 60 * PX_PER_MIN,
                              height: 60 * PX_PER_MIN,
                              background: (h - startHour) % 2 === 0 ? "rgba(255,255,255,0.012)" : "transparent",
                            }} />
                          {/* Hour line */}
                          <div className="absolute left-0 right-0 pointer-events-none"
                            style={{ top: (h - startHour) * 60 * PX_PER_MIN, height: 1, background: "rgba(255,255,255,0.09)" }} />
                          {/* Half-hour line */}
                          <div className="absolute left-0 right-0 pointer-events-none"
                            style={{ top: (h - startHour + 0.5) * 60 * PX_PER_MIN, height: 1, background: "rgba(255,255,255,0.03)" }} />
                        </React.Fragment>
                      ))}

                      {/* Match blocks */}
                      {fieldMatches.map(m => {
                        const t = parseTime(m.scheduledAt!);
                        const matchMins = slotToMins(t);
                        const top    = (matchMins - dayStartMins) * PX_PER_MIN;
                        const dur    = getMatchDurationMins(m);
                        const height = Math.max(dur * PX_PER_MIN, 36);
                        const color  = stageColorMap(m.stageId ?? 0);
                        const divisionName = getDivName ? getDivName(m.stageId ?? 0) : undefined;
                        return (
                          <div key={m.id} className="absolute"
                            style={{ top: top + 1, height: height - 1, left: 3, right: 3, zIndex: 2 }}
                            onClick={e => { e.stopPropagation(); handleSelectInGrid(m); }}>
                            <MatchCard
                              match={m}
                              color={color}
                              conflict={conflictMap.get(m.id)}
                              selected={selectedMatch?.id === m.id}
                              compact={height < 64}
                              isDragging={dragState?.matchId === m.id}
                              divisionName={divisionName}
                              onDragStart={() => handleDragStart(m)}
                              onDragEnd={handleDragEnd}
                              onContextMenu={e => handleContextMenu(m, e)}
                              onClick={() => handleSelectInGrid(m)}
                              onUnschedule={() => handleUnschedule(m)}
                              saving={saving === m.id}
                            />
                          </div>
                        );
                      })}

                      {/* Drag ghost — shows where the match will land */}
                      {isDropTarget && dragOverCell && (
                        <div className="absolute pointer-events-none"
                          style={{
                            top: dragOverCell.topPx,
                            height: dragDurPx,
                            left: 3, right: 3, zIndex: 5,
                            borderRadius: 8,
                            border: `1.5px dashed ${ghostColor}`,
                            background: `${ghostColor}18`,
                          }}>
                          <span className="block pl-2 pt-1 text-[9px] font-bold" style={{ color: ghostColor }}>
                            {dragOverCell.slot}{dragOverCell.validity === "conflict" ? " ⚡" : dragOverCell.validity === "occupied" ? " ✕" : ""}
                          </span>
                        </div>
                      )}

                      {/* "Place here" highlight when a match is selected */}
                      {selectedMatch && !dragState && (
                        <div className="absolute inset-0 pointer-events-none"
                          style={{ zIndex: 1, borderLeft: "2px solid rgba(6,182,212,0.25)" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Legend ───────────────────────────────────────────────────────── */}
      {stages.length > 0 && (
        <div className="flex items-center gap-3 mt-3 flex-wrap shrink-0">
          <span className="text-[10px] font-bold" style={{ color: "var(--cat-text-muted)" }}>{t("planner.stagesLabel")}</span>
          {stages.map((s, i) => (
            <button key={s.id}
              onClick={() => setFilterStage(prev => prev === s.id ? null : s.id)}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg transition-all"
              style={{ background: filterStage === s.id ? `${STAGE_COLORS[i % STAGE_COLORS.length]}22` : "transparent" }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: STAGE_COLORS[i % STAGE_COLORS.length] }} />
              <span className="text-[10px]" style={{ color: "var(--cat-text-secondary)" }}>{s.name}</span>
            </button>
          ))}
          {/* Conflict legend */}
          <div className="flex items-center gap-3 ml-4 pl-4" style={{ borderLeft: "1px solid var(--cat-card-border)" }}>
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: 10 }}>👑</span>
              <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>{t("planner.legendFinal")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-2.5 h-2.5" style={{ color: "#f97316" }} />
              <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>{t("planner.legendLowRest")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
              <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>{t("planner.legendConflict")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#f59e0b" }} />
              <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>{t("planner.legendManyPerDay")}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Context Menu ──────────────────────────────────────────────────── */}
      {ctxMenu && ctxMatch && (
        <ContextMenuPanel
          ctx={ctxMenu}
          match={ctxMatch}
          fields={fields}
          onClose={() => setCtxMenu(null)}
          onUnschedule={() => { handleUnschedule(ctxMatch); setCtxMenu(null); }}
          onSwap={() => { handleSwapTeams(ctxMatch); setCtxMenu(null); }}
          onEdit={() => { handleOpenEdit(ctxMatch); setCtxMenu(null); }}
        />
      )}

      {/* ── Edit Popover ──────────────────────────────────────────────────── */}
      {editState && (
        <EditPopover
          edit={editState}
          fields={fields}
          onSave={handleEditSave}
          onClose={() => setEditState(null)}
        />
      )}

      {/* ── Stadium Schedule Modal ────────────────────────────────────────── */}
      {showStadiumSchedule && (
        <StadiumScheduleModal
          stadiums={stadiumObjects}
          tournamentDays={days}
          schedules={stadiumSchedules}
          base={base}
          onClose={() => setShowStadiumSchedule(false)}
          onSaved={(entries) => {
            setStadiumSchedules(entries);
            showToast(t("planner.stadiumsSaved"), "ok");
          }}
        />
      )}

      {/* ── Add Match Modal ───────────────────────────────────────────────── */}
      {showAddMatch && (
        <AddMatchModal
          base={base}
          stages={stages}
          classes={classes}
          onClose={() => setShowAddMatch(false)}
          onCreated={() => { load(); showToast(t("planner.matchCreated"), "ok"); }}
        />
      )}
    </div>
  );
}
