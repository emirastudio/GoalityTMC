"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { TeamBadge } from "@/components/ui/team-badge";
import { useTournament } from "@/lib/tournament-context";
import { useRouter } from "@/i18n/navigation";
import {
  Radio, Zap, Clock, CheckCircle, Filter,
  RefreshCw, Plus, SquareActivity, Swords, X,
  Play, StopCircle, Eye, Pencil, RotateCcw,
  Link2, Printer, Save, Ban, ChevronDown,

} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassInfo { id: number; name: string; }
type ClassMap = Map<number, ClassInfo>;

// Deterministic palette per division index
const CLASS_PALETTE = [
  { bg: "rgba(16,185,129,0.15)",  text: "#10b981", border: "rgba(16,185,129,0.35)" },  // green
  { bg: "rgba(59,130,246,0.15)",  text: "#3b82f6", border: "rgba(59,130,246,0.35)" },  // blue
  { bg: "rgba(245,158,11,0.15)",  text: "#f59e0b", border: "rgba(245,158,11,0.35)" },  // amber
  { bg: "rgba(139,92,246,0.15)",  text: "#8b5cf6", border: "rgba(139,92,246,0.35)" },  // purple
  { bg: "rgba(239,68,68,0.15)",   text: "#ef4444", border: "rgba(239,68,68,0.35)"  },  // red
  { bg: "rgba(236,72,153,0.15)",  text: "#ec4899", border: "rgba(236,72,153,0.35)" },  // pink
  { bg: "rgba(20,184,166,0.15)",  text: "#14b8a6", border: "rgba(20,184,166,0.35)" },  // teal
];

function classColor(idx: number) {
  return CLASS_PALETTE[idx % CLASS_PALETTE.length];
}

type MatchStatus = "scheduled" | "live" | "finished" | "cancelled" | "postponed" | "walkover";
type EventType =
  | "goal" | "own_goal" | "yellow" | "red" | "yellow_red"
  | "penalty_scored" | "penalty_missed"
  | "substitution_in" | "substitution_out" | "injury" | "var";

interface Team {
  id: number;
  name: string;
  club?: { name?: string; badgeUrl?: string | null } | null;
}

interface MatchEvent {
  id: number;
  matchId: number;
  eventType: EventType;
  minute: number;
  minuteExtra?: number | null;
  teamId: number;
  personId?: number | null;
  person?: { id: number; firstName: string; lastName: string } | null;
  assistPersonId?: number | null;
  assistPerson?: { id: number; firstName: string; lastName: string } | null;
  team?: Team;
}

interface Match {
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
  stage?: {
    id: number; name: string; nameRu?: string | null; nameEt?: string | null;
    type?: string | null; classId?: number | null;
    settings?: {
      drawResolution?: "extra_time" | "penalties" | "extra_time_then_penalties" | null;
      extraTimeHalves?: number | null;
      extraTimeMinutes?: number | null;
    } | null;
  } | null;
  group?: { id: number; name: string } | null;
  round?: { id: number; name: string } | null;
  events?: MatchEvent[];
}

interface HubLineupPlayer {
  personId: number;
  teamId: number;
  shirtNumber?: number | null;
  person?: { firstName: string; lastName: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

function calcMinute(startedAt: string, now: number) {
  const elapsed = Math.floor((now - new Date(startedAt).getTime()) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return { mins, secs, display: `${mins}'${secs < 10 ? "0" + secs : secs}"` };
}

function fmtTime(iso: string, locale?: string) {
  const loc = locale === "et" ? "et-EE" : locale === "ru" ? "ru-RU" : "en-GB";
  return new Date(iso).toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });
}

function teamAbbr(team?: Team | null) {
  if (!team) return "TBD";
  return team.name.slice(0, 3).toUpperCase();
}

// Translated fallbacks for system stage types (when DB name is in wrong locale)
const STAGE_TYPE_LABELS: Record<string, Record<string, string>> = {
  group:    { en: "Group Stage",    ru: "Групповой этап", et: "Grupiturniir"    },
  league:   { en: "League Stage",   ru: "Лиговый этап",  et: "Liigaetapp"      },
  knockout: { en: "Knockout Stage", ru: "Плей-офф",      et: "Väljalangemismäng" },
};

function stageName(
  stage: { name: string; nameRu?: string | null; nameEt?: string | null; type?: string | null } | null | undefined,
  locale: string,
): string {
  if (!stage) return "";
  if (locale === "ru") return stage.nameRu || stage.name || "";
  if (locale === "et") return stage.nameEt || stage.name || "";
  // For English (and other locales): prefer `name`, but if name looks like Russian
  // (starts with Cyrillic), fall back to type-based label
  const name = stage.name || "";
  const isCyrillic = /^[\u0400-\u04FF]/.test(name.trim());
  if (isCyrillic && stage.type && STAGE_TYPE_LABELS[stage.type]) {
    return STAGE_TYPE_LABELS[stage.type].en;
  }
  return name;
}

function eventIcon(type: EventType) {
  const map: Record<EventType, { icon: string; color: string }> = {
    goal:             { icon: "⚽", color: "#10b981" },
    own_goal:         { icon: "⚽", color: "#f59e0b" },
    yellow:           { icon: "🟨", color: "#f59e0b" },
    red:              { icon: "🟥", color: "#ef4444" },
    yellow_red:       { icon: "🟧", color: "#f97316" },
    penalty_scored:   { icon: "⚽", color: "#3b82f6" },
    penalty_missed:   { icon: "✗",  color: "#6b7280" },
    substitution_in:  { icon: "↑",  color: "#10b981" },
    substitution_out: { icon: "↓",  color: "#ef4444" },
    injury:           { icon: "🩹", color: "#8b5cf6" },
    var:              { icon: "📺", color: "#6366f1" },
  };
  return map[type] ?? { icon: "·", color: "#6b7280" };
}

function eventLabel(type: EventType, t: (k: string) => string) {
  const map: Record<EventType, string> = {
    goal: t("matchHub.eventGoal"),
    own_goal: t("matchHub.eventOwnGoal"),
    yellow: t("matchHub.eventYellow"),
    red: t("matchHub.eventRed"),
    yellow_red: t("matchHub.eventYellowRed"),
    penalty_scored: t("matchHub.eventPenaltyScored"),
    penalty_missed: t("matchHub.eventPenaltyMissed"),
    substitution_in: t("matchHub.eventSubIn"),
    substitution_out: t("matchHub.eventSubOut"),
    injury: t("matchHub.eventInjury"),
    var: t("matchHub.eventVar"),
  };
  return map[type] ?? type;
}

function scoreGoals(match: Match, teamId: number) {
  if (!match.events) return 0;
  return match.events.filter(e =>
    (e.eventType === "goal" || e.eventType === "penalty_scored") && e.teamId === teamId
  ).length + match.events.filter(e =>
    e.eventType === "own_goal" && e.teamId !== teamId
  ).length;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Reusable pill/chip filter button */
function PillBtn({
  active, onClick, children, activeColor,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  activeColor?: string;
}) {
  const accent = activeColor ?? "var(--cat-accent)";
  const accentText = activeColor ? "#fff" : "var(--cat-accent-text)";
  return (
    <button
      onClick={onClick}
      className="text-xs px-2.5 py-1 rounded-full font-semibold transition-all hover:opacity-90 active:scale-95 whitespace-nowrap"
      style={active
        ? { background: accent, color: accentText, boxShadow: activeColor ? `0 0 10px ${activeColor}40` : undefined }
        : { background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)", border: "1px solid var(--cat-card-border)" }}>
      {children}
    </button>
  );
}

/** Football pitch / field icon — no Lucide equivalent */
function FieldIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="1.4"
      strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}>
      {/* Outer rectangle */}
      <rect x="1" y="1" width="18" height="12" rx="1" />
      {/* Center line */}
      <line x1="10" y1="1" x2="10" y2="13" />
      {/* Center circle */}
      <circle cx="10" cy="7" r="2.5" />
      {/* Left penalty box */}
      <rect x="1" y="3.5" width="3.5" height="7" />
      {/* Right penalty box */}
      <rect x="15.5" y="3.5" width="3.5" height="7" />
    </svg>
  );
}

function StatPill({ icon, value, label, color }: { icon: React.ReactNode; value: number | string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      <span style={{ color }}>{icon}</span>
      <span className="text-lg font-black" style={{ color: "var(--cat-text)" }}>{value}</span>
      <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{label}</span>
    </div>
  );
}

function LiveTimer({ startedAt, now }: { startedAt: string; now: number }) {
  const { mins, secs } = calcMinute(startedAt, now);
  return (
    <div className="flex items-center gap-1">
      <span
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ background: "#ef4444" }}
      />
      <span className="font-mono text-sm font-bold" style={{ color: "#ef4444" }}>
        {mins}:{secs < 10 ? "0" + secs : secs}
      </span>
    </div>
  );
}

// ─── Match Card (live) ────────────────────────────────────────────────────────

function LiveMatchCard({
  match, now, base, onRefresh, onOpenProtocol, classMap,
}: {
  match: Match;
  now: number;
  base: string;
  onRefresh: () => void;
  onOpenProtocol: (match: Match) => void;
  classMap: ClassMap;
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [scoreLoading, setScoreLoading] = useState(false);

  // ── Event panel state ──
  const [showEvents, setShowEvents] = useState(false);
  const [teamSide, setTeamSide] = useState<"home" | "away">("home");
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [minute, setMinute] = useState("");
  const [personId, setPersonId] = useState<number | "">("");
  const [assistId, setAssistId] = useState<number | "">("");
  const [adding, setAdding] = useState(false);
  const [squad, setSquad] = useState<HubLineupPlayer[]>([]);
  const minuteRef = useRef<HTMLInputElement>(null);

  // Load squad when event panel opens
  useEffect(() => {
    if (!showEvents) return;
    // Auto-fill minute with current live time
    if (match.startedAt) {
      const { mins } = calcMinute(match.startedAt, now);
      setMinute(String(Math.max(1, Math.min(120, mins))));
    }
    // Fetch lineup + squad
    fetch(`${base}/matches/${match.id}/lineup?includeSquad=true`)
      .then(r => r.json())
      .then(d => {
        const lineupEntries: HubLineupPlayer[] = (d.lineup ?? []).map((l: HubLineupPlayer & { personId: number }) => ({
          personId: l.personId,
          teamId: l.teamId,
          shirtNumber: l.shirtNumber,
          person: l.person,
        }));
        const lineupIds = new Set(lineupEntries.map(l => l.personId));
        const fromSquad: HubLineupPlayer[] = [
          ...(d.homePlayers ?? []),
          ...(d.awayPlayers ?? []),
        ]
          .filter((p: { id: number }) => !lineupIds.has(p.id))
          .map((p: { id: number; teamId: number; shirtNumber?: number | null; firstName: string; lastName: string }) => ({
            personId: p.id,
            teamId: p.teamId,
            shirtNumber: p.shirtNumber,
            person: { firstName: p.firstName, lastName: p.lastName },
          }));
        setSquad([...lineupEntries, ...fromSquad]);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEvents, base, match.id]);

  // ── Draw resolution state ──
  const [drawPhase, setDrawPhase] = useState<null | "extra_time" | "penalties">(null);
  const [etHome, setEtHome] = useState("");
  const [etAway, setEtAway] = useState("");
  const [penHome, setPenHome] = useState("");
  const [penAway, setPenAway] = useState("");
  const [drawLoading, setDrawLoading] = useState(false);

  const home = match.homeScore ?? 0;
  const away = match.awayScore ?? 0;
  const isKnockout = !!match.round;
  const isDraw = home === away;
  const drawResolution = match.stage?.settings?.drawResolution ?? "penalties";

  const teamId = teamSide === "home" ? match.homeTeamId : match.awayTeamId;
  const teamPlayers = squad
    .filter(p => p.teamId === (eventType === "own_goal"
      ? (teamSide === "home" ? match.awayTeamId : match.homeTeamId)
      : teamId))
    .sort((a, b) => (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99));
  const assistPlayers = squad
    .filter(p => p.teamId === teamId)
    .sort((a, b) => (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99));

  const wantsPlayer = eventType !== null && eventType !== "var";
  const wantsAssist = eventType === "goal" || eventType === "penalty_scored";
  const wantsSubOut = eventType === "substitution_in";

  async function patchScore(homeScore: number, awayScore: number) {
    setScoreLoading(true);
    await fetch(`${base}/matches/${match.id}/result`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeScore, awayScore }),
    });
    setScoreLoading(false);
    onRefresh();
  }

  async function addEvent() {
    if (!eventType || !minute) return;
    setAdding(true);
    await fetch(`${base}/matches/${match.id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        eventType,
        minute: parseInt(minute),
        personId: personId || null,
        assistPersonId: wantsAssist && assistId ? assistId : null,
      }),
    });
    // Auto-update score
    if (eventType === "goal" || eventType === "penalty_scored") {
      await patchScore(
        (match.homeScore ?? 0) + (teamSide === "home" ? 1 : 0),
        (match.awayScore ?? 0) + (teamSide === "away" ? 1 : 0),
      );
    } else if (eventType === "own_goal") {
      await patchScore(
        (match.homeScore ?? 0) + (teamSide === "away" ? 1 : 0),
        (match.awayScore ?? 0) + (teamSide === "home" ? 1 : 0),
      );
    }
    setAdding(false);
    setEventType(null);
    setPersonId("");
    setAssistId("");
    onRefresh();
  }

  async function finishMatch() {
    if (isKnockout && isDraw) {
      const startPhase = drawResolution === "extra_time" || drawResolution === "extra_time_then_penalties"
        ? "extra_time" : "penalties";
      setDrawPhase(startPhase);
      return;
    }
    if (!confirm(t("matchHub.confirmFinish"))) return;
    await fetch(`${base}/matches/${match.id}/result`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "finished" }),
    });
    onRefresh();
  }

  async function applyExtraTime() {
    const eh = parseInt(etHome), ea = parseInt(etAway);
    if (isNaN(eh) || isNaN(ea)) { alert(t("matchHub.enterExtraTimeScore")); return; }
    setDrawLoading(true);
    if (eh !== ea) {
      await fetch(`${base}/matches/${match.id}/result`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "finished", homeExtraScore: eh, awayExtraScore: ea, resultType: "extra_time" }),
      });
      setDrawPhase(null);
    } else {
      await fetch(`${base}/matches/${match.id}/result`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeExtraScore: eh, awayExtraScore: ea }),
      });
      setDrawPhase("penalties");
    }
    setDrawLoading(false);
    onRefresh();
  }

  async function finishWithPenalties() {
    const ph = parseInt(penHome), pa = parseInt(penAway);
    if (isNaN(ph) || isNaN(pa) || ph === pa) { alert(t("matchHub.enterValidPenalty")); return; }
    setDrawLoading(true);
    await fetch(`${base}/matches/${match.id}/result`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "finished", homePenalties: ph, awayPenalties: pa, resultType: "penalties" }),
    });
    setDrawLoading(false);
    setDrawPhase(null);
    onRefresh();
  }

  const divName = stageName(match.stage, locale);
  const classId = match.stage?.classId ?? null;
  const classInfo = classId ? classMap.get(classId) : null;
  const classIdx = classId ? Array.from(classMap.keys()).indexOf(classId) : -1;
  const classPalette = classIdx >= 0 ? classColor(classIdx) : null;

  const QUICK_EVENTS: { type: EventType; emoji: string; label: string; color: string }[] = [
    { type: "goal",            emoji: "⚽", label: t("matchHub.eventGoal"),          color: "#10b981" },
    { type: "own_goal",        emoji: "⚽", label: t("matchHub.eventOwnGoal"),       color: "#f59e0b" },
    { type: "yellow",          emoji: "🟨", label: t("matchHub.eventYellow"),        color: "#f59e0b" },
    { type: "red",             emoji: "🟥", label: t("matchHub.eventRed"),           color: "#ef4444" },
    { type: "yellow_red",      emoji: "🟧", label: t("matchHub.eventYellowRed"),     color: "#f97316" },
    { type: "substitution_in", emoji: "🔄", label: t("matchHub.eventSubIn"),         color: "#3b82f6" },
    { type: "injury",          emoji: "🩹", label: t("matchHub.eventInjury"),        color: "#8b5cf6" },
    { type: "var",             emoji: "📺", label: t("matchHub.eventVar"),           color: "#6366f1" },
    { type: "penalty_scored",  emoji: "⚽", label: t("matchHub.eventPenaltyScored"), color: "#3b82f6" },
    { type: "penalty_missed",  emoji: "✗",  label: t("matchHub.eventPenaltyMissed"), color: "#6b7280" },
  ];

  const inputStyle = {
    background: "var(--cat-tag-bg)",
    border: "1px solid var(--cat-card-border)",
    color: "var(--cat-text)",
    outline: "none",
  };

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: "#ef4444", boxShadow: "0 0 20px rgba(239,68,68,0.15)" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2"
        style={{ background: "rgba(239,68,68,0.08)", borderBottom: "1px solid rgba(239,68,68,0.2)" }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#ef4444" }}>LIVE</span>
          <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
            {match.field ? `· ${match.field.name}` : ""}
            {match.group ? ` · ${match.group.name}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {classInfo && classPalette && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{ background: classPalette.bg, color: classPalette.text, border: `1px solid ${classPalette.border}` }}>
              {classInfo.name}
            </span>
          )}
          {divName && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>{divName}</span>
          )}
          {match.startedAt && <LiveTimer startedAt={match.startedAt} now={now} />}
        </div>
      </div>

      {/* ── Score ── */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex-1 text-right">
            <p className="font-black text-base leading-tight" style={{ color: "var(--cat-text)" }}>
              {match.homeTeam?.name ?? "TBD"}
            </p>
            {match.homeTeam?.club?.name && (
              <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{match.homeTeam.club.name}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl shrink-0"
            style={{ background: "rgba(239,68,68,0.08)" }}>
            <button onClick={() => patchScore(Math.max(0, home - 1), away)} disabled={home <= 0 || scoreLoading}
              className="w-5 h-5 rounded text-sm font-bold hover:opacity-70 disabled:opacity-20 transition-opacity"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)" }}>−</button>
            <span className="text-3xl font-black tabular-nums w-7 text-center" style={{ color: "var(--cat-text)" }}>{home}</span>
            <span className="text-lg font-light" style={{ color: "var(--cat-text-muted)" }}>:</span>
            <span className="text-3xl font-black tabular-nums w-7 text-center" style={{ color: "var(--cat-text)" }}>{away}</span>
            <button onClick={() => patchScore(home, Math.max(0, away - 1))} disabled={away <= 0 || scoreLoading}
              className="w-5 h-5 rounded text-sm font-bold hover:opacity-70 disabled:opacity-20 transition-opacity"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)" }}>−</button>
          </div>
          <div className="flex-1">
            <p className="font-black text-base leading-tight" style={{ color: "var(--cat-text)" }}>
              {match.awayTeam?.name ?? "TBD"}
            </p>
            {match.awayTeam?.club?.name && (
              <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{match.awayTeam.club.name}</p>
            )}
          </div>
        </div>

        {/* Recent events mini-strip */}
        {match.events && match.events.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {[...match.events].sort((a, b) => b.minute - a.minute).slice(0, 3).map(ev => {
              const ei = eventIcon(ev.eventType);
              const isHome = ev.teamId === match.homeTeamId;
              return (
                <div key={ev.id} className={`flex items-center gap-2 text-[11px] ${isHome ? "flex-row" : "flex-row-reverse"}`}
                  style={{ color: "var(--cat-text-secondary)" }}>
                  <span className="font-mono font-bold w-7 shrink-0" style={{ color: "var(--cat-text-muted)", textAlign: isHome ? "left" : "right" }}>
                    {ev.minute}&apos;
                  </span>
                  <span>{ei.icon}</span>
                  <span className="truncate">
                    {ev.person ? `${ev.person.firstName} ${ev.person.lastName}` : eventLabel(ev.eventType, t)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Event Panel Toggle ── */}
      <div className="px-4 pb-3">
        <button
          onClick={() => { setShowEvents(v => !v); setEventType(null); setPersonId(""); setAssistId(""); }}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all"
          style={showEvents
            ? { background: "var(--cat-accent)", color: "var(--cat-accent-text)" }
            : { background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)", border: "1px dashed var(--cat-card-border)" }}>
          <Plus className="w-3.5 h-3.5" />
          {t("matchHub.addEventTitle")}
          {showEvents && <span className="ml-1 opacity-70">▲</span>}
        </button>
      </div>

      {/* ── Expanded Event Panel ── */}
      {showEvents && (
        <div className="border-t px-4 py-3 space-y-3" style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>

          {/* Team selector */}
          <div className="grid grid-cols-2 gap-2">
            {(["home", "away"] as const).map(side => (
              <button key={side}
                onClick={() => { setTeamSide(side); setPersonId(""); setAssistId(""); }}
                className="py-2 rounded-xl text-xs font-bold transition-all truncate px-2"
                style={teamSide === side
                  ? { background: side === "home" ? "#3b82f6" : "#f97316", color: "#fff", boxShadow: `0 0 10px ${side === "home" ? "#3b82f620" : "#f9741620"}` }
                  : { background: "var(--cat-card-bg)", color: "var(--cat-text-secondary)", border: "1px solid var(--cat-card-border)" }}>
                {side === "home" ? (match.homeTeam?.name ?? t("matchHub.homeTeam")) : (match.awayTeam?.name ?? t("matchHub.awayTeam"))}
              </button>
            ))}
          </div>

          {/* Event type grid */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_EVENTS.map(ev => (
              <button key={ev.type}
                onClick={() => { setEventType(prev => prev === ev.type ? null : ev.type); setPersonId(""); setAssistId(""); setTimeout(() => minuteRef.current?.focus(), 40); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                style={eventType === ev.type
                  ? { background: ev.color, color: "#fff", boxShadow: `0 0 8px ${ev.color}50` }
                  : { background: "var(--cat-card-bg)", color: "var(--cat-text-secondary)", border: "1px solid var(--cat-card-border)" }}>
                {ev.emoji} {ev.label}
              </button>
            ))}
          </div>

          {/* Detail fields when type selected */}
          {eventType && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                {/* Player selector */}
                {wantsPlayer && teamPlayers.length > 0 && (
                  <select value={personId} onChange={e => setPersonId(e.target.value ? parseInt(e.target.value) : "")}
                    className="flex-1 rounded-xl px-3 py-2 text-xs min-w-0"
                    style={inputStyle}>
                    <option value="">
                      {eventType === "own_goal" ? t("matchHub.ownGoalAuthorLabel") :
                       eventType === "substitution_in" ? t("matchHub.subInLabel") :
                       t("matchHub.playerLabel")} —
                    </option>
                    {teamPlayers.map(p => (
                      <option key={p.personId} value={p.personId}>
                        {p.shirtNumber ? `#${p.shirtNumber} ` : ""}{p.person?.firstName} {p.person?.lastName}
                      </option>
                    ))}
                  </select>
                )}

                {/* Minute */}
                <input ref={minuteRef} type="number" value={minute}
                  onChange={e => setMinute(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addEvent()}
                  placeholder="'" min={1} max={120}
                  className="w-16 rounded-xl px-2 py-2 text-xs text-center font-mono font-bold shrink-0"
                  style={inputStyle} />

                {/* Add button */}
                <button onClick={addEvent} disabled={!minute || adding}
                  className="px-4 py-2 rounded-xl text-xs font-black hover:opacity-80 disabled:opacity-40 transition-opacity shrink-0"
                  style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}>
                  {adding ? "..." : "✓"}
                </button>
              </div>

              {/* Assist selector */}
              {wantsAssist && assistPlayers.length > 0 && (
                <select value={assistId} onChange={e => setAssistId(e.target.value ? parseInt(e.target.value) : "")}
                  className="w-full rounded-xl px-3 py-2 text-xs"
                  style={inputStyle}>
                  <option value="">{t("matchHub.assistLabel")} —</option>
                  {assistPlayers.map(p => (
                    <option key={p.personId} value={p.personId}>
                      {p.shirtNumber ? `#${p.shirtNumber} ` : ""}{p.person?.firstName} {p.person?.lastName}
                    </option>
                  ))}
                </select>
              )}

              {/* Sub-off selector */}
              {wantsSubOut && squad.filter(p => p.teamId === teamId).length > 0 && (
                <select value={assistId} onChange={e => setAssistId(e.target.value ? parseInt(e.target.value) : "")}
                  className="w-full rounded-xl px-3 py-2 text-xs"
                  style={inputStyle}>
                  <option value="">{t("matchHub.subOutLabel")} —</option>
                  {squad.filter(p => p.teamId === teamId).sort((a, b) => (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99)).map(p => (
                    <option key={p.personId} value={p.personId}>
                      {p.shirtNumber ? `#${p.shirtNumber} ` : ""}{p.person?.firstName} {p.person?.lastName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Draw resolvers ── */}
      {drawPhase === "extra_time" && (
        <div className="mx-4 mb-3 rounded-xl p-3 border"
          style={{ background: "rgba(59,130,246,0.06)", borderColor: "rgba(59,130,246,0.3)" }}>
          <p className="text-xs font-bold mb-1" style={{ color: "#3b82f6" }}>{t("matchHub.drawExtraTime")}</p>
          <p className="text-[10px] mb-2" style={{ color: "var(--cat-text-muted)" }}>{t("matchHub.drawExtraTimeHint")}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-right">
              <p className="text-[10px] mb-1 truncate" style={{ color: "var(--cat-text-muted)" }}>{match.homeTeam?.name}</p>
              <input type="number" min={0} value={etHome} onChange={e => setEtHome(e.target.value)} placeholder="0"
                className="w-full text-center rounded-lg px-2 py-1.5 text-sm font-black outline-none"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)", border: "1px solid var(--cat-card-border)" }} />
            </div>
            <span className="text-base font-light" style={{ color: "var(--cat-text-muted)" }}>:</span>
            <div className="flex-1">
              <p className="text-[10px] mb-1 truncate" style={{ color: "var(--cat-text-muted)" }}>{match.awayTeam?.name}</p>
              <input type="number" min={0} value={etAway} onChange={e => setEtAway(e.target.value)} placeholder="0"
                className="w-full text-center rounded-lg px-2 py-1.5 text-sm font-black outline-none"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)", border: "1px solid var(--cat-card-border)" }} />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={applyExtraTime} disabled={drawLoading}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 disabled:opacity-40"
              style={{ background: "#3b82f6", color: "#fff" }}>
              {drawLoading ? "..." : t("matchHub.applyExtraTime")}
            </button>
            <button onClick={() => setDrawPhase(null)}
              className="px-3 py-1.5 rounded-lg text-xs hover:opacity-70"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
              {t("matchHub.titleCancel")}
            </button>
          </div>
        </div>
      )}

      {drawPhase === "penalties" && (
        <div className="mx-4 mb-3 rounded-xl p-3 border"
          style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.3)" }}>
          <p className="text-xs font-bold mb-1" style={{ color: "#f59e0b" }}>
            {drawResolution === "extra_time_then_penalties" ? t("matchHub.drawExtraTimePenalties") : t("matchHub.drawPlayoffPenalties")}
          </p>
          <p className="text-[10px] mb-2" style={{ color: "var(--cat-text-muted)" }}>{t("matchHub.drawPenaltiesHint")}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-right">
              <p className="text-[10px] mb-1 truncate" style={{ color: "var(--cat-text-muted)" }}>{match.homeTeam?.name}</p>
              <input type="number" min={0} value={penHome} onChange={e => setPenHome(e.target.value)} placeholder="0"
                className="w-full text-center rounded-lg px-2 py-1.5 text-sm font-black outline-none"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)", border: "1px solid var(--cat-card-border)" }} />
            </div>
            <span className="text-base font-light" style={{ color: "var(--cat-text-muted)" }}>:</span>
            <div className="flex-1">
              <p className="text-[10px] mb-1 truncate" style={{ color: "var(--cat-text-muted)" }}>{match.awayTeam?.name}</p>
              <input type="number" min={0} value={penAway} onChange={e => setPenAway(e.target.value)} placeholder="0"
                className="w-full text-center rounded-lg px-2 py-1.5 text-sm font-black outline-none"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)", border: "1px solid var(--cat-card-border)" }} />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={finishWithPenalties} disabled={drawLoading}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 disabled:opacity-40"
              style={{ background: "#f59e0b", color: "#fff" }}>
              {drawLoading ? "..." : t("matchHub.finishWithPenalties")}
            </button>
            {drawResolution === "extra_time_then_penalties" && (
              <button onClick={() => setDrawPhase("extra_time")}
                className="px-3 py-1.5 rounded-lg text-xs hover:opacity-70"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                {t("matchHub.drawBack")}
              </button>
            )}
            <button onClick={() => setDrawPhase(null)}
              className="px-3 py-1.5 rounded-lg text-xs hover:opacity-70"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
              {t("matchHub.titleCancel")}
            </button>
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-t"
        style={{ borderColor: "rgba(239,68,68,0.15)" }}>
        <button onClick={() => onOpenProtocol(match)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)" }}>
          <Eye className="w-3.5 h-3.5" /> {t("matchHub.protocol")}
        </button>
        {/* Revert to scheduled — undo accidental start */}
        <button
          onClick={async () => {
            if (!confirm(t("matchHub.confirmRevertToScheduled"))) return;
            await fetch(`${base}/matches/${match.id}/result`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "scheduled", startedAt: null, homeScore: null, awayScore: null }),
            });
            onRefresh();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
          style={{ background: "var(--cat-tag-bg)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}
          title={t("matchHub.confirmRevertToScheduled")}>
          <RotateCcw className="w-3.5 h-3.5" /> {t("matchHub.revertToScheduled")}
        </button>
        <button onClick={finishMatch}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity ml-auto"
          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
          <StopCircle className="w-3.5 h-3.5" /> {t("matchHub.finish")}
        </button>
      </div>
    </div>
  );
}

// ─── Upcoming / Finished compact card ─────────────────────────────────────────

// ─── Club Badge — alias kept for local usage ──────────────────────────────────

function ClubBadge({ team, size = 32 }: { team?: { name: string; club?: { name?: string | null; badgeUrl?: string | null } | null } | null; size?: number }) {
  return <TeamBadge team={team ?? null} size={size} />;
}

// ─── Finished Match Card (rich) ───────────────────────────────────────────────

function FinishedMatchCard({
  match, base, onRefresh, onOpenProtocol, orgSlug, classMap,
}: {
  match: Match; base: string; onRefresh: () => void;
  onOpenProtocol: (match: Match) => void; orgSlug: string; classMap: ClassMap;
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [editHome, setEditHome] = useState(String(match.homeScore ?? 0));
  const [editAway, setEditAway] = useState(String(match.awayScore ?? 0));
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const divName = stageName(match.stage, locale);
  const protocolFilled = (match.events?.length ?? 0) > 0;
  const classId = match.stage?.classId ?? null;
  const classInfo = classId ? classMap.get(classId) : null;
  const classIdx = classId ? Array.from(classMap.keys()).indexOf(classId) : -1;
  const classPalette = classIdx >= 0 ? classColor(classIdx) : null;

  async function saveScore() {
    setSaving(true);
    await fetch(`${base}/matches/${match.id}/result`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeScore: parseInt(editHome) || 0, awayScore: parseInt(editAway) || 0 }),
    });
    setSaving(false);
    setEditing(false);
    onRefresh();
  }

  async function reopenMatch() {
    if (!confirm(t("matchHub.confirmReopen"))) return;
    await fetch(`${base}/matches/${match.id}/result`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "live", finishedAt: null }),
    });
    onRefresh();
  }

  async function restoreMatch() {
    if (!confirm(t("matchHub.confirmRestore"))) return;
    await fetch(`${base}/matches/${match.id}/result`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "scheduled" }),
    });
    onRefresh();
  }

  async function cancelMatch() {
    if (!confirm(t("matchHub.confirmCancel"))) return;
    await fetch(`${base}/matches/${match.id}/result`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    onRefresh();
  }

  function copyLink() {
    const url = `${window.location.origin}/t/${orgSlug}/match/${match.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const homeWon = (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWon = (match.awayScore ?? 0) > (match.homeScore ?? 0);
  const isDraw = (match.homeScore ?? 0) === (match.awayScore ?? 0);

  // Цвет результата
  const WIN_C  = "#10b981";
  const LOSE_C = "#ef4444";
  const DRAW_C = "#f59e0b";
  const homeResultColor = homeWon ? WIN_C : awayWon ? LOSE_C : DRAW_C;
  const awayResultColor = awayWon ? WIN_C : homeWon ? LOSE_C : DRAW_C;

  return (
    <div className="rounded-xl overflow-hidden transition-all relative"
      style={{
        border: "1px solid var(--cat-card-border)",
        background: "var(--cat-card-bg)",
      }}>

      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">

        {/* Left: home team */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
          <div className="text-right min-w-0">
            <div className="flex items-center justify-end gap-1.5">
              {/* W / D / L dot — hidden for cancelled */}
              {match.status !== "cancelled" && (
                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: homeResultColor, boxShadow: `0 0 4px ${homeResultColor}` }} />
              )}
              <p className="text-sm font-bold truncate leading-tight" style={{
                color: "var(--cat-text)",
                opacity: match.status === "cancelled" ? 0.45 : 1,
              }}>
                {match.homeTeam?.name ?? "TBD"}
              </p>
            </div>
            {match.homeTeam?.club?.name && (
              <p className="text-[10px] truncate" style={{ color: "var(--cat-text-muted)" }}>
                {match.homeTeam.club.name}
              </p>
            )}
          </div>
          <ClubBadge team={match.homeTeam} size={36} />
        </div>

        {/* Center: score or CANCELLED badge */}
        <div className="flex flex-col items-center shrink-0 gap-1">
          {match.status === "cancelled" ? (
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(107,114,128,0.12)", border: "1px solid rgba(107,114,128,0.3)" }}>
              <Ban className="w-3.5 h-3.5" style={{ color: "#6b7280" }} />
              <span className="text-xs font-black uppercase tracking-wider" style={{ color: "#6b7280" }}>
                {t("matchHub.statusCancelled")}
              </span>
            </div>
          ) : editing ? (
            <div className="flex items-center gap-1">
              <input type="number" value={editHome} onChange={e => setEditHome(e.target.value)}
                className="w-10 rounded text-center text-base font-black outline-none py-0.5"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)", border: "1px solid var(--cat-accent)" }} />
              <span className="text-base font-light" style={{ color: "var(--cat-text-muted)" }}>:</span>
              <input type="number" value={editAway} onChange={e => setEditAway(e.target.value)}
                className="w-10 rounded text-center text-base font-black outline-none py-0.5"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)", border: "1px solid var(--cat-accent)" }} />
            </div>
          ) : (
            <div className="flex items-center gap-1 px-3 py-1 rounded-xl"
              style={{ background: "var(--cat-tag-bg)", minWidth: 64, justifyContent: "center" }}>
              <span className="text-2xl font-black tabular-nums"
                style={{ color: "var(--cat-text)", opacity: homeWon || isDraw ? 1 : 0.45 }}>
                {match.homeScore ?? 0}
              </span>
              <span className="text-lg font-light mx-0.5" style={{ color: "var(--cat-text-muted)" }}>:</span>
              <span className="text-2xl font-black tabular-nums"
                style={{ color: "var(--cat-text)", opacity: awayWon || isDraw ? 1 : 0.45 }}>
                {match.awayScore ?? 0}
              </span>
            </div>
          )}
          {/* Meta under score */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {classInfo && classPalette && (
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: classPalette.bg, color: classPalette.text, border: `1px solid ${classPalette.border}` }}>
                {classInfo.name}
              </span>
            )}
            {divName && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6" }}>{divName}</span>
            )}
            {match.group && (
              <span className="text-[9px]" style={{ color: "var(--cat-text-muted)" }}>{match.group.name}</span>
            )}
            {match.round && (
              <span className="text-[9px]" style={{ color: "var(--cat-text-muted)" }}>{match.round.name}</span>
            )}
            {match.field && (
              <span className="text-[9px]" style={{ color: "var(--cat-text-muted)" }}>{match.field.name}</span>
            )}
            {match.scheduledAt && (
              <span className="text-[9px] font-mono" style={{ color: "var(--cat-text-muted)" }}>
                {new Date(match.scheduledAt).toLocaleDateString(
                  locale === "et" ? "et-EE" : locale === "ru" ? "ru-RU" : "en-GB",
                  { day: "2-digit", month: "2-digit" }
                )} {fmtTime(match.scheduledAt, locale)}
              </span>
            )}
          </div>
        </div>

        {/* Right: away team */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <ClubBadge team={match.awayTeam} size={36} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold truncate leading-tight" style={{
                color: "var(--cat-text)",
                opacity: match.status === "cancelled" ? 0.45 : 1,
              }}>
                {match.awayTeam?.name ?? "TBD"}
              </p>
              {/* W / D / L dot — hidden for cancelled */}
              {match.status !== "cancelled" && (
                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: awayResultColor, boxShadow: `0 0 4px ${awayResultColor}` }} />
              )}
            </div>
            {match.awayTeam?.club?.name && (
              <p className="text-[10px] truncate" style={{ color: "var(--cat-text-muted)" }}>
                {match.awayTeam.club.name}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {match.status === "cancelled" ? (
            /* Cancelled match — only restore to scheduled */
            <button onClick={restoreMatch}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:opacity-70 transition-opacity"
              style={{ background: "rgba(107,114,128,0.1)", color: "#9ca3af" }} title={t("matchHub.titleRestore")}>
              <RotateCcw className="w-3 h-3" />
              {t("matchHub.titleRestore")}
            </button>
          ) : (
            <>
              {/* Protocol status */}
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mr-1 hidden sm:inline"
                style={protocolFilled
                  ? { background: "rgba(16,185,129,0.1)", color: "#10b981" }
                  : { background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                {protocolFilled ? t("matchHub.eventCount", { count: match.events!.length }) : t("matchHub.noEvents")}
              </span>

              {editing ? (
                <>
                  <button onClick={saveScore} disabled={saving}
                    className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                    style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }} title={t("matchHub.titleSave")}>
                    <Save className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                    style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }} title={t("matchHub.titleCancel")}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => onOpenProtocol(match)}
                    className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                    style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }} title={t("matchHub.titleProtocol")}>
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setEditing(true); setEditHome(String(match.homeScore ?? 0)); setEditAway(String(match.awayScore ?? 0)); }}
                    className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                    style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }} title={t("matchHub.titleEditScore")}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={copyLink}
                    className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                    style={{ background: copied ? "rgba(16,185,129,0.15)" : "var(--cat-tag-bg)", color: copied ? "#10b981" : "var(--cat-text-muted)" }}
                    title={t("matchHub.titleCopyLink")}>
                    <Link2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={reopenMatch}
                    className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                    style={{ background: "var(--cat-tag-bg)", color: "#f59e0b" }} title={t("matchHub.titleReopen")}>
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={cancelMatch}
                    className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                    style={{ background: "var(--cat-tag-bg)", color: "#ef4444" }} title={t("matchHub.titleCancelMatch")}>
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Upcoming Match Card ───────────────────────────────────────────────────────

function UpcomingMatchCard({
  match, base, onRefresh, onOpenProtocol, classMap,
}: {
  match: Match; base: string; onRefresh: () => void;
  onOpenProtocol: (match: Match) => void; classMap: ClassMap;
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const divName = stageName(match.stage, locale);
  const classId = match.stage?.classId ?? null;
  const classInfo = classId ? classMap.get(classId) : null;
  const classIdx = classId ? Array.from(classMap.keys()).indexOf(classId) : -1;
  const classPalette = classIdx >= 0 ? classColor(classIdx) : null;

  async function startMatch() {
    await fetch(`${base}/matches/${match.id}/result`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "live", startedAt: new Date().toISOString(), homeScore: 0, awayScore: 0 }),
    });
    onRefresh();
  }

  const dtLocale = locale === "et" ? "et-EE" : locale === "ru" ? "ru-RU" : "en-GB";

  return (
    <div className="rounded-xl border px-3 py-2.5 flex items-center gap-3 hover:border-[var(--cat-accent)] transition-colors"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>

      {/* Date + Time column */}
      <div className="shrink-0 w-14 text-right">
        {match.scheduledAt ? (
          <>
            <div className="text-[10px] font-mono font-semibold leading-tight" style={{ color: "var(--cat-text)" }}>
              {new Date(match.scheduledAt).toLocaleDateString(dtLocale, { day: "2-digit", month: "2-digit" })}
            </div>
            <div className="text-xs font-mono font-bold leading-tight" style={{ color: "var(--cat-text-muted)" }}>
              {fmtTime(match.scheduledAt, locale)}
            </div>
          </>
        ) : (
          <span className="text-xs font-mono" style={{ color: "var(--cat-text-muted)" }}>—</span>
        )}
      </div>

      {/* Teams */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <ClubBadge team={match.homeTeam} size={22} />
        <span className="text-sm font-semibold truncate" style={{ color: "var(--cat-text)" }}>
          {match.homeTeam?.name ?? "TBD"}
        </span>
        <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded font-mono"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>vs</span>
        <span className="text-sm font-semibold truncate" style={{ color: "var(--cat-text)" }}>
          {match.awayTeam?.name ?? "TBD"}
        </span>
        <ClubBadge team={match.awayTeam} size={22} />
      </div>

      {/* Division + Stage / Group / Round / Field meta */}
      <div className="hidden md:flex items-center gap-1.5 shrink-0 flex-wrap justify-end max-w-[240px]">
        {/* Division (class) — prominent colored pill */}
        {classInfo && classPalette && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap"
            style={{ background: classPalette.bg, color: classPalette.text, border: `1px solid ${classPalette.border}` }}>
            {classInfo.name}
          </span>
        )}
        {divName && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap"
            style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6" }}>
            {divName}
          </span>
        )}
        {match.group && (
          <span className="text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
            {match.group.name}
          </span>
        )}
        {match.round && (
          <span className="text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap"
            style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
            {match.round.name}
          </span>
        )}
        {match.field && (
          <span className="text-[10px] flex items-center gap-0.5 whitespace-nowrap" style={{ color: "var(--cat-text-muted)" }}>
            <FieldIcon className="w-2.5 h-2.5 shrink-0" />{match.field.name}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => onOpenProtocol(match)}
          className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}
          title={t("matchHub.titleProtocol")}>
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button onClick={startMatch}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity whitespace-nowrap"
          style={{ background: "#10b981", color: "#fff" }}>
          <Play className="w-3 h-3" /> {t("matchHub.startMatch")}
        </button>
      </div>
    </div>
  );
}

// ─── Protocol Modal ────────────────────────────────────────────────────────────

function ProtocolModal({
  match, base, onClose, onRefresh,
}: {
  match: Match;
  base: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [events, setEvents] = useState<MatchEvent[]>(match.events ?? []);
  const [addingType, setAddingType] = useState<EventType | null>(null);
  const [minute, setMinute] = useState("");
  const [teamSide, setTeamSide] = useState<"home" | "away">("home");
  const [saving, setSaving] = useState(false);

  async function loadEvents() {
    const r = await fetch(`${base}/matches/${match.id}/events`);
    if (r.ok) setEvents(await r.json());
  }

  useEffect(() => { loadEvents(); }, []);

  async function addEvent() {
    if (!addingType || !minute) return;
    setSaving(true);
    const teamId = teamSide === "home" ? match.homeTeamId : match.awayTeamId;
    await fetch(`${base}/matches/${match.id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, eventType: addingType, minute: parseInt(minute) }),
    });

    // Update score automatically on goal
    if (addingType === "goal" || addingType === "penalty_scored") {
      const homeScore = (match.homeScore ?? 0) + (teamSide === "home" ? 1 : 0);
      const awayScore = (match.awayScore ?? 0) + (teamSide === "away" ? 1 : 0);
      await fetch(`${base}/matches/${match.id}/result`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeScore, awayScore }),
      });
    }
    if (addingType === "own_goal") {
      const homeScore = (match.homeScore ?? 0) + (teamSide === "away" ? 1 : 0);
      const awayScore = (match.awayScore ?? 0) + (teamSide === "home" ? 1 : 0);
      await fetch(`${base}/matches/${match.id}/result`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeScore, awayScore }),
      });
    }

    setSaving(false);
    setAddingType(null);
    setMinute("");
    await loadEvents();
    onRefresh();
  }

  async function deleteEvent(id: number) {
    await fetch(`${base}/matches/${match.id}/events?eventId=${id}`, { method: "DELETE" });
    await loadEvents();
    onRefresh();
  }

  const quickEvents: { type: EventType; label: string; emoji: string; color: string }[] = [
    { type: "goal",           label: t("matchHub.eventGoal"),          emoji: "⚽", color: "#10b981" },
    { type: "own_goal",       label: t("matchHub.eventOwnGoal"),       emoji: "⚽", color: "#f59e0b" },
    { type: "yellow",         label: t("matchHub.eventYellow"),        emoji: "🟨", color: "#f59e0b" },
    { type: "red",            label: t("matchHub.eventRed"),           emoji: "🟥", color: "#ef4444" },
    { type: "yellow_red",     label: t("matchHub.eventYellowRed"),     emoji: "🟧", color: "#f97316" },
    { type: "substitution_in", label: t("matchHub.eventSubIn"),        emoji: "🔄", color: "#3b82f6" },
    { type: "injury",         label: t("matchHub.eventInjury"),        emoji: "🩹", color: "#8b5cf6" },
    { type: "var",            label: t("matchHub.eventVar"),           emoji: "📺", color: "#6366f1" },
    { type: "penalty_scored", label: t("matchHub.eventPenaltyScored"), emoji: "⚽", color: "#3b82f6" },
    { type: "penalty_missed", label: t("matchHub.eventPenaltyMissed"), emoji: "✗",  color: "#6b7280" },
  ];

  const divName = stageName(match.stage, locale);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="h-full w-full max-w-lg flex flex-col overflow-hidden"
        style={{ background: "var(--cat-card-bg)", borderLeft: "1px solid var(--cat-card-border)" }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: "var(--cat-card-border)" }}>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                {divName}
              </span>
              {match.field && <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{match.field.name}</span>}
            </div>
            <h2 className="text-base font-bold" style={{ color: "var(--cat-text)" }}>
              {match.homeTeam?.name ?? "TBD"} {match.homeScore ?? 0}:{match.awayScore ?? 0} {match.awayTeam?.name ?? "TBD"}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("matchHub.protocol")} #{match.matchNumber ?? match.id}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:opacity-70"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add event panel */}
        <div className="px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--cat-card-border)" }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--cat-text-muted)" }}>
            {t("matchHub.addEventTitle")}
          </p>

          {/* Team selector */}
          <div className="flex gap-2 mb-3">
            {(["home", "away"] as const).map(side => (
              <button
                key={side}
                onClick={() => setTeamSide(side)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={teamSide === side
                  ? { background: "var(--cat-accent)", color: "var(--cat-accent-text)" }
                  : { background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}
              >
                {side === "home" ? (match.homeTeam?.name ?? t("matchHub.homeTeam")) : (match.awayTeam?.name ?? t("matchHub.awayTeam"))}
              </button>
            ))}
          </div>

          {/* Event type buttons */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {quickEvents.map(ev => (
              <button
                key={ev.type}
                onClick={() => setAddingType(prev => prev === ev.type ? null : ev.type)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                style={addingType === ev.type
                  ? { background: ev.color, color: "#fff" }
                  : { background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}
              >
                {ev.emoji} {ev.label}
              </button>
            ))}
          </div>

          {/* Minute + save */}
          {addingType && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minute}
                onChange={e => setMinute(e.target.value)}
                placeholder={t("matchHub.minutePlaceholder")}
                min={1} max={120}
                className="w-24 rounded-lg px-3 py-1.5 text-sm outline-none"
                style={{
                  background: "var(--cat-input-bg, var(--cat-card-bg))",
                  border: "1px solid var(--cat-card-border)",
                  color: "var(--cat-text)",
                }}
              />
              <button
                onClick={addEvent}
                disabled={!minute || saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 disabled:opacity-40 transition-opacity"
                style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}
              >
                {saving ? "..." : `✓ ${t("matchHub.titleSave")}`}
              </button>
              <button onClick={() => { setAddingType(null); setMinute(""); }}
                className="text-xs px-2 py-1.5 rounded-lg hover:opacity-70"
                style={{ color: "var(--cat-text-muted)", background: "var(--cat-tag-bg)" }}>
                {t("matchHub.titleCancel")}
              </button>
            </div>
          )}
        </div>

        {/* Events list */}
        <div className="flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: "var(--cat-text-muted)" }}>
              <SquareActivity className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">{t("matchHub.noEvents")}</p>
              <p className="text-xs mt-1 opacity-60">{t("matchHub.noEventsAddHint")}</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--cat-card-border)" }}>
              {[...events].sort((a, b) => a.minute - b.minute).map(ev => {
                const ei = eventIcon(ev.eventType);
                const isHome = ev.teamId === match.homeTeamId;
                return (
                  <div key={ev.id} className="flex items-center gap-3 px-5 py-3 hover:opacity-80 group">
                    <span className="w-10 text-right font-mono text-sm font-bold shrink-0"
                      style={{ color: "var(--cat-text-muted)" }}>{ev.minute}'</span>

                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0"
                      style={{ background: `${ei.color}20`, color: ei.color }}
                    >{ei.icon}</div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>
                        {ev.person ? `${ev.person.firstName} ${ev.person.lastName}` : eventLabel(ev.eventType, t)}
                      </p>
                      <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                        {eventLabel(ev.eventType, t)} · {isHome ? match.homeTeam?.name : match.awayTeam?.name}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteEvent(ev.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                      style={{ background: "var(--cat-tag-bg)", color: "#ef4444" }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Qualification Rule type (read-only display) ─────────────────────────────

interface QualRule {
  id: number;
  fromStageId: number;
  targetStageId: number;
  fromRank: number;
  toRank: number;
  targetSlot?: string | null;
  condition?: Record<string, unknown> | null;
}

// ─── Stage Advance Panel ──────────────────────────────────────────────────────

function StageAdvancePanel({
  matches, base, orgSlug, tournamentId, onAdvanced,
}: {
  matches: Match[];
  base: string;
  orgSlug: string;
  tournamentId: number;
  onAdvanced: () => void;
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [advancing, setAdvancing] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, { ok: boolean; message?: string }>>({});
  const [qualRules, setQualRules] = useState<QualRule[]>([]);
  const [stageNames, setStageNames] = useState<Record<number, string>>({});

  // Группируем матчи по этапам (только с командами)
  const stageMap = new Map<number, { stage: Match["stage"]; all: Match[]; finished: Match[]; classId: number | null }>();
  for (const m of matches) {
    if (!m.stage) continue;
    if (!m.homeTeamId && !m.awayTeamId) continue;
    // Skip knockout stages — they advance automatically match by match
    const t = m.stage.type;
    if (t !== "group" && t !== "league") continue;
    const id = m.stage.id;
    if (!stageMap.has(id)) stageMap.set(id, { stage: m.stage, all: [], finished: [], classId: m.stage.classId ?? null });
    const entry = stageMap.get(id)!;
    entry.all.push(m);
    if (m.status === "finished" || m.status === "walkover" || m.status === "cancelled") {
      entry.finished.push(m);
    }
  }

  const classIds = [...new Set(Array.from(stageMap.values()).map(s => s.classId).filter(Boolean))] as number[];

  // Load qualification rules + all stage names once
  useEffect(() => {
    if (classIds.length === 0) return;
    // Fetch all qual rules for this tournament
    fetch(`${base}/qualification-rules`)
      .then(r => r.ok ? r.json() : [])
      .then((rules: QualRule[]) => setQualRules(rules));
    // Fetch all stages for name lookup
    Promise.all(classIds.map(cid =>
      fetch(`${base}/stages?classId=${cid}`).then(r => r.ok ? r.json() : [])
    )).then(results => {
      const nameMap: Record<number, string> = {};
      for (const stage of results.flat() as Array<{ id: number; name: string; nameRu?: string | null }>) {
        nameMap[stage.id] = (locale === "ru" && stage.nameRu) ? stage.nameRu : stage.name;
      }
      setStageNames(nameMap);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, classIds.join(","), locale]);

  // Only group/league stages can be "advanced" — knockout advances happen match by match automatically
  const ready = Array.from(stageMap.values()).filter(
    s => s.all.length > 0 &&
      s.all.length === s.finished.length &&
      (s.stage?.type === "group" || s.stage?.type === "league")
  );

  if (ready.length === 0) return null;

  async function advance(stageId: number) {
    if (!confirm(t("matchHub.confirmAdvance"))) return;
    setAdvancing(stageId);
    try {
      const r = await fetch(`${base}/stages/${stageId}/advance`, { method: "POST" });
      const json = await r.json().catch(() => ({}));
      setResults(prev => ({ ...prev, [stageId]: { ok: r.ok, message: json.error ?? json.message } }));
      if (r.ok) setTimeout(onAdvanced, 800);
    } catch {
      setResults(prev => ({ ...prev, [stageId]: { ok: false, message: t("matchHub.networkError") } }));
    } finally {
      setAdvancing(null);
    }
  }

  return (
    <div className="rounded-2xl border-2 p-4 space-y-3"
      style={{ borderColor: "rgba(251,191,36,0.45)", background: "rgba(251,191,36,0.06)" }}>
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-4 h-4" style={{ color: "#f59e0b" }} />
        <h3 className="text-sm font-black" style={{ color: "#f59e0b" }}>
          {t("matchHub.readyForNextStage")}
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full font-bold"
          style={{ background: "rgba(251,191,36,0.15)", color: "#f59e0b" }}>
          {ready.length}
        </span>
      </div>
      {ready.map(({ stage, all, finished, classId }) => {
        const stageId = stage!.id;
        const stageType = stage!.type;
        const res = results[stageId];
        const isGroupStage = stageType === "group" || stageType === "league";
        const stageRules = qualRules.filter(r => r.fromStageId === stageId);
        const formatHref = classId
          ? `/org/${orgSlug}/admin/tournament/${tournamentId}/format?classId=${classId}`
          : `/org/${orgSlug}/admin/tournament/${tournamentId}/format`;

        return (
          <div key={stageId}
            className="rounded-xl px-4 py-3 space-y-2"
            style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>

            {/* Header row */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
                  {stageName(stage, locale)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                  ✅ {t("matchHub.matchesFinished", { done: finished.length, total: all.length })}
                </p>
                {res && !res.ok && (
                  <p className="text-xs mt-1 font-semibold" style={{ color: "#ef4444" }}>
                    ✗ {res.message ?? t("matchHub.advanceError")}
                  </p>
                )}
                {res?.ok && (
                  <p className="text-xs mt-1 font-semibold" style={{ color: "#10b981" }}>
                    ✓ {t("matchHub.done")}
                  </p>
                )}
              </div>

              {/* Advance button — group/league only */}
              {isGroupStage && (
                <button
                  onClick={() => advance(stageId)}
                  disabled={advancing === stageId || res?.ok === true || stageRules.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all disabled:opacity-50 hover:scale-105 active:scale-95 shrink-0"
                  style={res?.ok
                    ? { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid #10b981" }
                    : { background: "#f59e0b", color: "#000" }}>
                  {advancing === stageId ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> {t("matchHub.transitioning")}</>
                  ) : res?.ok ? (
                    <><CheckCircle className="w-3.5 h-3.5" /> {t("matchHub.done")}</>
                  ) : (
                    <><Zap className="w-3.5 h-3.5" /> {t("matchHub.nextStage")}</>
                  )}
                </button>
              )}
            </div>

            {/* Qualification rules — read-only display */}
            {isGroupStage && (
              <div className="mt-1">
                {stageRules.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {stageRules.map(rule => (
                      <span key={rule.id}
                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-semibold"
                        style={{
                          background: rule.targetSlot === "b_playoff"
                            ? "rgba(139,92,246,0.12)" : "rgba(16,185,129,0.12)",
                          color: rule.targetSlot === "b_playoff" ? "#a78bfa" : "#34d399",
                          border: `1px solid ${rule.targetSlot === "b_playoff" ? "rgba(139,92,246,0.3)" : "rgba(16,185,129,0.3)"}`,
                        }}>
                        <span>#{rule.fromRank}–{rule.toRank}</span>
                        <span style={{ opacity: 0.6 }}>→</span>
                        <span>{stageNames[rule.targetStageId] ?? `Stage ${rule.targetStageId}`}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px]" style={{ color: "#f59e0b" }}>
                      ⚠ No qualification rules — configure in
                    </span>
                    <a href={formatHref}
                      className="text-[11px] font-bold underline"
                      style={{ color: "#f59e0b" }}>
                      Format settings
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Event Feed ───────────────────────────────────────────────────────────────

function EventFeed({ matches }: { matches: Match[] }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const allEvents = matches
    .flatMap(m => (m.events ?? []).map(e => ({ ...e, match: m })))
    .sort((a, b) => new Date(b.match.startedAt ?? 0).getTime() - new Date(a.match.startedAt ?? 0).getTime()
      || b.minute - a.minute)
    .slice(0, 40);

  if (allEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12" style={{ color: "var(--cat-text-muted)" }}>
        <Radio className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-xs">{t("matchHub.eventFeedEmpty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {allEvents.map(ev => {
        const ei = eventIcon(ev.eventType);
        const isHome = ev.teamId === ev.match.homeTeamId;
        return (
          <div key={`${ev.id}-${ev.match.id}`}
            className="flex items-start gap-2.5 px-3 py-2 rounded-lg hover:opacity-80"
            style={{ background: "var(--cat-tag-bg)" }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5"
              style={{ background: `${ei.color}20`, color: ei.color }}>
              {ei.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs font-bold" style={{ color: "var(--cat-text)" }}>
                  {ev.match.homeTeam?.name ?? "?"} {ev.match.homeScore ?? 0}:{ev.match.awayScore ?? 0} {ev.match.awayTeam?.name ?? "?"}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="font-mono text-[10px] font-bold" style={{ color: "var(--cat-text-muted)" }}>
                  {ev.minute}'
                </span>
                <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                  {eventLabel(ev.eventType, t)}
                  {ev.person ? ` · ${ev.person.firstName} ${ev.person.lastName}` : ""}
                  {` · ${isHome ? ev.match.homeTeam?.name : ev.match.awayTeam?.name}`}
                </span>
              </div>
              <div className="text-[9px] mt-0.5" style={{ color: "var(--cat-text-muted)", opacity: 0.6 }}>
                {stageName(ev.match.stage, locale)}
                {ev.match.field ? ` · ${ev.match.field.name}` : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MatchHubPage() {
  const ctx = useTournament();
  const t = useTranslations("admin");
  const locale = useLocale();
  const orgSlug = ctx?.orgSlug ?? "";
  const tournamentId = ctx?.tournamentId ?? 0;
  const base = `/api/org/${orgSlug}/tournament/${tournamentId}`;
  const router = useRouter();

  const now = useNow(1000);
  const [matches, setMatches] = useState<Match[]>([]);
  const [classMap, setClassMap] = useState<ClassMap>(new Map());
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterField, setFilterField] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [groupByDiv, setGroupByDiv] = useState(false);

  function navigateToProtocol(match: Match) {
    router.push(`/org/${orgSlug}/admin/tournament/${tournamentId}/hub/match/${match.id}`);
  }

  const loadMatches = useCallback(async () => {
    try {
      const r = await fetch(`${base}/matches`);
      if (r.ok) {
        setMatches(await r.json());
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => { loadMatches(); }, [loadMatches]);

  // Load classes once on mount (no auto-refresh needed — classes don't change during a match day)
  useEffect(() => {
    fetch(`${base}/classes`)
      .then(r => r.ok ? r.json() : [])
      .then((classes: ClassInfo[]) => {
        const m = new Map<number, ClassInfo>();
        for (const c of classes) m.set(c.id, c);
        setClassMap(m);
      })
      .catch(() => {});
  }, [base]);

  // Auto-refresh every 5s
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(loadMatches, 5000);
    return () => clearInterval(t);
  }, [autoRefresh, loadMatches]);

  // Build sorted class list for filter dropdown
  const classOptions = Array.from(classMap.values());
  const fields = Array.from(new Set(
    matches.map(m => m.field?.name).filter(Boolean)
  )) as string[];

  const filtered = matches.filter(m => {
    if (filterClass !== "all" && String(m.stage?.classId ?? "") !== filterClass) return false;
    if (filterField !== "all" && m.field?.name !== filterField) return false;
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    return true;
  });

  const live = filtered.filter(m => m.status === "live");
  const upcoming = filtered.filter(m => m.status === "scheduled" || m.status === "postponed");
  const finished = filtered.filter(m => m.status === "finished" || m.status === "walkover" || m.status === "cancelled");

  // Stats
  const totalGoals = matches.flatMap(m => m.events ?? []).filter(e => e.eventType === "goal" || e.eventType === "own_goal" || e.eventType === "penalty_scored").length;
  const totalYellow = matches.flatMap(m => m.events ?? []).filter(e => e.eventType === "yellow" || e.eventType === "yellow_red").length;
  const totalRed = matches.flatMap(m => m.events ?? []).filter(e => e.eventType === "red").length;

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: "var(--cat-text-muted)" }}>
      <RefreshCw className="w-5 h-5 animate-spin mr-2" /> {t("matchHub.loadingDots")}
    </div>
  );

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-5 h-5" style={{ color: "#ef4444" }} />
            <h1 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>{t("matchHub.hubTitle")}</h1>
            {live.length > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold animate-pulse"
                style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                {live.length} LIVE
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
            {t("matchHub.allMatchesLive")}
            {lastUpdated && <span className="ml-2 opacity-50">· {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-70"
            style={autoRefresh
              ? { background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }
              : { background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }} />
            {autoRefresh ? t("matchHub.autoRefresh") : t("matchHub.pauseRefresh")}
          </button>
          <button onClick={loadMatches}
            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-2">
        <StatPill icon={<Zap className="w-4 h-4" />}     value={live.length}       label="Live"       color="#ef4444" />
        <StatPill icon={<Clock className="w-4 h-4" />}   value={upcoming.length}   label={t("matchHub.statUpcoming")}  color="#f59e0b" />
        <StatPill icon={<CheckCircle className="w-4 h-4" />} value={`${finished.length}/${matches.length}`} label={t("matchHub.statFinished")} color="#10b981" />
        <StatPill icon={<span>⚽</span>}                 value={totalGoals}        label={t("matchHub.statGoals")}    color="#10b981" />
        <StatPill icon={<span>🟨</span>}                 value={totalYellow}       label={t("matchHub.statYellow")}   color="#f59e0b" />
        <StatPill icon={<span>🟥</span>}                 value={totalRed}          label={t("matchHub.statRed")}      color="#ef4444" />
      </div>

      {/* Advance Panel — показывается когда этап завершён */}
      <StageAdvancePanel matches={matches} base={base} orgSlug={orgSlug} tournamentId={tournamentId} onAdvanced={loadMatches} />

      {/* Filters */}
      <div className="space-y-2">
        {/* Row 1: Division pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="w-3 h-3 shrink-0 mr-0.5" style={{ color: "var(--cat-text-muted)" }} />
          <PillBtn active={filterClass === "all"} onClick={() => setFilterClass("all")}>
            {t("matchHub.allDivisionsFilter")}
          </PillBtn>
          {classOptions.map((cls, idx) => {
            const pal = classColor(idx);
            const active = filterClass === String(cls.id);
            return (
              <button key={cls.id}
                onClick={() => setFilterClass(active ? "all" : String(cls.id))}
                className="text-xs px-2.5 py-1 rounded-full font-black transition-all hover:opacity-90 active:scale-95"
                style={active
                  ? { background: pal.text, color: "#fff", boxShadow: `0 0 12px ${pal.text}50` }
                  : { background: pal.bg, color: pal.text, border: `1px solid ${pal.border}` }}>
                {cls.name}
              </button>
            );
          })}

          {/* Separator */}
          {fields.length > 1 && <span className="w-px h-4 mx-1" style={{ background: "var(--cat-card-border)" }} />}

          {/* Field pills */}
          {fields.length > 1 && (
            <>
              <PillBtn active={filterField === "all"} onClick={() => setFilterField("all")}>
                <FieldIcon className="w-3 h-3 inline-block mr-1" style={{ display: "inline" }} />{t("matchHub.allFieldsFilter")}
              </PillBtn>
              {fields.map(f => (
                <PillBtn key={f} active={filterField === f} onClick={() => setFilterField(filterField === f ? "all" : f)}>
                  <FieldIcon className="w-3 h-3 inline-block mr-1" style={{ display: "inline" }} />{f}
                </PillBtn>
              ))}
            </>
          )}

          {/* Separator */}
          <span className="w-px h-4 mx-1" style={{ background: "var(--cat-card-border)" }} />

          {/* Status pills — emojis live in i18n strings, don't add extra here */}
          <PillBtn active={filterStatus === "all"} onClick={() => setFilterStatus("all")}>
            {t("matchHub.allStatusesFilter")}
          </PillBtn>
          <PillBtn active={filterStatus === "live"} onClick={() => setFilterStatus(filterStatus === "live" ? "all" : "live")}
            activeColor="#ef4444">
            {t("matchHub.statusLiveOption")}
          </PillBtn>
          <PillBtn active={filterStatus === "scheduled"} onClick={() => setFilterStatus(filterStatus === "scheduled" ? "all" : "scheduled")}
            activeColor="#f59e0b">
            {t("matchHub.statusUpcomingOption")}
          </PillBtn>
          <PillBtn active={filterStatus === "finished"} onClick={() => setFilterStatus(filterStatus === "finished" ? "all" : "finished")}
            activeColor="#10b981">
            {t("matchHub.statusFinishedOption")}
          </PillBtn>

          {/* Group by division toggle */}
          {classOptions.length > 1 && filterClass === "all" && (
            <>
              <span className="w-px h-4 mx-1" style={{ background: "var(--cat-card-border)" }} />
              <button
                onClick={() => setGroupByDiv(v => !v)}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold transition-all hover:opacity-90 active:scale-95"
                style={groupByDiv
                  ? { background: "var(--cat-accent)", color: "var(--cat-accent-text)", boxShadow: "0 0 10px var(--cat-accent-text, #fff)20" }
                  : { background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)", border: "1px solid var(--cat-card-border)" }}>
                ⊞ {t("matchHub.groupByDivision")}
              </button>
            </>
          )}

          {/* Reset */}
          {(filterClass !== "all" || filterField !== "all" || filterStatus !== "all") && (
            <button onClick={() => { setFilterClass("all"); setFilterField("all"); setFilterStatus("all"); }}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-all hover:opacity-70 active:scale-95"
              style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <X className="w-3 h-3" /> {t("matchHub.filterReset")}
            </button>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left: matches */}
        <div className="xl:col-span-2 space-y-5">
          {/* LIVE */}
          {live.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
                <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "#ef4444" }}>
                  {t("matchHub.sectionLive", { count: live.length })}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {live.map(m => (
                  <LiveMatchCard key={m.id} match={m} now={now} base={base}
                    onRefresh={loadMatches} onOpenProtocol={navigateToProtocol} classMap={classMap} />
                ))}
              </div>
            </div>
          )}

          {/* UPCOMING — flat or grouped by division */}
          {upcoming.length > 0 && (() => {
            // Render a single group of upcoming matches
            const renderGroup = (items: Match[]) => (
              <div className="space-y-1.5">
                {items.map(m => (
                  <UpcomingMatchCard key={m.id} match={m} base={base}
                    onRefresh={loadMatches} onOpenProtocol={navigateToProtocol} classMap={classMap} />
                ))}
              </div>
            );

            if (groupByDiv && classOptions.length > 1) {
              // Group by class
              const byClass = new Map<number | null, Match[]>();
              for (const m of upcoming) {
                const k = m.stage?.classId ?? null;
                if (!byClass.has(k)) byClass.set(k, []);
                byClass.get(k)!.push(m);
              }
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />
                    <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "#f59e0b" }}>
                      {t("matchHub.sectionUpcoming", { count: upcoming.length })}
                    </h2>
                  </div>
                  {Array.from(byClass.entries()).map(([cid, items]) => {
                    const cls = cid ? classMap.get(cid) : null;
                    const idx = cid ? Array.from(classMap.keys()).indexOf(cid) : -1;
                    const pal = idx >= 0 ? classColor(idx) : null;
                    return (
                      <div key={cid ?? "none"}>
                        {cls && pal && (
                          <div className="flex items-center gap-2 mb-2 px-1">
                            <span className="text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wide"
                              style={{ background: pal.bg, color: pal.text, border: `1px solid ${pal.border}` }}>
                              {cls.name}
                            </span>
                            <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                              {items.length} {t("matchHub.matchesCount")}
                            </span>
                          </div>
                        )}
                        {renderGroup(items)}
                      </div>
                    );
                  })}
                </div>
              );
            }

            return (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />
                  <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "#f59e0b" }}>
                    {t("matchHub.sectionUpcoming", { count: upcoming.length })}
                  </h2>
                </div>
                {renderGroup(upcoming)}
              </div>
            );
          })()}

          {/* FINISHED */}
          {finished.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
                <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "#10b981" }}>
                  {t("matchHub.sectionFinished", { count: finished.length })}
                </h2>
              </div>
              <div className="space-y-2">
                {finished.map(m => (
                  <FinishedMatchCard key={m.id} match={m} base={base}
                    onRefresh={loadMatches} onOpenProtocol={navigateToProtocol}
                    orgSlug={orgSlug} classMap={classMap} />
                ))}
              </div>
            </div>
          )}

          {/* Empty */}
          {filtered.length === 0 && (
            <div className="rounded-2xl border py-16 flex flex-col items-center"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              <Swords className="w-12 h-12 mb-3 opacity-20" style={{ color: "var(--cat-text)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--cat-text-muted)" }}>{t("matchHub.noMatches")}</p>
              <p className="text-xs mt-1 opacity-60" style={{ color: "var(--cat-text-muted)" }}>
                {t("matchHub.noMatchesHint")}
              </p>
            </div>
          )}
        </div>

        {/* Right: event feed */}
        <div>
          <div className="sticky top-4">
            <div className="rounded-2xl border overflow-hidden"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              <div className="px-4 py-3 border-b flex items-center justify-between"
                style={{ borderColor: "var(--cat-card-border)" }}>
                <div className="flex items-center gap-2">
                  <SquareActivity className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
                  <h3 className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{t("matchHub.eventFeedTitle")}</h3>
                </div>
                {autoRefresh && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>● LIVE</span>
                )}
              </div>
              <div className="p-3 max-h-[70vh] overflow-y-auto">
                <EventFeed matches={matches} />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
