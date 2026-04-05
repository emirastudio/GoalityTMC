"use client";

import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { Clock, MapPin, Zap, CheckCircle, CalendarDays, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

// ─── Types ───────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────

function fmtDate(iso: string, locale: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { day: "numeric", month: "long", weekday: "long" });
}

function fmtTime(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function groupByDate(matches: PublicMatch[], locale: string, noDateLabel: string): { dateKey: string; label: string; matches: PublicMatch[] }[] {
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

// ─── Match card ──────────────────────────────────────────

function MatchCard({ match, locale, tGroup, tFinished }: { match: PublicMatch; locale: string; tGroup: string; tFinished: string }) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  const stageMeta = [
    match.stage?.nameRu ?? match.stage?.name,
    match.group ? `${tGroup} ${match.group.name}` : null,
    match.round?.shortName ?? match.round?.name,
  ].filter(Boolean).join(" · ");

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: "var(--cat-card-bg)",
        border: `1px solid ${isLive ? "var(--cat-accent)" : "var(--cat-card-border)"}`,
        boxShadow: isLive ? "0 0 16px var(--cat-accent-glow)" : "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Top row */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{
          borderColor: isLive ? "var(--cat-accent-glow)" : "var(--cat-card-border)",
          background: isLive ? "rgba(43,254,186,0.04)" : "var(--cat-tag-bg)",
        }}
      >
        <div className="flex items-center gap-2">
          {isLive && (
            <span
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse"
              style={{ background: "var(--cat-accent)", color: "#0A0E14" }}
            >
              <Zap className="w-2.5 h-2.5" /> LIVE
            </span>
          )}
          {isFinished && (
            <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "var(--cat-text-muted)" }}>
              <CheckCircle className="w-3 h-3" /> {tFinished}
            </span>
          )}
          {stageMeta && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}
            >
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
              {fmtTime(match.scheduledAt, locale)}
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

      {/* Main row */}
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Home */}
        <div className="flex-1 flex items-center gap-2 justify-end">
          <span
            className="text-sm font-bold text-right leading-tight"
            style={{ color: isFinished && (match.homeScore ?? 0) > (match.awayScore ?? 0) ? "var(--cat-text)" : "var(--cat-text-secondary)" }}
          >
            {match.homeTeam?.name ?? "TBD"}
          </span>
          {match.homeTeam?.club?.badgeUrl && (
            <img src={match.homeTeam.club.badgeUrl} alt="" className="w-7 h-7 rounded object-contain shrink-0" />
          )}
        </div>

        {/* Score / VS */}
        <div className="shrink-0 flex items-center gap-1.5">
          {isFinished || isLive ? (
            <>
              <span className="text-2xl font-black w-8 text-center tabular-nums" style={{ color: "var(--cat-text)" }}>
                {match.homeScore ?? 0}
              </span>
              <span className="text-base font-bold" style={{ color: "var(--cat-text-muted)" }}>:</span>
              <span className="text-2xl font-black w-8 text-center tabular-nums" style={{ color: "var(--cat-text)" }}>
                {match.awayScore ?? 0}
              </span>
            </>
          ) : (
            <span
              className="text-sm font-bold px-3 py-1 rounded-lg"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}
            >
              vs
            </span>
          )}
        </div>

        {/* Away */}
        <div className="flex-1 flex items-center gap-2">
          {match.awayTeam?.club?.badgeUrl && (
            <img src={match.awayTeam.club.badgeUrl} alt="" className="w-7 h-7 rounded object-contain shrink-0" />
          )}
          <span
            className="text-sm font-bold leading-tight"
            style={{ color: isFinished && (match.awayScore ?? 0) > (match.homeScore ?? 0) ? "var(--cat-text)" : "var(--cat-text-secondary)" }}
          >
            {match.awayTeam?.name ?? "TBD"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────

type TabKey = "all" | "live" | "finished" | "scheduled";

export default function DivisionSchedulePage() {
  const { org, tournament: tourney } = useTournamentPublic();
  const params = useParams<{ classId: string }>();
  const classId = params.classId ?? "";
  const locale = useLocale();
  const t = useTranslations("tournament");

  const [tab, setTab] = useState<TabKey>("all");
  const [allMatches, setAllMatches] = useState<PublicMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    function load(showLoader = false) {
      if (showLoader) setLoading(true);
      fetch(`/api/public/t/${org.slug}/${tourney.slug}/matches?classId=${classId}`)
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
  const grouped = groupByDate(filtered, locale, t("noDateSet"));

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "all",       label: t("tabAll") },
    { key: "live",      label: t("tabLive"), count: liveCount },
    { key: "scheduled", label: t("tabScheduled") },
    { key: "finished",  label: t("tabFinished") },
  ];

  return (
    <div className="space-y-6">

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--cat-tag-bg)" }}>
        {tabs.map(({ key, label, count }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 justify-center"
              style={active
                ? { background: "var(--cat-accent)", color: "#0A0E14", boxShadow: "0 0 10px var(--cat-accent-glow)" }
                : { color: "var(--cat-text-secondary)" }}
            >
              {label}
              {count != null && count > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: active ? "rgba(255,255,255,0.25)" : "var(--cat-accent)", color: "#0A0E14" }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-2" style={{ color: "var(--cat-text-muted)" }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--cat-accent)" }} />
          <span className="text-sm">{t("loading")}</span>
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div
          className="text-center py-16 rounded-2xl border"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
        >
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "var(--cat-accent)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--cat-text-muted)" }}>
            {t("scheduleNotPublished")}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--cat-text-muted)" }}>
            {t("matchesAfterPublish")}
          </p>
        </div>
      )}

      {/* Match groups */}
      {!loading && grouped.map(({ dateKey, label, matches }) => (
        <div key={dateKey} className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
            <span
              className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full"
              style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}
            >
              {label}
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
          </div>
          {matches.map(m => (
            <MatchCard key={m.id} match={m} locale={locale} tGroup={t("groupLabel")} tFinished={t("finished")} />
          ))}
        </div>
      ))}
    </div>
  );
}
