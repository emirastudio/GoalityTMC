"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useTournament } from "@/lib/tournament-context";
import {
  RefreshCw, Loader2, CheckCircle2, Clock, ChevronDown,
  ChevronUp, ExternalLink, Calendar, Trophy, FileText,
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
  personId?: number | null;
  person?: { id: number; firstName: string; lastName: string } | null;
  assistPerson?: { id: number; firstName: string; lastName: string } | null;
  team?: { id: number; name: string } | null;
}

interface Match {
  id: number;
  matchNumber?: number | null;
  status: MatchStatus;
  scheduledAt?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  homeTeam?: { id: number; name: string } | null;
  awayTeam?: { id: number; name: string } | null;
  field?: { name: string } | null;
  group?: { name: string } | null;
  round?: { name: string } | null;
  stage?: { name: string; nameRu?: string | null; type?: string } | null;
  events?: MatchEvent[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === "ru" ? "ru-RU" : locale === "et" ? "et-EE" : "en-GB", {
    weekday: "short", day: "numeric", month: "long",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

function localDateKey(iso: string) {
  return iso.slice(0, 10); // YYYY-MM-DD
}

function groupMatchesByDate(matches: Match[]): { date: string; matches: Match[] }[] {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    const key = m.scheduledAt ? localDateKey(m.scheduledAt) : "unscheduled";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, matches]) => ({ date, matches }));
}

// Summarize events for display chips in match row
function summarizeEvents(events: MatchEvent[], homeTeamId?: number | null, awayTeamId?: number | null) {
  const homeGoals: string[] = [];
  const awayGoals: string[] = [];
  const homeCards: { type: "yellow" | "red" | "yellow_red"; name: string }[] = [];
  const awayCards: { type: "yellow" | "red" | "yellow_red"; name: string }[] = [];

  for (const ev of events) {
    const isHome = ev.teamId === homeTeamId;
    const name = ev.person ? `${ev.person.lastName}` : "";
    if (ev.eventType === "goal" || ev.eventType === "penalty_scored") {
      const label = `${name} ${ev.minute}'`;
      if (isHome) homeGoals.push(label.trim());
      else awayGoals.push(label.trim());
    } else if (ev.eventType === "own_goal") {
      // own goal counts for opposite team
      const label = `${name} ${ev.minute}' (og)`;
      if (isHome) awayGoals.push(label.trim());
      else homeGoals.push(label.trim());
    } else if (ev.eventType === "yellow" || ev.eventType === "red" || ev.eventType === "yellow_red") {
      const card = { type: ev.eventType, name: `${name} ${ev.minute}'`.trim() };
      if (isHome) homeCards.push(card);
      else awayCards.push(card);
    }
  }

  return { homeGoals, awayGoals, homeCards, awayCards };
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ match, t }: { match: Match; t: ReturnType<typeof useTranslations> }) {
  if (match.status === "finished" && (match.events?.length ?? 0) > 0) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0"
        style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
        <CheckCircle2 className="w-3 h-3" />
        <span>{t("protocols.statusFilled")}</span>
      </div>
    );
  }
  if (match.status === "finished") {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0"
        style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
        <FileText className="w-3 h-3" />
        <span>{t("protocols.statusEmpty")}</span>
      </div>
    );
  }
  if (match.status === "live") {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0"
        style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
        <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: "#ef4444" }} />
        <span>Live</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0"
      style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
      <Clock className="w-3 h-3" />
      <span>{t("protocols.statusNotStarted")}</span>
    </div>
  );
}

// ─── Match row ────────────────────────────────────────────────────────────────

function MatchRow({
  match, orgSlug, tournamentId, locale,
}: {
  match: Match; orgSlug: string; tournamentId: number; locale: string;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const isFinished = match.status === "finished" || match.status === "live";
  const evs = match.events ?? [];
  const summary = summarizeEvents(evs, match.homeTeamId, match.awayTeamId);
  const hasGoalInfo = summary.homeGoals.length > 0 || summary.awayGoals.length > 0;
  const hasCardInfo = summary.homeCards.length > 0 || summary.awayCards.length > 0;
  const showExpand = evs.length > 0 && (hasGoalInfo || hasCardInfo);
  const stageLabel = match.stage?.nameRu || match.stage?.name || "";
  const groupLabel = match.group?.name ? `Гр. ${match.group.name}` : "";
  const roundLabel = match.round?.name || "";

  function openProtocol(e: React.MouseEvent) {
    e.stopPropagation();
    router.push(`/${locale}/org/${orgSlug}/admin/tournament/${tournamentId}/hub/match/${match.id}`);
  }

  return (
    <div className="rounded-xl border overflow-hidden transition-all"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>

      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">

        {/* Time */}
        <div className="text-xs font-mono shrink-0 w-10 text-right tabular-nums"
          style={{ color: "var(--cat-text-muted)" }}>
          {match.scheduledAt ? fmtTime(match.scheduledAt) : "—"}
        </div>

        {/* Home team */}
        <div className="flex-1 min-w-0 text-right">
          <span className="text-sm font-semibold truncate block"
            style={{ color: "var(--cat-text)" }}>
            {match.homeTeam?.name ?? "TBD"}
          </span>
        </div>

        {/* Score / vs */}
        <div className="shrink-0">
          {isFinished ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg tabular-nums"
              style={{ background: "var(--cat-tag-bg)" }}>
              <span className="text-base font-black leading-none" style={{ color: "var(--cat-text)" }}>
                {match.homeScore ?? 0}
              </span>
              <span className="text-xs font-bold" style={{ color: "var(--cat-text-muted)" }}>:</span>
              <span className="text-base font-black leading-none" style={{ color: "var(--cat-text)" }}>
                {match.awayScore ?? 0}
              </span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-lg text-xs font-semibold"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
              vs
            </div>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold truncate block"
            style={{ color: "var(--cat-text)" }}>
            {match.awayTeam?.name ?? "TBD"}
          </span>
        </div>

        {/* Meta badges */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          {stageLabel && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
              {stageLabel}
            </span>
          )}
          {groupLabel && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
              {groupLabel}
            </span>
          )}
          {roundLabel && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
              {roundLabel}
            </span>
          )}
          {match.field && (
            <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
              {match.field.name}
            </span>
          )}
        </div>

        {/* Status */}
        <StatusPill match={match} t={t} />

        {/* Expand events */}
        {showExpand && (
          <button onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity shrink-0"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Open protocol */}
        <button onClick={openProtocol}
          className="p-1.5 rounded-lg hover:opacity-70 transition-opacity shrink-0"
          title="Открыть протокол"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded events summary */}
      {expanded && showExpand && (
        <div className="px-4 pb-3 pt-0 border-t"
          style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>
          <div className="flex gap-6 pt-3">
            {/* Home side */}
            <div className="flex-1 space-y-1">
              {summary.homeGoals.map((g, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--cat-text-secondary)" }}>
                  <span>⚽</span><span>{g}</span>
                </div>
              ))}
              {summary.homeCards.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--cat-text-secondary)" }}>
                  <span>{c.type === "yellow" ? "🟨" : c.type === "red" ? "🟥" : "🟧"}</span>
                  <span>{c.name}</span>
                </div>
              ))}
            </div>

            {/* Away side */}
            <div className="flex-1 space-y-1 text-right">
              {summary.awayGoals.map((g, i) => (
                <div key={i} className="flex items-center justify-end gap-1.5 text-xs" style={{ color: "var(--cat-text-secondary)" }}>
                  <span>{g}</span><span>⚽</span>
                </div>
              ))}
              {summary.awayCards.map((c, i) => (
                <div key={i} className="flex items-center justify-end gap-1.5 text-xs" style={{ color: "var(--cat-text-secondary)" }}>
                  <span>{c.name}</span>
                  <span>{c.type === "yellow" ? "🟨" : c.type === "red" ? "🟥" : "🟧"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Date group ───────────────────────────────────────────────────────────────

function DateGroup({
  date, matches, orgSlug, tournamentId, locale,
}: {
  date: string; matches: Match[]; orgSlug: string; tournamentId: number; locale: string;
}) {
  const filledCount = matches.filter(m => m.status === "finished" && (m.events?.length ?? 0) > 0).length;
  const finishedCount = matches.filter(m => m.status === "finished").length;

  return (
    <div className="space-y-2">
      {/* Date header */}
      <div className="flex items-center gap-3 pt-2 pb-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" style={{ color: "var(--cat-text-muted)" }} />
          <span className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
            {date === "unscheduled" ? "Без даты" : fmtDate(date + "T12:00:00", locale)}
          </span>
        </div>
        <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
        <span className="text-[11px] font-semibold shrink-0" style={{ color: "var(--cat-text-muted)" }}>
          {matches.length} {matches.length === 1 ? "match" : "matches"}
          {finishedCount > 0 && ` · ${filledCount}/${finishedCount} protocols`}
        </span>
      </div>

      {/* Matches */}
      <div className="space-y-1.5">
        {matches.map(m => (
          <MatchRow key={m.id} match={m} orgSlug={orgSlug} tournamentId={tournamentId} locale={locale} />
        ))}
      </div>
    </div>
  );
}

// ─── Stats card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-[100px] rounded-xl border px-4 py-3"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      <div className="flex items-center gap-2 mb-1" style={{ color }}>
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-black tabular-nums" style={{ color: "var(--cat-text)" }}>
        {value}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ProtocolsPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const ctx = useTournament();
  const orgSlug = ctx?.orgSlug ?? "";
  const tournamentId = ctx?.tournamentId ?? 0;
  const base = `/api/org/${orgSlug}/tournament/${tournamentId}`;

  const searchParams = useSearchParams();
  const classId = searchParams ? Number(searchParams.get("classId")) || null : null;
  const className = searchParams ? searchParams.get("className") || null : null;

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "filled" | "empty" | "live" | "scheduled">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = classId
        ? `${base}/matches?classId=${classId}`
        : `${base}/matches`;
      const r = await fetch(url);
      if (!r.ok) return;
      const data: Match[] = await r.json();

      // Sort by scheduledAt ascending
      data.sort((a, b) => {
        if (a.scheduledAt && b.scheduledAt)
          return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        return a.id - b.id;
      });

      setMatches(data);
    } finally {
      setLoading(false);
    }
  }, [base, classId]);

  useEffect(() => { load(); }, [load]);

  const stats = {
    total: matches.length,
    finished: matches.filter(m => m.status === "finished").length,
    filled: matches.filter(m => m.status === "finished" && (m.events?.length ?? 0) > 0).length,
    empty: matches.filter(m => m.status === "finished" && (m.events?.length ?? 0) === 0).length,
    live: matches.filter(m => m.status === "live").length,
    pending: matches.filter(m => m.status === "scheduled").length,
  };

  const filtered = (() => {
    if (filter === "filled") return matches.filter(m => m.status === "finished" && (m.events?.length ?? 0) > 0);
    if (filter === "empty") return matches.filter(m => m.status === "finished" && (m.events?.length ?? 0) === 0);
    if (filter === "live") return matches.filter(m => m.status === "live");
    if (filter === "scheduled") return matches.filter(m => m.status === "scheduled");
    return matches;
  })();

  const groups = groupMatchesByDate(filtered);

  type FilterKey = typeof filter;
  const filters: { key: FilterKey; label: string; count: number; color: string }[] = [
    { key: "all",       label: "Все",           count: stats.total,   color: "var(--cat-text-muted)" },
    { key: "live",      label: "Live",          count: stats.live,    color: "#ef4444" },
    { key: "filled",    label: "Заполнены",     count: stats.filled,  color: "#10b981" },
    { key: "empty",     label: "Без событий",   count: stats.empty,   color: "#f59e0b" },
    { key: "scheduled", label: "Не начались",   count: stats.pending, color: "var(--cat-text-muted)" },
  ];

  return (
    <div className="space-y-6 w-full">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>
            {className ? `Протоколы · ${className}` : "Протоколы"}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            Архив матчей, статусы протоколов и ввод событий
          </p>
        </div>
        <button onClick={load}
          className="p-2 rounded-lg hover:opacity-70 transition-opacity shrink-0"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats */}
      {!loading && stats.total > 0 && (
        <div className="flex gap-3 flex-wrap">
          <StatCard
            label="Всего матчей"
            value={stats.total}
            color="var(--cat-text-muted)"
            icon={<Trophy className="w-3.5 h-3.5" />}
          />
          <StatCard
            label="Протоколов"
            value={stats.filled}
            color="#10b981"
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          />
          <StatCard
            label="Без событий"
            value={stats.empty}
            color="#f59e0b"
            icon={<FileText className="w-3.5 h-3.5" />}
          />
          {stats.live > 0 && (
            <StatCard
              label="Сейчас Live"
              value={stats.live}
              color="#ef4444"
              icon={<span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#ef4444" }} />}
            />
          )}
        </div>
      )}

      {/* Filter tabs */}
      {!loading && (
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={filter === f.key
                ? { background: f.color === "var(--cat-text-muted)" ? "var(--cat-tag-bg)" : f.color + "22",
                    color: f.color, border: `1.5px solid ${f.color}` }
                : { background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)",
                    border: "1.5px solid transparent" }}>
              {f.key === "live" && f.count > 0 && (
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
              )}
              {f.label}
              <span className="font-black">{f.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16"
          style={{ color: "var(--cat-text-muted)" }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Загрузка...</span>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border py-16 flex flex-col items-center gap-3"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <Trophy className="w-12 h-12 opacity-20" style={{ color: "var(--cat-text)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--cat-text-muted)" }}>
            Матчей не найдено
          </p>
          <p className="text-xs opacity-60 text-center max-w-xs" style={{ color: "var(--cat-text-muted)" }}>
            Сгенерируйте матчи в разделе Расписание → Этапы
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(g => (
            <DateGroup
              key={g.date}
              date={g.date}
              matches={g.matches}
              orgSlug={orgSlug}
              tournamentId={tournamentId}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
