"use client";

import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { Clock, MapPin, Zap, CheckCircle, CalendarDays, Loader2, ExternalLink, Navigation } from "lucide-react";

// ─── Types ────────────────────────────────────────────────

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
  field?: {
    name: string;
    stadiumId?: number | null;
    stadium?: {
      name: string;
      mapsUrl?: string | null;
      wazeUrl?: string | null;
    } | null;
  } | null;
  stage?: { name: string; nameRu?: string | null } | null;
  group?: { name: string } | null;
  round?: { name: string; shortName?: string | null } | null;
}

// ─── Helpers ─────────────────────────────────────────────

function fmtDate(iso: string, locale: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { day: "numeric", month: "long", weekday: "long" });
}

function fmtTime(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function groupByDate(matches: PublicMatch[], noDateLabel: string, locale: string) {
  const map = new Map<string, PublicMatch[]>();
  for (const m of matches) {
    const key = m.scheduledAt ? new Date(m.scheduledAt).toDateString() : "no-date";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return Array.from(map.entries()).map(([key, ms]) => ({
    dateKey: key,
    label: key === "no-date" ? noDateLabel : fmtDate(ms[0].scheduledAt!, locale),
    matches: ms,
  }));
}

/* Derive gender + display label from class name.
   Convention: B2014 = Boys, G2014 = Girls, else neutral */
function parseClass(name: string): { label: string; color: string; bg: string } {
  const upper = name.toUpperCase();
  if (upper.startsWith("B")) {
    return { label: name, color: "#3B82F6", bg: "rgba(59,130,246,0.12)" };
  }
  if (upper.startsWith("G")) {
    return { label: name, color: "#EC4899", bg: "rgba(236,72,153,0.12)" };
  }
  // Fallback — cycle through palette by first char code
  const palette = ["#8B5CF6","#F59E0B","#10B981","#06B6D4","#EF4444"];
  const color = palette[name.charCodeAt(0) % palette.length];
  return { label: name, color, bg: `${color}20` };
}

// ─── Match card ──────────────────────────────────────────

function MatchCard({ match, locale, tFinished, tGroup }: {
  match: PublicMatch; locale: string; tFinished: string; tGroup: string;
}) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  const stageMeta = [
    match.stage?.name,
    match.group ? `${tGroup} ${match.group.name}` : null,
    match.round?.shortName ?? match.round?.name,
  ].filter(Boolean).join(" · ");

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: "var(--cat-card-bg)",
        border: `1px solid ${isLive ? "var(--cat-accent)" : "var(--cat-card-border)"}`,
        boxShadow: isLive ? "0 0 16px var(--cat-accent-glow)" : "0 1px 4px rgba(0,0,0,0.04)",
      }}>
      {/* Top: meta + time */}
      <div className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: isLive ? "var(--cat-accent-glow)" : "var(--cat-card-border)", background: isLive ? "rgba(43,254,186,0.04)" : "var(--cat-tag-bg)" }}>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse"
              style={{ background: "var(--cat-accent)", color: "#0A0E14" }}>
              <Zap className="w-2.5 h-2.5" /> LIVE
            </span>
          )}
          {isFinished && (
            <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "var(--cat-text-muted)" }}>
              <CheckCircle className="w-3 h-3" /> {tFinished}
            </span>
          )}
          {stageMeta && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}>
              {stageMeta}
            </span>
          )}
          {match.matchNumber && (
            <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>#{match.matchNumber}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
          {match.scheduledAt && !isLive && (
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" />{fmtTime(match.scheduledAt, locale)}
            </span>
          )}
          {match.field && (
            <span className="flex items-center gap-1 shrink-0">
              <MapPin className="w-3 h-3" />
              {match.field.stadium
                ? `${match.field.stadium.name} — ${match.field.name}`
                : match.field.name}
            </span>
          )}
          {match.field?.stadium?.mapsUrl && (
            <a href={match.field.stadium.mapsUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg font-bold shrink-0 transition-all hover:opacity-80"
              style={{ background: "rgba(66,133,244,0.15)", color: "#4285f4", border: "1px solid rgba(66,133,244,0.25)" }}
              onClick={e => e.stopPropagation()}>
              <ExternalLink className="w-2.5 h-2.5" />
              <span className="text-[10px]">Maps</span>
            </a>
          )}
          {match.field?.stadium?.wazeUrl && (
            <a href={match.field.stadium.wazeUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg font-bold shrink-0 transition-all hover:opacity-80"
              style={{ background: "rgba(0,211,136,0.12)", color: "#00d388", border: "1px solid rgba(0,211,136,0.2)" }}
              onClick={e => e.stopPropagation()}>
              <Navigation className="w-2.5 h-2.5" />
              <span className="text-[10px]">Waze</span>
            </a>
          )}
        </div>
      </div>

      {/* Teams + score */}
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="flex-1 flex items-center gap-2 justify-end">
          <span className="text-sm font-bold text-right leading-tight"
            style={{ color: isFinished && (match.homeScore ?? 0) > (match.awayScore ?? 0) ? "var(--cat-text)" : "var(--cat-text-secondary)" }}>
            {match.homeTeam?.name ?? "TBD"}
          </span>
          {match.homeTeam?.club?.badgeUrl && (
            <img src={match.homeTeam.club.badgeUrl} alt="" className="w-7 h-7 rounded object-contain shrink-0" />
          )}
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {isFinished || isLive ? (
            <>
              <span className="text-2xl font-black w-8 text-center tabular-nums" style={{ color: "var(--cat-text)" }}>{match.homeScore ?? 0}</span>
              <span className="text-base font-bold" style={{ color: "var(--cat-text-muted)" }}>:</span>
              <span className="text-2xl font-black w-8 text-center tabular-nums" style={{ color: "var(--cat-text)" }}>{match.awayScore ?? 0}</span>
            </>
          ) : (
            <span className="text-sm font-bold px-3 py-1 rounded-lg"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>vs</span>
          )}
        </div>
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

// ─── Main page ───────────────────────────────────────────

type TabKey = "all" | "live" | "finished" | "scheduled";

export default function PublicSchedulePage() {
  const { org, tournament: tourney, classes } = useTournamentPublic();
  const t = useTranslations("tournament");
  const locale = useLocale();

  const [tab, setTab]               = useState<TabKey>("all");
  const [classId, setClassId]       = useState<number | null>(null); // null = all classes
  const [allMatches, setAllMatches] = useState<PublicMatch[]>([]);
  const [loading, setLoading]       = useState(true);

  // Re-fetch when classId changes
  useEffect(() => {
    let cancelled = false;
    function load(showLoader = false) {
      if (showLoader) setLoading(true);
      const url = classId
        ? `/api/public/t/${org.slug}/${tourney.slug}/matches?classId=${classId}`
        : `/api/public/t/${org.slug}/${tourney.slug}/matches`;
      fetch(url)
        .then(r => r.ok ? r.json() : [])
        .then(data => { if (!cancelled) setAllMatches(data); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    load(true);
    const interval = setInterval(() => load(false), 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [org.slug, tourney.slug, classId]);

  const filtered = tab === "all" ? allMatches : allMatches.filter(m => m.status === tab);
  const liveCount = allMatches.filter(m => m.status === "live").length;
  const grouped = groupByDate(filtered, t("noDateSet"), locale);

  const statusTabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "all",       label: t("tabAll") },
    { key: "live",      label: t("tabLive"), count: liveCount },
    { key: "scheduled", label: t("tabScheduled") },
    { key: "finished",  label: t("tabFinished") },
  ];

  return (
    <div className="space-y-4">

      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--cat-badge-open-bg)" }}>
          <CalendarDays className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--cat-text)" }}>{t("scheduleTitle")}</h1>
          <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
            {t("matchCount", { count: allMatches.length })}
          </p>
        </div>
      </div>

      {/* ── Status tabs (Live / Upcoming / etc.) ── */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--cat-tag-bg)" }}>
        {statusTabs.map(({ key, label, count }) => {
          const active = tab === key;
          return (
            <button key={key} onClick={() => setTab(key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all flex-1 justify-center"
              style={active
                ? { background: "var(--cat-accent)", color: "#0A0E14", boxShadow: "0 0 10px var(--cat-accent-glow)" }
                : { color: "var(--cat-text-secondary)" }}>
              {label}
              {count != null && count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: active ? "rgba(0,0,0,0.2)" : "var(--cat-accent)", color: "#0A0E14" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Division / Class filter ── */}
      {classes.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          {/* "All" pill */}
          <button
            onClick={() => setClassId(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold border transition-all"
            style={classId === null ? {
              background: "var(--cat-pill-active-bg)",
              borderColor: "var(--cat-accent)",
              color: "var(--cat-accent)",
            } : {
              background: "var(--cat-tag-bg)",
              borderColor: "var(--cat-card-border)",
              color: "var(--cat-text-secondary)",
            }}>
            Все дивизионы
          </button>

          {classes.map(cls => {
            const { label, color, bg } = parseClass(cls.name);
            const isActive = classId === cls.id;
            return (
              <button
                key={cls.id}
                onClick={() => setClassId(isActive ? null : cls.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold border transition-all"
                style={isActive ? {
                  background: bg,
                  borderColor: color,
                  color,
                  boxShadow: `0 0 8px ${color}40`,
                } : {
                  background: "var(--cat-tag-bg)",
                  borderColor: "var(--cat-card-border)",
                  color: "var(--cat-text-secondary)",
                }}>
                {/* Gender dot */}
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: isActive ? color : "var(--cat-text-faint)" }} />
                {label}
                {cls.teamCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-0.5"
                    style={{ background: isActive ? `${color}25` : "var(--cat-divider)", color: isActive ? color : "var(--cat-text-faint)" }}>
                    {cls.teamCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-2" style={{ color: "var(--cat-text-muted)" }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{t("loading")}</span>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 rounded-2xl border"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "var(--cat-accent)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--cat-text-muted)" }}>{t("noMatches")}</p>
        </div>
      )}

      {!loading && grouped.map(({ dateKey, label, matches }) => (
        <div key={dateKey} className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
            <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full"
              style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}>
              {label}
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
          </div>
          {matches.map(m => (
            <MatchCard key={m.id} match={m} locale={locale} tFinished={t("finished")} tGroup={t("group")} />
          ))}
        </div>
      ))}
    </div>
  );
}
