"use client";

import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useTranslations, useLocale } from "next-intl";
import { useEffect, useState, useRef } from "react";
import { Trophy, TrendingUp, Loader2, ArrowUpRight, Star, Shield, Radio } from "lucide-react";

// ─── Types ───────────────────────────────────────────────

interface Standing {
  position: number;
  teamId: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  form?: string[];
  provisional?: boolean;   // true = contains live in-progress contribution
  livePoints?: number;     // provisional points added
  team?: { name: string; club?: { badgeUrl?: string | null; name?: string | null } | null } | null;
}

interface LiveMatch {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
}

interface Group {
  id: number;
  name: string;
  order: number;
  isLive?: boolean;
  liveMatches?: LiveMatch[];
  standings: Standing[];
}

interface Zone {
  fromRank: number;
  toRank: number;
  targetName: string;
  targetNameRu?: string | null;
  targetNameEt?: string | null;
  targetType: string;
}

interface Stage {
  id: number;
  name: string;
  nameRu?: string | null;
  nameEt?: string | null;
  type: string;
  order: number;
  status: string;
  hasLive?: boolean;
  groups: Group[];
  zones: Zone[];
}

interface StandingsResponse {
  liveEnabled: boolean;
  hasLive: boolean;
  stages: Stage[];
}

// ─── Zone styling ─────────────────────────────────────────────────────────────

function getZoneStyle(targetName: string, targetType: string) {
  const n = targetName.toLowerCase();
  if (n.includes("champion") || n.includes("gold") || n.includes("золот") || n.includes("чемпион"))
    return { color: "#F59E0B", bg: "#F59E0B14", border: "#F59E0B" };
  if (n.includes("europa") || n.includes("silver") || n.includes("серебр") || n.includes("европа"))
    return { color: "#F97316", bg: "#F9731614", border: "#F97316" };
  if (n.includes("conference") || n.includes("bronze") || n.includes("бронз"))
    return { color: "#10B981", bg: "#10B98114", border: "#10B981" };
  if (n.includes("relegat"))
    return { color: "#EF4444", bg: "#EF444414", border: "#EF4444" };
  if (targetType === "knockout")
    return { color: "#3B82F6", bg: "#3B82F614", border: "#3B82F6" };
  return { color: "#8B5CF6", bg: "#8B5CF614", border: "#8B5CF6" };
}

function getZoneForPosition(position: number, zones: Zone[]) {
  return zones.find(z => position >= z.fromRank && position <= z.toRank) ?? null;
}

// ─── Form badge ───────────────────────────────────────────────────────────────

function FormBadge({ result }: { result: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    W: { bg: "#22c55e20", color: "#22c55e" },
    D: { bg: "#F59E0B20", color: "#F59E0B" },
    L: { bg: "#ef444420", color: "#ef4444" },
  };
  const style = colors[result] ?? { bg: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" };
  return (
    <span className="w-4 h-4 rounded text-[9px] font-black flex items-center justify-center shrink-0"
      style={{ background: style.bg, color: style.color }}>
      {result}
    </span>
  );
}

// ─── Standings row ────────────────────────────────────────────────────────────

function StandingsRow({ s, zones, isLeague, brand, liveMatches }: {
  s: Standing;
  zones: Zone[];
  isLeague: boolean;
  brand: string;
  liveMatches?: LiveMatch[];
}) {
  const zone       = getZoneForPosition(s.position, zones);
  const zoneStyle  = zone ? getZoneStyle(zone.targetName, zone.targetType) : null;
  const isLastZone = zone ? s.position === zone.toRank : false;
  const isLive     = s.provisional === true;

  // Find the live score for this team
  const liveMatch = liveMatches?.find(
    m => m.homeTeamId === s.teamId || m.awayTeamId === s.teamId
  );
  const isHome    = liveMatch?.homeTeamId === s.teamId;
  const liveScore = liveMatch
    ? isHome
      ? `${liveMatch.homeScore}:${liveMatch.awayScore}`
      : `${liveMatch.awayScore}:${liveMatch.homeScore}`
    : null;

  return (
    <tr style={{
      background:   isLive ? "rgba(239,68,68,0.04)" : zoneStyle ? zoneStyle.bg : "transparent",
      borderBottom: isLastZone
        ? `2px solid ${zoneStyle!.border}40`
        : "1px solid var(--cat-card-border)",
      transition:   "background 0.3s",
    }}>
      {/* Zone color strip */}
      <td className="w-1 py-0 px-0" style={{ padding: 0 }}>
        <div className="h-full w-1"
          style={{ background: zoneStyle ? zoneStyle.color : "transparent", minHeight: "44px" }} />
      </td>

      {/* Position */}
      <td className="px-2 py-2.5 w-9 text-center">
        <span className="text-sm font-black tabular-nums"
          style={{ color: zoneStyle ? zoneStyle.color : "var(--cat-text-muted)" }}>
          {s.position}
        </span>
      </td>

      {/* Team */}
      <td className="px-2 py-2.5 min-w-[140px]">
        <div className="flex items-center gap-2">
          {s.team?.club?.badgeUrl ? (
            <img src={s.team.club.badgeUrl} alt="" className="w-6 h-6 rounded-md object-contain shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center text-[9px] font-bold"
              style={{ background: `${brand}18`, color: brand }}>
              {s.team?.name?.[0] ?? "?"}
            </div>
          )}
          <span className="text-[13px] font-semibold leading-tight" style={{ color: "var(--cat-text)" }}>
            {s.team?.name ?? "—"}
          </span>
          {/* Live score chip */}
          {isLive && liveScore && (
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-black"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", letterSpacing: "0.05em" }}>
              🔴 {liveScore}
            </span>
          )}
        </div>
      </td>

      {/* Stats */}
      {[s.played, s.won, s.drawn, s.lost].map((v, i) => (
        <td key={i} className="px-1.5 py-2.5 text-center text-xs tabular-nums w-8"
          style={{ color: "var(--cat-text-secondary)" }}>{v}</td>
      ))}

      <td className="px-1.5 py-2.5 text-center text-xs tabular-nums w-8"
        style={{ color: s.goalDiff > 0 ? "#22c55e" : s.goalDiff < 0 ? "#ef4444" : "var(--cat-text-muted)" }}>
        {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
      </td>

      {isLeague && (
        <td className="px-2 py-2.5 w-24 hidden sm:table-cell">
          <div className="flex gap-0.5 justify-center">
            {(s.form ?? []).slice(-5).map((r, i) => <FormBadge key={i} result={r} />)}
          </div>
        </td>
      )}

      {/* Points — highlight if provisional */}
      <td className="px-3 py-2.5 text-center w-10">
        <span className="text-sm font-black tabular-nums"
          style={{ color: isLive ? "#ef4444" : brand }}>
          {s.points}
          {isLive && (s.livePoints ?? 0) > 0 && (
            <span className="text-[9px] font-bold ml-0.5 opacity-60">
              +{s.livePoints}
            </span>
          )}
        </span>
      </td>
    </tr>
  );
}

// ─── Zone legend ──────────────────────────────────────────────────────────────

function ZoneLegend({ zones, locale }: { zones: Zone[]; locale: string }) {
  if (zones.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 px-4 py-2.5 border-t"
      style={{ borderColor: "var(--cat-card-border)", background: "rgba(0,0,0,0.02)" }}>
      {zones.map(zone => {
        const style = getZoneStyle(zone.targetName, zone.targetType);
        const name  = locale === "ru" ? (zone.targetNameRu ?? zone.targetName)
          : locale === "et" ? (zone.targetNameEt ?? zone.targetName)
          : zone.targetName;
        return (
          <div key={`${zone.fromRank}-${zone.toRank}`}
            className="flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full"
            style={{ background: style.bg, color: style.color, border: `1px solid ${style.color}30` }}>
            <ArrowUpRight className="w-3 h-3" />
            <span>{zone.fromRank === zone.toRank ? `${zone.fromRank}` : `${zone.fromRank}–${zone.toRank}`}</span>
            <span className="opacity-80">→ {name}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Group table ──────────────────────────────────────────────────────────────

function GroupTable({ group, zones, isLeague, brand, t }: {
  group: Group;
  zones: Zone[];
  isLeague: boolean;
  brand: string;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="rounded-2xl overflow-hidden border"
      style={{
        borderColor: group.isLive ? "rgba(239,68,68,0.35)" : "var(--cat-card-border)",
        background: "var(--cat-card-bg)",
        boxShadow: group.isLive ? "0 0 20px rgba(239,68,68,0.08)" : undefined,
        transition: "border-color 0.3s",
      }}>
      {!isLeague && (
        <div className="flex items-center gap-2.5 px-4 py-3 border-b"
          style={{ borderColor: "var(--cat-card-border)", background: "rgba(43,254,186,0.04)" }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
            style={{ background: brand, color: "#0A0E14" }}>
            {group.name}
          </div>
          <span className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
            {t("groupLabel")} {group.name}
          </span>
          <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
            · {group.standings.length} {t("teams")}
          </span>
          {/* 🔴 LIVE badge */}
          {group.isLive && (
            <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr style={{ background: "var(--cat-tag-bg)", borderBottom: "1px solid var(--cat-card-border)" }}>
              <th className="w-1 p-0" />
              <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide w-9"
                style={{ color: "var(--cat-text-muted)" }}>#</th>
              <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide"
                style={{ color: "var(--cat-text-muted)" }}>{t("colTeam")}</th>
              {[t("colPlayed"), t("colWon"), t("colDrawn"), t("colLost")].map(h => (
                <th key={h} className="px-1.5 py-2 text-center text-[10px] font-bold uppercase tracking-wide w-8"
                  style={{ color: "var(--cat-text-muted)" }}>{h}</th>
              ))}
              <th className="px-1.5 py-2 text-center text-[10px] font-bold uppercase tracking-wide w-8"
                style={{ color: "var(--cat-text-muted)" }}>{t("colGoalDiff")}</th>
              {isLeague && (
                <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide w-24 hidden sm:table-cell"
                  style={{ color: "var(--cat-text-muted)" }}>Form</th>
              )}
              <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide w-10"
                style={{ color: "var(--cat-text-muted)" }}>{t("colPoints")}</th>
            </tr>
          </thead>
          <tbody>
            {group.standings.length === 0 && (
              <tr>
                <td colSpan={isLeague ? 9 : 8} className="text-center py-6 text-xs"
                  style={{ color: "var(--cat-text-muted)" }}>{t("noData")}</td>
              </tr>
            )}
            {group.standings.map(s => (
              <StandingsRow
                key={s.teamId ?? s.position}
                s={s}
                zones={zones}
                isLeague={isLeague}
                brand={brand}
                liveMatches={group.isLive ? group.liveMatches : undefined}
              />
            ))}
          </tbody>
        </table>
      </div>

      {zones.length > 0 && <ZoneLegend zones={zones} locale="ru" />}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StandingsPage() {
  const { org, tournament: tourney } = useTournamentPublic();
  const t       = useTranslations("tournament");
  const locale  = useLocale();
  const brand   = org.brandColor ?? "#2BFEBA";

  const [stages,       setStages]       = useState<Stage[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [activeStage,  setActiveStage]  = useState<number | null>(null);
  const [liveEnabled,  setLiveEnabled]  = useState(false);
  const [hasLive,      setHasLive]      = useState(false);

  const sseRef = useRef<EventSource | null>(null);

  // ── Fetch standings ────────────────────────────────────────────────────────
  const fetchStandings = (showLoader = false) => {
    if (showLoader) setLoading(true);
    fetch(`/api/public/t/${org.slug}/${tourney.slug}/standings`)
      .then(r => r.ok ? r.json() : null)
      .then((data: StandingsResponse | null) => {
        if (!data) return;
        // Handle both old (Stage[]) and new ({ liveEnabled, hasLive, stages }) shapes
        const stagesArr = Array.isArray(data) ? data : data.stages;
        setStages(stagesArr);
        setLiveEnabled(!Array.isArray(data) && data.liveEnabled);
        setHasLive(!Array.isArray(data) && data.hasLive);
        if (stagesArr.length > 0 && !activeStage) setActiveStage(stagesArr[0].id);
      })
      .finally(() => setLoading(false));
  };

  // ── Initial load + polling fallback ───────────────────────────────────────
  useEffect(() => {
    fetchStandings(true);
    // Poll every 30s as fallback (SSE handles instant updates when liveEnabled)
    const interval = setInterval(() => fetchStandings(false), 30_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.slug, tourney.slug]);

  // ── SSE connection for Pro/Elite live push ─────────────────────────────────
  useEffect(() => {
    if (!liveEnabled) return;

    // Connect to SSE stream
    const sse = new EventSource(
      `/api/public/t/${org.slug}/${tourney.slug}/live`
    );
    sseRef.current = sse;

    sse.addEventListener("match:update", () => {
      // Re-fetch standings immediately on any match score change
      fetchStandings(false);
    });

    sse.onerror = () => {
      // SSE error — fall back to polling (already set up above)
      sse.close();
    };

    return () => {
      sse.close();
      sseRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveEnabled, org.slug, tourney.slug]);

  const currentStage = stages.find(s => s.id === activeStage);
  const isLeague     = currentStage?.type === "league";

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${brand}15` }}>
          <TrendingUp className="w-5 h-5" style={{ color: brand }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--cat-text)" }}>
            {t("standingsTitle")}
          </h1>
          <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
            {isLeague ? t("leaguePhase") : t("groupStages")}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* 🔴 LIVE global indicator */}
          {hasLive && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
              <Radio className="w-3 h-3" />
              LIVE
            </div>
          )}

          {/* Stage status */}
          {currentStage && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{
                background: currentStage.status === "active" ? "rgba(34,197,94,0.12)" : "var(--cat-tag-bg)",
                color: currentStage.status === "active" ? "#22c55e" : "var(--cat-text-muted)",
              }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block"
                style={{
                  background: currentStage.status === "active" ? "#22c55e" : "var(--cat-text-muted)",
                  animation: currentStage.status === "active" ? "pulse 1.5s infinite" : undefined,
                }} />
              {currentStage.status === "active" ? t("stageActive")
                : currentStage.status === "finished" ? t("stageFinished")
                : t("stagePreparing")}
            </div>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-2"
          style={{ color: "var(--cat-text-muted)" }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{t("loading")}</span>
        </div>
      )}

      {/* Empty */}
      {!loading && stages.length === 0 && (
        <div className="text-center py-16 rounded-2xl border"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: brand }} />
          <p className="text-sm font-medium" style={{ color: "var(--cat-text-muted)" }}>
            {t("standingsEmpty")}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--cat-text-muted)" }}>
            {t("standingsEmptyHint")}
          </p>
        </div>
      )}

      {/* Stage switcher */}
      {!loading && stages.length > 1 && (
        <div className="flex flex-wrap gap-1 p-1 rounded-xl w-fit"
          style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}>
          {stages.map(s => {
            const sLabel = locale === "ru" ? (s.nameRu ?? s.name)
              : locale === "et" ? (s.nameEt ?? s.name)
              : s.name;
            return (
              <button key={s.id} onClick={() => setActiveStage(s.id)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer relative"
                style={activeStage === s.id
                  ? { background: brand, color: "#0A0E14", boxShadow: `0 2px 10px ${brand}40` }
                  : { color: "var(--cat-text-secondary)" }
                }>
                {sLabel}
                {s.hasLive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* League phase header */}
      {!loading && currentStage && isLeague && currentStage.groups[0]?.standings.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ background: `${brand}08`, borderColor: `${brand}25` }}>
          <Star className="w-4 h-4" style={{ color: brand }} />
          <span className="text-[13px] font-bold" style={{ color: brand }}>
            {locale === "ru" ? (currentStage.nameRu ?? currentStage.name)
              : locale === "et" ? (currentStage.nameEt ?? currentStage.name)
              : currentStage.name}
          </span>
          <span className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
            · {currentStage.groups[0].standings.length} {t("teams")}
          </span>
        </div>
      )}

      {/* Groups */}
      {!loading && currentStage && (
        <div className="space-y-4">
          {currentStage.groups.length === 0 && (
            <div className="text-center py-10 rounded-2xl border"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: brand }} />
              <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("groupsNotCreated")}</p>
            </div>
          )}
          {currentStage.groups.map(group => (
            <GroupTable
              key={group.id}
              group={group}
              zones={currentStage.zones}
              isLeague={isLeague}
              brand={brand}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Live hint */}
      {!loading && hasLive && (
        <p className="text-[10px] text-center" style={{ color: "var(--cat-text-muted)" }}>
          🔴 {t("liveHint")}
        </p>
      )}

      {/* Column legend */}
      {!loading && stages.length > 0 && (
        <div className="flex flex-wrap gap-4 text-[10px] pt-1" style={{ color: "var(--cat-text-muted)" }}>
          {[
            [t("colPlayed"), t("colPlayed_full")],
            [t("colWon"), t("colWon_full")],
            [t("colDrawn"), t("colDrawn_full")],
            [t("colLost"), t("colLost_full")],
            [t("colGoalDiff"), t("colGoalDiff_full")],
            [t("colPoints"), t("colPoints_full")],
          ].map(([abbr, full]) => (
            <span key={abbr}><b>{abbr}</b> — {full}</span>
          ))}
        </div>
      )}
    </div>
  );
}
