"use client";

import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useTranslations, useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TeamBadge } from "@/components/ui/team-badge";
import {
  Loader2,
  Clock,
  MapPin,
  CheckCircle,
  Zap,
  ExternalLink,
  Navigation,
  ChevronLeft,
  ShieldCheck,
  ListOrdered,
  Users,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

// ─── Types ─────────────────────────────────────────────────

type MatchStatus = "scheduled" | "live" | "finished" | "cancelled" | "postponed";
type EventType =
  | "goal" | "own_goal" | "yellow" | "red" | "yellow_red"
  | "penalty_scored" | "penalty_missed"
  | "substitution_in" | "substitution_out"
  | "injury" | "var";

interface LineupPlayer {
  personId: number;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  shirtNumber: number | null;
  position: string | null;
  isStarting: boolean;
}

interface MatchEvent {
  id: number;
  teamId: number;
  side: "home" | "away" | null;
  personId: number | null;
  personName: string | null;
  assistPersonId: number | null;
  assistPersonName: string | null;
  eventType: EventType;
  minute: number;
  minuteExtra: number | null;
  notes: string | null;
}

interface ProtocolData {
  match: {
    id: number;
    matchNumber: number | null;
    status: MatchStatus;
    scheduledAt: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    homeScore: number | null;
    awayScore: number | null;
    homeTeam: { id: number; name: string; club: { name: string; badgeUrl: string | null } | null } | null;
    awayTeam: { id: number; name: string; club: { name: string; badgeUrl: string | null } | null } | null;
    field: {
      name: string;
      stadium: { name: string; mapsUrl: string | null; wazeUrl: string | null } | null;
    } | null;
    stage: { id: number; name: string; nameRu: string | null } | null;
    group: { id: number; name: string } | null;
    round: { id: number; name: string; shortName: string | null } | null;
    isThirdPlace: boolean;
  };
  lineup: {
    home: { starters: LineupPlayer[]; bench: LineupPlayer[] };
    away: { starters: LineupPlayer[]; bench: LineupPlayer[] };
  };
  events: MatchEvent[];
  stats: {
    home: { goals: number; yellow: number; red: number };
    away: { goals: number; yellow: number; red: number };
  };
}

// ─── Helpers ────────────────────────────────────────────────

function eventIcon(type: EventType): string {
  switch (type) {
    case "goal":
    case "penalty_scored":
      return "⚽";
    case "own_goal":
      return "🥅";
    case "penalty_missed":
      return "❌";
    case "yellow":
      return "🟨";
    case "red":
      return "🟥";
    case "yellow_red":
      return "🟨🟥";
    case "substitution_in":
      return "🔺";
    case "substitution_out":
      return "🔻";
    case "injury":
      return "🤕";
    case "var":
      return "📺";
    default:
      return "•";
  }
}

function eventLabel(type: EventType, t: (k: string) => string): string {
  const map: Record<EventType, string> = {
    goal: t("matchEventGoal"),
    own_goal: t("matchEventOwnGoal"),
    penalty_scored: t("matchEventPenaltyScored"),
    penalty_missed: t("matchEventPenaltyMissed"),
    yellow: t("matchEventYellow"),
    red: t("matchEventRed"),
    yellow_red: t("matchEventYellowRed"),
    substitution_in: t("matchEventSubIn"),
    substitution_out: t("matchEventSubOut"),
    injury: t("matchEventInjury"),
    var: t("matchEventVar"),
  };
  return map[type] ?? type;
}

function formatMinute(m: number, extra: number | null): string {
  if (extra && extra > 0) return `${m}+${extra}'`;
  return `${m}'`;
}

// ─── Components ─────────────────────────────────────────────

function LineupColumn({
  title, players, benchTitle, bench, side,
}: {
  title: string;
  players: LineupPlayer[];
  benchTitle: string;
  bench: LineupPlayer[];
  side: "home" | "away";
}) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
    >
      <div
        className="px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b"
        style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)", color: "var(--cat-text)" }}
      >
        <ShieldCheck className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
        <span>{title}</span>
      </div>
      {players.length === 0 && bench.length === 0 ? (
        <div className="py-8 text-center text-xs" style={{ color: "var(--cat-text-muted)" }}>
          —
        </div>
      ) : (
        <>
          {players.map((p, idx) => (
            <div
              key={p.personId}
              className="grid grid-cols-[2rem_1fr_auto] gap-2 px-3 py-1.5 items-center border-b last:border-b-0"
              style={{
                borderColor: "var(--cat-card-border)",
                background: idx % 2 === 0 ? "transparent" : "var(--cat-tag-bg)",
              }}
            >
              <div className="text-center text-[11px] font-black tabular-nums" style={{ color: "var(--cat-accent)" }}>
                {p.shirtNumber ?? "—"}
              </div>
              <div className="text-xs font-semibold truncate" style={{ color: "var(--cat-text)" }}>
                {p.fullName}
              </div>
              <div className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                {p.position ?? ""}
              </div>
            </div>
          ))}
          {bench.length > 0 && (
            <>
              <div
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide border-t"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)", borderColor: "var(--cat-card-border)" }}
              >
                {benchTitle}
              </div>
              {bench.map((p, idx) => (
                <div
                  key={p.personId}
                  className="grid grid-cols-[2rem_1fr_auto] gap-2 px-3 py-1.5 items-center border-b last:border-b-0 opacity-80"
                  style={{
                    borderColor: "var(--cat-card-border)",
                    background: idx % 2 === 0 ? "transparent" : "var(--cat-tag-bg)",
                  }}
                >
                  <div className="text-center text-[11px] font-black tabular-nums" style={{ color: "var(--cat-text-muted)" }}>
                    {p.shirtNumber ?? "—"}
                  </div>
                  <div className="text-xs truncate" style={{ color: "var(--cat-text-secondary)" }}>
                    {p.fullName}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                    {p.position ?? ""}
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}
      {side === "home" /* decorative anchor */ && null}
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────

export default function MatchProtocolPage() {
  const { org, tournament: tourney } = useTournamentPublic();
  const t = useTranslations("tournament");
  const locale = useLocale();
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;

  const [data, setData] = useState<ProtocolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/public/t/${org.slug}/${tourney.slug}/m/${matchId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: ProtocolData) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [org.slug, tourney.slug, matchId]);

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

  const { match, lineup, events } = data;
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  const stageMeta = [
    match.stage?.name,
    match.group ? `${t("group")} ${match.group.name}` : null,
    match.isThirdPlace ? `🥉 ${t("thirdPlaceMatch")}` : (match.round?.shortName ?? match.round?.name),
  ].filter(Boolean).join(" · ");

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href={`/t/${org.slug}/${tourney.slug}/schedule`}
        className="inline-flex items-center gap-1.5 text-sm font-medium transition-all hover:opacity-80"
        style={{ color: "var(--cat-text-muted)" }}
      >
        <ChevronLeft className="w-4 h-4" />
        {t("matchProtocol")}
      </Link>

      {/* Hero — score card */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "var(--cat-card-bg)",
          borderColor: isLive ? "var(--cat-accent)" : "var(--cat-card-border)",
          boxShadow: isLive ? "0 0 20px var(--cat-accent-glow)" : undefined,
        }}
      >
        {/* top meta */}
        <div
          className="flex items-center justify-between gap-2 px-4 py-2 border-b flex-wrap"
          style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {isLive && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse"
                style={{ background: "var(--cat-accent)", color: "#0A0E14" }}>
                <Zap className="w-2.5 h-2.5" /> LIVE
              </span>
            )}
            {isFinished && (
              <span className="flex items-center gap-1 text-[10px] font-semibold"
                style={{ color: "var(--cat-text-muted)" }}>
                <CheckCircle className="w-3 h-3" /> {t("finished")}
              </span>
            )}
            {stageMeta && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}>
                {stageMeta}
              </span>
            )}
            {match.matchNumber && (
              <span className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                #{match.matchNumber}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
            {match.scheduledAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(match.scheduledAt).toLocaleString(locale, {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            )}
            {match.field && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {match.field.stadium ? `${match.field.stadium.name} — ${match.field.name}` : match.field.name}
              </span>
            )}
            {match.field?.stadium?.mapsUrl && (
              <a
                href={match.field.stadium.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg font-bold transition-all hover:opacity-80"
                style={{
                  background: "rgba(66,133,244,0.15)",
                  color: "#4285f4",
                  border: "1px solid rgba(66,133,244,0.25)",
                }}
              >
                <ExternalLink className="w-2.5 h-2.5" />
                <span className="text-[10px]">Maps</span>
              </a>
            )}
            {match.field?.stadium?.wazeUrl && (
              <a
                href={match.field.stadium.wazeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg font-bold transition-all hover:opacity-80"
                style={{
                  background: "rgba(0,211,136,0.12)",
                  color: "#00d388",
                  border: "1px solid rgba(0,211,136,0.2)",
                }}
              >
                <Navigation className="w-2.5 h-2.5" />
                <span className="text-[10px]">Waze</span>
              </a>
            )}
          </div>
        </div>

        {/* Teams + score */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 px-6 py-6">
          {/* Home */}
          <Link
            href={match.homeTeam ? `/t/${org.slug}/${tourney.slug}/teams/${match.homeTeam.id}` : "#"}
            className="flex flex-col items-center gap-2 transition-all hover:opacity-80"
          >
            <TeamBadge team={match.homeTeam} size={64} />
            <span className="text-sm font-bold text-center leading-tight" style={{ color: "var(--cat-text)" }}>
              {match.homeTeam?.name ?? "TBD"}
            </span>
            {match.homeTeam?.club?.name && match.homeTeam.club.name !== match.homeTeam.name && (
              <span className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                {match.homeTeam.club.name}
              </span>
            )}
          </Link>

          {/* Score */}
          <div className="flex items-center gap-2">
            {isFinished || isLive ? (
              <>
                <span className="text-5xl font-black tabular-nums w-14 text-center" style={{ color: "var(--cat-text)" }}>
                  {match.homeScore ?? 0}
                </span>
                <span className="text-3xl font-bold" style={{ color: "var(--cat-text-muted)" }}>:</span>
                <span className="text-5xl font-black tabular-nums w-14 text-center" style={{ color: "var(--cat-text)" }}>
                  {match.awayScore ?? 0}
                </span>
              </>
            ) : (
              <span className="text-sm font-bold px-4 py-2 rounded-xl"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                vs
              </span>
            )}
          </div>

          {/* Away */}
          <Link
            href={match.awayTeam ? `/t/${org.slug}/${tourney.slug}/teams/${match.awayTeam.id}` : "#"}
            className="flex flex-col items-center gap-2 transition-all hover:opacity-80"
          >
            <TeamBadge team={match.awayTeam} size={64} />
            <span className="text-sm font-bold text-center leading-tight" style={{ color: "var(--cat-text)" }}>
              {match.awayTeam?.name ?? "TBD"}
            </span>
            {match.awayTeam?.club?.name && match.awayTeam.club.name !== match.awayTeam.name && (
              <span className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                {match.awayTeam.club.name}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
          <h2 className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
            {t("matchTimeline")}
          </h2>
        </div>

        {events.length === 0 ? (
          <div
            className="rounded-2xl border py-10 text-center"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("matchNoEvents")}</p>
          </div>
        ) : (
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
          >
            {events.map((e, idx) => (
              <div
                key={e.id}
                className="grid grid-cols-[3fr_auto_3fr] gap-2 px-4 py-2.5 items-center border-b last:border-b-0"
                style={{
                  borderColor: "var(--cat-card-border)",
                  background: idx % 2 === 0 ? "transparent" : "var(--cat-tag-bg)",
                }}
              >
                {/* Home cell */}
                <div className="flex items-center gap-2 justify-end">
                  {e.side === "home" && (
                    <>
                      <div className="text-right">
                        <div className="text-xs font-semibold" style={{ color: "var(--cat-text)" }}>
                          {e.personName ?? "—"}
                        </div>
                        {e.assistPersonName && (
                          <div className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                            {t("assist")}: {e.assistPersonName}
                          </div>
                        )}
                      </div>
                      <span className="text-lg">{eventIcon(e.eventType)}</span>
                    </>
                  )}
                </div>

                {/* Minute */}
                <div
                  className="text-center text-[11px] font-black tabular-nums px-2 py-1 rounded-lg min-w-[3rem]"
                  style={{ background: "var(--cat-tag-bg)", color: "var(--cat-accent)" }}
                  title={eventLabel(e.eventType, t)}
                >
                  {formatMinute(e.minute, e.minuteExtra)}
                </div>

                {/* Away cell */}
                <div className="flex items-center gap-2 justify-start">
                  {e.side === "away" && (
                    <>
                      <span className="text-lg">{eventIcon(e.eventType)}</span>
                      <div className="text-left">
                        <div className="text-xs font-semibold" style={{ color: "var(--cat-text)" }}>
                          {e.personName ?? "—"}
                        </div>
                        {e.assistPersonName && (
                          <div className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                            {t("assist")}: {e.assistPersonName}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lineups */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
          <h2 className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
            {t("matchStarters")}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <LineupColumn
            title={match.homeTeam?.name ?? t("matchLineupHome")}
            players={lineup.home.starters}
            benchTitle={t("matchBench")}
            bench={lineup.home.bench}
            side="home"
          />
          <LineupColumn
            title={match.awayTeam?.name ?? t("matchLineupAway")}
            players={lineup.away.starters}
            benchTitle={t("matchBench")}
            bench={lineup.away.bench}
            side="away"
          />
        </div>
      </div>
    </div>
  );
}
