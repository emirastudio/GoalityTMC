"use client";

import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useEffect, useState } from "react";
import { Clock, MapPin, Zap, CheckCircle, CalendarDays, Loader2 } from "lucide-react";

// ─── Типы ───────────────────────────────────────────────

type MatchStatus = "scheduled" | "live" | "finished" | "cancelled" | "postponed";

interface PublicMatch {
  id: number;
  matchNumber?: number | null;
  status: MatchStatus;
  scheduledAt?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeam?: { name: string; club?: { badgeUrl?: string | null } | null } | null;
  awayTeam?: { name: string; club?: { badgeUrl?: string | null } | null } | null;
  field?: { name: string } | null;
  stage?: { name: string; nameRu?: string | null } | null;
  group?: { name: string } | null;
  round?: { name: string; shortName?: string | null } | null;
}

// ─── Хелперы ────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function groupByDate(matches: PublicMatch[]): { dateKey: string; label: string; matches: PublicMatch[] }[] {
  const map = new Map<string, PublicMatch[]>();
  for (const m of matches) {
    const key = m.scheduledAt ? new Date(m.scheduledAt).toDateString() : "no-date";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return Array.from(map.entries()).map(([key, ms]) => ({
    dateKey: key,
    label: key === "no-date" ? "Дата не указана" : fmtDate(ms[0].scheduledAt!),
    matches: ms,
  }));
}

// ─── Карточка матча ─────────────────────────────────────

function MatchCard({ match, brand }: { match: PublicMatch; brand: string }) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  const stageMeta = [
    match.stage?.name,
    match.group ? `Гр. ${match.group.name}` : null,
    match.round?.shortName ?? match.round?.name,
  ].filter(Boolean).join(" · ");

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: "var(--cat-card-bg)",
        border: `1px solid ${isLive ? brand : "var(--cat-card-border)"}`,
        boxShadow: isLive ? `0 0 16px ${brand}30` : "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Верхняя строка: мета + время */}
      <div className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: isLive ? `${brand}30` : "var(--cat-card-border)", background: isLive ? `${brand}08` : "var(--cat-tag-bg)" }}>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse"
              style={{ background: brand, color: "#fff" }}>
              <Zap className="w-2.5 h-2.5" /> LIVE
            </span>
          )}
          {isFinished && (
            <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "var(--cat-text-muted)" }}>
              <CheckCircle className="w-3 h-3" /> Завершён
            </span>
          )}
          {stageMeta && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${brand}15`, color: brand }}>
              {stageMeta}
            </span>
          )}
          {match.matchNumber && (
            <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
              #{match.matchNumber}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
          {match.scheduledAt && !isLive && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {fmtTime(match.scheduledAt)}
            </span>
          )}
          {match.field && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {match.field.name}
            </span>
          )}
        </div>
      </div>

      {/* Основная строка: команды + счёт */}
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Хозяева */}
        <div className="flex-1 flex items-center gap-2 justify-end">
          <span className="text-sm font-bold text-right leading-tight"
            style={{ color: isFinished && (match.homeScore ?? 0) > (match.awayScore ?? 0) ? "var(--cat-text)" : "var(--cat-text-secondary)" }}>
            {match.homeTeam?.name ?? "TBD"}
          </span>
          {match.homeTeam?.club?.badgeUrl && (
            <img src={match.homeTeam.club.badgeUrl} alt="" className="w-7 h-7 rounded object-contain shrink-0" />
          )}
        </div>

        {/* Счёт / VS */}
        <div className="shrink-0 flex items-center gap-1.5">
          {isFinished || isLive ? (
            <>
              <span className="text-2xl font-black w-8 text-center tabular-nums"
                style={{ color: "var(--cat-text)" }}>{match.homeScore ?? 0}</span>
              <span className="text-base font-bold" style={{ color: "var(--cat-text-muted)" }}>:</span>
              <span className="text-2xl font-black w-8 text-center tabular-nums"
                style={{ color: "var(--cat-text)" }}>{match.awayScore ?? 0}</span>
            </>
          ) : (
            <span className="text-sm font-bold px-3 py-1 rounded-lg"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
              vs
            </span>
          )}
        </div>

        {/* Гости */}
        <div className="flex-1 flex items-center gap-2">
          {match.awayTeam?.club?.badgeUrl && (
            <img src={match.awayTeam.club.badgeUrl} alt="" className="w-7 h-7 rounded object-contain shrink-0" />
          )}
          <span className="text-sm font-bold leading-tight"
            style={{ color: isFinished && (match.awayScore ?? 0) > (match.homeScore ?? 0) ? "var(--cat-text)" : "var(--cat-text-secondary)" }}>
            {match.awayTeam?.name ?? "TBD"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Главная страница ───────────────────────────────────

type TabKey = "all" | "live" | "finished" | "scheduled";

export default function PublicSchedulePage() {
  const { org, tournament: t } = useTournamentPublic();
  const brand = org.brandColor;

  const [tab, setTab] = useState<TabKey>("all");
  const [allMatches, setAllMatches] = useState<PublicMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/t/${org.slug}/${t.slug}/matches`)
      .then(r => r.ok ? r.json() : [])
      .then(setAllMatches)
      .finally(() => setLoading(false));
  }, [org.slug, t.slug]);

  // Фильтруем по табу
  const filtered = tab === "all"
    ? allMatches
    : allMatches.filter(m => m.status === tab);

  const liveCount = allMatches.filter(m => m.status === "live").length;

  // Группируем по дате
  const grouped = groupByDate(filtered);

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "all",       label: "Все" },
    { key: "live",      label: "Live",        count: liveCount },
    { key: "scheduled", label: "Предстоящие" },
    { key: "finished",  label: "Результаты" },
  ];

  return (
    <div className="space-y-6">

      {/* Заголовок */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${brand}15` }}>
          <CalendarDays className="w-5 h-5" style={{ color: brand }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--cat-text)" }}>Расписание</h1>
          <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{allMatches.length} матчей</p>
        </div>
      </div>

      {/* Табы */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--cat-tag-bg)" }}>
        {tabs.map(({ key, label, count }) => {
          const active = tab === key;
          return (
            <button key={key} onClick={() => setTab(key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 justify-center"
              style={active
                ? { background: brand, color: "#fff", boxShadow: `0 0 10px ${brand}40` }
                : { color: "var(--cat-text-secondary)" }}>
              {label}
              {count != null && count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: active ? "rgba(255,255,255,0.25)" : brand, color: active ? "#fff" : "#fff" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Контент */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-2" style={{ color: "var(--cat-text-muted)" }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Загрузка...</span>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 rounded-2xl border"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: brand }} />
          <p className="text-sm font-medium" style={{ color: "var(--cat-text-muted)" }}>Матчей нет</p>
        </div>
      )}

      {!loading && grouped.map(({ dateKey, label, matches }) => (
        <div key={dateKey} className="space-y-2">
          {/* Дата-разделитель */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
            <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full"
              style={{ background: `${brand}10`, color: brand }}>
              {label}
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
          </div>

          {matches.map(m => (
            <MatchCard key={m.id} match={m} brand={brand} />
          ))}
        </div>
      ))}
    </div>
  );
}
