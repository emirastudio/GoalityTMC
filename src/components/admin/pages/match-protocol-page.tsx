"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useTournament } from "@/lib/tournament-context";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowLeft, RefreshCw, Loader2, SquareActivity,
  Plus, X, Clock, MapPin, Calendar, Trophy,
  Zap, StopCircle, Play, Shield, Users, ChevronDown,
  UserCheck, UserMinus, Download,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type MatchStatus = "scheduled" | "live" | "finished" | "cancelled" | "postponed" | "walkover";
type EventType =
  | "goal" | "own_goal" | "yellow" | "red" | "yellow_red"
  | "penalty_scored" | "penalty_missed"
  | "substitution_in" | "substitution_out" | "injury" | "var";

type TFunc = ReturnType<typeof useTranslations<"admin.matchHub">>;

interface Person {
  id: number;
  firstName: string;
  lastName: string;
}

interface MatchEvent {
  id: number;
  matchId: number;
  eventType: EventType;
  minute: number;
  minuteExtra?: number | null;
  teamId: number;
  personId?: number | null;
  person?: Person | null;
  assistPersonId?: number | null;
  assistPerson?: Person | null;
  team?: { id: number; name: string; club?: { name?: string; badgeUrl?: string | null } | null };
}

interface Team {
  id: number;
  name: string;
  club?: { id?: number; name?: string; badgeUrl?: string | null } | null;
}

interface MatchData {
  id: number;
  matchNumber?: number | null;
  status: MatchStatus;
  scheduledAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  homeTeam?: Team | null;
  awayTeam?: Team | null;
  field?: { id: number; name: string } | null;
  stage?: { id: number; name: string; nameRu?: string | null; classId?: number | null } | null;
  group?: { id: number; name: string } | null;
  round?: { id: number; name: string; shortName?: string | null } | null;
  events?: MatchEvent[];
}

interface LineupEntry {
  id: number;
  matchId: number;
  teamId: number;
  personId: number;
  isStarting: boolean;
  shirtNumber?: number | null;
  position?: string | null;
  person?: Person | null;
  team?: Team | null;
}

interface SquadPlayer {
  id: number;
  firstName: string;
  lastName: string;
  shirtNumber?: number | null;
  position?: string | null;
  teamId: number;
}

interface RecentMatch {
  id: number;
  status: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return now;
}

function calcMinute(startedAt: string, now: number) {
  const elapsed = Math.floor((now - new Date(startedAt).getTime()) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return { mins, secs };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function eventMeta(type: EventType, t: TFunc): { icon: string; color: string; label: string } {
  const map: Record<EventType, { icon: string; color: string; label: string }> = {
    goal:             { icon: "⚽", color: "#10b981", label: t("eventGoal") },
    own_goal:         { icon: "⚽", color: "#f59e0b", label: t("eventOwnGoal") },
    yellow:           { icon: "🟨", color: "#f59e0b", label: t("eventYellow") },
    red:              { icon: "🟥", color: "#ef4444", label: t("eventRed") },
    yellow_red:       { icon: "🟧", color: "#f97316", label: t("eventYellowRed") },
    penalty_scored:   { icon: "⚽", color: "#3b82f6", label: t("eventPenaltyScored") },
    penalty_missed:   { icon: "✗",  color: "#6b7280", label: t("eventPenaltyMissed") },
    substitution_in:  { icon: "↑",  color: "#10b981", label: t("eventSubIn") },
    substitution_out: { icon: "↓",  color: "#ef4444", label: t("eventSubOut") },
    injury:           { icon: "🩹", color: "#8b5cf6", label: t("eventInjury") },
    var:              { icon: "📺", color: "#6366f1", label: t("eventVar") },
  };
  return map[type] ?? { icon: "·", color: "#6b7280", label: type };
}

function isGoalEvent(type: EventType) {
  return type === "goal" || type === "penalty_scored";
}

function teamResult(m: RecentMatch, teamId: number): "W" | "D" | "L" | null {
  if (m.status !== "finished") return null;
  const isHome = m.homeTeamId === teamId;
  const myScore = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
  const theirScore = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
  if (myScore > theirScore) return "W";
  if (myScore < theirScore) return "L";
  return "D";
}

// ─── ClubBadge ────────────────────────────────────────────────────────────────

function ClubBadge({ team, size = 40 }: {
  team?: Team | null;
  size?: number;
}) {
  const url = team?.club?.badgeUrl;
  const letter = (team?.club?.name ?? team?.name ?? "?").charAt(0).toUpperCase();
  if (url) return (
    <img
      src={url} alt={team?.club?.name ?? ""}
      width={size} height={size}
      className="rounded-xl object-contain shrink-0"
      style={{ width: size, height: size, background: "var(--cat-tag-bg)" }}
    />
  );
  return (
    <div className="rounded-xl flex items-center justify-center shrink-0 font-black"
      style={{
        width: size, height: size,
        background: "var(--cat-tag-bg)",
        color: "var(--cat-text-muted)",
        fontSize: Math.max(10, size * 0.38),
      }}>
      {letter}
    </div>
  );
}

// ─── Form Pill ────────────────────────────────────────────────────────────────

function FormPill({ result }: { result: "W" | "D" | "L" }) {
  const style = {
    W: { bg: "#10b981", text: "#fff" },
    D: { bg: "#f59e0b", text: "#fff" },
    L: { bg: "#ef4444", text: "#fff" },
  }[result];
  return (
    <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black shrink-0"
      style={{ background: style.bg, color: style.text }}>
      {result}
    </div>
  );
}

// ─── Timeline Bar (horizontal, premium) ──────────────────────────────────────

function TimelineBar({
  events,
  homeTeamId,
  homeTeamName,
  awayTeamName,
  currentMinute,
  isLive,
  t,
}: {
  events: MatchEvent[];
  homeTeamId?: number | null;
  homeTeamName?: string;
  awayTeamName?: string;
  currentMinute?: number;
  isLive: boolean;
  t: TFunc;
}) {
  const MAX = 120;
  const progressMinute = Math.min(currentMinute ?? (isLive ? 45 : MAX), MAX);
  const progressPct = (progressMinute / MAX) * 100;
  function pct(m: number) { return Math.min((m / MAX) * 100, 100); }

  const homeEvents = events.filter(e => e.teamId === homeTeamId);
  const awayEvents = events.filter(e => e.teamId !== homeTeamId);

  return (
    <div className="px-5 py-6 select-none">
      {/* ── gradient track ─────────────────────────────────────────── */}
      <div className="relative" style={{ height: 150 }}>

        {/* Home team label — top left */}
        {homeTeamName && (
          <div className="absolute left-0 flex items-center gap-1" style={{ top: 0 }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#3b82f6" }} />
            <span className="text-[9px] font-black uppercase tracking-wider truncate max-w-[110px]"
              style={{ color: "#3b82f6" }}>{homeTeamName}</span>
          </div>
        )}

        {/* Above-track: home team events */}
        <div className="absolute w-full" style={{ bottom: 78, height: 52, top: 16 }}>
          {homeEvents.map(ev => {
            const meta = eventMeta(ev.eventType, t);
            const x = pct(ev.minute);
            const name = ev.person ? `${ev.person.lastName} ${ev.person.firstName.charAt(0)}.` : meta.label;
            return (
              <div key={ev.id} className="absolute flex flex-col items-center"
                style={{ left: `${x}%`, transform: "translateX(-50%)", bottom: 0 }}>
                <span className="text-[9px] font-bold mb-0.5 whitespace-nowrap"
                  style={{ color: "var(--cat-text-secondary)" }}>{name}</span>
                <div className="w-0.5 h-3" style={{ background: meta.color + "80" }} />
              </div>
            );
          })}
        </div>

        {/* ── main track ── */}
        <div className="absolute w-full" style={{ top: 60 }}>
          {/* Background rail */}
          <div className="relative h-3 rounded-full"
            style={{ background: "rgba(255,255,255,0.06)", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)" }}>

            {/* Filled progress — rainbow gradient */}
            <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progressPct}%`,
                background: isLive
                  ? "linear-gradient(90deg, #10b981 0%, #3b82f6 40%, #8b5cf6 70%, #ef4444 100%)"
                  : "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)",
                boxShadow: isLive ? "0 0 16px rgba(239,68,68,0.5), 0 0 32px rgba(139,92,246,0.3)" : "0 0 8px rgba(59,130,246,0.4)",
              }} />

            {/* HT marker at 45' */}
            <div className="absolute top-0 h-full flex flex-col items-center"
              style={{ left: `${pct(45)}%`, transform: "translateX(-50%)" }}>
              <div className="w-px h-full" style={{ background: "rgba(255,255,255,0.2)" }} />
            </div>
            {/* FT marker at 90' */}
            <div className="absolute top-0 h-full"
              style={{ left: `${pct(90)}%`, width: 1, background: "rgba(255,255,255,0.2)" }} />

            {/* Event markers on track */}
            {events.map(ev => {
              const meta = eventMeta(ev.eventType, t);
              const isHome = ev.teamId === homeTeamId;
              const x = pct(ev.minute);
              const letter = ev.eventType === "goal" || ev.eventType === "own_goal" || ev.eventType === "penalty_scored"
                ? "⚽" : ev.eventType === "yellow" ? "Y" : ev.eventType === "red" ? "R"
                : ev.eventType === "var" ? "V"
                : ev.eventType === "substitution_in" ? "↔" : ev.eventType === "injury" ? "+" : "·";
              return (
                <div key={ev.id}
                  className="absolute flex items-center justify-center rounded-full text-[9px] font-black cursor-default transition-transform hover:scale-125"
                  style={{
                    left: `${x}%`,
                    transform: "translateX(-50%) translateY(-50%)",
                    top: "50%",
                    width: 20, height: 20,
                    background: meta.color,
                    color: "#fff",
                    boxShadow: `0 0 10px ${meta.color}80, 0 0 4px ${meta.color}`,
                    zIndex: isHome ? 2 : 1,
                  }}
                  title={`${ev.minute}' · ${meta.label}${ev.person ? ` · ${ev.person.firstName} ${ev.person.lastName}` : ""}`}
                >
                  {letter}
                </div>
              );
            })}

            {/* Live cursor */}
            {isLive && (
              <div className="absolute"
                style={{ left: `${progressPct}%`, top: "50%", transform: "translateX(-50%) translateY(-50%)" }}>
                <div className="w-5 h-5 rounded-full animate-ping opacity-30 absolute inset-0"
                  style={{ background: "#ef4444" }} />
                <div className="w-5 h-5 rounded-full relative z-10 flex items-center justify-center"
                  style={{ background: "#ef4444", boxShadow: "0 0 16px #ef4444, 0 0 32px rgba(239,68,68,0.5)" }}>
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>
            )}
          </div>

          {/* Minute labels */}
          <div className="relative mt-2 text-[9px] font-mono" style={{ color: "var(--cat-text-muted)" }}>
            <span className="absolute" style={{ left: 0 }}>0&apos;</span>
            <span className="absolute" style={{ left: `${pct(45)}%`, transform: "translateX(-50%)" }}>45&apos;</span>
            <span className="absolute" style={{ left: `${pct(90)}%`, transform: "translateX(-50%)" }}>90&apos;</span>
            <span className="absolute" style={{ right: 0 }}>120&apos;</span>
          </div>
        </div>

        {/* Below-track: away team events */}
        <div className="absolute w-full" style={{ top: 88, paddingTop: 16 }}>
          {awayEvents.map(ev => {
            const meta = eventMeta(ev.eventType, t);
            const x = pct(ev.minute);
            const name = ev.person ? `${ev.person.lastName} ${ev.person.firstName.charAt(0)}.` : meta.label;
            return (
              <div key={ev.id} className="absolute flex flex-col items-center"
                style={{ left: `${x}%`, transform: "translateX(-50%)", top: 0 }}>
                <div className="w-0.5 h-3" style={{ background: meta.color + "80" }} />
                <span className="text-[9px] font-bold mt-0.5 whitespace-nowrap"
                  style={{ color: "var(--cat-text-secondary)" }}>{name}</span>
              </div>
            );
          })}
        </div>

        {/* Away team label — bottom left */}
        {awayTeamName && (
          <div className="absolute left-0 bottom-0 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#f97316" }} />
            <span className="text-[9px] font-black uppercase tracking-wider truncate max-w-[110px]"
              style={{ color: "#f97316" }}>{awayTeamName}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Events List ──────────────────────────────────────────────────────────────

function EventsList({
  events,
  homeTeamId,
  homeTeamName,
  awayTeamName,
  onDelete,
  canEdit,
  t,
}: {
  events: MatchEvent[];
  homeTeamId?: number | null;
  homeTeamName: string;
  awayTeamName: string;
  onDelete: (id: number) => void;
  canEdit: boolean;
  t: TFunc;
}) {
  const sorted = [...events].sort((a, b) => a.minute - b.minute || (a.minuteExtra ?? 0) - (b.minuteExtra ?? 0));

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10" style={{ color: "var(--cat-text-muted)" }}>
        <SquareActivity className="w-8 h-8 mb-2 opacity-20" />
        <p className="text-sm font-semibold">{t("noEvents")}</p>
        <p className="text-xs mt-0.5 opacity-60">{t("noEventsHint")}</p>
      </div>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: "var(--cat-card-border)" }}>
      {sorted.map(ev => {
        const meta = eventMeta(ev.eventType, t);
        const isHome = ev.teamId === homeTeamId;
        const teamLabel = isHome ? homeTeamName : awayTeamName;
        return (
          <div key={ev.id} className="flex items-center gap-3 px-4 py-3.5 group hover:opacity-90 transition-opacity">
            <span className="w-11 text-right font-mono text-sm font-bold shrink-0"
              style={{ color: "var(--cat-text-muted)" }}>
              {ev.minute}{ev.minuteExtra ? `+${ev.minuteExtra}` : ""}&apos;
            </span>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
              style={{ background: `${meta.color}18`, boxShadow: `0 0 8px ${meta.color}30` }}>
              {meta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold leading-snug" style={{ color: "var(--cat-text)" }}>
                {ev.person ? `${ev.person.firstName} ${ev.person.lastName}` : meta.label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                {meta.label}
                {ev.assistPerson && (
                  <span className="opacity-70"> · {t("assist", { name: `${ev.assistPerson.firstName} ${ev.assistPerson.lastName}` })}</span>
                )}
                <span style={{ color: isHome ? "#3b82f6" : "#f97316" }}> · {teamLabel}</span>
              </p>
            </div>
            {canEdit && (
              <button onClick={() => onDelete(ev.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-opacity"
                style={{ background: "var(--cat-tag-bg)", color: "#ef4444" }}>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Add Event Panel ──────────────────────────────────────────────────────────

function AddEventPanel({
  match,
  base,
  onAdded,
  lineup,
  t,
}: {
  match: MatchData;
  base: string;
  onAdded: () => void;
  lineup: LineupEntry[];
  t: TFunc;
}) {
  const QUICK_EVENTS: { type: EventType; label: string; emoji: string; color: string }[] = [
    { type: "goal",             label: t("eventGoal"),          emoji: "⚽", color: "#10b981" },
    { type: "own_goal",         label: t("eventOwnGoal"),       emoji: "⚽", color: "#f59e0b" },
    { type: "yellow",           label: t("eventYellow"),        emoji: "🟨", color: "#f59e0b" },
    { type: "red",              label: t("eventRed"),           emoji: "🟥", color: "#ef4444" },
    { type: "yellow_red",       label: t("eventYellowRed"),     emoji: "🟧", color: "#f97316" },
    { type: "substitution_in",  label: t("eventSubIn"),         emoji: "🔄", color: "#3b82f6" },
    { type: "injury",           label: t("eventInjury"),        emoji: "🩹", color: "#8b5cf6" },
    { type: "var",              label: t("eventVar"),           emoji: "📺", color: "#6366f1" },
    { type: "penalty_scored",   label: t("eventPenaltyScored"), emoji: "⚽", color: "#3b82f6" },
    { type: "penalty_missed",   label: t("eventPenaltyMissed"), emoji: "✗",  color: "#6b7280" },
  ];

  const [addingType, setAddingType] = useState<EventType | null>(null);
  const [minute, setMinute] = useState("");
  const [teamSide, setTeamSide] = useState<"home" | "away">("home");
  const [personId, setPersonId] = useState<number | "">("");
  const [assistId, setAssistId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const minuteRef = useRef<HTMLInputElement>(null);

  const teamId = teamSide === "home" ? match.homeTeamId : match.awayTeamId;
  const teamPlayers = lineup.filter(l => l.teamId === teamId)
    .sort((a, b) => (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99));
  const homeTeamPlayers = lineup.filter(l => l.teamId === match.homeTeamId)
    .sort((a, b) => (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99));
  const awayTeamPlayers = lineup.filter(l => l.teamId === match.awayTeamId)
    .sort((a, b) => (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99));

  // For own_goal, the "player" is from the other team
  const ownGoalPlayers = addingType === "own_goal"
    ? (teamSide === "home" ? homeTeamPlayers : awayTeamPlayers)
    : teamPlayers;

  const wantsAssist = addingType === "goal" || addingType === "penalty_scored";
  const wantsPlayer = addingType !== null && addingType !== "var";

  async function addEvent() {
    if (!addingType || !minute) return;
    setSaving(true);
    await fetch(`${base}/matches/${match.id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        eventType: addingType,
        minute: parseInt(minute),
        personId: personId || null,
        assistPersonId: wantsAssist && assistId ? assistId : null,
      }),
    });

    // Auto-update score
    if (addingType === "goal" || addingType === "penalty_scored") {
      const homeScore = (match.homeScore ?? 0) + (teamSide === "home" ? 1 : 0);
      const awayScore = (match.awayScore ?? 0) + (teamSide === "away" ? 1 : 0);
      await fetch(`${base}/matches/${match.id}/result`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeScore, awayScore }),
      });
    }
    if (addingType === "own_goal") {
      const homeScore = (match.homeScore ?? 0) + (teamSide === "away" ? 1 : 0);
      const awayScore = (match.awayScore ?? 0) + (teamSide === "home" ? 1 : 0);
      await fetch(`${base}/matches/${match.id}/result`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeScore, awayScore }),
      });
    }

    setSaving(false);
    setAddingType(null);
    setMinute("");
    setPersonId("");
    setAssistId("");
    onAdded();
  }

  const inputStyle = {
    background: "var(--cat-tag-bg)",
    border: "1px solid var(--cat-card-border)",
    color: "var(--cat-text)",
  };

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      <div className="px-4 py-3 border-b flex items-center gap-2"
        style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>
        <Plus className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--cat-text-secondary)" }}>
          {t("addEventTitle")}
        </span>
      </div>
      <div className="p-4 space-y-4">
        {/* Team selector */}
        <div className="grid grid-cols-2 gap-2">
          {(["home", "away"] as const).map(side => (
            <button key={side} onClick={() => { setTeamSide(side); setPersonId(""); setAssistId(""); }}
              className="py-3 rounded-xl text-sm font-bold transition-all"
              style={teamSide === side
                ? { background: "var(--cat-accent)", color: "var(--cat-accent-text)", boxShadow: "0 0 12px rgba(var(--cat-accent-rgb),0.3)" }
                : { background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}>
              {side === "home" ? (match.homeTeam?.name ?? t("homeTeam")) : (match.awayTeam?.name ?? t("awayTeam"))}
            </button>
          ))}
        </div>

        {/* Event type */}
        <div className="flex flex-wrap gap-2">
          {QUICK_EVENTS.map(ev => (
            <button key={ev.type}
              onClick={() => { setAddingType(prev => prev === ev.type ? null : ev.type); setPersonId(""); setAssistId(""); setTimeout(() => minuteRef.current?.focus(), 50); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={addingType === ev.type
                ? { background: ev.color, color: "#fff", boxShadow: `0 0 10px ${ev.color}60` }
                : { background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}>
              <span>{ev.emoji}</span> {ev.label}
            </button>
          ))}
        </div>

        {/* Detail fields */}
        {addingType && (
          <div className="space-y-3 pt-1">
            {/* Minute */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold w-20 shrink-0" style={{ color: "var(--cat-text-muted)" }}>
                {t("minuteLabel")}
              </label>
              <input ref={minuteRef} type="number" value={minute}
                onChange={e => setMinute(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addEvent()}
                placeholder={t("minutePlaceholder")} min={1} max={120}
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                style={inputStyle} />
            </div>

            {/* Player */}
            {wantsPlayer && teamPlayers.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold w-20 shrink-0" style={{ color: "var(--cat-text-muted)" }}>
                  {addingType === "own_goal" ? t("ownGoalAuthorLabel") : addingType === "substitution_in" ? t("subInLabel") : t("playerLabel")}
                </label>
                <select value={personId} onChange={e => setPersonId(e.target.value ? parseInt(e.target.value) : "")}
                  className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                  style={inputStyle}>
                  <option value="">{t("notSelected")}</option>
                  {ownGoalPlayers.map(p => (
                    <option key={p.personId} value={p.personId}>
                      {p.shirtNumber ? `#${p.shirtNumber} ` : ""}{p.person?.firstName} {p.person?.lastName}
                      {!p.isStarting ? ` (${t("benchPlayer")})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Assist / Sub-off player */}
            {wantsAssist && teamPlayers.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold w-20 shrink-0" style={{ color: "var(--cat-text-muted)" }}>
                  {t("assistLabel")}
                </label>
                <select value={assistId} onChange={e => setAssistId(e.target.value ? parseInt(e.target.value) : "")}
                  className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                  style={inputStyle}>
                  <option value="">{t("notSelected")}</option>
                  {teamPlayers.map(p => (
                    <option key={p.personId} value={p.personId}>
                      {p.shirtNumber ? `#${p.shirtNumber} ` : ""}{p.person?.firstName} {p.person?.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {addingType === "substitution_in" && teamPlayers.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold w-20 shrink-0" style={{ color: "var(--cat-text-muted)" }}>
                  {t("subOutLabel")}
                </label>
                <select value={assistId} onChange={e => setAssistId(e.target.value ? parseInt(e.target.value) : "")}
                  className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                  style={inputStyle}>
                  <option value="">{t("notSelected")}</option>
                  {teamPlayers.filter(p => p.isStarting).map(p => (
                    <option key={p.personId} value={p.personId}>
                      {p.shirtNumber ? `#${p.shirtNumber} ` : ""}{p.person?.firstName} {p.person?.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button onClick={addEvent} disabled={!minute || saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 disabled:opacity-40 transition-opacity"
                style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : `✓ ${t("addButton")}`}
              </button>
              <button onClick={() => { setAddingType(null); setMinute(""); setPersonId(""); setAssistId(""); }}
                className="px-4 py-2.5 rounded-xl text-sm hover:opacity-70 transition-opacity"
                style={{ color: "var(--cat-text-muted)", background: "var(--cat-tag-bg)" }}>
                {t("titleCancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Match Control Panel ──────────────────────────────────────────────────────

function MatchControlPanel({ match, base, onRefresh, t }: { match: MatchData; base: string; onRefresh: () => void; t: TFunc }) {
  const [loading, setLoading] = useState<string | null>(null);
  const isScheduled = match.status === "scheduled";
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  async function ctrl(action: string) {
    setLoading(action);
    try {
      const now = new Date().toISOString();
      if (action === "start") {
        await fetch(`${base}/matches/${match.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "live", startedAt: now }),
        });
      } else if (action === "finish") {
        await fetch(`${base}/matches/${match.id}/result`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "finished" }),
        });
      } else if (action === "reopen") {
        await fetch(`${base}/matches/${match.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "live", finishedAt: null }),
        });
      } else if (action === "reset_time") {
        if (!confirm(t("confirmResetTime"))) return;
        await fetch(`${base}/matches/${match.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startedAt: now }),
        });
      }
      onRefresh();
    } finally {
      setLoading(null);
    }
  }

  type CtrlBtn = { id: string; label: string; icon: string; color: string; bg: string; border: string; enabled: boolean };
  const buttons: CtrlBtn[] = [
    {
      id: "start", label: t("startMatch"), icon: "▶",
      color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.4)",
      enabled: isScheduled || isFinished,
    },
    {
      id: "finish", label: t("finishMatchBtn"), icon: "⏹",
      color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.4)",
      enabled: isLive,
    },
    {
      id: "reopen", label: t("reopenMatchBtn"), icon: "↩",
      color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)",
      enabled: isFinished,
    },
    {
      id: "reset_time", label: t("resetTime"), icon: "🕐",
      color: "#6b7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.3)",
      enabled: isLive,
    },
  ];

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      <div className="px-4 py-3 border-b flex items-center gap-2"
        style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>
        <Play className="w-3.5 h-3.5" style={{ color: isLive ? "#ef4444" : "var(--cat-text-muted)" }} />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--cat-text-secondary)" }}>
          {t("controlTitle")}
        </span>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold"
          style={isLive
            ? { background: "rgba(239,68,68,0.15)", color: "#ef4444" }
            : isFinished
            ? { background: "rgba(107,114,128,0.1)", color: "#6b7280" }
            : { background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
          {isLive ? `🔴 LIVE` : isFinished ? `✓ ${t("statusFinished")}` : `⏱ ${t("statusNotStarted")}`}
        </span>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        {buttons.map(btn => (
          <button
            key={btn.id}
            onClick={() => ctrl(btn.id)}
            disabled={!btn.enabled || loading !== null}
            className="flex items-center gap-3 p-4 rounded-xl border text-left transition-all hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: btn.bg, borderColor: btn.border }}
          >
            <span className="text-2xl shrink-0">{loading === btn.id ? "⏳" : btn.icon}</span>
            <span className="text-sm font-bold leading-tight" style={{ color: btn.color }}>
              {btn.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Team Form ────────────────────────────────────────────────────────────────

function TeamForm({ teamId, matches, t }: { teamId?: number | null; matches: RecentMatch[]; t: TFunc }) {
  if (!teamId) return null;
  const relevant = matches
    .filter(m => m.homeTeamId === teamId || m.awayTeamId === teamId)
    .filter(m => m.status === "finished")
    .slice(0, 5);

  if (relevant.length === 0) {
    return <span className="text-xs opacity-40" style={{ color: "var(--cat-text-muted)" }}>{t("noFormData")}</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {relevant.map(m => {
        const result = teamResult(m, teamId);
        if (!result) return null;
        return <FormPill key={m.id} result={result} />;
      })}
    </div>
  );
}

// ─── Lineup Panel ─────────────────────────────────────────────────────────────

function PlayerEventIcons({ personId, events }: { personId: number; events: MatchEvent[] }) {
  const mine = events.filter(e => e.personId === personId || e.assistPersonId === personId);
  if (mine.length === 0) return null;

  const chips: { key: string; icon: string; color: string; label: string }[] = [];
  let goalCount = 0;
  let assistCount = 0;

  for (const ev of mine) {
    if (ev.personId === personId) {
      if (ev.eventType === "goal" || ev.eventType === "penalty_scored") {
        goalCount++;
      } else if (ev.eventType === "own_goal") {
        chips.push({ key: `og-${ev.id}`, icon: "⚽", color: "#f59e0b", label: `${ev.minute}'` });
      } else if (ev.eventType === "yellow") {
        chips.push({ key: `y-${ev.id}`, icon: "🟨", color: "#f59e0b", label: `${ev.minute}'` });
      } else if (ev.eventType === "red") {
        chips.push({ key: `r-${ev.id}`, icon: "🟥", color: "#ef4444", label: `${ev.minute}'` });
      } else if (ev.eventType === "yellow_red") {
        chips.push({ key: `yr-${ev.id}`, icon: "🟧", color: "#f97316", label: `${ev.minute}'` });
      } else if (ev.eventType === "substitution_out") {
        chips.push({ key: `so-${ev.id}`, icon: "↓", color: "#ef4444", label: `${ev.minute}'` });
      } else if (ev.eventType === "substitution_in") {
        chips.push({ key: `si-${ev.id}`, icon: "↑", color: "#10b981", label: `${ev.minute}'` });
      } else if (ev.eventType === "injury") {
        chips.push({ key: `inj-${ev.id}`, icon: "🩹", color: "#8b5cf6", label: `${ev.minute}'` });
      }
    }
    if (ev.assistPersonId === personId && (ev.eventType === "goal" || ev.eventType === "penalty_scored")) {
      assistCount++;
    }
  }

  // Merge goal chips
  if (goalCount > 0) {
    const goalMins = mine
      .filter(e => e.personId === personId && (e.eventType === "goal" || e.eventType === "penalty_scored"))
      .map(e => `${e.minute}'`).join(" ");
    chips.unshift({ key: "goals", icon: "⚽", color: "#10b981", label: goalMins });
  }
  if (assistCount > 0) {
    chips.push({ key: "assists", icon: "🅰", color: "#6366f1", label: assistCount > 1 ? `×${assistCount}` : "" });
  }

  return (
    <div className="flex items-center gap-0.5 shrink-0 flex-wrap">
      {chips.map(chip => (
        <span key={chip.key}
          className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: chip.color + "18", color: chip.color }}>
          <span className="text-xs leading-none">{chip.icon}</span>
          {chip.label && <span>{chip.label}</span>}
        </span>
      ))}
    </div>
  );
}

function TeamLineup({
  matchId, teamId, teamName, lineup, squad, canEdit, base, onRefresh, events, t,
}: {
  matchId: number;
  teamId: number;
  teamName: string;
  lineup: LineupEntry[];
  squad: SquadPlayer[];
  canEdit: boolean;
  base: string;
  onRefresh: () => void;
  events: MatchEvent[];
  t: TFunc;
}) {
  const [importing, setImporting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const teamLineup = lineup.filter(l => l.teamId === teamId);
  const starters = teamLineup.filter(l => l.isStarting);
  const subs = teamLineup.filter(l => !l.isStarting);

  // Players not yet in lineup
  const inLineupIds = new Set(teamLineup.map(l => l.personId));
  const available = squad.filter(p => !inLineupIds.has(p.id));

  async function importSquad(isStarting: boolean) {
    setImporting(true);
    await fetch(`${base}/lineup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ importSquad: true, teamId, isStarting }),
    });
    setImporting(false);
    onRefresh();
  }

  async function toggleStarting(entry: LineupEntry) {
    await fetch(`${base}/lineup?personId=${entry.personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isStarting: !entry.isStarting }),
    });
    onRefresh();
  }

  async function removePlayer(personId: number) {
    await fetch(`${base}/lineup?personId=${personId}`, { method: "DELETE" });
    onRefresh();
  }

  async function clearTeam() {
    await fetch(`${base}/lineup?clearTeam=${teamId}`, { method: "DELETE" });
    onRefresh();
  }

  async function addPlayer(player: SquadPlayer, isStarting: boolean) {
    await fetch(`${base}/lineup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, personId: player.id, isStarting, shirtNumber: player.shirtNumber }),
    });
    setShowPicker(false);
    onRefresh();
  }

  function PlayerRow({ entry }: { entry: LineupEntry }) {
    const name = entry.person
      ? `${entry.person.firstName} ${entry.person.lastName}`
      : `#${entry.personId}`;
    return (
      <div className="flex items-center gap-2 py-2 group">
        {entry.shirtNumber != null && (
          <span className="w-6 text-right text-xs font-bold shrink-0" style={{ color: "var(--cat-text-muted)" }}>
            {entry.shirtNumber}
          </span>
        )}
        <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--cat-text)" }}>{name}</span>
        {/* Event icons for this player */}
        <PlayerEventIcons personId={entry.personId} events={events} />
        {entry.position && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
            {entry.position}
          </span>
        )}
        {canEdit && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => toggleStarting(entry)}
              title={entry.isStarting ? t("moveToSub") : t("moveToStart")}
              className="p-1 rounded hover:opacity-70"
              style={{ color: entry.isStarting ? "#f59e0b" : "#10b981" }}>
              {entry.isStarting ? <UserMinus className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
            </button>
            <button onClick={() => removePlayer(entry.personId)}
              className="p-1 rounded hover:opacity-70"
              style={{ color: "#ef4444" }}>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0">
      {/* Team header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--cat-text-secondary)" }}>
          {teamName}
        </span>
        {canEdit && (
          <div className="flex items-center gap-1">
            <button onClick={() => importSquad(true)}
              disabled={importing}
              title={t("importSquad")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold hover:opacity-80 transition-opacity"
              style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
              <Download className="w-2.5 h-2.5" /> {t("importSquad")}
            </button>
            {teamLineup.length > 0 && (
              <button onClick={clearTeam}
                title={t("clearLineup")}
                className="p-1 rounded hover:opacity-70"
                style={{ color: "var(--cat-text-muted)" }}>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Starters */}
      {starters.length > 0 && (
        <div className="mb-3">
          <div className="text-[11px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1"
            style={{ color: "var(--cat-text-muted)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            {t("startersLabel", { count: starters.length })}
          </div>
          <div className="space-y-0.5">
            {starters.map(e => <PlayerRow key={e.id} entry={e} />)}
          </div>
        </div>
      )}

      {/* Subs */}
      {subs.length > 0 && (
        <div className="mb-3">
          <div className="text-[11px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1"
            style={{ color: "var(--cat-text-muted)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            {t("subsLabel", { count: subs.length })}
          </div>
          <div className="space-y-0.5">
            {subs.map(e => <PlayerRow key={e.id} entry={e} />)}
          </div>
        </div>
      )}

      {/* Empty state */}
      {teamLineup.length === 0 && (
        <div className="text-center py-6">
          <Users className="w-6 h-6 mx-auto mb-1 opacity-20" style={{ color: "var(--cat-text-muted)" }} />
          <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>{t("noLineup")}</p>
        </div>
      )}

      {/* Add player from squad */}
      {canEdit && available.length > 0 && (
        <div className="mt-2">
          <button onClick={() => setShowPicker(v => !v)}
            className="flex items-center gap-1 text-[10px] font-semibold hover:opacity-70 transition-opacity"
            style={{ color: "var(--cat-accent)" }}>
            <Plus className="w-3 h-3" />
            {t("addPlayerButton", { count: available.length })}
            <ChevronDown className={`w-3 h-3 transition-transform ${showPicker ? "rotate-180" : ""}`} />
          </button>
          {showPicker && (
            <div className="mt-2 rounded-xl border overflow-hidden"
              style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>
              <div className="max-h-48 overflow-y-auto divide-y" style={{ borderColor: "var(--cat-card-border)" }}>
                {available.map(p => (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-2 hover:opacity-80">
                    {p.shirtNumber != null && (
                      <span className="w-5 text-right text-[10px] font-bold shrink-0" style={{ color: "var(--cat-text-muted)" }}>
                        {p.shirtNumber}
                      </span>
                    )}
                    <span className="flex-1 text-xs truncate" style={{ color: "var(--cat-text)" }}>
                      {p.firstName} {p.lastName}
                    </span>
                    <button onClick={() => addPlayer(p, true)}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                      {t("moveToStart")}
                    </button>
                    <button onClick={() => addPlayer(p, false)}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                      {t("moveToSub")}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MatchProtocolPage({ matchId }: { matchId: number }) {
  const ctx = useTournament();
  const orgSlug = ctx?.orgSlug ?? "";
  const tournamentId = ctx?.tournamentId ?? 0;
  const base = `/api/org/${orgSlug}/tournament/${tournamentId}`;
  const router = useRouter();
  const t = useTranslations("admin.matchHub");
  const locale = useLocale();

  const now = useNow(1000);
  const [match, setMatch] = useState<MatchData | null>(null);
  const [allMatches, setAllMatches] = useState<RecentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [lineup, setLineup] = useState<LineupEntry[]>([]);
  const [homePlayers, setHomePlayers] = useState<SquadPlayer[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<SquadPlayer[]>([]);

  const lineupBase = `${base}/matches/${matchId}`;

  const loadLineup = useCallback(async () => {
    const r = await fetch(`${lineupBase}/lineup?includeSquad=true`);
    if (r.ok) {
      const d = await r.json();
      setLineup(d.lineup ?? []);
      setHomePlayers(d.homePlayers ?? []);
      setAwayPlayers(d.awayPlayers ?? []);
    }
  }, [lineupBase]);

  const loadMatch = useCallback(async () => {
    try {
      const [matchRes, matchesRes] = await Promise.all([
        fetch(`${base}/matches/${matchId}`),
        fetch(`${base}/matches?status=finished`),
      ]);
      if (matchRes.ok) setMatch(await matchRes.json());
      if (matchesRes.ok) setAllMatches(await matchesRes.json());
    } finally {
      setLoading(false);
    }
  }, [base, matchId]);

  useEffect(() => { loadMatch(); loadLineup(); }, [loadMatch, loadLineup]);

  // Auto-refresh for live matches
  useEffect(() => {
    if (match?.status !== "live") return;
    const timer = setInterval(loadMatch, 8000);
    return () => clearInterval(timer);
  }, [match?.status, loadMatch]);

  async function finishMatch() {
    if (!confirm(t("confirmFinish"))) return;
    await fetch(`${base}/matches/${match!.id}/result`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "finished", finishedAt: new Date().toISOString() }),
    });
    loadMatch();
  }

  async function reopenMatch() {
    if (!confirm(t("confirmReopen"))) return;
    await fetch(`${base}/matches/${match!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "live", finishedAt: null }),
    });
    loadMatch();
  }

  async function deleteEvent(eventId: number) {
    await fetch(`${base}/matches/${match!.id}/events?eventId=${eventId}`, { method: "DELETE" });
    loadMatch();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" style={{ color: "var(--cat-text-muted)" }}>
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        {t("loading")}
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-sm font-semibold" style={{ color: "var(--cat-text-muted)" }}>{t("matchNotFound")}</p>
      </div>
    );
  }

  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const canEdit = isLive || isFinished;
  const canEditLineup = true; // lineup can be filled any time (even before match starts)

  const divName = (locale === "ru" ? match.stage?.nameRu : null) || match.stage?.name || "";
  const home = match.homeScore ?? 0;
  const away = match.awayScore ?? 0;
  const homeWon = isFinished && home > away;
  const awayWon = isFinished && away > home;
  const isDraw = isFinished && home === away;

  const events = match.events ?? [];

  let currentMinute: number | undefined;
  if (isLive && match.startedAt) {
    const { mins } = calcMinute(match.startedAt, now);
    currentMinute = mins;
  }

  // Goals per team for score confirmation
  const homeGoals = events.filter(e =>
    (isGoalEvent(e.eventType) && e.teamId === match.homeTeamId) ||
    (e.eventType === "own_goal" && e.teamId === match.awayTeamId)
  );
  const awayGoals = events.filter(e =>
    (isGoalEvent(e.eventType) && e.teamId === match.awayTeamId) ||
    (e.eventType === "own_goal" && e.teamId === match.homeTeamId)
  );

  // Filter allMatches to exclude current match
  const recentMatches = allMatches.filter(m => m.id !== match.id);

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">

      {/* ── Back + Actions bar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold hover:opacity-70 transition-opacity"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}
        >
          <ArrowLeft className="w-4 h-4" /> {t("back")}
        </button>
        <div className="flex items-center gap-2">
          {isLive && (
            <button onClick={finishMatch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80 transition-opacity"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
              <StopCircle className="w-3.5 h-3.5" /> {t("finishMatchBtn")}
            </button>
          )}
          {isFinished && (
            <button onClick={reopenMatch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80 transition-opacity"
              style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
              <Play className="w-3.5 h-3.5" /> {t("reopenMatchBtn")}
            </button>
          )}
          <button onClick={loadMatch}
            className="p-2 rounded-xl hover:opacity-70 transition-opacity"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Hero: Match Header ─────────────────────────────────────── */}
      <div className="rounded-2xl border overflow-hidden relative"
        style={{
          background: "var(--cat-card-bg)",
          borderColor: isLive ? "#ef4444" : "var(--cat-card-border)",
          boxShadow: isLive ? "0 0 30px rgba(239,68,68,0.12)" : undefined,
        }}>

        {/* Status bar */}
        <div className="px-4 py-2 flex items-center justify-between"
          style={{
            background: isLive
              ? "rgba(239,68,68,0.07)"
              : isFinished ? "rgba(16,185,129,0.05)" : "var(--cat-tag-bg)",
            borderBottom: "1px solid var(--cat-card-border)",
          }}>
          <div className="flex items-center gap-2">
            {isLive ? (
              <>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#ef4444" }}>LIVE</span>
                {currentMinute !== undefined && (
                  <span className="font-mono text-sm font-black" style={{ color: "#ef4444" }}>
                    {currentMinute}&apos;
                  </span>
                )}
              </>
            ) : isFinished ? (
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#10b981" }}>
                {t("statusFinished")}
              </span>
            ) : (
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--cat-text-muted)" }}>
                {t("statusNotStarted")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {divName && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>
                {divName}
              </span>
            )}
            {match.group && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                {t("groupLabel", { name: match.group.name })}
              </span>
            )}
            {match.round && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                {match.round.name}
              </span>
            )}
            <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
              #{match.matchNumber ?? match.id}
            </span>
          </div>
        </div>

        {/* Teams + Score */}
        <div className="px-6 py-8">
          <div className="flex items-center gap-4">

            {/* Home team */}
            <div className="flex-1 flex flex-col items-center gap-3 text-center">
              <ClubBadge team={match.homeTeam} size={72} />
              <div>
                <p className="font-black text-lg leading-tight"
                  style={{ color: homeWon ? "var(--cat-text)" : isFinished && !homeWon ? "var(--cat-text-secondary)" : "var(--cat-text)" }}>
                  {match.homeTeam?.name ?? "TBD"}
                </p>
                {match.homeTeam?.club?.name && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                    {match.homeTeam.club.name}
                  </p>
                )}
                <div className="flex justify-center mt-2">
                  <TeamForm teamId={match.homeTeamId} matches={recentMatches} t={t} />
                </div>
              </div>
            </div>

            {/* Score */}
            <div className="shrink-0 flex flex-col items-center gap-2">
              <div className="flex items-center gap-3 px-6 py-4 rounded-2xl"
                style={{ background: "var(--cat-tag-bg)" }}>
                <span className="text-5xl font-black tabular-nums leading-none"
                  style={{
                    color: homeWon ? "var(--cat-text)" : isFinished ? "var(--cat-text-secondary)" : "var(--cat-text)",
                    opacity: isFinished && !homeWon && !isDraw ? 0.5 : 1,
                  }}>
                  {home}
                </span>
                <span className="text-3xl font-thin" style={{ color: "var(--cat-text-muted)" }}>:</span>
                <span className="text-5xl font-black tabular-nums leading-none"
                  style={{
                    color: awayWon ? "var(--cat-text)" : isFinished ? "var(--cat-text-secondary)" : "var(--cat-text)",
                    opacity: isFinished && !awayWon && !isDraw ? 0.5 : 1,
                  }}>
                  {away}
                </span>
              </div>

              {/* Winner badge */}
              {homeWon && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                  {t("homeWin")}
                </span>
              )}
              {awayWon && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                  {t("awayWin")}
                </span>
              )}
              {isDraw && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                  {t("draw")}
                </span>
              )}
            </div>

            {/* Away team */}
            <div className="flex-1 flex flex-col items-center gap-3 text-center">
              <ClubBadge team={match.awayTeam} size={72} />
              <div>
                <p className="font-black text-lg leading-tight"
                  style={{ color: awayWon ? "var(--cat-text)" : isFinished && !awayWon ? "var(--cat-text-secondary)" : "var(--cat-text)" }}>
                  {match.awayTeam?.name ?? "TBD"}
                </p>
                {match.awayTeam?.club?.name && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                    {match.awayTeam.club.name}
                  </p>
                )}
                <div className="flex justify-center mt-2">
                  <TeamForm teamId={match.awayTeamId} matches={recentMatches} t={t} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Match meta row */}
        <div className="px-4 py-3 border-t flex items-center gap-4 flex-wrap"
          style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>
          {match.scheduledAt && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
              <span className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>
                {fmtDate(match.scheduledAt)}
              </span>
            </div>
          )}
          {match.scheduledAt && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
              <span className="text-xs font-mono font-semibold" style={{ color: "var(--cat-text-secondary)" }}>
                {fmtTime(match.scheduledAt)}
              </span>
            </div>
          )}
          {match.field && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
              <span className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>{match.field.name}</span>
            </div>
          )}
          {isLive && match.startedAt && (
            <div className="flex items-center gap-1.5 ml-auto">
              <Zap className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
              <span className="text-xs font-semibold" style={{ color: "#ef4444" }}>
                {t("startedAtLabel", { time: fmtTime(match.startedAt) })}
              </span>
            </div>
          )}
          {isFinished && match.finishedAt && (
            <div className="flex items-center gap-1.5 ml-auto">
              <Trophy className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
              <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                {t("finishedAtLabel", { time: fmtTime(match.finishedAt) })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Match Control Panel — shown for all statuses ────────── */}
      <MatchControlPanel match={match} base={base} onRefresh={loadMatch} t={t} />

      {/* ── Add Event Panel ───────────────────────────────────────── */}
      {canEdit && (
        <AddEventPanel match={match} base={base} onAdded={loadMatch} lineup={lineup} t={t} />
      )}

      {/* ── Timeline Bar ──────────────────────────────────────────── */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <div className="px-4 py-3 border-b flex items-center gap-2"
          style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>
          <Zap className="w-3.5 h-3.5" style={{ color: isLive ? "#ef4444" : "var(--cat-text-muted)" }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--cat-text-secondary)" }}>
            {t("timelineTitle")}
          </span>
          {isLive && (
            <span className="flex items-center gap-1 ml-1">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
              <span className="text-[10px] font-black" style={{ color: "#ef4444" }}>LIVE</span>
            </span>
          )}
          <span className="text-xs ml-auto" style={{ color: "var(--cat-text-muted)" }}>
            {t("eventCount", { count: events.length })}
          </span>
        </div>
        <TimelineBar
          events={events}
          homeTeamId={match.homeTeamId}
          homeTeamName={match.homeTeam?.name ?? t("homeTeam")}
          awayTeamName={match.awayTeam?.name ?? t("awayTeam")}
          currentMinute={currentMinute}
          isLive={isLive}
          t={t}
        />
      </div>

      {/* ── Lineups ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <div className="px-4 py-3 border-b flex items-center gap-2"
          style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>
          <Shield className="w-3.5 h-3.5" style={{ color: "var(--cat-text-muted)" }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--cat-text-secondary)" }}>
            {t("lineupTitle")}
          </span>
          {lineup.length > 0 && (
            <span className="text-xs ml-auto" style={{ color: "var(--cat-text-muted)" }}>
              {t("lineupSummary", { starters: lineup.filter(l => l.isStarting).length, subs: lineup.filter(l => !l.isStarting).length })}
            </span>
          )}
        </div>
        {(lineup.length > 0 || homePlayers.length > 0 || awayPlayers.length > 0) ? (
          <div className="flex gap-0 divide-x" style={{ borderColor: "var(--cat-card-border)" }}>
            {match.homeTeamId && (
              <div className="flex-1 min-w-0 p-4">
                <TeamLineup
                  matchId={matchId}
                  teamId={match.homeTeamId}
                  teamName={match.homeTeam?.name ?? t("homeTeam")}
                  lineup={lineup}
                  squad={homePlayers}
                  canEdit={canEditLineup}
                  base={lineupBase}
                  onRefresh={loadLineup}
                  events={events}
                  t={t}
                />
              </div>
            )}
            {match.awayTeamId && (
              <div className="flex-1 min-w-0 p-4">
                <TeamLineup
                  matchId={matchId}
                  teamId={match.awayTeamId}
                  teamName={match.awayTeam?.name ?? t("awayTeam")}
                  lineup={lineup}
                  squad={awayPlayers}
                  canEdit={canEditLineup}
                  base={lineupBase}
                  onRefresh={loadLineup}
                  events={events}
                  t={t}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-b-2xl border-dashed p-6 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "var(--cat-text)" }} />
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--cat-text-muted)" }}>{t("noLineupRegistered")}</p>
            <p className="text-xs" style={{ color: "var(--cat-text-muted)", opacity: 0.7 }}>
              {t("noLineupDesc")}
            </p>
          </div>
        )}
      </div>

      {/* ── Full Events List ──────────────────────────────────────── */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <div className="px-4 py-3 border-b flex items-center gap-2"
          style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>
          <SquareActivity className="w-3.5 h-3.5" style={{ color: "var(--cat-text-muted)" }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--cat-text-secondary)" }}>
            {t("eventsTitle")}
          </span>
        </div>
        <EventsList
          events={events}
          homeTeamId={match.homeTeamId}
          homeTeamName={match.homeTeam?.name ?? t("homeTeam")}
          awayTeamName={match.awayTeam?.name ?? t("awayTeam")}
          onDelete={deleteEvent}
          canEdit={canEdit}
          t={t}
        />
      </div>

      {/* ── Match Stats ───────────────────────────────────────────── */}
      {events.length > 0 && (() => {
        const homeYellow = events.filter(e => e.eventType === "yellow" && e.teamId === match.homeTeamId).length;
        const awayYellow = events.filter(e => e.eventType === "yellow" && e.teamId === match.awayTeamId).length;
        const homeRed = events.filter(e => (e.eventType === "red" || e.eventType === "yellow_red") && e.teamId === match.homeTeamId).length;
        const awayRed = events.filter(e => (e.eventType === "red" || e.eventType === "yellow_red") && e.teamId === match.awayTeamId).length;
        const homeSubs = events.filter(e => e.eventType === "substitution_in" && e.teamId === match.homeTeamId).length;
        const awaySubs = events.filter(e => e.eventType === "substitution_in" && e.teamId === match.awayTeamId).length;
        return (
          <div className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <div className="px-4 py-3 border-b"
              style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--cat-text-secondary)" }}>
                {t("statsTitle")}
              </span>
            </div>
            <div className="p-4 space-y-4">
              {[
                { label: t("statGoals"), home: home, away: away, color: "#10b981" },
                { label: t("statYellowCards"), home: homeYellow, away: awayYellow, color: "#f59e0b" },
                { label: t("statRedCards"), home: homeRed, away: awayRed, color: "#ef4444" },
                { label: t("statSubstitutions"), home: homeSubs, away: awaySubs, color: "#3b82f6" },
              ].map(stat => {
                const total = stat.home + stat.away;
                const homePct = total > 0 ? (stat.home / total) * 100 : 50;
                const awayPct = 100 - homePct;
                return (
                  <div key={stat.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-black tabular-nums" style={{ color: stat.color }}>{stat.home}</span>
                      <span className="text-xs font-semibold" style={{ color: "var(--cat-text-muted)" }}>{stat.label}</span>
                      <span className="text-sm font-black tabular-nums" style={{ color: stat.color }}>{stat.away}</span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                      <div className="rounded-full transition-all" style={{ width: `${homePct}%`, background: stat.color + "80" }} />
                      <div className="rounded-full transition-all" style={{ width: `${awayPct}%`, background: stat.color + "30" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* score sanity check — shown in console for debugging only */}
      {process.env.NODE_ENV === "development" && homeGoals.length !== home && (
        <div className="hidden" />
      )}
      {process.env.NODE_ENV === "development" && awayGoals.length !== away && (
        <div className="hidden" />
      )}
    </div>
  );
}
