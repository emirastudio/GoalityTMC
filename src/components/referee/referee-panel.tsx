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

function MatchCard({ match, token, onScoreUpdate, t }: MatchCardProps) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const showScore = isLive || isFinished;

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
      </div>
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
              t={t}
            />
          ))
        )}
      </div>
    </div>
  );
}
