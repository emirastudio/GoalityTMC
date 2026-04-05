"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTournament } from "@/lib/tournament-context";
import {
  ClipboardList, RefreshCw, Loader2, CheckCircle,
  Circle, Clock, ChevronDown, ChevronRight, Eye, X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type MatchStatus = "scheduled" | "live" | "finished" | "cancelled" | "postponed" | "walkover";
type EventType = "goal" | "own_goal" | "yellow" | "red" | "yellow_red" |
  "penalty_scored" | "penalty_missed" | "substitution_in" | "substitution_out" | "injury";

interface MatchEvent {
  id: number;
  eventType: EventType;
  minute: number;
  minuteExtra?: number | null;
  teamId: number;
  person?: { firstName: string; lastName: string } | null;
  team?: { name: string } | null;
}

interface Match {
  id: number;
  matchNumber?: number | null;
  status: MatchStatus;
  scheduledAt?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeam?: { id: number; name: string } | null;
  awayTeam?: { id: number; name: string } | null;
  field?: { name: string } | null;
  group?: { name: string } | null;
  round?: { name: string } | null;
  stage?: { name: string; nameRu?: string | null } | null;
  events?: MatchEvent[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function eventIcon(type: EventType) {
  const map: Record<EventType, string> = {
    goal: "⚽", own_goal: "⚽", yellow: "🟨", red: "🟥", yellow_red: "🟧",
    penalty_scored: "⚽", penalty_missed: "✗", substitution_in: "↑", substitution_out: "↓", injury: "🩹",
  };
  return map[type] ?? "·";
}

function eventLabel(type: EventType) {
  const map: Record<EventType, string> = {
    goal: "Гол", own_goal: "Автогол", yellow: "Жёлтая", red: "Красная",
    yellow_red: "2-я жёлтая", penalty_scored: "Пенальти ✓", penalty_missed: "Пенальти ✗",
    substitution_in: "Замена ↑", substitution_out: "Замена ↓", injury: "Травма",
  };
  return map[type] ?? type;
}

function protocolStatus(match: Match): { label: string; color: string; bg: string; icon: React.ReactNode } {
  if (match.status === "finished" && match.events && match.events.length > 0)
    return { label: "Заполнен", color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: <CheckCircle className="w-3.5 h-3.5" /> };
  if (match.status === "finished")
    return { label: "Без событий", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: <Circle className="w-3.5 h-3.5" /> };
  if (match.status === "live")
    return { label: "Live", color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: <span className="w-2 h-2 rounded-full animate-pulse inline-block" style={{ background: "#ef4444" }} /> };
  return { label: "Не начат", color: "var(--cat-text-muted)", bg: "var(--cat-tag-bg)", icon: <Clock className="w-3.5 h-3.5" /> };
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

// ─── Protocol inline view ─────────────────────────────────────────────────────

function ProtocolInline({
  match, base, onClose, onRefresh,
}: {
  match: Match; base: string; onClose: () => void; onRefresh: () => void;
}) {
  const [events, setEvents] = useState<MatchEvent[]>(match.events ?? []);
  const [addingType, setAddingType] = useState<EventType | null>(null);
  const [teamSide, setTeamSide] = useState<"home" | "away">("home");
  const [minute, setMinute] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadEvents() {
    const r = await fetch(`${base}/matches/${match.id}/events`);
    if (r.ok) setEvents(await r.json());
  }

  async function addEvent() {
    if (!addingType || !minute) return;
    setSaving(true);
    const teamId = teamSide === "home" ? match.homeTeam?.id : match.awayTeam?.id;
    await fetch(`${base}/matches/${match.id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, eventType: addingType, minute: parseInt(minute) }),
    });
    if (addingType === "goal" || addingType === "penalty_scored") {
      const hs = (match.homeScore ?? 0) + (teamSide === "home" ? 1 : 0);
      const as_ = (match.awayScore ?? 0) + (teamSide === "away" ? 1 : 0);
      await fetch(`${base}/matches/${match.id}/result`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeScore: hs, awayScore: as_ }),
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
  }

  const quickEvents: { type: EventType; label: string; emoji: string }[] = [
    { type: "goal", label: "Гол", emoji: "⚽" },
    { type: "own_goal", label: "Автогол", emoji: "⚽" },
    { type: "yellow", label: "Жёлтая", emoji: "🟨" },
    { type: "red", label: "Красная", emoji: "🟥" },
    { type: "substitution_in", label: "Замена", emoji: "🔄" },
    { type: "injury", label: "Травма", emoji: "🩹" },
  ];

  return (
    <div className="mt-3 rounded-xl border p-4 space-y-3"
      style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
      {/* Team selector + quick events */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["home", "away"] as const).map(side => (
          <button key={side} onClick={() => setTeamSide(side)}
            className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            style={teamSide === side
              ? { background: "var(--cat-accent)", color: "var(--cat-accent-text)" }
              : { background: "var(--cat-card-bg)", color: "var(--cat-text-secondary)", border: "1px solid var(--cat-card-border)" }}>
            {side === "home" ? (match.homeTeam?.name ?? "Хозяева") : (match.awayTeam?.name ?? "Гости")}
          </button>
        ))}
        <div className="h-4 w-px" style={{ background: "var(--cat-card-border)" }} />
        {quickEvents.map(ev => (
          <button key={ev.type} onClick={() => setAddingType(p => p === ev.type ? null : ev.type)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
            style={addingType === ev.type
              ? { background: "var(--cat-accent)", color: "var(--cat-accent-text)" }
              : { background: "var(--cat-card-bg)", color: "var(--cat-text-secondary)", border: "1px solid var(--cat-card-border)" }}>
            {ev.emoji} {ev.label}
          </button>
        ))}
        {addingType && (
          <div className="flex items-center gap-1.5">
            <input type="number" value={minute} onChange={e => setMinute(e.target.value)}
              placeholder="Мин" min={1} max={120}
              className="w-16 rounded-lg px-2 py-1 text-xs outline-none"
              style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }} />
            <button onClick={addEvent} disabled={!minute || saving}
              className="px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-40"
              style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}>
              {saving ? "..." : "✓"}
            </button>
          </div>
        )}
        <button onClick={onClose} className="ml-auto p-1 rounded hover:opacity-70"
          style={{ color: "var(--cat-text-muted)" }}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Events list */}
      {events.length === 0 ? (
        <p className="text-xs text-center py-2" style={{ color: "var(--cat-text-muted)" }}>Событий нет</p>
      ) : (
        <div className="space-y-1">
          {[...events].sort((a, b) => a.minute - b.minute).map(ev => (
            <div key={ev.id} className="flex items-center gap-2 group text-xs py-1">
              <span className="font-mono w-7 text-right shrink-0" style={{ color: "var(--cat-text-muted)" }}>{ev.minute}'</span>
              <span>{eventIcon(ev.eventType)}</span>
              <span style={{ color: "var(--cat-text-secondary)" }}>
                {ev.person ? `${ev.person.firstName} ${ev.person.lastName}` : eventLabel(ev.eventType)}
                {" · "}{ev.teamId === match.homeTeam?.id ? match.homeTeam?.name : match.awayTeam?.name}
              </span>
              <button onClick={() => deleteEvent(ev.id)}
                className="ml-auto opacity-0 group-hover:opacity-100 text-red-400 hover:opacity-70 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Match row ────────────────────────────────────────────────────────────────

function MatchRow({ match, base, onRefresh }: { match: Match; base: string; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const ps = protocolStatus(match);
  const stageName = match.stage?.nameRu || match.stage?.name || "";

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Time */}
        <div className="text-xs font-mono shrink-0 w-10 text-right" style={{ color: "var(--cat-text-muted)" }}>
          {match.scheduledAt ? fmtTime(match.scheduledAt) : "—"}
        </div>

        {/* Teams + score */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-semibold truncate" style={{ color: "var(--cat-text)" }}>
            {match.homeTeam?.name ?? "TBD"}
          </span>
          {match.status === "finished" || match.status === "live" ? (
            <span className="text-sm font-black tabular-nums shrink-0 px-2 py-0.5 rounded"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)" }}>
              {match.homeScore ?? 0} : {match.awayScore ?? 0}
            </span>
          ) : (
            <span className="text-xs shrink-0" style={{ color: "var(--cat-text-muted)" }}>vs</span>
          )}
          <span className="text-sm font-semibold truncate" style={{ color: "var(--cat-text)" }}>
            {match.awayTeam?.name ?? "TBD"}
          </span>
        </div>

        {/* Meta */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          {stageName && <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>{stageName}</span>}
          {match.field && <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>{match.field.name}</span>}
          {match.group && <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>Гр. {match.group.name}</span>}
          {match.round && <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>{match.round.name}</span>}
        </div>

        {/* Protocol status */}
        <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-full text-[11px] font-semibold"
          style={{ background: ps.bg, color: ps.color }}>
          {ps.icon}
          <span className="hidden sm:inline">{ps.label}</span>
        </div>

        {/* Events count */}
        {(match.events?.length ?? 0) > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0"
            style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
            {match.events!.length} событий
          </span>
        )}

        {/* Toggle */}
        <button onClick={() => setOpen(v => !v)}
          className="p-1.5 rounded-lg hover:opacity-70 transition-opacity shrink-0"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4">
          <ProtocolInline match={match} base={base} onClose={() => setOpen(false)} onRefresh={onRefresh} />
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ProtocolsPage() {
  const ctx = useTournament();
  const orgSlug = ctx?.orgSlug ?? "";
  const tournamentId = ctx?.tournamentId ?? 0;
  const base = `/api/org/${orgSlug}/tournament/${tournamentId}`;

  const searchParams = useSearchParams();
  const classId = searchParams ? Number(searchParams.get("classId")) || null : null;
  const className = searchParams ? searchParams.get("className") || null : null;

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Load stages for this class, then load matches per stage
      const stagesUrl = classId ? `${base}/stages?classId=${classId}` : `${base}/stages`;
      const sr = await fetch(stagesUrl);
      if (!sr.ok) return;
      const stages: { id: number }[] = await sr.json();

      const allMatches: Match[] = [];
      await Promise.all(stages.map(async stage => {
        const mr = await fetch(`${base}/matches?stageId=${stage.id}`);
        if (!mr.ok) return;
        const stageMatches: Match[] = await mr.json();
        // Load events for each match
        await Promise.all(stageMatches.map(async m => {
          const er = await fetch(`${base}/matches/${m.id}/events`);
          if (er.ok) m.events = await er.json();
        }));
        allMatches.push(...stageMatches);
      }));

      allMatches.sort((a, b) => {
        if (a.scheduledAt && b.scheduledAt)
          return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        return (a.id - b.id);
      });

      setMatches(allMatches);
    } finally {
      setLoading(false);
    }
  }, [base, classId]);

  useEffect(() => { load(); }, [load]);

  const filtered = filterStatus === "all" ? matches : matches.filter(m => {
    if (filterStatus === "filled") return m.status === "finished" && (m.events?.length ?? 0) > 0;
    if (filterStatus === "empty") return m.status === "finished" && (m.events?.length ?? 0) === 0;
    return m.status === filterStatus;
  });

  const stats = {
    total: matches.length,
    live: matches.filter(m => m.status === "live").length,
    filled: matches.filter(m => m.status === "finished" && (m.events?.length ?? 0) > 0).length,
    finished: matches.filter(m => m.status === "finished").length,
    pending: matches.filter(m => m.status === "scheduled").length,
  };

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>
            {className ? `Протоколы · ${className}` : "Протоколы матчей"}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            Статус заполнения и редактирование событий матчей
          </p>
        </div>
        <button onClick={load}
          className="p-2 rounded-lg hover:opacity-70 transition-opacity"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all",      label: `Все (${stats.total})`,                  color: "var(--cat-text-muted)", bg: "var(--cat-tag-bg)" },
            { key: "live",     label: `🔴 Live (${stats.live})`,               color: "#ef4444",  bg: "rgba(239,68,68,0.1)" },
            { key: "filled",   label: `✓ Заполнен (${stats.filled})`,          color: "#10b981",  bg: "rgba(16,185,129,0.1)" },
            { key: "empty",    label: `○ Без событий (${stats.finished - stats.filled})`, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
            { key: "scheduled",label: `⏳ Не начат (${stats.pending})`,        color: "var(--cat-text-muted)", bg: "var(--cat-tag-bg)" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={filterStatus === f.key
                ? { background: f.color === "var(--cat-text-muted)" ? "var(--cat-tag-bg)" : f.bg, color: f.color, border: `1px solid ${f.color}` }
                : { background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 py-12 justify-center" style={{ color: "var(--cat-text-muted)" }}>
          <Loader2 className="w-5 h-5 animate-spin" /> Загрузка...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border py-16 flex flex-col items-center gap-3"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <ClipboardList className="w-12 h-12 opacity-20" style={{ color: "var(--cat-text)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--cat-text-muted)" }}>Матчей нет</p>
          <p className="text-xs opacity-60" style={{ color: "var(--cat-text-muted)" }}>
            Сгенерируйте матчи в разделе Расписание → Этапы
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => (
            <MatchRow key={m.id} match={m} base={base} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  );
}
