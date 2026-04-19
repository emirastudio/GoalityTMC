"use client";

import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useTranslations, useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TeamBadge } from "@/components/ui/team-badge";
import {
  Loader2,
  Trophy,
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle,
  Zap,
  ExternalLink,
  Navigation,
  ChevronLeft,
  Users,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

// ─── Types ─────────────────────────────────────────────────

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
  isThirdPlace?: boolean;
}

interface StandingRow {
  position: number | null;
  teamId: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  form?: string[] | null;
  team?: { name: string | null; club?: { badgeUrl?: string | null } | null } | null;
}

interface TeamDetailData {
  team: {
    id: number;
    name: string | null;
    club: { name: string; badgeUrl: string | null; city: string | null } | null;
  };
  registration: {
    displayName: string | null;
    classId: number | null;
    className: string | null;
    status: string;
    regNumber: number;
  } | null;
  groupStandings: {
    groupId: number;
    groupName: string;
    standings: StandingRow[];
  } | null;
  matches: PublicMatch[];
}

// ─── Helpers ────────────────────────────────────────────────

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

function ordinalSuffix(n: number, locale: string): string {
  if (locale.startsWith("ru") || locale.startsWith("et")) return String(n);
  const pr = new Intl.PluralRules(locale, { type: "ordinal" });
  const suffixes: Record<string, string> = { one: "st", two: "nd", few: "rd", other: "th" };
  return `${n}${suffixes[pr.select(n)] ?? "th"}`;
}

// ─── Match card (same style as schedule/page.tsx) ───────────

function MatchCard({
  match,
  locale,
  tFinished,
  tGroup,
  tThirdPlace,
  protocolHref,
}: {
  match: PublicMatch;
  locale: string;
  tFinished: string;
  tGroup: string;
  tThirdPlace: string;
  protocolHref: string;
}) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const isThirdPlace = match.isThirdPlace === true;

  const stageMeta = [
    match.stage?.name,
    match.group ? `${tGroup} ${match.group.name}` : null,
    isThirdPlace ? `🥉 ${tThirdPlace}` : (match.round?.shortName ?? match.round?.name),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={protocolHref}
      className="block rounded-2xl overflow-hidden transition-all hover:opacity-90 cursor-pointer"
      style={{
        background: "var(--cat-card-bg)",
        border: `1px solid ${isLive ? "var(--cat-accent)" : "var(--cat-card-border)"}`,
        boxShadow: isLive ? "0 0 16px var(--cat-accent-glow)" : "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Top: meta + time */}
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
            <span
              className="flex items-center gap-1 text-[10px] font-semibold"
              style={{ color: "var(--cat-text-muted)" }}
            >
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
        <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
          {match.scheduledAt && !isLive && (
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" />
              {fmtTime(match.scheduledAt, locale)}
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
            <span
              role="button"
              tabIndex={0}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg font-bold shrink-0 transition-all hover:opacity-80"
              style={{
                background: "rgba(66,133,244,0.15)",
                color: "#4285f4",
                border: "1px solid rgba(66,133,244,0.25)",
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(match.field!.stadium!.mapsUrl!, "_blank", "noopener,noreferrer");
              }}
            >
              <ExternalLink className="w-2.5 h-2.5" />
              <span className="text-[10px]">Maps</span>
            </span>
          )}
          {match.field?.stadium?.wazeUrl && (
            <span
              role="button"
              tabIndex={0}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg font-bold shrink-0 transition-all hover:opacity-80"
              style={{
                background: "rgba(0,211,136,0.12)",
                color: "#00d388",
                border: "1px solid rgba(0,211,136,0.2)",
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(match.field!.stadium!.wazeUrl!, "_blank", "noopener,noreferrer");
              }}
            >
              <Navigation className="w-2.5 h-2.5" />
              <span className="text-[10px]">Waze</span>
            </span>
          )}
        </div>
      </div>

      {/* Teams + score */}
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="flex-1 flex items-center gap-2 justify-end">
          <span
            className="text-sm font-bold text-right leading-tight"
            style={{
              color:
                isFinished && (match.homeScore ?? 0) > (match.awayScore ?? 0)
                  ? "var(--cat-text)"
                  : "var(--cat-text-secondary)",
            }}
          >
            {match.homeTeam?.name ?? "TBD"}
          </span>
          <TeamBadge team={match.homeTeam} size={28} />
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {isFinished || isLive ? (
            <>
              <span
                className="text-2xl font-black w-8 text-center tabular-nums"
                style={{ color: "var(--cat-text)" }}
              >
                {match.homeScore ?? 0}
              </span>
              <span className="text-base font-bold" style={{ color: "var(--cat-text-muted)" }}>
                :
              </span>
              <span
                className="text-2xl font-black w-8 text-center tabular-nums"
                style={{ color: "var(--cat-text)" }}
              >
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
        <div className="flex-1 flex items-center gap-2">
          <TeamBadge team={match.awayTeam} size={28} />
          <span
            className="text-sm font-bold leading-tight"
            style={{
              color:
                isFinished && (match.awayScore ?? 0) > (match.homeScore ?? 0)
                  ? "var(--cat-text)"
                  : "var(--cat-text-secondary)",
            }}
          >
            {match.awayTeam?.name ?? "TBD"}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Squad types ────────────────────────────────────────────

interface SquadPlayer {
  id: number;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  shirtNumber: number | null;
  position: string | null;
  personType: string;
  appearances: number;
  starts: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
}

interface SquadData {
  players: SquadPlayer[];
}

type TabKey = "overview" | "squad" | "stats" | "matches";

// ─── Main page ──────────────────────────────────────────────

export default function TeamDetailPage() {
  const { org, tournament: tourney } = useTournamentPublic();
  const t = useTranslations("tournament");
  const locale = useLocale();
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId;

  const [data, setData] = useState<TeamDetailData | null>(null);
  const [squad, setSquad] = useState<SquadData | null>(null);
  const [squadLoading, setSquadLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/public/t/${org.slug}/${tourney.slug}/teams/${teamId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: TeamDetailData) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [org.slug, tourney.slug, teamId]);

  // Lazy-load squad on first visit of squad / stats tab.
  useEffect(() => {
    if (squad || squadLoading) return;
    if (activeTab !== "squad" && activeTab !== "stats") return;
    setSquadLoading(true);
    fetch(`/api/public/t/${org.slug}/${tourney.slug}/teams/${teamId}/squad`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: SquadData) => setSquad(d))
      .catch(() => setSquad({ players: [] }))
      .finally(() => setSquadLoading(false));
  }, [activeTab, org.slug, tourney.slug, teamId, squad, squadLoading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2" style={{ color: "var(--cat-text-muted)" }}>
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">{t("loading")}</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="rounded-2xl border p-12 text-center"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("notFound")}</p>
      </div>
    );
  }

  const { team, registration, groupStandings, matches } = data;
  const displayName = registration?.displayName ?? team.name ?? team.club?.name ?? "—";
  const className = registration?.className ?? null;

  // Find this team's position in the group
  const myStanding = groupStandings?.standings.find((s) => s.teamId === Number(teamId));
  const myPosition = myStanding?.position ?? null;

  const noDateLabel = t("noDateSet");
  const grouped = groupByDate(matches, noDateLabel, locale);

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href={`/t/${org.slug}/${tourney.slug}/teams`}
        className="inline-flex items-center gap-1.5 text-sm font-medium transition-all hover:opacity-80"
        style={{ color: "var(--cat-text-muted)" }}
      >
        <ChevronLeft className="w-4 h-4" />
        {t("navTeams")}
      </Link>

      {/* ── Hero card ── */}
      <div
        className="rounded-2xl border p-5"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <div className="flex items-center gap-4">
          <TeamBadge
            team={{ name: displayName, club: team.club ? { badgeUrl: team.club.badgeUrl } : null }}
            size={56}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate" style={{ color: "var(--cat-text)" }}>
              {displayName}
            </h1>
            {team.club?.city && (
              <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                {team.club.city}
              </p>
            )}
            {(myPosition !== null || groupStandings) && (
              <p className="text-xs mt-1 font-medium" style={{ color: "var(--cat-text-muted)" }}>
                {groupStandings && (
                  <>
                    {t("teamGroupPosition", {
                      pos: myPosition !== null ? ordinalSuffix(myPosition, locale) : "—",
                      group: groupStandings.groupName,
                    })}
                  </>
                )}
              </p>
            )}
          </div>
          {className && (
            <span
              className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full"
              style={{
                background: "var(--cat-badge-open-bg)",
                color: "var(--cat-accent)",
                border: "1px solid var(--cat-accent)",
              }}
            >
              {className}
            </span>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div
        className="flex gap-1 p-1 rounded-2xl overflow-x-auto"
        style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}
      >
        {([
          { key: "overview", label: t("teamTabOverview"), Icon: Trophy },
          { key: "squad",    label: t("teamTabSquad"),    Icon: Users },
          { key: "stats",    label: t("teamTabStats"),    Icon: BarChart3 },
          { key: "matches",  label: t("teamTabMatches"),  Icon: CalendarDays },
        ] as const).map(({ key, label, Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold transition-all whitespace-nowrap"
              style={{
                background: isActive ? "var(--cat-card-bg)" : "transparent",
                color: isActive ? "var(--cat-accent)" : "var(--cat-text-muted)",
                border: isActive ? "1px solid var(--cat-card-border)" : "1px solid transparent",
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Group standings (only on overview) ── */}
      {activeTab === "overview" && groupStandings && groupStandings.standings.length > 0 && (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
        >
          {/* Section header */}
          <div
            className="px-4 py-3 border-b flex items-center gap-2"
            style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}
          >
            <Trophy className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
              {t("teamGroupStandings")} · {groupStandings.groupName}
            </h2>
          </div>

          {/* Table header */}
          <div
            className="grid grid-cols-[2rem_1fr_repeat(8,2.5rem)] gap-0 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide border-b"
            style={{ color: "var(--cat-text-muted)", borderColor: "var(--cat-card-border)" }}
          >
            <div className="text-center">#</div>
            <div>{t("colTeam")}</div>
            <div className="text-center">{t("colPlayed")}</div>
            <div className="text-center">{t("colWon")}</div>
            <div className="text-center">{t("colDrawn")}</div>
            <div className="text-center">{t("colLost")}</div>
            <div className="text-center">{t("colGoalsFor")}</div>
            <div className="text-center">{t("colGoalsAgainst")}</div>
            <div className="text-center">{t("colGoalDiff")}</div>
            <div className="text-center">{t("colPoints")}</div>
          </div>

          {/* Table rows */}
          {groupStandings.standings.map((row, idx) => {
            const isMe = row.teamId === Number(teamId);
            return (
              <div
                key={row.teamId}
                className="grid grid-cols-[2rem_1fr_repeat(8,2.5rem)] gap-0 px-3 py-2.5 items-center border-b last:border-b-0"
                style={{
                  borderColor: "var(--cat-card-border)",
                  background: isMe ? "rgba(43,254,186,0.04)" : idx % 2 === 0 ? "transparent" : "var(--cat-tag-bg)",
                  borderLeft: isMe ? "3px solid var(--cat-accent)" : "3px solid transparent",
                }}
              >
                <div
                  className="text-center text-xs font-bold"
                  style={{ color: isMe ? "var(--cat-accent)" : "var(--cat-text-muted)" }}
                >
                  {row.position ?? idx + 1}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <TeamBadge
                    team={row.team ? { ...row.team, name: row.team.name ?? "—" } : null}
                    size={20}
                  />
                  <span
                    className="text-xs font-semibold truncate"
                    style={{ color: isMe ? "var(--cat-text)" : "var(--cat-text-secondary)" }}
                  >
                    {row.team?.name ?? "—"}
                  </span>
                  {isMe && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: "var(--cat-accent)", color: "#0A0E14" }}
                    >
                      ★
                    </span>
                  )}
                </div>
                <div className="text-center text-xs tabular-nums" style={{ color: "var(--cat-text-secondary)" }}>
                  {row.played}
                </div>
                <div className="text-center text-xs tabular-nums" style={{ color: "var(--cat-text-secondary)" }}>
                  {row.won}
                </div>
                <div className="text-center text-xs tabular-nums" style={{ color: "var(--cat-text-secondary)" }}>
                  {row.drawn}
                </div>
                <div className="text-center text-xs tabular-nums" style={{ color: "var(--cat-text-secondary)" }}>
                  {row.lost}
                </div>
                <div className="text-center text-xs tabular-nums" style={{ color: "var(--cat-text-secondary)" }}>
                  {row.goalsFor}
                </div>
                <div className="text-center text-xs tabular-nums" style={{ color: "var(--cat-text-secondary)" }}>
                  {row.goalsAgainst}
                </div>
                <div
                  className="text-center text-xs tabular-nums font-medium"
                  style={{
                    color:
                      row.goalDiff > 0
                        ? "#10B981"
                        : row.goalDiff < 0
                        ? "#EF4444"
                        : "var(--cat-text-secondary)",
                  }}
                >
                  {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                </div>
                <div
                  className="text-center text-xs font-black tabular-nums"
                  style={{ color: isMe ? "var(--cat-accent)" : "var(--cat-text)" }}
                >
                  {row.points}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Matches tab ── */}
      {activeTab === "matches" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
              {t("teamMatches")}
            </h2>
            {matches.length > 0 && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}
              >
                {matches.length}
              </span>
            )}
          </div>

          {matches.length === 0 ? (
            <div
              className="rounded-2xl border py-12 text-center"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
            >
              <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--cat-accent)" }} />
              <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
                {t("teamNoMatches")}
              </p>
            </div>
          ) : (
            grouped.map(({ dateKey, label, matches: dayMatches }) => (
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
                {dayMatches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    locale={locale}
                    tFinished={t("finished")}
                    tGroup={t("group")}
                    tThirdPlace={t("thirdPlaceMatch")}
                    protocolHref={`/t/${org.slug}/${tourney.slug}/m/${m.id}`}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Overview tab: last 3 matches preview ── */}
      {activeTab === "overview" && matches.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
              <h2 className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
                {t("teamMatches")}
              </h2>
            </div>
            <button
              onClick={() => setActiveTab("matches")}
              className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition-all hover:opacity-80"
              style={{ color: "var(--cat-accent)" }}
            >
              {t("seeAll")} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {matches.slice(0, 3).map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              locale={locale}
              tFinished={t("finished")}
              tGroup={t("group")}
              tThirdPlace={t("thirdPlaceMatch")}
              protocolHref={`/t/${org.slug}/${tourney.slug}/m/${m.id}`}
            />
          ))}
        </div>
      )}

      {/* ── Squad tab ── */}
      {activeTab === "squad" && (
        <SquadTabView
          squad={squad}
          loading={squadLoading}
          t={{
            empty: t("teamSquadEmpty"),
            headerName: t("teamPlayer"),
            headerNumber: t("teamNumber"),
            headerPosition: t("teamPosition"),
            headerApps: t("teamAppearances"),
            staff: t("teamStaff"),
          }}
        />
      )}

      {/* ── Stats tab ── */}
      {activeTab === "stats" && (
        <StatsTabView
          squad={squad}
          loading={squadLoading}
          t={{
            empty: t("teamStatsEmpty"),
            topScorers: t("teamTopScorers"),
            topAssists: t("teamTopAssists"),
            topCards: t("teamTopCards"),
            noData: t("teamNoStatsYet"),
          }}
        />
      )}
    </div>
  );
}

// ─── Squad tab ──────────────────────────────────────────────

function SquadTabView({
  squad,
  loading,
  t,
}: {
  squad: SquadData | null;
  loading: boolean;
  t: {
    empty: string;
    headerName: string;
    headerNumber: string;
    headerPosition: string;
    headerApps: string;
    staff: string;
  };
}) {
  if (loading || !squad) {
    return (
      <div className="flex items-center justify-center py-12 gap-2" style={{ color: "var(--cat-text-muted)" }}>
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }
  if (squad.players.length === 0) {
    return (
      <div
        className="rounded-2xl border py-12 text-center"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <Users className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--cat-accent)" }} />
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t.empty}</p>
      </div>
    );
  }
  const players = squad.players.filter(p => p.personType === "player");
  const staff = squad.players.filter(p => p.personType !== "player");
  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <div
          className="grid grid-cols-[2.5rem_1fr_6rem_3rem] gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide border-b"
          style={{ color: "var(--cat-text-muted)", borderColor: "var(--cat-card-border)" }}
        >
          <div className="text-center">{t.headerNumber}</div>
          <div>{t.headerName}</div>
          <div>{t.headerPosition}</div>
          <div className="text-center">{t.headerApps}</div>
        </div>
        {players.map((p, idx) => (
          <div
            key={p.id}
            className="grid grid-cols-[2.5rem_1fr_6rem_3rem] gap-2 px-3 py-2 items-center border-b last:border-b-0"
            style={{
              borderColor: "var(--cat-card-border)",
              background: idx % 2 === 0 ? "transparent" : "var(--cat-tag-bg)",
            }}
          >
            <div className="text-center text-xs font-black tabular-nums" style={{ color: "var(--cat-accent)" }}>
              {p.shirtNumber ?? "—"}
            </div>
            <div className="text-xs font-semibold truncate" style={{ color: "var(--cat-text)" }}>
              {p.fullName}
            </div>
            <div className="text-[11px] truncate" style={{ color: "var(--cat-text-muted)" }}>
              {p.position ?? ""}
            </div>
            <div className="text-center text-xs tabular-nums" style={{ color: "var(--cat-text-secondary)" }}>
              {p.appearances}
            </div>
          </div>
        ))}
      </div>
      {staff.length > 0 && (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
        >
          <div
            className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide border-b"
            style={{ color: "var(--cat-text-muted)", borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}
          >
            {t.staff}
          </div>
          {staff.map((p, idx) => (
            <div
              key={p.id}
              className="px-3 py-2 text-xs border-b last:border-b-0"
              style={{ borderColor: "var(--cat-card-border)", background: idx % 2 === 0 ? "transparent" : "var(--cat-tag-bg)" }}
            >
              <span className="font-semibold" style={{ color: "var(--cat-text)" }}>{p.fullName}</span>
              {p.position && (
                <span className="ml-2" style={{ color: "var(--cat-text-muted)" }}>
                  · {p.position}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stats tab ──────────────────────────────────────────────

function StatsTabView({
  squad,
  loading,
  t,
}: {
  squad: SquadData | null;
  loading: boolean;
  t: {
    empty: string;
    topScorers: string;
    topAssists: string;
    topCards: string;
    noData: string;
  };
}) {
  if (loading || !squad) {
    return (
      <div className="flex items-center justify-center py-12 gap-2" style={{ color: "var(--cat-text-muted)" }}>
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }
  const players = squad.players.filter(p => p.personType === "player");
  if (players.length === 0) {
    return (
      <div
        className="rounded-2xl border py-12 text-center"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--cat-accent)" }} />
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t.empty}</p>
      </div>
    );
  }

  const scorers = [...players].filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals).slice(0, 5);
  const assisters = [...players].filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists).slice(0, 5);
  const carded = [...players]
    .filter(p => p.yellow > 0 || p.red > 0)
    .sort((a, b) => (b.red * 3 + b.yellow) - (a.red * 3 + a.yellow))
    .slice(0, 5);

  const Card = ({ title, rows, valueKey, valueLabel, emoji }: {
    title: string;
    rows: SquadPlayer[];
    valueKey: "goals" | "assists" | "cards";
    valueLabel: string;
    emoji: string;
  }) => (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
    >
      <div
        className="px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b"
        style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)", color: "var(--cat-text)" }}
      >
        <span>{emoji}</span>
        <span>{title}</span>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs" style={{ color: "var(--cat-text-muted)" }}>{t.noData}</div>
      ) : (
        rows.map((p, idx) => (
          <div
            key={p.id}
            className="grid grid-cols-[1.5rem_1fr_auto] gap-2 px-3 py-2 items-center border-b last:border-b-0"
            style={{
              borderColor: "var(--cat-card-border)",
              background: idx % 2 === 0 ? "transparent" : "var(--cat-tag-bg)",
            }}
          >
            <div className="text-center text-xs font-bold" style={{ color: "var(--cat-text-muted)" }}>
              {idx + 1}
            </div>
            <div className="text-xs font-semibold truncate" style={{ color: "var(--cat-text)" }}>
              {p.fullName}
            </div>
            <div className="text-xs font-black tabular-nums" style={{ color: "var(--cat-accent)" }}>
              {valueKey === "goals" ? p.goals
                : valueKey === "assists" ? p.assists
                : `${p.yellow}🟨${p.red > 0 ? ` ${p.red}🟥` : ""}`}
              {valueKey !== "cards" && (
                <span className="ml-1 text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                  {valueLabel}
                </span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Card title={t.topScorers} rows={scorers} valueKey="goals" valueLabel="G" emoji="⚽" />
      <Card title={t.topAssists} rows={assisters} valueKey="assists" valueLabel="A" emoji="🎯" />
      <Card title={t.topCards} rows={carded} valueKey="cards" valueLabel="" emoji="🟨" />
    </div>
  );
}
