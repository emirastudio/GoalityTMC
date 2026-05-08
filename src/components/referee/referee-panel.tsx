"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Radio, CheckCircle2, Clock } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RefereeInfo {
  id: number;
  firstName: string;
  lastName: string;
  colorTag: string | null;
}

interface TournamentInfo {
  id: number;
  name: string;
  slug: string;
  startDate: string | null;
  endDate: string | null;
  logoUrl: string | null;
}

interface OrgInfo {
  name: string;
  slug: string;
  brandColor: string | null;
}

interface MatchInfo {
  id: number;
  scheduledTime: string | null;
  venue: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  role: string;
  classId: number | null;
}

interface RefereePanelData {
  referee: RefereeInfo;
  tournament: TournamentInfo;
  org: OrgInfo;
  matches: MatchInfo[];
}

interface AvailabilityEntry {
  date: string;
  isBlackout: boolean;
  notes?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** Generate array of date strings "YYYY-MM-DD" from startDate to endDate (inclusive) */
function buildDateRange(startDate: string | null, endDate: string | null): string[] {
  if (!startDate || !endDate) return [];
  const dates: string[] = [];
  const cur = new Date(startDate);
  const end = new Date(endDate);
  // Normalize to midnight UTC
  cur.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

// ─── Score Entry (single match) ───────────────────────────────────────────────

interface ScoreEntryProps {
  match: MatchInfo;
  token: string;
  onScoreUpdate: (matchId: number, homeScore: number, awayScore: number) => void;
  t: ReturnType<typeof useTranslations<"refereePanel">>;
}

function ScoreEntry({ match, token, onScoreUpdate, t }: ScoreEntryProps) {
  const [home, setHome] = useState(match.homeScore ?? 0);
  const [away, setAway] = useState(match.awayScore ?? 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with incoming data changes (from polling)
  useEffect(() => {
    setHome(match.homeScore ?? 0);
    setAway(match.awayScore ?? 0);
  }, [match.homeScore, match.awayScore]);

  const save = useCallback(
    async (h: number, a: number) => {
      setSaving(true);
      try {
        await fetch(`/api/referee/${token}/match/${match.id}/result`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ homeScore: h, awayScore: a }),
        });
        onScoreUpdate(match.id, h, a);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } finally {
        setSaving(false);
      }
    },
    [token, match.id, onScoreUpdate],
  );

  const scheduleSave = (h: number, a: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(h, a), 1000);
  };

  function changeScore(side: "home" | "away", delta: number) {
    if (side === "home") {
      const next = Math.max(0, home + delta);
      setHome(next);
      scheduleSave(next, away);
    } else {
      const next = Math.max(0, away + delta);
      setAway(next);
      scheduleSave(home, next);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Score row */}
      <div className="flex items-center gap-3 justify-center">
        {/* Home */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs font-semibold text-center max-w-[80px] truncate" style={{ color: "var(--cat-text-muted)" }}>
            {match.homeTeam ?? "—"}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeScore("home", -1)}
              className="w-10 h-10 rounded-xl text-lg font-bold flex items-center justify-center active:scale-95 transition-transform select-none"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)" }}
            >
              −
            </button>
            <span className="w-12 text-center text-3xl font-black tabular-nums" style={{ color: "var(--cat-text)" }}>
              {home}
            </span>
            <button
              onClick={() => changeScore("home", 1)}
              className="w-10 h-10 rounded-xl text-lg font-bold flex items-center justify-center active:scale-95 transition-transform select-none"
              style={{ background: "var(--cat-accent)", color: "#000" }}
            >
              +
            </button>
          </div>
        </div>

        <span className="text-2xl font-black" style={{ color: "var(--cat-text-muted)" }}>:</span>

        {/* Away */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs font-semibold text-center max-w-[80px] truncate" style={{ color: "var(--cat-text-muted)" }}>
            {match.awayTeam ?? "—"}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeScore("away", -1)}
              className="w-10 h-10 rounded-xl text-lg font-bold flex items-center justify-center active:scale-95 transition-transform select-none"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)" }}
            >
              −
            </button>
            <span className="w-12 text-center text-3xl font-black tabular-nums" style={{ color: "var(--cat-text)" }}>
              {away}
            </span>
            <button
              onClick={() => changeScore("away", 1)}
              className="w-10 h-10 rounded-xl text-lg font-bold flex items-center justify-center active:scale-95 transition-transform select-none"
              style={{ background: "var(--cat-accent)", color: "#000" }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Save indicator */}
      <div className="flex justify-center h-6 items-center">
        {saving && (
          <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
            {t("saveScore")}…
          </span>
        )}
        {saved && !saving && (
          <span className="flex items-center gap-1 text-xs text-emerald-500">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t("saveScore")}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Match Card ───────────────────────────────────────────────────────────────

interface MatchCardProps {
  match: MatchInfo;
  token: string;
  onScoreUpdate: (matchId: number, homeScore: number, awayScore: number) => void;
  onStatusUpdate: (matchId: number, status: string) => void;
  t: ReturnType<typeof useTranslations<"refereePanel">>;
}

function roleLabel(role: string, t: ReturnType<typeof useTranslations<"refereePanel">>) {
  const map: Record<string, string> = {
    main: t("role_main"),
    assistant1: t("role_assistant1"),
    assistant2: t("role_assistant2"),
    fourth: t("role_fourth"),
  };
  return map[role] ?? role;
}

function StatusChip({
  status,
  t,
}: {
  status: string;
  t: ReturnType<typeof useTranslations<"refereePanel">>;
}) {
  if (status === "live") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        {t("statusLive")}
      </span>
    );
  }
  if (status === "finished") {
    return (
      <span className="text-xs font-semibold" style={{ color: "var(--cat-text-muted)" }}>
        {t("statusFinished")}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs" style={{ color: "var(--cat-text-muted)" }}>
      <Clock className="w-3 h-3" />
      {t("statusScheduled")}
    </span>
  );
}

function MatchCard({ match, token, onScoreUpdate, onStatusUpdate, t }: MatchCardProps) {
  const isScheduled = match.status === "scheduled";
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const showScore = isLive || isFinished;

  const [actionLoading, setActionLoading] = useState(false);
  const [confirmingFinish, setConfirmingFinish] = useState(false);

  async function handleStartMatch() {
    setActionLoading(true);
    try {
      await fetch(`/api/referee/${token}/match/${match.id}/result`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "live" }),
      });
      onStatusUpdate(match.id, "live");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFinishMatch() {
    setConfirmingFinish(false);
    setActionLoading(true);
    try {
      await fetch(`/api/referee/${token}/match/${match.id}/result`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "finished",
          homeScore: match.homeScore ?? 0,
          awayScore: match.awayScore ?? 0,
        }),
      });
      onStatusUpdate(match.id, "finished");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        background: "var(--cat-card-bg)",
        borderColor: isLive ? "#22c55e" : "var(--cat-card-border)",
        boxShadow: isLive ? "0 0 0 1px #22c55e22" : undefined,
      }}
    >
      {/* Card header: time + role */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{
          borderColor: "var(--cat-card-border)",
          background: isLive ? "rgba(34,197,94,0.06)" : "var(--cat-tag-bg)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tabular-nums" style={{ color: "var(--cat-text)" }}>
            {formatTime(match.scheduledTime)}
          </span>
          {match.scheduledTime && (
            <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
              {formatDate(match.scheduledTime)}
            </span>
          )}
          {match.venue && (
            <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
              · {match.venue}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)", border: "1px solid var(--cat-card-border)" }}
          >
            {roleLabel(match.role, t)}
          </span>
        </div>
      </div>

      {/* Teams + score display */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          {/* Home team */}
          <p
            className="text-base font-bold flex-1 min-w-0 truncate"
            style={{ color: "var(--cat-text)" }}
          >
            {match.homeTeam ?? "—"}
          </p>

          {/* Score area */}
          <div className="shrink-0 px-2 text-center">
            {showScore ? (
              <span className="text-2xl font-black tabular-nums" style={{ color: "var(--cat-text)" }}>
                {match.homeScore ?? 0} : {match.awayScore ?? 0}
              </span>
            ) : (
              <span className="text-2xl font-black" style={{ color: "var(--cat-text-muted)" }}>
                – : –
              </span>
            )}
          </div>

          {/* Away team */}
          <p
            className="text-base font-bold flex-1 min-w-0 truncate text-right"
            style={{ color: "var(--cat-text)" }}
          >
            {match.awayTeam ?? "—"}
          </p>
        </div>

        {/* Status */}
        <div className="mt-2 flex justify-center">
          <StatusChip status={match.status} t={t} />
        </div>

        {/* Score entry for live matches */}
        {isLive && (
          <ScoreEntry
            match={match}
            token={token}
            onScoreUpdate={onScoreUpdate}
            t={t}
          />
        )}

        {/* Action buttons */}
        {isScheduled && (
          <div className="mt-4">
            <button
              onClick={handleStartMatch}
              disabled={actionLoading}
              className="w-full py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform disabled:opacity-60"
              style={{ background: "#22c55e", color: "#fff" }}
            >
              {actionLoading ? "…" : t("startMatch")}
            </button>
          </div>
        )}

        {isLive && !confirmingFinish && (
          <div className="mt-3">
            <button
              onClick={() => setConfirmingFinish(true)}
              disabled={actionLoading}
              className="w-full py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform disabled:opacity-60"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)", border: "1px solid var(--cat-card-border)" }}
            >
              {t("finishMatch")}
            </button>
          </div>
        )}

        {isLive && confirmingFinish && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-center font-semibold" style={{ color: "var(--cat-text-muted)" }}>
              {t("confirmFinish")}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingFinish(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)", border: "1px solid var(--cat-card-border)" }}
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleFinishMatch}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform disabled:opacity-60"
                style={{ background: "#ef4444", color: "#fff" }}
              >
                {actionLoading ? "…" : t("confirm")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Availability Section ─────────────────────────────────────────────────────

interface AvailabilitySectionProps {
  token: string;
  tournament: TournamentInfo;
  t: ReturnType<typeof useTranslations<"refereePanel">>;
}

function AvailabilitySection({ token, tournament, t }: AvailabilitySectionProps) {
  const [entries, setEntries] = useState<Map<string, AvailabilityEntry>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const dates = buildDateRange(tournament.startDate, tournament.endDate);

  // Load current availability on mount
  useEffect(() => {
    if (dates.length === 0) return;
    fetch(`/api/referee/${token}/availability`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.availability) {
          const map = new Map<string, AvailabilityEntry>();
          for (const row of data.availability) {
            map.set(row.date, { date: row.date, isBlackout: row.isBlackout, notes: row.notes });
          }
          setEntries(map);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function toggleDate(date: string) {
    const current = entries.get(date);
    const newEntry: AvailabilityEntry = current
      ? { ...current, isBlackout: !current.isBlackout }
      : { date, isBlackout: true };

    const next = new Map(entries);
    next.set(date, newEntry);
    setEntries(next);

    setSaving(true);
    try {
      await fetch(`/api/referee/${token}/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: Array.from(next.values()) }),
      });
    } finally {
      setSaving(false);
    }
  }

  if (dates.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--cat-text-muted)" }}>
          {t("availability")}
        </h2>
        {saving && (
          <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
            {t("saveScore")}…
          </span>
        )}
      </div>

      {!loaded ? (
        <div className="h-10 rounded-xl animate-pulse" style={{ background: "var(--cat-tag-bg)" }} />
      ) : (
        <div className="space-y-2">
          {dates.map((date) => {
            const entry = entries.get(date);
            const isBlackout = entry?.isBlackout ?? false;
            return (
              <div
                key={date}
                className="flex items-center justify-between px-4 py-3 rounded-xl border"
                style={{
                  background: "var(--cat-card-bg)",
                  borderColor: "var(--cat-card-border)",
                }}
              >
                <span className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>
                  {formatDateLabel(date)}
                </span>
                <button
                  onClick={() => toggleDate(date)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition-transform"
                  style={
                    isBlackout
                      ? { background: "#fee2e2", color: "#b91c1c" }
                      : { background: "#d1fae5", color: "#065f46" }
                  }
                >
                  {isBlackout ? `❌ ${t("unavailable")}` : `✅ ${t("available")}`}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface RefereePanelClientProps {
  data: RefereePanelData;
  token: string;
}

export function RefereePanelClient({ data: initialData, token }: RefereePanelClientProps) {
  const t = useTranslations("refereePanel");
  const [data, setData] = useState<RefereePanelData>(initialData);

  const hasLive = data.matches.some((m) => m.status === "live");

  // Optimistic score update without waiting for poll
  const handleScoreUpdate = useCallback((matchId: number, homeScore: number, awayScore: number) => {
    setData((prev) => ({
      ...prev,
      matches: prev.matches.map((m) =>
        m.id === matchId ? { ...m, homeScore, awayScore } : m,
      ),
    }));
  }, []);

  // Optimistic status update
  const handleStatusUpdate = useCallback((matchId: number, status: string) => {
    setData((prev) => ({
      ...prev,
      matches: prev.matches.map((m) =>
        m.id === matchId ? { ...m, status } : m,
      ),
    }));
  }, []);

  // Poll every 30 seconds to stay in sync
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/referee/${token}`, { cache: "no-store" });
        if (res.ok) {
          const fresh = await res.json();
          setData(fresh);
        }
      } catch {
        // silently ignore poll errors
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [token]);

  const accentColor = data.org.brandColor ?? "#272D2D";

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--cat-bg)", color: "var(--cat-text)" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 border-b"
        style={{
          background: "var(--cat-card-bg)",
          borderColor: "var(--cat-card-border)",
        }}
      >
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          {/* Tournament logo */}
          {data.tournament.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.tournament.logoUrl}
              alt={data.tournament.name}
              className="w-10 h-10 rounded-xl object-contain shrink-0"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-lg font-black"
              style={{ background: accentColor + "22", color: accentColor }}
            >
              {data.tournament.name.charAt(0)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "var(--cat-text)" }}>
              {data.tournament.name}
            </p>
            <div className="flex items-center gap-2">
              {/* Referee name + color dot */}
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 inline-block"
                style={{
                  background: data.referee.colorTag ?? accentColor,
                  border: "1.5px solid rgba(0,0,0,0.12)",
                }}
              />
              <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                {data.referee.firstName} {data.referee.lastName}
              </span>
            </div>
          </div>

          {/* Live badge */}
          {hasLive && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white bg-red-500 shrink-0">
              <Radio className="w-3 h-3" />
              Live
            </span>
          )}
        </div>
      </div>

      {/* Match list */}
      <div className="max-w-md mx-auto px-4 py-4 space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "var(--cat-text-muted)" }}>
          {t("myMatches")}
        </h2>

        {data.matches.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
              {t("noMatches")}
            </p>
          </div>
        ) : (
          data.matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              token={token}
              onScoreUpdate={handleScoreUpdate}
              onStatusUpdate={handleStatusUpdate}
              t={t}
            />
          ))
        )}

        {/* Availability section */}
        <AvailabilitySection
          token={token}
          tournament={data.tournament}
          t={t}
        />
      </div>
    </div>
  );
}
