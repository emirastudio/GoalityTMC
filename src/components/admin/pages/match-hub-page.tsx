"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTournament } from "@/lib/tournament-context";
import { useRouter } from "@/i18n/navigation";
import {
  Radio, Zap, Clock, CheckCircle, Filter,
  RefreshCw, Plus, SquareActivity, Swords, X,
  Play, StopCircle, Eye, Pencil, RotateCcw,
  Link2, Printer, Save, Ban, ChevronDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type MatchStatus = "scheduled" | "live" | "finished" | "cancelled" | "postponed" | "walkover";
type EventType =
  | "goal" | "own_goal" | "yellow" | "red" | "yellow_red"
  | "penalty_scored" | "penalty_missed"
  | "substitution_in" | "substitution_out" | "injury";

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
    id: number; name: string; nameRu?: string | null; classId?: number | null;
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

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

function teamAbbr(team?: Team | null) {
  if (!team) return "TBD";
  return team.name.slice(0, 3).toUpperCase();
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
    injury:           { icon: "🩹", color: "#f59e0b" },
  };
  return map[type] ?? { icon: "·", color: "#6b7280" };
}

function eventLabel(type: EventType) {
  const map: Record<EventType, string> = {
    goal: "Гол", own_goal: "Автогол", yellow: "Жёлтая", red: "Красная",
    yellow_red: "Вторая жёлтая", penalty_scored: "Пенальти (гол)",
    penalty_missed: "Пенальти (мимо)", substitution_in: "Замена (вышел)",
    substitution_out: "Замена (ушёл)", injury: "Травма",
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
  match, now, base, onRefresh, onOpenProtocol,
}: {
  match: Match;
  now: number;
  base: string;
  onRefresh: () => void;
  onOpenProtocol: (match: Match) => void;
}) {
  const [scoreLoading, setScoreLoading] = useState(false);

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

  // Draw resolution state
  // phase: null=normal, "extra_time"=ET input, "penalties"=PEN input
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

  async function finishMatch() {
    if (isKnockout && isDraw) {
      // No draw allowed in playoffs — open resolver
      const startPhase = drawResolution === "extra_time" || drawResolution === "extra_time_then_penalties"
        ? "extra_time"
        : "penalties";
      setDrawPhase(startPhase);
      return;
    }
    if (!confirm("Завершить матч?")) return;
    await fetch(`${base}/matches/${match.id}/result`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "finished" }),
    });
    onRefresh();
  }

  async function applyExtraTime() {
    const eh = parseInt(etHome);
    const ea = parseInt(etAway);
    if (isNaN(eh) || isNaN(ea)) {
      alert("Введите счёт дополнительного времени");
      return;
    }
    setDrawLoading(true);
    if (eh !== ea) {
      // Winner found in ET
      await fetch(`${base}/matches/${match.id}/result`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "finished",
          homeExtraScore: eh,
          awayExtraScore: ea,
          resultType: "extra_time",
        }),
      });
      setDrawLoading(false);
      setDrawPhase(null);
      onRefresh();
    } else {
      // Still tied — save ET scores and move to penalties
      await fetch(`${base}/matches/${match.id}/result`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeExtraScore: eh, awayExtraScore: ea }),
      });
      setDrawLoading(false);
      setDrawPhase("penalties");
    }
  }

  async function finishWithPenalties() {
    const ph = parseInt(penHome);
    const pa = parseInt(penAway);
    if (isNaN(ph) || isNaN(pa) || ph === pa) {
      alert("Введите корректный счёт пенальти (должен быть победитель)");
      return;
    }
    setDrawLoading(true);
    await fetch(`${base}/matches/${match.id}/result`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "finished",
        homePenalties: ph,
        awayPenalties: pa,
        resultType: "penalties",
      }),
    });
    setDrawLoading(false);
    setDrawPhase(null);
    onRefresh();
  }

  const divName = match.stage?.nameRu || match.stage?.name || "—";

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        background: "var(--cat-card-bg)",
        borderColor: "#ef4444",
        boxShadow: "0 0 20px rgba(239,68,68,0.15)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2"
        style={{ background: "rgba(239,68,68,0.08)", borderBottom: "1px solid rgba(239,68,68,0.2)" }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#ef4444" }}>LIVE</span>
          <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
            {match.field ? `· ${match.field.name}` : ""}
            {match.group ? ` · Гр. ${match.group.name}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
            {divName}
          </span>
          {match.startedAt && <LiveTimer startedAt={match.startedAt} now={now} />}
        </div>
      </div>

      {/* Score */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Home */}
          <div className="flex-1 text-right">
            <p className="font-bold text-base leading-tight" style={{ color: "var(--cat-text)" }}>
              {match.homeTeam?.name ?? "TBD"}
            </p>
            {match.homeTeam?.club?.name && (
              <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{match.homeTeam.club.name}</p>
            )}
          </div>

          {/* Score display + controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => patchScore(Math.max(0, home - 1), away)}
              disabled={home <= 0 || scoreLoading}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-lg font-bold hover:opacity-70 disabled:opacity-20 transition-opacity"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)" }}
            >−</button>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(239,68,68,0.08)", minWidth: 72, justifyContent: "center" }}>
              <span className="text-3xl font-black tabular-nums" style={{ color: "var(--cat-text)" }}>{home}</span>
              <span className="text-xl font-light" style={{ color: "var(--cat-text-muted)" }}>:</span>
              <span className="text-3xl font-black tabular-nums" style={{ color: "var(--cat-text)" }}>{away}</span>
            </div>

            <button
              onClick={() => patchScore(home, Math.max(0, away - 1))}
              disabled={away <= 0 || scoreLoading}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-lg font-bold hover:opacity-70 disabled:opacity-20 transition-opacity"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)" }}
            >−</button>
          </div>

          {/* Away */}
          <div className="flex-1">
            <p className="font-bold text-base leading-tight" style={{ color: "var(--cat-text)" }}>
              {match.awayTeam?.name ?? "TBD"}
            </p>
            {match.awayTeam?.club?.name && (
              <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{match.awayTeam.club.name}</p>
            )}
          </div>
        </div>

        {/* Score +1 buttons */}
        <div className="flex items-center justify-between mt-2 gap-3">
          <div className="flex-1 flex justify-end">
            <button
              onClick={() => patchScore(home + 1, away)}
              disabled={scoreLoading}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
              style={{ background: "#10b981", color: "#fff" }}
            >
              <Plus className="w-3 h-3" /> Гол
            </button>
          </div>
          <div className="w-[72px] shrink-0" />
          <div className="flex-1 flex justify-start">
            <button
              onClick={() => patchScore(home, away + 1)}
              disabled={scoreLoading}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
              style={{ background: "#10b981", color: "#fff" }}
            >
              <Plus className="w-3 h-3" /> Гол
            </button>
          </div>
        </div>
      </div>

      {/* Recent events */}
      {match.events && match.events.length > 0 && (
        <div className="px-4 pb-2 space-y-1 max-h-24 overflow-hidden">
          {[...match.events].reverse().slice(0, 3).map(ev => {
            const ei = eventIcon(ev.eventType);
            return (
              <div key={ev.id} className="flex items-center gap-2 text-xs" style={{ color: "var(--cat-text-secondary)" }}>
                <span className="w-8 text-right font-mono font-semibold" style={{ color: "var(--cat-text-muted)" }}>{ev.minute}'</span>
                <span>{ei.icon}</span>
                <span>{ev.person ? `${ev.person.firstName} ${ev.person.lastName}` : ev.team?.name ?? "—"}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Draw resolver: Extra Time */}
      {drawPhase === "extra_time" && (
        <div className="mx-4 mb-3 rounded-xl p-3 border"
          style={{ background: "rgba(59,130,246,0.06)", borderColor: "rgba(59,130,246,0.3)" }}>
          <p className="text-xs font-bold mb-1" style={{ color: "#3b82f6" }}>
            Ничья — Дополнительное время
          </p>
          <p className="text-[10px] mb-2" style={{ color: "var(--cat-text-muted)" }}>
            Введите счёт доп. времени. Если ничья — перейдём к пенальти.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-right">
              <p className="text-[10px] mb-1 truncate" style={{ color: "var(--cat-text-muted)" }}>
                {match.homeTeam?.name ?? "Хозяева"}
              </p>
              <input type="number" min={0} value={etHome} onChange={e => setEtHome(e.target.value)}
                placeholder="0"
                className="w-full text-center rounded-lg px-2 py-1.5 text-sm font-black outline-none"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)", border: "1px solid var(--cat-card-border)" }} />
            </div>
            <span className="text-base font-light shrink-0" style={{ color: "var(--cat-text-muted)" }}>:</span>
            <div className="flex-1">
              <p className="text-[10px] mb-1 truncate" style={{ color: "var(--cat-text-muted)" }}>
                {match.awayTeam?.name ?? "Гости"}
              </p>
              <input type="number" min={0} value={etAway} onChange={e => setEtAway(e.target.value)}
                placeholder="0"
                className="w-full text-center rounded-lg px-2 py-1.5 text-sm font-black outline-none"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)", border: "1px solid var(--cat-card-border)" }} />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={applyExtraTime} disabled={drawLoading}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 disabled:opacity-40 transition-opacity"
              style={{ background: "#3b82f6", color: "#fff" }}>
              {drawLoading ? "..." : "→ Применить доп. время"}
            </button>
            <button onClick={() => setDrawPhase(null)}
              className="px-3 py-1.5 rounded-lg text-xs hover:opacity-70"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Draw resolver: Penalties */}
      {drawPhase === "penalties" && (
        <div className="mx-4 mb-3 rounded-xl p-3 border"
          style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.3)" }}>
          <p className="text-xs font-bold mb-1" style={{ color: "#f59e0b" }}>
            {drawResolution === "extra_time_then_penalties" ? "Ничья в доп. времени — Пенальти" : "Ничья в плей-офф — Пенальти"}
          </p>
          <p className="text-[10px] mb-2" style={{ color: "var(--cat-text-muted)" }}>
            Введите счёт серии пенальти. Должен быть победитель.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-right">
              <p className="text-[10px] mb-1 truncate" style={{ color: "var(--cat-text-muted)" }}>
                {match.homeTeam?.name ?? "Хозяева"}
              </p>
              <input type="number" min={0} value={penHome} onChange={e => setPenHome(e.target.value)}
                placeholder="0"
                className="w-full text-center rounded-lg px-2 py-1.5 text-sm font-black outline-none"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)", border: "1px solid var(--cat-card-border)" }} />
            </div>
            <span className="text-base font-light shrink-0" style={{ color: "var(--cat-text-muted)" }}>:</span>
            <div className="flex-1">
              <p className="text-[10px] mb-1 truncate" style={{ color: "var(--cat-text-muted)" }}>
                {match.awayTeam?.name ?? "Гости"}
              </p>
              <input type="number" min={0} value={penAway} onChange={e => setPenAway(e.target.value)}
                placeholder="0"
                className="w-full text-center rounded-lg px-2 py-1.5 text-sm font-black outline-none"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)", border: "1px solid var(--cat-card-border)" }} />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={finishWithPenalties} disabled={drawLoading}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 disabled:opacity-40 transition-opacity"
              style={{ background: "#f59e0b", color: "#fff" }}>
              {drawLoading ? "..." : "✓ Завершить по пенальти"}
            </button>
            {drawResolution === "extra_time_then_penalties" && (
              <button onClick={() => setDrawPhase("extra_time")}
                className="px-3 py-1.5 rounded-lg text-xs hover:opacity-70"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                ← Назад
              </button>
            )}
            <button onClick={() => setDrawPhase(null)}
              className="px-3 py-1.5 rounded-lg text-xs hover:opacity-70"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t"
        style={{ borderColor: "rgba(239,68,68,0.15)" }}>
        <button
          onClick={() => onOpenProtocol(match)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)" }}
        >
          <Eye className="w-3.5 h-3.5" /> Протокол
        </button>
        <button
          onClick={finishMatch}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity ml-auto"
          style={{ background: "var(--badge-error-bg, rgba(239,68,68,0.1))", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
        >
          <StopCircle className="w-3.5 h-3.5" /> Завершить
        </button>
      </div>
    </div>
  );
}

// ─── Upcoming / Finished compact card ─────────────────────────────────────────

// ─── Club Badge ───────────────────────────────────────────────────────────────

function ClubBadge({ team, size = 32 }: { team?: { name: string; club?: { name?: string; badgeUrl?: string | null } | null } | null; size?: number }) {
  const url = team?.club?.badgeUrl;
  const letter = (team?.club?.name ?? team?.name ?? "?").charAt(0).toUpperCase();
  if (url) return (
    <img src={url} alt={team?.club?.name ?? ""} width={size} height={size}
      className="rounded-lg object-contain shrink-0"
      style={{ width: size, height: size, background: "var(--cat-tag-bg)" }} />
  );
  return (
    <div className="rounded-lg flex items-center justify-center shrink-0 font-black text-xs"
      style={{ width: size, height: size, background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
      {letter}
    </div>
  );
}

// ─── Finished Match Card (rich) ───────────────────────────────────────────────

function FinishedMatchCard({
  match, base, onRefresh, onOpenProtocol, orgSlug,
}: {
  match: Match; base: string; onRefresh: () => void;
  onOpenProtocol: (match: Match) => void; orgSlug: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editHome, setEditHome] = useState(String(match.homeScore ?? 0));
  const [editAway, setEditAway] = useState(String(match.awayScore ?? 0));
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const divName = match.stage?.nameRu || match.stage?.name || "";
  const protocolFilled = (match.events?.length ?? 0) > 0;

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
    if (!confirm("Открыть матч снова (перевести в Live)?")) return;
    await fetch(`${base}/matches/${match.id}/result`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "live", finishedAt: null }),
    });
    onRefresh();
  }

  async function cancelMatch() {
    if (!confirm("Отменить матч?")) return;
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
              {/* W / D / L dot */}
              <span className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: homeResultColor, boxShadow: `0 0 4px ${homeResultColor}` }} />
              <p className="text-sm font-bold truncate leading-tight" style={{ color: "var(--cat-text)" }}>
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

        {/* Center: score */}
        <div className="flex flex-col items-center shrink-0 gap-1">
          {editing ? (
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
            {divName && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>{divName}</span>
            )}
            {match.group && (
              <span className="text-[9px]" style={{ color: "var(--cat-text-muted)" }}>Гр. {match.group.name}</span>
            )}
            {match.round && (
              <span className="text-[9px]" style={{ color: "var(--cat-text-muted)" }}>{match.round.name}</span>
            )}
            {match.field && (
              <span className="text-[9px]" style={{ color: "var(--cat-text-muted)" }}>{match.field.name}</span>
            )}
            {match.scheduledAt && (
              <span className="text-[9px] font-mono" style={{ color: "var(--cat-text-muted)" }}>
                {new Date(match.scheduledAt).toLocaleDateString("ru", { day: "2-digit", month: "2-digit" })} {fmtTime(match.scheduledAt)}
              </span>
            )}
          </div>
        </div>

        {/* Right: away team */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <ClubBadge team={match.awayTeam} size={36} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold truncate leading-tight" style={{ color: "var(--cat-text)" }}>
                {match.awayTeam?.name ?? "TBD"}
              </p>
              {/* W / D / L dot */}
              <span className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: awayResultColor, boxShadow: `0 0 4px ${awayResultColor}` }} />
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
          {/* Protocol status */}
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mr-1 hidden sm:inline"
            style={protocolFilled
              ? { background: "rgba(16,185,129,0.1)", color: "#10b981" }
              : { background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
            {protocolFilled ? `✓ ${match.events!.length} событий` : "без событий"}
          </span>

          {editing ? (
            <>
              <button onClick={saveScore} disabled={saving}
                className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }} title="Сохранить">
                <Save className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setEditing(false)}
                className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }} title="Отмена">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onOpenProtocol(match)}
                className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }} title="Протокол">
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setEditing(true); setEditHome(String(match.homeScore ?? 0)); setEditAway(String(match.awayScore ?? 0)); }}
                className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }} title="Редактировать счёт">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={copyLink}
                className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                style={{ background: copied ? "rgba(16,185,129,0.15)" : "var(--cat-tag-bg)", color: copied ? "#10b981" : "var(--cat-text-muted)" }}
                title="Скопировать ссылку на публичный протокол">
                <Link2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={reopenMatch}
                className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                style={{ background: "var(--cat-tag-bg)", color: "#f59e0b" }} title="Открыть снова">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button onClick={cancelMatch}
                className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                style={{ background: "var(--cat-tag-bg)", color: "#ef4444" }} title="Отменить матч">
                <Ban className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Upcoming Match Card ───────────────────────────────────────────────────────

function UpcomingMatchCard({
  match, base, onRefresh, onOpenProtocol,
}: {
  match: Match; base: string; onRefresh: () => void; onOpenProtocol: (match: Match) => void;
}) {
  const divName = match.stage?.nameRu || match.stage?.name || "";

  async function startMatch() {
    await fetch(`${base}/matches/${match.id}/result`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "live", startedAt: new Date().toISOString(), homeScore: 0, awayScore: 0 }),
    });
    onRefresh();
  }

  return (
    <div className="rounded-xl border px-4 py-3 flex items-center gap-3 hover:border-[var(--cat-accent)] transition-colors"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      <div className="text-xs font-mono shrink-0 w-12 text-right" style={{ color: "var(--cat-text-muted)" }}>
        {match.scheduledAt ? fmtTime(match.scheduledAt) : "—"}
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <ClubBadge team={match.homeTeam} size={24} />
        <span className="text-sm font-semibold truncate" style={{ color: "var(--cat-text)" }}>
          {match.homeTeam?.name ?? "TBD"}
        </span>
        <span className="text-xs shrink-0 px-1.5 py-0.5 rounded font-mono"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>vs</span>
        <span className="text-sm font-semibold truncate" style={{ color: "var(--cat-text)" }}>
          {match.awayTeam?.name ?? "TBD"}
        </span>
        <ClubBadge team={match.awayTeam} size={24} />
      </div>
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        {divName && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>{divName}</span>}
        {match.field && <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>{match.field.name}</span>}
        {match.group && <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>Гр. {match.group.name}</span>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => onOpenProtocol(match)}
          className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button onClick={startMatch}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
          style={{ background: "#10b981", color: "#fff" }}>
          <Play className="w-3 h-3" /> Старт
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
    { type: "goal",           label: "Гол",        emoji: "⚽", color: "#10b981" },
    { type: "own_goal",       label: "Автогол",    emoji: "⚽", color: "#f59e0b" },
    { type: "yellow",         label: "Жёлтая",     emoji: "🟨", color: "#f59e0b" },
    { type: "red",            label: "Красная",     emoji: "🟥", color: "#ef4444" },
    { type: "yellow_red",     label: "2-я жёлтая", emoji: "🟧", color: "#f97316" },
    { type: "substitution_in", label: "Замена",    emoji: "🔄", color: "#3b82f6" },
    { type: "injury",         label: "Травма",     emoji: "🩹", color: "#8b5cf6" },
    { type: "penalty_scored", label: "Пенальти ✓", emoji: "⚽", color: "#3b82f6" },
    { type: "penalty_missed", label: "Пенальти ✗", emoji: "✗",  color: "#6b7280" },
  ];

  const divName = match.stage?.nameRu || match.stage?.name || "—";

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
              Протокол матча #{match.matchNumber ?? match.id}
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
            Добавить событие
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
                {side === "home" ? (match.homeTeam?.name ?? "Хозяева") : (match.awayTeam?.name ?? "Гости")}
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
                placeholder="Минута"
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
                {saving ? "..." : "✓ Сохранить"}
              </button>
              <button onClick={() => { setAddingType(null); setMinute(""); }}
                className="text-xs px-2 py-1.5 rounded-lg hover:opacity-70"
                style={{ color: "var(--cat-text-muted)", background: "var(--cat-tag-bg)" }}>
                Отмена
              </button>
            </div>
          )}
        </div>

        {/* Events list */}
        <div className="flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: "var(--cat-text-muted)" }}>
              <SquareActivity className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Событий нет</p>
              <p className="text-xs mt-1 opacity-60">Добавьте первое событие выше</p>
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
                        {ev.person ? `${ev.person.firstName} ${ev.person.lastName}` : eventLabel(ev.eventType)}
                      </p>
                      <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                        {eventLabel(ev.eventType)} · {isHome ? match.homeTeam?.name : match.awayTeam?.name}
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

// ─── Stage Advance Panel ──────────────────────────────────────────────────────

function StageAdvancePanel({
  matches, base, onAdvanced,
}: {
  matches: Match[];
  base: string;
  onAdvanced: () => void;
}) {
  const [advancing, setAdvancing] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, { ok: boolean; message?: string }>>({});

  // Группируем матчи по этапам (только с командами)
  const stageMap = new Map<number, { stage: Match["stage"]; all: Match[]; finished: Match[] }>();
  for (const m of matches) {
    if (!m.stage) continue;
    // Учитываем только матчи, у которых есть хотя бы одна команда (не пустые слоты)
    if (!m.homeTeamId && !m.awayTeamId) continue;
    const id = m.stage.id;
    if (!stageMap.has(id)) stageMap.set(id, { stage: m.stage, all: [], finished: [] });
    const entry = stageMap.get(id)!;
    entry.all.push(m);
    if (m.status === "finished" || m.status === "walkover" || m.status === "cancelled") {
      entry.finished.push(m);
    }
  }

  // Этапы, где ВСЕ матчи (с командами) завершены — готовы к advance
  const ready = Array.from(stageMap.values()).filter(
    s => s.all.length > 0 && s.all.length === s.finished.length
  );

  if (ready.length === 0) return null;

  async function advance(stageId: number) {
    if (!confirm("Перевести команды в следующий этап? Это действие нельзя отменить.")) return;
    setAdvancing(stageId);
    try {
      const r = await fetch(`${base}/stages/${stageId}/advance`, { method: "POST" });
      const json = await r.json().catch(() => ({}));
      setResults(prev => ({ ...prev, [stageId]: { ok: r.ok, message: json.error ?? json.message } }));
      if (r.ok) setTimeout(onAdvanced, 800);
    } catch (e) {
      setResults(prev => ({ ...prev, [stageId]: { ok: false, message: "Сетевая ошибка" } }));
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
          Готово к следующему этапу
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full font-bold"
          style={{ background: "rgba(251,191,36,0.15)", color: "#f59e0b" }}>
          {ready.length}
        </span>
      </div>
      {ready.map(({ stage, all, finished }) => {
        const res = results[stage!.id];
        return (
          <div key={stage!.id}
            className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
            style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
                {stage?.nameRu || stage?.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                ✅ {finished.length}/{all.length} матчей завершено
              </p>
              {res && !res.ok && (
                <p className="text-xs mt-1 font-semibold" style={{ color: "#ef4444" }}>
                  ✗ {res.message ?? "Ошибка"}
                </p>
              )}
            </div>
            <button
              onClick={() => advance(stage!.id)}
              disabled={advancing === stage!.id || res?.ok === true}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black shrink-0 transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
              style={res?.ok
                ? { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid #10b981" }
                : { background: "#f59e0b", color: "#000" }}>
              {advancing === stage!.id ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Переход...</>
              ) : res?.ok ? (
                <><CheckCircle className="w-3.5 h-3.5" /> Выполнено</>
              ) : (
                <><Zap className="w-3.5 h-3.5" /> Следующий этап →</>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Event Feed ───────────────────────────────────────────────────────────────

function EventFeed({ matches }: { matches: Match[] }) {
  const allEvents = matches
    .flatMap(m => (m.events ?? []).map(e => ({ ...e, match: m })))
    .sort((a, b) => new Date(b.match.startedAt ?? 0).getTime() - new Date(a.match.startedAt ?? 0).getTime()
      || b.minute - a.minute)
    .slice(0, 40);

  if (allEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12" style={{ color: "var(--cat-text-muted)" }}>
        <Radio className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-xs">Событий пока нет</p>
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
                  {eventLabel(ev.eventType)}
                  {ev.person ? ` · ${ev.person.firstName} ${ev.person.lastName}` : ""}
                  {` · ${isHome ? ev.match.homeTeam?.name : ev.match.awayTeam?.name}`}
                </span>
              </div>
              <div className="text-[9px] mt-0.5" style={{ color: "var(--cat-text-muted)", opacity: 0.6 }}>
                {ev.match.stage?.nameRu || ev.match.stage?.name}
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
  const orgSlug = ctx?.orgSlug ?? "";
  const tournamentId = ctx?.tournamentId ?? 0;
  const base = `/api/org/${orgSlug}/tournament/${tournamentId}`;
  const router = useRouter();

  const now = useNow(1000);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterDiv, setFilterDiv] = useState<string>("all");
  const [filterField, setFilterField] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

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

  // Auto-refresh every 10s
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(loadMatches, 5000);
    return () => clearInterval(t);
  }, [autoRefresh, loadMatches]);

  // Derived filters
  const divisions = Array.from(new Set(
    matches.map(m => m.stage?.nameRu || m.stage?.name).filter(Boolean)
  )) as string[];
  const fields = Array.from(new Set(
    matches.map(m => m.field?.name).filter(Boolean)
  )) as string[];

  const filtered = matches.filter(m => {
    const divName = m.stage?.nameRu || m.stage?.name;
    if (filterDiv !== "all" && divName !== filterDiv) return false;
    if (filterField !== "all" && m.field?.name !== filterField) return false;
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    return true;
  });

  const live = filtered.filter(m => m.status === "live");
  const upcoming = filtered.filter(m => m.status === "scheduled" || m.status === "postponed");
  const finished = filtered.filter(m => m.status === "finished" || m.status === "walkover");

  // Stats
  const totalGoals = matches.flatMap(m => m.events ?? []).filter(e => e.eventType === "goal" || e.eventType === "own_goal" || e.eventType === "penalty_scored").length;
  const totalYellow = matches.flatMap(m => m.events ?? []).filter(e => e.eventType === "yellow" || e.eventType === "yellow_red").length;
  const totalRed = matches.flatMap(m => m.events ?? []).filter(e => e.eventType === "red").length;

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: "var(--cat-text-muted)" }}>
      <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Загрузка...
    </div>
  );

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-5 h-5" style={{ color: "#ef4444" }} />
            <h1 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>Пульт управления</h1>
            {live.length > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold animate-pulse"
                style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                {live.length} LIVE
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
            Все матчи турнира в реальном времени
            {lastUpdated && <span className="ml-2 opacity-50">· обновлено {lastUpdated.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>}
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
            {autoRefresh ? "Авто" : "Пауза"}
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
        <StatPill icon={<Clock className="w-4 h-4" />}   value={upcoming.length}   label="Скоро"      color="#f59e0b" />
        <StatPill icon={<CheckCircle className="w-4 h-4" />} value={`${finished.length}/${matches.length}`} label="Завершено" color="#10b981" />
        <StatPill icon={<span>⚽</span>}                 value={totalGoals}        label="Голов"      color="#10b981" />
        <StatPill icon={<span>🟨</span>}                 value={totalYellow}       label="Жёлтых"     color="#f59e0b" />
        <StatPill icon={<span>🟥</span>}                 value={totalRed}          label="Красных"    color="#ef4444" />
      </div>

      {/* Advance Panel — показывается когда этап завершён */}
      <StageAdvancePanel matches={matches} base={base} onAdvanced={loadMatches} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-3.5 h-3.5" style={{ color: "var(--cat-text-muted)" }} />

        <select value={filterDiv} onChange={e => setFilterDiv(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-xs outline-none"
          style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}>
          <option value="all">Все дивизионы</option>
          {divisions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select value={filterField} onChange={e => setFilterField(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-xs outline-none"
          style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}>
          <option value="all">Все поля</option>
          {fields.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-xs outline-none"
          style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}>
          <option value="all">Все статусы</option>
          <option value="live">🔴 Live</option>
          <option value="scheduled">⏳ Скоро</option>
          <option value="finished">✅ Завершено</option>
        </select>

        {(filterDiv !== "all" || filterField !== "all" || filterStatus !== "all") && (
          <button onClick={() => { setFilterDiv("all"); setFilterField("all"); setFilterStatus("all"); }}
            className="text-xs px-2 py-1.5 rounded-lg hover:opacity-70 transition-opacity flex items-center gap-1"
            style={{ color: "var(--cat-text-muted)", background: "var(--cat-tag-bg)" }}>
            <X className="w-3 h-3" /> Сброс
          </button>
        )}
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
                  Идут сейчас ({live.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {live.map(m => (
                  <LiveMatchCard
                    key={m.id}
                    match={m}
                    now={now}
                    base={base}
                    onRefresh={loadMatches}
                    onOpenProtocol={navigateToProtocol}
                  />
                ))}
              </div>
            </div>
          )}

          {/* UPCOMING */}
          {upcoming.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />
                <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "#f59e0b" }}>
                  Предстоящие ({upcoming.length})
                </h2>
              </div>
              <div className="space-y-1.5">
                {upcoming.map(m => (
                  <UpcomingMatchCard
                    key={m.id}
                    match={m}
                    base={base}
                    onRefresh={loadMatches}
                    onOpenProtocol={navigateToProtocol}
                  />
                ))}
              </div>
            </div>
          )}

          {/* FINISHED */}
          {finished.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
                <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "#10b981" }}>
                  Завершены ({finished.length})
                </h2>
              </div>
              <div className="space-y-2">
                {finished.map(m => (
                  <FinishedMatchCard
                    key={m.id}
                    match={m}
                    base={base}
                    onRefresh={loadMatches}
                    onOpenProtocol={navigateToProtocol}
                    orgSlug={orgSlug}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty */}
          {filtered.length === 0 && (
            <div className="rounded-2xl border py-16 flex flex-col items-center"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              <Swords className="w-12 h-12 mb-3 opacity-20" style={{ color: "var(--cat-text)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--cat-text-muted)" }}>Матчей нет</p>
              <p className="text-xs mt-1 opacity-60" style={{ color: "var(--cat-text-muted)" }}>
                Сгенерируйте матчи в разделе Расписание → Этапы
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
                  <h3 className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>Лента событий</h3>
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
