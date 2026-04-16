"use client";

import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useTranslations, useLocale } from "next-intl";
import React, { useEffect, useState, useRef } from "react";
import {
  Trophy, TrendingUp, Loader2, ArrowUpRight, Star, Shield, Radio,
  Crown, Zap, Clock, GitBranch, MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// STANDINGS TYPES
// ─────────────────────────────────────────────────────────────────────────────

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
  provisional?: boolean;
  livePoints?: number;
  team?: { name?: string | null; club?: { badgeUrl?: string | null; name?: string | null } | null } | null;
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

interface GroupStage {
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
  classId?: number | null;
  className?: string | null;
}

interface StandingsResponse {
  liveEnabled: boolean;
  hasLive: boolean;
  stages: GroupStage[];
}

// ─────────────────────────────────────────────────────────────────────────────
// BRACKET TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface BracketMatch {
  id: number;
  matchNumber?: number | null;
  status: string;
  scheduledAt?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeam?: { name?: string | null; club?: { name?: string | null; badgeUrl?: string | null } | null } | null;
  awayTeam?: { name?: string | null; club?: { name?: string | null; badgeUrl?: string | null } | null } | null;
  field?: { name: string; stadium?: { name: string } | null } | null;
  homeSlotLabel?: string | null;
  homeSlotLabelRu?: string | null;
  awaySlotLabel?: string | null;
  awaySlotLabelRu?: string | null;
}

interface BracketRound {
  id: number;
  name: string;
  nameRu?: string | null;
  nameEt?: string | null;
  shortName?: string | null;
  order: number;
  matchCount: number;
  isTwoLegged: boolean;
  hasThirdPlace: boolean;
  matches: BracketMatch[];
}

interface BracketStage {
  stage: {
    id: number;
    name: string;
    nameRu?: string | null;
    nameEt?: string | null;
    status: string;
  };
  rounds: BracketRound[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const GROUP_COLORS = [
  "#2BFEBA", "#3B82F6", "#F59E0B", "#8B5CF6",
  "#EF4444", "#06B6D4", "#EC4899", "#84CC16",
];

const DIV_PALETTE = ["#3B82F6", "#EC4899", "#8B5CF6", "#F59E0B", "#10B981", "#06B6D4"];

function divisionColor(name: string, index: number): string {
  const u = name.toUpperCase();
  if (u.startsWith("U") || u.startsWith("B")) return DIV_PALETTE[index % DIV_PALETTE.length];
  if (u.startsWith("G")) return "#EC4899";
  return DIV_PALETTE[index % DIV_PALETTE.length];
}

function groupLetter(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length - 1] ?? name[0] ?? "?").toUpperCase();
}

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

function getCompetitionMeta(name: string): { color: string; icon: string } {
  const n = name.toLowerCase();
  if (n.includes("champion") || n.includes("gold") || n.includes("чемпион"))
    return { color: "#F59E0B", icon: "🏆" };
  if (n.includes("europa") || n.includes("silver") || n.includes("европ"))
    return { color: "#F97316", icon: "🥈" };
  if (n.includes("conference") || n.includes("bronze"))
    return { color: "#10B981", icon: "🥉" };
  if (n.includes("b-playoff") || n.includes("b playoff") || n.includes("б-плей"))
    return { color: "#8B5CF6", icon: "⚽" };
  return { color: "#3B82F6", icon: "🎯" };
}

// ─────────────────────────────────────────────────────────────────────────────
// STANDINGS COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

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

function StandingsRow({ s, zones, isLeague, brand, liveMatches }: {
  s: Standing;
  zones: Zone[];
  isLeague: boolean;
  brand: string;
  liveMatches?: LiveMatch[];
}) {
  const zone      = getZoneForPosition(s.position, zones);
  const zoneStyle = zone ? getZoneStyle(zone.targetName, zone.targetType) : null;
  const isLastZone = zone ? s.position === zone.toRank : false;
  const isLive    = s.provisional === true;

  const liveMatch = liveMatches?.find(m => m.homeTeamId === s.teamId || m.awayTeamId === s.teamId);
  const isHome    = liveMatch?.homeTeamId === s.teamId;
  const liveScore = liveMatch
    ? isHome ? `${liveMatch.homeScore}:${liveMatch.awayScore}` : `${liveMatch.awayScore}:${liveMatch.homeScore}`
    : null;

  return (
    <tr style={{
      background:   isLive ? "rgba(239,68,68,0.04)" : zoneStyle ? zoneStyle.bg : "transparent",
      borderBottom: isLastZone ? `2px solid ${zoneStyle!.border}40` : "1px solid var(--cat-card-border)",
      transition:   "background 0.3s",
    }}>
      <td className="w-1 py-0 px-0" style={{ padding: 0 }}>
        <div className="h-full w-1" style={{ background: zoneStyle ? zoneStyle.color : "transparent", minHeight: "44px" }} />
      </td>
      <td className="px-2 py-2.5 w-9 text-center">
        <span className="text-sm font-black tabular-nums"
          style={{ color: zoneStyle ? zoneStyle.color : "var(--cat-text-muted)" }}>{s.position}</span>
      </td>
      <td className="px-2 py-2.5 min-w-[140px]">
        <div className="flex items-center gap-2">
          {s.team?.club?.badgeUrl ? (
            <img src={s.team.club.badgeUrl} alt="" className="w-6 h-6 rounded-md object-contain shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center text-[9px] font-bold"
              style={{ background: `${brand}18`, color: brand }}>
              {(s.team?.name ?? s.team?.club?.name ?? "?")[0]}
            </div>
          )}
          <span className="text-[13px] font-semibold leading-tight" style={{ color: "var(--cat-text)" }}>
            {s.team?.name ?? s.team?.club?.name ?? "—"}
          </span>
          {isLive && liveScore && (
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-black"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
              🔴 {liveScore}
            </span>
          )}
        </div>
      </td>
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
      <td className="px-3 py-2.5 text-center w-10">
        <span className="text-sm font-black tabular-nums" style={{ color: isLive ? "#ef4444" : brand }}>
          {s.points}
          {isLive && (s.livePoints ?? 0) > 0 && (
            <span className="text-[9px] font-bold ml-0.5 opacity-60">+{s.livePoints}</span>
          )}
        </span>
      </td>
    </tr>
  );
}

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

function GroupTable({ group, zones, isLeague, brand, t, groupIndex = 0 }: {
  group: Group;
  zones: Zone[];
  isLeague: boolean;
  brand: string;
  t: ReturnType<typeof useTranslations>;
  groupIndex?: number;
}) {
  return (
    <div className="rounded-2xl overflow-hidden border"
      style={{
        borderColor: group.isLive ? "rgba(239,68,68,0.35)" : "var(--cat-card-border)",
        background: "var(--cat-card-bg)",
        boxShadow: group.isLive ? "0 0 20px rgba(239,68,68,0.08)" : undefined,
      }}>
      {!isLeague && (
        <div className="flex items-center gap-2.5 px-4 py-3 border-b"
          style={{ borderColor: "var(--cat-card-border)", background: "rgba(43,254,186,0.04)" }}>
          {(() => {
            const gc = GROUP_COLORS[groupIndex % GROUP_COLORS.length];
            const gl = groupLetter(group.name);
            return (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                style={{ background: `${gc}22`, color: gc, border: `1.5px solid ${gc}55` }}>
                {gl}
              </div>
            );
          })()}
          <span className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
            {t("groupLabel")} {groupLetter(group.name)}
          </span>
          <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
            · {group.standings.length} {t("teams")}
          </span>
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
                s={s} zones={zones} isLeague={isLeague} brand={brand}
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

// ─────────────────────────────────────────────────────────────────────────────
// BRACKET COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const CARD_W   = 256;
const TEAM_H   = 48;   // height per team row
const FOOTER_H = 26;   // time/field footer row height
const COL_GAP  = 56;   // gap between columns (for connectors)
const HEADER_H = 60;   // round header block height
const MIN_SLOT = TEAM_H * 2 + 24;  // min slot height = 120px

// ── Bracket positioning helpers ──────────────────────────────────────────────
// Rounds are displayed left→right: round 0 = earliest (QF), round K-1 = Final.
// Each match in round i occupies a "slot" of height slotH = 2^i * MIN_SLOT.
// The card is vertically centered in its slot.

function slotH(ri: number): number { return Math.pow(2, ri) * MIN_SLOT; }
function matchCY(ri: number, mi: number): number { return (mi + 0.5) * slotH(ri); }
function matchCardH(match: BracketMatch | null): number {
  return TEAM_H * 2 + (match?.scheduledAt || match?.field ? FOOTER_H : 0);
}
function matchTopPx(ri: number, mi: number): number { return matchCY(ri, mi) - TEAM_H; }
function bracketTotalH(K: number): number { return Math.pow(2, K - 1) * MIN_SLOT; }

/** Extract earliest date from a round's matches */
function roundDate(matches: BracketMatch[], locale: string): string | null {
  const dates = matches
    .map(m => m.scheduledAt ? new Date(m.scheduledAt).getTime() : null)
    .filter(Boolean) as number[];
  if (dates.length === 0) return null;
  const earliest = new Date(Math.min(...dates));
  return earliest.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/** Single team row inside a match card */
function BracketTeamRow({ team, score, won, isLive, isFinished, brand, isTop, slotLabel }: {
  team?: { name?: string | null; club?: { name?: string | null; badgeUrl?: string | null } | null } | null;
  score?: number | null;
  won: boolean;
  isLive: boolean;
  isFinished: boolean;
  brand: string;
  isTop: boolean;
  slotLabel?: string | null;
}) {
  const isTBD       = !team;
  const displayName = team?.name ?? team?.club?.name ?? null;
  const initials    = displayName
    ? displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div
      className="flex items-center gap-2 px-3"
      style={{
        height: TEAM_H,
        borderBottom: isTop ? "1px solid var(--cat-divider)" : undefined,
        background: won
          ? `linear-gradient(90deg, ${brand}22 0%, ${brand}08 50%, transparent 100%)`
          : "transparent",
        transition: "background 0.2s",
        position: "relative",
      }}
    >
      {/* Left accent stripe for winner — 4px */}
      {won && (
        <div
          className="absolute left-0 top-0 bottom-0"
          style={{
            width: 4,
            background: `linear-gradient(180deg, ${brand}, ${brand}80)`,
            borderRadius: "0 2px 2px 0",
          }}
        />
      )}

      {/* Badge 28×28 */}
      <div
        className="shrink-0 flex items-center justify-center overflow-hidden"
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: isTBD
            ? "var(--cat-tag-bg)"
            : won
            ? `${brand}15`
            : "var(--cat-tag-bg)",
          border: `1px solid ${won ? `${brand}50` : "var(--cat-card-border)"}`,
        }}
      >
        {team?.club?.badgeUrl ? (
          <img src={team.club.badgeUrl} alt="" className="w-full h-full object-contain" />
        ) : isTBD ? (
          <span className="text-[9px] font-black" style={{ color: "var(--cat-text-faint)" }}>?</span>
        ) : (
          <span className="text-[9px] font-black" style={{ color: brand }}>{initials}</span>
        )}
      </div>

      {/* Name + optional slot label */}
      <div className="flex-1 min-w-0">
        <span
          className="block text-[13px] font-semibold truncate leading-tight"
          style={{
            color: isTBD
              ? "var(--cat-text-muted)"
              : won
              ? "var(--cat-text)"
              : "var(--cat-text-secondary)",
          }}
        >
          {displayName ?? (slotLabel ? "" : "TBD")}
        </span>
        {isTBD && slotLabel && (
          <span
            className="block truncate leading-tight mt-0.5"
            style={{ fontSize: 9, color: "var(--cat-text-faint)", fontStyle: "italic" }}
          >
            {slotLabel}
          </span>
        )}
      </div>

      {/* Score */}
      {(isFinished || isLive) && !isTBD ? (
        <span
          className="tabular-nums ml-1 shrink-0"
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: won ? brand : "var(--cat-text-muted)",
            textShadow: won ? `0 0 16px ${brand}80` : undefined,
            minWidth: 22,
            textAlign: "right",
          }}
        >
          {score ?? 0}
        </span>
      ) : !isTBD ? (
        <span className="w-5 shrink-0" />
      ) : null}
    </div>
  );
}

/** Single match card */
function BracketMatchCard({ match, brand, isFinal, locale, colIndex }: {
  match: BracketMatch | null;
  brand: string;
  isFinal?: boolean;
  locale: string;
  colIndex: number;
}) {
  const isFinished = match?.status === "finished";
  const isLive     = match?.status === "live";
  const homeWon    = isFinished && (match!.homeScore ?? 0) > (match!.awayScore ?? 0);
  const awayWon    = isFinished && (match!.awayScore ?? 0) > (match!.homeScore ?? 0);

  const hasTime     = !!match?.scheduledAt;
  const hasField    = !!match?.field?.name;
  const stadiumName = match?.field?.stadium?.name ?? null;
  const fieldName   = match?.field?.name ?? null;
  const venueStr    = stadiumName && stadiumName !== fieldName
    ? `${stadiumName} · ${fieldName}`
    : (fieldName ?? stadiumName);
  const timeStr     = hasTime
    ? new Date(match!.scheduledAt!).toLocaleString(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  const cardH = matchCardH(match);

  const homeSlot = locale === "ru" ? (match?.homeSlotLabelRu ?? match?.homeSlotLabel) : match?.homeSlotLabel;
  const awaySlot = locale === "ru" ? (match?.awaySlotLabelRu ?? match?.awaySlotLabel) : match?.awaySlotLabel;

  const cardBg = isLive
    ? `linear-gradient(135deg, ${brand}12, var(--cat-card-bg))`
    : isFinal && isFinished
    ? `linear-gradient(135deg, ${brand}08, var(--cat-card-bg))`
    : "var(--cat-card-bg)";

  const cardBorder = isLive
    ? `2px solid ${brand}60`
    : isFinal && isFinished
    ? `1px solid ${brand}35`
    : isFinished
    ? `1px solid var(--cat-input-border)`
    : `1px solid var(--cat-card-border)`;

  const cardShadow = isLive
    ? `0 0 24px ${brand}20, 0 4px 16px rgba(0,0,0,0.1)`
    : isFinal && isFinished
    ? `0 8px 24px rgba(0,0,0,0.08), 0 0 0 1px ${brand}12`
    : isFinished
    ? `0 2px 8px rgba(0,0,0,0.05)`
    : `var(--cat-card-shadow)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: colIndex * 0.05, ease: "easeOut" }}
      whileHover={{
        y: -2,
        boxShadow: `0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px ${brand}25`,
      }}
      style={{ width: CARD_W, height: cardH, cursor: "default" }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: cardBg,
          border: cardBorder,
          boxShadow: cardShadow,
          position: "relative",
        }}
      >
        {/* Match number badge */}
        {match?.matchNumber != null && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 6,
              fontSize: 8,
              color: "var(--cat-text-faint)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            #{match.matchNumber}
          </span>
        )}

        {/* LIVE animated top bar (3px) */}
        {isLive && (
          <motion.div
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{ height: 3, background: brand, flexShrink: 0 }}
          />
        )}

        {/* Team rows */}
        <div style={{ flex: 1 }}>
          <BracketTeamRow
            team={match?.homeTeam ?? null}
            score={match?.homeScore}
            won={homeWon}
            isLive={!!isLive}
            isFinished={!!isFinished}
            brand={brand}
            isTop
            slotLabel={homeSlot}
          />
          <BracketTeamRow
            team={match?.awayTeam ?? null}
            score={match?.awayScore}
            won={awayWon}
            isLive={!!isLive}
            isFinished={!!isFinished}
            brand={brand}
            isTop={false}
            slotLabel={awaySlot}
          />
        </div>

        {/* Footer: time + venue */}
        {(hasTime || hasField) && (
          <div
            className="flex items-center gap-2 px-3"
            style={{
              height: FOOTER_H,
              borderTop: "1px solid var(--cat-divider)",
              flexShrink: 0,
            }}
          >
            {timeStr && (
              <span className="flex items-center gap-1 font-semibold shrink-0"
                style={{ fontSize: 10, color: "var(--cat-text-secondary)" }}>
                <Clock style={{ width: 10, height: 10, flexShrink: 0, color: brand }} />
                {timeStr}
              </span>
            )}
            {venueStr && (
              <>
                {timeStr && <span style={{ color: "var(--cat-text-faint)", fontSize: 10 }}>·</span>}
                <span className="flex items-center gap-1 font-medium truncate"
                  style={{ fontSize: 10, color: "var(--cat-text-muted)" }}>
                  <MapPin style={{ width: 10, height: 10, flexShrink: 0, color: brand }} />
                  {venueStr}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** Right-angle SVG connectors between round columns */
function BracketConnectors({ rounds, totalH, brand }: {
  rounds: BracketRound[];
  totalH: number;
  brand: string;
}) {
  const totalW = rounds.length * (CARD_W + COL_GAP) - COL_GAP;
  const lines: React.ReactNode[] = [];

  rounds.forEach((round, ri) => {
    if (ri === rounds.length - 1) return;
    const x1 = ri * (CARD_W + COL_GAP) + CARD_W;
    const x2 = (ri + 1) * (CARD_W + COL_GAP);
    const mx = (x1 + x2) / 2;
    const matchCount = round.matchCount;

    for (let m = 0; m < matchCount; m += 2) {
      const topY     = matchCY(ri, m);
      const botY     = matchCY(ri, m + 1);
      const outY     = (topY + botY) / 2;
      const topDone  = round.matches[m]?.status === "finished";
      const botDone  = round.matches[m + 1]?.status === "finished";
      const pairDone = topDone && botDone;

      const lc   = pairDone ? `${brand}80` : "var(--cat-bracket-line)";
      const sw   = pairDone ? 2 : 1.5;
      const outC = pairDone ? brand : lc;
      const outW = pairDone ? 2.5 : sw;

      lines.push(
        <g key={`${ri}-${m}`}>
          {/* Horizontal exit lines from each match */}
          <line x1={x1} y1={topY} x2={mx} y2={topY} stroke={lc} strokeWidth={sw} />
          {/* End cap circles at x1 side */}
          <circle cx={x1} cy={topY} r={2} fill={topDone ? brand : "var(--cat-text-faint)"} />

          {m + 1 < matchCount && (
            <>
              <line x1={x1} y1={botY} x2={mx} y2={botY} stroke={lc} strokeWidth={sw} />
              <circle cx={x1} cy={botY} r={2} fill={botDone ? brand : "var(--cat-text-faint)"} />
              {/* Vertical bar joining top & bottom */}
              <line x1={mx} y1={topY} x2={mx} y2={botY} stroke={lc} strokeWidth={sw} />
              {/* Output line to next round */}
              <line x1={mx} y1={outY} x2={x2} y2={outY} stroke={outC} strokeWidth={outW} />
              {/* Junction dot */}
              <circle cx={mx} cy={outY} r={3.5} fill={pairDone ? brand : "var(--cat-text-faint)"} />
            </>
          )}
        </g>
      );
    }
  });

  return (
    <svg
      width={totalW}
      height={totalH}
      viewBox={`0 0 ${totalW} ${totalH}`}
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", overflow: "visible" }}
    >
      {lines}
    </svg>
  );
}

/** Desktop bracket grid — absolute-positioned, mathematically aligned */
function BracketGrid({ rounds, brand, locale, t }: {
  rounds: BracketRound[];
  brand: string;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const K      = rounds.length;
  const totalH = bracketTotalH(K);
  const totalW = K * (CARD_W + COL_GAP) - COL_GAP;

  return (
    <div className="overflow-x-auto pb-6" style={{ scrollbarWidth: "thin" }}>
      <div style={{ position: "relative", width: totalW, height: totalH + HEADER_H, minWidth: totalW }}>

        {/* ── Round headers ── */}
        {rounds.map((round, ri) => {
          const isFinal  = round.shortName?.toUpperCase() === "F" || round.name.toLowerCase() === "final";
          const gold     = "#F59E0B";
          const hdrColor = isFinal ? gold : brand;
          const dateStr  = roundDate(round.matches, locale);
          const label    = locale === "ru"
            ? (round.nameRu ?? round.name)
            : locale === "et"
            ? (round.nameEt ?? round.name)
            : round.name;

          return (
            <motion.div
              key={round.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ri * 0.06 }}
              style={{
                position: "absolute",
                left: ri * (CARD_W + COL_GAP),
                top: 0,
                width: CARD_W,
                height: HEADER_H,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                paddingBottom: 8,
                borderBottom: isFinal
                  ? `1px solid ${gold}40`
                  : `1px solid var(--cat-divider)`,
                background: isFinal
                  ? `linear-gradient(180deg, ${gold}08 0%, transparent 100%)`
                  : undefined,
                borderRadius: isFinal ? "8px 8px 0 0" : undefined,
              }}
            >
              <div className="flex items-center gap-1.5 px-1">
                {isFinal && <Crown style={{ width: 14, height: 14, flexShrink: 0, color: gold }} />}
                <span style={{
                  fontSize: isFinal ? 13 : 11,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: isFinal ? gold : "var(--cat-text-secondary)",
                }}>
                  {label}
                </span>
              </div>

              {dateStr ? (
                <p className="mt-0.5 px-1" style={{ fontSize: 13, fontWeight: 700, color: isFinal ? "var(--cat-text)" : "var(--cat-text-secondary)" }}>
                  {dateStr}
                </p>
              ) : (
                <p className="mt-0.5 px-1" style={{ fontSize: 11, color: "var(--cat-text-muted)" }}>
                  {round.matchCount} {round.matchCount === 1 ? t("matchSingular") : t("matchPlural")}
                </p>
              )}

              {isFinal && (
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, ${gold}80, ${gold}20, transparent)`,
                  borderRadius: 1,
                }} />
              )}
            </motion.div>
          );
        })}

        {/* ── SVG connectors layer ── */}
        <div style={{ position: "absolute", left: 0, top: HEADER_H, width: totalW, height: totalH }}>
          <BracketConnectors rounds={rounds} totalH={totalH} brand={brand} />
        </div>

        {/* ── Match cards ── */}
        {rounds.map((round, ri) => {
          const isFinalRound = round.shortName?.toUpperCase() === "F" || round.name.toLowerCase() === "final";
          const gold = "#F59E0B";

          // For the Final round with 3rd place: render Final at slot 0, 3rd place right below it
          if (isFinalRound && round.hasThirdPlace && round.matchCount >= 2) {
            const finalMatch    = round.matches[0] ?? null;
            const thirdMatch    = round.matches[1] ?? null;
            const finalTopY     = HEADER_H + matchTopPx(ri, 0);
            const finalCardH    = matchCardH(finalMatch);
            const thirdTopY     = finalTopY + finalCardH + 16;

            return (
              <React.Fragment key={round.id}>
                {/* Final match */}
                <div style={{ position: "absolute", left: ri * (CARD_W + COL_GAP), top: finalTopY, width: CARD_W }}>
                  <BracketMatchCard match={finalMatch} brand={gold} isFinal locale={locale} colIndex={ri} />
                </div>
                {/* 3rd place match */}
                <div style={{ position: "absolute", left: ri * (CARD_W + COL_GAP), top: thirdTopY, width: CARD_W }}>
                  {/* Badge */}
                  <div className="flex items-center gap-1.5 mb-1.5 px-1">
                    <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(156,163,175,0.15)", color: "var(--cat-text-muted)" }}>
                      🥉 {t("thirdPlace")}
                    </span>
                  </div>
                  <BracketMatchCard match={thirdMatch} brand={brand} locale={locale} colIndex={ri} />
                </div>
              </React.Fragment>
            );
          }

          // Regular rounds
          const emptyCount = Math.max(0, round.matchCount - round.matches.length);
          const slots: (BracketMatch | null)[] = [...round.matches, ...Array(emptyCount).fill(null)];

          return slots.map((match, mi) => (
            <div
              key={match ? match.id : `empty-${ri}-${mi}`}
              style={{
                position: "absolute",
                left: ri * (CARD_W + COL_GAP),
                top: HEADER_H + matchTopPx(ri, mi),
                width: CARD_W,
              }}
            >
              <BracketMatchCard
                match={match}
                brand={isFinalRound ? "#F59E0B" : brand}
                isFinal={isFinalRound}
                locale={locale}
                colIndex={ri}
              />
            </div>
          ));
        })}
      </div>
    </div>
  );
}

/** Winner banner */
function WinnerBanner({ match, brand, tWinner }: { match: BracketMatch | undefined; brand: string; tWinner: string }) {
  if (!match || match.status !== "finished") return null;
  const homeWon = (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const winner  = homeWon ? match.homeTeam : match.awayTeam;
  if (!winner) return null;
  const name = winner.name ?? winner.club?.name ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{
        background: `linear-gradient(135deg, ${brand}18, ${brand}06)`,
        border: `1px solid ${brand}40`,
        boxShadow: `0 0 40px ${brand}12`,
      }}
    >
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 relative"
        style={{ background: `${brand}20`, boxShadow: `0 0 24px ${brand}40` }}>
        {winner.club?.badgeUrl
          ? <img src={winner.club.badgeUrl} alt="" className="w-12 h-12 object-contain" />
          : <Crown className="w-7 h-7" style={{ color: brand }} />
        }
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 1.5, repeat: 2, delay: 0.5 }}
          className="absolute -top-1 -right-1 text-xl">🏆</motion.div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: brand }}>{tWinner}</p>
        <p className="text-xl font-black" style={{ color: "var(--cat-text)" }}>{name}</p>
      </div>
    </motion.div>
  );
}

/** Mobile: vertical accordion — Final first (reversed), full-width match cards */
function MobileBracket({ rounds, brand, locale }: { rounds: BracketRound[]; brand: string; locale: string }) {
  const [openRound, setOpenRound] = useState<number | null>(
    [...rounds].reverse()[0]?.id ?? null
  );

  return (
    <div className="space-y-2">
      {[...rounds].reverse().map(round => {
        const isFinal = round.shortName?.toUpperCase() === "F" || round.name.toLowerCase() === "final";
        const isOpen  = openRound === round.id;
        const label   = locale === "ru"
          ? (round.nameRu ?? round.shortName ?? round.name)
          : locale === "et"
          ? (round.nameEt ?? round.shortName ?? round.name)
          : round.shortName ?? round.name;
        const date = roundDate(round.matches, locale);

        return (
          <div
            key={round.id}
            style={{
              borderRadius: 12,
              overflow: "hidden",
              border: `1px solid ${isFinal ? `${brand}30` : "var(--cat-card-border)"}`,
              background: "var(--cat-card-bg)",
            }}
          >
            {/* Accordion header */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              style={{ background: isFinal ? `${brand}08` : "transparent" }}
              onClick={() => setOpenRound(isOpen ? null : round.id)}
            >
              {isFinal && (
                <Crown style={{ width: 14, height: 14, flexShrink: 0, color: brand }} />
              )}
              <div className="flex-1 min-w-0">
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: isFinal ? brand : "var(--cat-text-muted)",
                  }}
                >
                  {label}
                </p>
                {date && (
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--cat-stat-value)" }}>
                    {date}
                  </p>
                )}
              </div>

              {/* Match count badge */}
              <span
                className="shrink-0 rounded-full px-2 py-0.5"
                style={{ fontSize: 10, background: `${brand}18`, color: brand }}
              >
                {round.matchCount}
              </span>

              {/* Chevron */}
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <svg
                  style={{ width: 16, height: 16, color: "var(--cat-text-muted)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.div>
            </button>

            {/* Accordion content */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="px-3 pb-3 pt-1 space-y-2">
                    {round.matches.map((match, mi) => {
                      const isFinished = match.status === "finished";
                      const isLive     = match.status === "live";
                      const homeWon    = isFinished && (match.homeScore ?? 0) > (match.awayScore ?? 0);
                      const awayWon    = isFinished && (match.awayScore ?? 0) > (match.homeScore ?? 0);
                      const hasFooter  = !!(match.scheduledAt || match.field);

                      return (
                        <div
                          key={match.id}
                          style={{
                            borderRadius: 12,
                            overflow: "hidden",
                            border: isLive
                              ? `2px solid ${brand}60`
                              : `1px solid ${isFinished ? "var(--cat-input-border)" : "var(--cat-card-border)"}`,
                            background: isLive
                              ? `linear-gradient(135deg, ${brand}12, var(--cat-card-bg))`
                              : "var(--cat-card-bg)",
                            boxShadow: isLive
                              ? `0 0 24px ${brand}20, 0 4px 16px rgba(0,0,0,0.1)`
                              : isFinished
                              ? `0 2px 8px rgba(0,0,0,0.05)`
                              : `var(--cat-card-shadow)`,
                            position: "relative",
                          }}
                        >
                          {/* Match number */}
                          {match.matchNumber != null && (
                            <span
                              style={{
                                position: "absolute",
                                top: 4,
                                right: 6,
                                fontSize: 8,
                                color: "var(--cat-text-faint)",
                                zIndex: 1,
                              }}
                            >
                              #{match.matchNumber}
                            </span>
                          )}

                          {/* LIVE bar */}
                          {isLive && (
                            <motion.div
                              animate={{ opacity: [1, 0.35, 1] }}
                              transition={{ duration: 1.2, repeat: Infinity }}
                              style={{ height: 3, background: brand }}
                            />
                          )}

                          {/* Team rows — reuse BracketTeamRow for consistency */}
                          <BracketTeamRow
                            team={match.homeTeam ?? null}
                            score={match.homeScore}
                            won={homeWon}
                            isLive={isLive}
                            isFinished={isFinished}
                            brand={brand}
                            isTop
                            slotLabel={
                              locale === "ru"
                                ? (match.homeSlotLabelRu ?? match.homeSlotLabel)
                                : match.homeSlotLabel
                            }
                          />
                          <BracketTeamRow
                            team={match.awayTeam ?? null}
                            score={match.awayScore}
                            won={awayWon}
                            isLive={isLive}
                            isFinished={isFinished}
                            brand={brand}
                            isTop={false}
                            slotLabel={
                              locale === "ru"
                                ? (match.awaySlotLabelRu ?? match.awaySlotLabel)
                                : match.awaySlotLabel
                            }
                          />

                          {/* Footer */}
                          {hasFooter && (
                            <div
                              className="flex items-center gap-3 px-3"
                              style={{
                                height: FOOTER_H,
                                borderTop: "1px solid var(--cat-divider)",
                              }}
                            >
                              {match.scheduledAt && (
                                <span
                                  className="flex items-center gap-1 font-medium"
                                  style={{ fontSize: 9, color: "var(--cat-text-muted)" }}
                                >
                                  <Clock style={{ width: 10, height: 10, color: brand }} />
                                  {new Date(match.scheduledAt).toLocaleString(locale, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                              {match.field && (
                                <span
                                  className="flex items-center gap-1 font-medium truncate"
                                  style={{ fontSize: 9, color: "var(--cat-text-muted)" }}
                                >
                                  <MapPin style={{ width: 10, height: 10, color: brand }} />
                                  {match.field.name}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {round.matches.length === 0 && (
                      <p
                        className="text-center py-4"
                        style={{ fontSize: 11, color: "var(--cat-text-faint)" }}
                      >
                        Draw not yet set
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function BracketView({ bracketStages, activeBracketStageId, setActiveBracketStageId, brand, t, locale }: {
  bracketStages: BracketStage[];
  activeBracketStageId: number | null;
  setActiveBracketStageId: (id: number) => void;
  brand: string;
  t: ReturnType<typeof useTranslations>;
  locale: string;
}) {
  const current = bracketStages.find(d => d.stage.id === activeBracketStageId) ?? bracketStages[0];
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (bracketStages.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl border"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: brand }} />
        <p className="text-sm font-medium" style={{ color: "var(--cat-text-muted)" }}>{t("bracketNotReady")}</p>
      </div>
    );
  }
  if (!current) return null;

  const finalRound = current.rounds.find(r => r.shortName?.toUpperCase() === "F" || r.name.toLowerCase() === "final");
  const finalMatch = finalRound?.matches[0];

  return (
    <div className="space-y-4">

      {/* Winner banner */}
      {finalMatch && <WinnerBanner match={finalMatch} brand={brand} tWinner={t("tournamentWinner")} />}

      {/* Status chip */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
          style={{
            background: current.stage.status === "active" ? "rgba(34,197,94,0.12)" : "var(--cat-tag-bg)",
            color: current.stage.status === "active" ? "#22c55e" : "var(--cat-text-muted)",
          }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block mr-1.5 align-middle"
            style={{ background: current.stage.status === "active" ? "#22c55e" : "var(--cat-text-muted)" }} />
          {current.stage.status === "active" ? t("stageActive") : current.stage.status === "finished" ? t("stageFinished") : t("stagePreparing")}
        </span>
        <span className="text-[10px]" style={{ color: "var(--cat-text-faint)" }}>↔ scroll</span>
      </div>

      {/* Bracket: desktop = horizontal scroll, mobile = vertical accordion */}
      {current.rounds.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("bracketNotReadyHint")}</p>
        </div>
      ) : isMobile ? (
        <MobileBracket rounds={current.rounds} brand={brand} locale={locale} />
      ) : (
        // API returns rounds desc (Final→QF), reverse to get QF→Final left-to-right
        <BracketGrid rounds={[...current.rounds].reverse()} brand={brand} locale={locale} t={t} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

type SectionKey = "groups" | `bracket:${number}`;

export default function StandingsPage() {
  const { org, tournament: tourney, classes } = useTournamentPublic();
  const t      = useTranslations("tournament");
  const locale = useLocale();
  const brand  = org.brandColor ?? "#2BFEBA";

  // ── Group standings ──────────────────────────────────────────────────────
  const [allStages,    setAllStages]    = useState<GroupStage[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [liveEnabled,  setLiveEnabled]  = useState(false);
  const [hasLive,      setHasLive]      = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  // ── Bracket ──────────────────────────────────────────────────────────────
  const [bracketMap,         setBracketMap]         = useState<Map<number, BracketStage[]>>(new Map());
  const [loadingBracket,     setLoadingBracket]     = useState(false);
  const [activeBracketStageIdMap, setActiveBracketStageIdMap] = useState<Map<number, number>>(new Map());

  // ── Division / section state ──────────────────────────────────────────────
  const [activeDivisionId, setActiveDivisionId] = useState<number | null>(null);
  const [activeSection,    setActiveSection]    = useState<SectionKey>("groups");

  // ── Fetch group standings ─────────────────────────────────────────────────
  const fetchStandings = (showLoader = false) => {
    if (showLoader) setLoading(true);
    fetch(`/api/public/t/${org.slug}/${tourney.slug}/standings`)
      .then(r => r.ok ? r.json() : null)
      .then((data: StandingsResponse | null) => {
        if (!data) return;
        const stagesArr = Array.isArray(data) ? data : data.stages;
        setAllStages(stagesArr);
        setLiveEnabled(!Array.isArray(data) && data.liveEnabled);
        setHasLive(!Array.isArray(data) && data.hasLive);
        // Auto-select first division
        if (stagesArr.length > 0 && !activeDivisionId) {
          const firstClassId = stagesArr[0].classId ?? null;
          setActiveDivisionId(firstClassId ?? (classes[0]?.id ?? null));
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStandings(true);
    const interval = setInterval(() => fetchStandings(false), 30_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.slug, tourney.slug]);

  // Auto-select division from classes if stages don't load yet
  useEffect(() => {
    if (!activeDivisionId && classes.length > 0) {
      setActiveDivisionId(classes[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes]);

  // ── SSE ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!liveEnabled) return;
    const sse = new EventSource(`/api/public/t/${org.slug}/${tourney.slug}/live`);
    sseRef.current = sse;
    sse.addEventListener("match:update", () => fetchStandings(false));
    sse.onerror = () => sse.close();
    return () => { sse.close(); sseRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveEnabled, org.slug, tourney.slug]);

  // ── Fetch bracket for a division (lazy) ───────────────────────────────────
  const fetchBracket = (classId: number) => {
    if (bracketMap.has(classId)) return;
    setLoadingBracket(true);
    fetch(`/api/public/t/${org.slug}/${tourney.slug}/bracket?classId=${classId}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: BracketStage[]) => {
        setBracketMap(prev => new Map(prev).set(classId, data));
        if (data.length > 0) {
          setActiveBracketStageIdMap(prev => {
            if (prev.has(classId)) return prev;
            return new Map(prev).set(classId, data[0].stage.id);
          });
        }
      })
      .finally(() => setLoadingBracket(false));
  };

  // Poll bracket silently every 15s when a bracket section is visible
  useEffect(() => {
    if (!activeDivisionId || !activeSection.startsWith("bracket:")) return;
    const interval = setInterval(() => {
      fetch(`/api/public/t/${org.slug}/${tourney.slug}/bracket?classId=${activeDivisionId}`)
        .then(r => r.ok ? r.json() : [])
        .then((data: BracketStage[]) => setBracketMap(prev => new Map(prev).set(activeDivisionId, data)));
    }, 15_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDivisionId, activeSection]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const divisionStages = allStages.filter(s => s.classId === activeDivisionId);
  const bracketStages  = activeDivisionId ? (bracketMap.get(activeDivisionId) ?? []) : [];
  const activeBracketStageId = activeDivisionId ? (activeBracketStageIdMap.get(activeDivisionId) ?? null) : null;

  // Sub-tabs: Groups + one tab per bracket stage
  // Строим sub-tabs; при дублировании имён добавляем индекс (Playoffs → Playoffs 2)
  const labelCount: Record<string, number> = {};
  const labelIdx:   Record<string, number> = {};
  bracketStages.forEach(bs => {
    const raw = locale === "ru" ? (bs.stage.nameRu ?? bs.stage.name) : bs.stage.name;
    labelCount[raw] = (labelCount[raw] ?? 0) + 1;
  });
  const subTabs: { key: SectionKey; label: string; icon?: string; color?: string }[] = [
    ...(divisionStages.length > 0 ? [{ key: "groups" as SectionKey, label: t("navStandings") }] : []),
    ...bracketStages.map(bs => {
      const meta = getCompetitionMeta(bs.stage.name);
      const raw  = locale === "ru" ? (bs.stage.nameRu ?? bs.stage.name) : bs.stage.name;
      labelIdx[raw] = (labelIdx[raw] ?? 0) + 1;
      const label = labelCount[raw] > 1 ? `${raw} ${labelIdx[raw]}` : raw;
      return { key: `bracket:${bs.stage.id}` as SectionKey, label, icon: meta.icon, color: meta.color };
    }),
  ];

  // Pre-fetch bracket for ALL divisions upfront so sub-tabs appear immediately
  useEffect(() => {
    if (classes.length > 0) {
      classes.forEach(cls => fetchBracket(cls.id));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes.map(c => c.id).join(",")]);

  const handleDivisionChange = (classId: number) => {
    setActiveDivisionId(classId);
    setActiveSection("groups");
    fetchBracket(classId);
  };

  const handleSectionChange = (key: SectionKey) => {
    setActiveSection(key);
    if (key.startsWith("bracket:") && activeDivisionId) {
      fetchBracket(activeDivisionId);
      const stageId = parseInt(key.split(":")[1]);
      if (stageId > 0) {
        setActiveBracketStageIdMap(prev => new Map(prev).set(activeDivisionId, stageId));
      }
    }
  };

  const isGroupsSection = activeSection === "groups";
  const currentGroupStage = divisionStages[0]; // usually one group stage per division
  const isLeague = currentGroupStage?.type === "league";

  return (
    <div className="space-y-4">

      {/* ── Single compact nav bar ── */}
      <div
        className="flex items-center gap-2 flex-wrap px-4 py-3 rounded-2xl"
        style={{
          background: "var(--cat-card-bg)",
          border: "1px solid var(--cat-card-border)",
          boxShadow: "var(--cat-card-shadow)",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `linear-gradient(135deg, ${brand}30, ${brand}10)`,
            boxShadow: `0 0 0 1px ${brand}30`,
          }}
        >
          <TrendingUp style={{ width: 16, height: 16, color: brand }} />
        </div>

        {/* Title */}
        <span style={{ fontSize: 15, fontWeight: 900, color: "var(--cat-text)", letterSpacing: "-0.01em", marginRight: 2 }}>
          {t("standingsTitle")}
        </span>

        {/* Divider before division tabs */}
        {classes.length > 1 && (
          <div style={{ width: 1, height: 18, background: `${brand}25`, flexShrink: 0, margin: "0 2px" }} />
        )}

        {/* Division tabs */}
        {classes.length > 1 && classes.map((cls, i) => {
          const color    = divisionColor(cls.name, i);
          const isActive = activeDivisionId === cls.id;
          return (
            <button key={cls.id} onClick={() => handleDivisionChange(cls.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer"
              style={isActive
                ? { background: color, color: "#fff", boxShadow: `0 2px 12px ${color}50` }
                : { background: `${color}15`, color, border: `1.5px solid ${color}30` }
              }
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: isActive ? "rgba(255,255,255,0.8)" : color }} />
              {cls.name}
              <span className="text-[10px] font-bold px-1 py-0.5 rounded-full"
                style={{ background: isActive ? "rgba(255,255,255,0.2)" : `${color}20`, color: isActive ? "#fff" : color }}>
                {cls.teamCount}
              </span>
            </button>
          );
        })}

        {/* Divider before sub-tabs */}
        {subTabs.length > 1 && (
          <div style={{ width: 1, height: 18, background: `${brand}25`, flexShrink: 0, margin: "0 2px" }} />
        )}

        {/* Sub-tabs inline */}
        {subTabs.length > 1 && subTabs.map(({ key, label, icon, color: tabColor }) => {
          const isAct       = activeSection === key;
          const activeColor = tabColor ?? brand;
          return (
            <button key={key} onClick={() => handleSectionChange(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer"
              style={isAct
                ? { background: activeColor, color: "#fff", boxShadow: `0 2px 8px ${activeColor}40` }
                : { color: "var(--cat-text-secondary)" }
              }
            >
              {icon && <span>{icon}</span>}
              {label}
            </button>
          );
        })}

        {/* LIVE badge pushed to the right */}
        {hasLive && (
          <>
            <div style={{ flex: 1 }} />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black shrink-0"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
              <Radio className="w-2.5 h-2.5" />
              LIVE
            </div>
          </>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 rounded-2xl border"
          style={{ color: "var(--cat-text-muted)", borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{t("loading")}</span>
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── Groups content ── */}
          {isGroupsSection && (
            <div className="space-y-4">
              {divisionStages.length === 0 && (
                <div className="text-center py-16 rounded-2xl border"
                  style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: brand }} />
                  <p className="text-sm font-medium" style={{ color: "var(--cat-text-muted)" }}>{t("standingsEmpty")}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--cat-text-muted)" }}>{t("standingsEmptyHint")}</p>
                </div>
              )}

              {/* If division has multiple group stages, show stage switcher */}
              {divisionStages.length > 1 && (
                <div className="flex flex-wrap gap-1 p-1 rounded-xl w-fit"
                  style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}>
                  {divisionStages.map(s => {
                    const sLabel = locale === "ru" ? (s.nameRu ?? s.name) : locale === "et" ? (s.nameEt ?? s.name) : s.name;
                    return (
                      <div key={s.id} className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
                        style={{ color: "var(--cat-text-secondary)" }}>
                        {sLabel}
                      </div>
                    );
                  })}
                </div>
              )}

              {divisionStages.map(stage => {
                const sIsLeague = stage.type === "league";
                return (
                  <div key={stage.id} className="space-y-4">
                    {/* Stage status chip */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                        style={{
                          background: stage.status === "active" ? "rgba(34,197,94,0.12)" : "var(--cat-tag-bg)",
                          color: stage.status === "active" ? "#22c55e" : "var(--cat-text-muted)",
                        }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block mr-1.5 align-middle"
                          style={{ background: stage.status === "active" ? "#22c55e" : "var(--cat-text-muted)" }} />
                        {stage.status === "active" ? t("stageActive") : stage.status === "finished" ? t("stageFinished") : t("stagePreparing")}
                      </span>
                    </div>

                    {stage.groups.map((group, gi) => (
                      <GroupTable
                        key={group.id}
                        group={group}
                        zones={stage.zones}
                        isLeague={sIsLeague}
                        brand={brand}
                        t={t}
                        groupIndex={gi}
                      />
                    ))}

                    {/* Column legend */}
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
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Bracket content ── */}
          {!isGroupsSection && (
            <div>
              {loadingBracket && bracketStages.length === 0 ? (
                <div className="flex items-center justify-center py-16 gap-2" style={{ color: "var(--cat-text-muted)" }}>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">{t("loading")}</span>
                </div>
              ) : (
                <BracketView
                  bracketStages={bracketStages}
                  activeBracketStageId={activeBracketStageId}
                  setActiveBracketStageId={(id) => {
                    if (activeDivisionId) {
                      setActiveBracketStageIdMap(prev => new Map(prev).set(activeDivisionId, id));
                    }
                    setActiveSection(`bracket:${id}`);
                  }}
                  brand={brand}
                  t={t}
                  locale={locale}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
