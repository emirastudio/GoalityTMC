"use client";

import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  Trophy, Loader2, Crown, Zap, Clock, ChevronRight,
  Star, Shield, TrendingUp,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BracketMatch {
  id: number;
  matchNumber?: number | null;
  status: string;
  scheduledAt?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeam?: { name: string; club?: { badgeUrl?: string | null } | null } | null;
  awayTeam?: { name: string; club?: { badgeUrl?: string | null } | null } | null;
  field?: { name: string } | null;
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

// ─── Иконка соревнования по имени этапа ─────────────────────────────────────

function getCompetitionMeta(name: string): { color: string; icon: string } {
  const n = name.toLowerCase();
  if (n.includes("champion") || n.includes("gold") || n.includes("чемпион") || n.includes("zlatý")) {
    return { color: "#F59E0B", icon: "🏆" };
  }
  if (n.includes("europa") || n.includes("silver") || n.includes("европ")) {
    return { color: "#F97316", icon: "🥈" };
  }
  if (n.includes("conference") || n.includes("конфер") || n.includes("bronze")) {
    return { color: "#10B981", icon: "🥉" };
  }
  return { color: "#3B82F6", icon: "⚽" };
}

// ─── Team Row ────────────────────────────────────────────────────────────────

function TeamRow({
  team, score, won, isLive, isFinished, brand, isTop,
}: {
  team?: { name: string; club?: { badgeUrl?: string | null } | null } | null;
  score?: number | null;
  won: boolean;
  isLive: boolean;
  isFinished: boolean;
  brand: string;
  isTop: boolean;
}) {
  const isTBD = !team;

  return (
    <div
      className="flex items-center gap-2.5 px-3"
      style={{
        paddingTop: "9px",
        paddingBottom: "9px",
        borderBottom: isTop ? "1px solid var(--cat-card-border)" : undefined,
        background: won ? `${brand}14` : "transparent",
        transition: "background 0.2s",
      }}
    >
      {/* Эмблема клуба */}
      <div
        className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
        style={{
          background: isTBD ? "var(--cat-tag-bg)" : `${brand}14`,
          border: won ? `1.5px solid ${brand}50` : "1.5px solid var(--cat-card-border)",
        }}
      >
        {team?.club?.badgeUrl ? (
          <img src={team.club.badgeUrl} alt="" className="w-full h-full object-contain" />
        ) : isTBD ? (
          <span className="text-[9px] font-black" style={{ color: "var(--cat-text-muted)" }}>?</span>
        ) : (
          <span className="text-[9px] font-black" style={{ color: brand }}>
            {team?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      {/* Имя */}
      <span
        className="flex-1 text-[12px] font-semibold leading-tight truncate"
        style={{
          color: isTBD ? "var(--cat-text-muted)" : won ? "var(--cat-text)" : "var(--cat-text-secondary)",
          fontStyle: isTBD ? "italic" : undefined,
        }}
      >
        {team?.name ?? "TBD"}
      </span>

      {/* Счёт */}
      {(isFinished || isLive) && !isTBD ? (
        <span
          className="text-[16px] font-black tabular-nums shrink-0 w-6 text-right"
          style={{
            color: won ? brand : "var(--cat-text-secondary)",
            textShadow: won ? `0 0 16px ${brand}80` : undefined,
          }}
        >
          {score ?? 0}
        </span>
      ) : !isTBD ? (
        <span className="w-6 shrink-0" />
      ) : null}
    </div>
  );
}

// ─── Match Card ──────────────────────────────────────────────────────────────

function BracketMatchCard({
  match, brand, isFinal, tFinal, locale,
}: {
  match: BracketMatch | null;
  brand: string;
  tFinal?: string;
  isFinal?: boolean;
  locale: string;
}) {
  const isFinished = match?.status === "finished";
  const isLive = match?.status === "live";
  const homeWon = isFinished && (match!.homeScore ?? 0) > (match!.awayScore ?? 0);
  const awayWon = isFinished && (match!.awayScore ?? 0) > (match!.homeScore ?? 0);

  // Пустой слот TBD
  if (!match) {
    return (
      <div
        className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center"
        style={{
          borderColor: "var(--cat-card-border)",
          minWidth: "220px",
          height: "88px",
          opacity: 0.35,
        }}
      >
        <span className="text-[10px] font-bold tracking-[0.2em] uppercase"
          style={{ color: "var(--cat-text-muted)" }}>
          TBD
        </span>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: "var(--cat-card-bg)",
        border: `1px solid ${isLive ? brand : isFinal ? `${brand}60` : "var(--cat-card-border)"}`,
        boxShadow: isLive
          ? `0 0 0 2px ${brand}30, 0 4px 20px ${brand}20`
          : isFinal
          ? `0 8px 32px ${brand}18, 0 0 0 1px ${brand}25`
          : "0 2px 8px rgba(0,0,0,0.06)",
        minWidth: "220px",
        transition: "box-shadow 0.2s",
      }}
    >
      {/* LIVE полоска */}
      {isLive && (
        <div className="flex items-center justify-center gap-1.5 py-1.5" style={{ background: brand }}>
          <Zap className="w-3 h-3 fill-current text-black animate-pulse" />
          <span className="text-[9px] font-black text-black uppercase tracking-[0.2em]">Live</span>
        </div>
      )}

      {/* Мета матча (номер + время) */}
      {!isLive && (
        <div
          className="flex items-center justify-between px-3 py-1.5 border-b"
          style={{
            borderColor: isFinal ? `${brand}25` : "var(--cat-card-border)",
            background: isFinal ? `${brand}08` : "var(--cat-tag-bg)",
          }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider"
            style={{ color: isFinal ? brand : "var(--cat-text-muted)" }}>
            {isFinal
              ? <><Crown className="inline w-2.5 h-2.5 mr-1 mb-0.5" />{tFinal ?? "Final"}</>
              : match.matchNumber ? `#${match.matchNumber}` : "—"}
          </span>
          {match.scheduledAt && (
            <span className="flex items-center gap-1 text-[9px]" style={{ color: "var(--cat-text-muted)" }}>
              <Clock className="w-2.5 h-2.5" />
              {new Date(match.scheduledAt).toLocaleTimeString(locale, {
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
          )}
        </div>
      )}

      {/* Команды */}
      <TeamRow
        team={match.homeTeam} score={match.homeScore}
        won={homeWon} isLive={isLive} isFinished={isFinished}
        brand={brand} isTop
      />
      <TeamRow
        team={match.awayTeam} score={match.awayScore}
        won={awayWon} isLive={isLive} isFinished={isFinished}
        brand={brand} isTop={false}
      />

      {/* Поле */}
      {match.field && (
        <div className="px-3 py-1 border-t"
          style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>
          <span className="text-[9px]" style={{ color: "var(--cat-text-muted)" }}>
            {match.field.name}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Round Column с SVG-соединителями ────────────────────────────────────────

function RoundColumn({
  round, nextRoundMatchCount, brand, isLast, totalRounds, tFinal, locale, tMatchSingular, tMatchPlural,
}: {
  round: BracketRound;
  nextRoundMatchCount: number;
  brand: string;
  isLast: boolean;
  totalRounds: number;
  tFinal: string;
  locale: string;
  tMatchSingular: string;
  tMatchPlural: string;
}) {
  const isFinalRound =
    round.shortName?.toUpperCase() === "F" ||
    round.name.toLowerCase() === "final";

  const emptyCount = Math.max(0, round.matchCount - round.matches.length);
  const slots: (BracketMatch | null)[] = [...round.matches, ...Array(emptyCount).fill(null)];

  // Вертикальный отступ между матчами растёт с каждым раундом
  const matchGap = isLast ? 0 : Math.max(16, 48 * Math.pow(2, totalRounds - round.order - 1));

  const cardHeight = 88; // примерная высота карточки
  const halfCard = cardHeight / 2;

  return (
    <div className="flex items-start">
      {/* Колонка матчей */}
      <div className="flex flex-col" style={{ gap: `${matchGap}px`, minWidth: "220px" }}>

        {/* Заголовок раунда */}
        <div className="flex flex-col items-center gap-1 pb-2">
          <span
            className="text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full"
            style={{
              background: isFinalRound ? `${brand}20` : "var(--cat-tag-bg)",
              color: isFinalRound ? brand : "var(--cat-text-muted)",
              border: `1px solid ${isFinalRound ? `${brand}40` : "transparent"}`,
            }}
          >
            {isFinalRound && <Crown className="inline w-2.5 h-2.5 mr-1 mb-0.5" />}
            {round.nameRu ?? round.shortName ?? round.name}
          </span>
          <span className="text-[9px]" style={{ color: "var(--cat-text-muted)" }}>
            {round.matchCount} {round.matchCount === 1 ? tMatchSingular : tMatchPlural}
          </span>
        </div>

        {/* Матчи */}
        {slots.map((match, i) => (
          <BracketMatchCard
            key={match ? match.id : `empty-${i}`}
            match={match}
            brand={brand}
            isFinal={isFinalRound}
            tFinal={tFinal}
            locale={locale}
          />
        ))}
      </div>

      {/* SVG-соединитель к следующему раунду */}
      {!isLast && nextRoundMatchCount > 0 && (
        <ConnectorLines
          matchCount={round.matchCount}
          matchGap={matchGap}
          cardHeight={cardHeight}
          brand={brand}
        />
      )}
    </div>
  );
}

// ─── SVG Соединители между раундами ─────────────────────────────────────────

function ConnectorLines({
  matchCount, matchGap, cardHeight, brand,
}: {
  matchCount: number;
  matchGap: number;
  cardHeight: number;
  brand: string;
}) {
  const connWidth = 40;
  const halfCard = cardHeight / 2;
  const pairHeight = cardHeight * 2 + matchGap;
  const totalHeight = matchCount * cardHeight + (matchCount - 1) * matchGap;

  // Для каждой пары матчей рисуем соединитель
  const pairs = Math.ceil(matchCount / 2);

  return (
    <svg
      width={connWidth}
      height={totalHeight}
      viewBox={`0 0 ${connWidth} ${totalHeight}`}
      style={{ flexShrink: 0, marginTop: "44px" }} // сдвиг на высоту заголовка раунда
    >
      {Array.from({ length: pairs }).map((_, pairIdx) => {
        const topMatchTop = pairIdx * pairHeight;
        const topMid = topMatchTop + halfCard;
        const bottomMid = topMatchTop + cardHeight + matchGap + halfCard;
        const midY = (topMid + bottomMid) / 2;

        return (
          <g key={pairIdx}>
            {/* Горизонтальная линия от топ-матча */}
            <path
              d={`M0,${topMid} H${connWidth * 0.5}`}
              fill="none"
              stroke="var(--cat-card-border)"
              strokeWidth="1.5"
            />
            {/* Горизонтальная линия от боттом-матча */}
            <path
              d={`M0,${bottomMid} H${connWidth * 0.5}`}
              fill="none"
              stroke="var(--cat-card-border)"
              strokeWidth="1.5"
            />
            {/* Вертикальная скобка */}
            <path
              d={`M${connWidth * 0.5},${topMid} V${bottomMid}`}
              fill="none"
              stroke="var(--cat-card-border)"
              strokeWidth="1.5"
            />
            {/* Горизонтальная стрелка к центру */}
            <path
              d={`M${connWidth * 0.5},${midY} H${connWidth}`}
              fill="none"
              stroke={`${brand}60`}
              strokeWidth="1.5"
            />
            {/* Точка соединения */}
            <circle cx={connWidth * 0.5} cy={midY} r="2.5" fill={`${brand}60`} />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Winner Banner ────────────────────────────────────────────────────────────

function WinnerBanner({
  match, brand, tWinner,
}: {
  match: BracketMatch | undefined;
  brand: string;
  tWinner: string;
}) {
  if (!match || match.status !== "finished") return null;
  const homeWon = (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const winner = homeWon ? match.homeTeam : match.awayTeam;
  if (!winner) return null;

  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{
        background: `linear-gradient(135deg, ${brand}15, ${brand}06)`,
        border: `1px solid ${brand}40`,
        boxShadow: `0 0 40px ${brand}12, 0 4px 16px rgba(0,0,0,0.1)`,
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 relative"
        style={{ background: `${brand}20`, boxShadow: `0 0 24px ${brand}40` }}
      >
        {winner.club?.badgeUrl ? (
          <img src={winner.club.badgeUrl} alt="" className="w-12 h-12 object-contain" />
        ) : (
          <Crown className="w-7 h-7" style={{ color: brand }} />
        )}
        <div
          className="absolute -top-1 -right-1 text-lg leading-none"
          style={{ textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}
        >
          🏆
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: brand }}>
          {tWinner}
        </p>
        <p className="text-xl font-black" style={{ color: "var(--cat-text)" }}>
          {winner.name}
        </p>
      </div>
    </div>
  );
}

// ─── Stage Tab (переключатель фаз) ───────────────────────────────────────────

function StageTab({
  stage, isActive, onClick, locale,
}: {
  stage: BracketStage;
  isActive: boolean;
  onClick: () => void;
  locale: string;
}) {
  const meta = getCompetitionMeta(stage.stage.name);
  const label = locale === "ru" ? (stage.stage.nameRu ?? stage.stage.name)
    : locale === "et" ? ((stage.stage as { nameEt?: string | null }).nameEt ?? stage.stage.name)
    : stage.stage.name;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap"
      style={
        isActive
          ? {
              background: meta.color,
              color: "#fff",
              boxShadow: `0 2px 12px ${meta.color}50`,
            }
          : {
              color: "var(--cat-text-secondary)",
              background: "transparent",
            }
      }
    >
      <span>{meta.icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DivisionBracketPage() {
  const { org, tournament: tourney } = useTournamentPublic();
  const params = useParams<{ classId: string }>();
  const classId = params.classId ?? "";
  const brand = org.brandColor ?? "#2BFEBA";
  const t = useTranslations("tournament");
  const locale = useLocale();

  const [data, setData] = useState<BracketStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<number | null>(null);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;

    function load(showLoader = false) {
      if (showLoader) setLoading(true);
      fetch(`/api/public/t/${org.slug}/${tourney.slug}/bracket?classId=${classId}`)
        .then(r => (r.ok ? r.json() : []))
        .then((d: BracketStage[]) => {
          if (cancelled) return;
          setData(d);
          if (d.length > 0 && !activeStage) setActiveStage(d[0].stage.id);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    load(true);
    const interval = setInterval(() => load(false), 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.slug, tourney.slug, classId]);

  const current = data.find(d => d.stage.id === activeStage);
  const hasLive = current?.rounds.some(r => r.matches.some(m => m.status === "live"));

  const finalRound = current?.rounds.find(
    r => r.shortName?.toUpperCase() === "F" || r.name.toLowerCase() === "final"
  );
  const finalMatch = finalRound?.matches[0];

  const currentMeta = current ? getCompetitionMeta(current.stage.name) : null;

  return (
    <div className="space-y-5">

      {/* Загрузка */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: `${brand}15` }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: brand }} />
          </div>
          <span className="text-sm font-medium" style={{ color: "var(--cat-text-muted)" }}>
            {t("loadingBracket")}
          </span>
        </div>
      )}

      {/* Нет данных */}
      {!loading && data.length === 0 && (
        <div
          className="text-center py-16 rounded-2xl border"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: `${brand}12` }}>
            <Trophy className="w-8 h-8 opacity-40" style={{ color: brand }} />
          </div>
          <p className="text-base font-bold mb-1" style={{ color: "var(--cat-text)" }}>
            {t("bracketNotReady")}
          </p>
          <p className="text-[13px]" style={{ color: "var(--cat-text-muted)" }}>
            {t("bracketNotReadyHint")}
          </p>
        </div>
      )}

      {/* Переключатель фаз плей-офф */}
      {!loading && data.length > 1 && (
        <div
          className="flex flex-wrap gap-1 p-1 rounded-2xl"
          style={{
            background: "var(--cat-tag-bg)",
            border: "1px solid var(--cat-card-border)",
          }}
        >
          {data.map(d => (
            <StageTab
              key={d.stage.id}
              stage={d}
              isActive={activeStage === d.stage.id}
              onClick={() => setActiveStage(d.stage.id)}
              locale={locale}
            />
          ))}
        </div>
      )}

      {/* Статус бар */}
      {!loading && current && (
        <div className="flex items-center gap-3 flex-wrap">
          {currentMeta && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold"
              style={{
                background: `${currentMeta.color}15`,
                color: currentMeta.color,
                border: `1px solid ${currentMeta.color}30`,
              }}
            >
              <span>{currentMeta.icon}</span>
              <span>
                {locale === "ru" ? (current.stage.nameRu ?? current.stage.name)
                  : locale === "et" ? ((current.stage as { nameEt?: string | null }).nameEt ?? current.stage.name)
                  : current.stage.name}
              </span>
            </div>
          )}

          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: current.stage.status === "active"
                ? "rgba(34,197,94,0.12)"
                : "var(--cat-tag-bg)",
              color: current.stage.status === "active" ? "#22c55e" : "var(--cat-text-muted)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{
                background: current.stage.status === "active"
                  ? "#22c55e"
                  : "var(--cat-text-muted)",
                animation: current.stage.status === "active" ? "pulse 1.5s infinite" : undefined,
              }}
            />
            {current.stage.status === "active" ? t("stageActive")
              : current.stage.status === "finished" ? t("stageFinished")
              : t("stagePreparing")}
          </div>

          {hasLive && (
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{ background: `${brand}20`, color: brand }}
            >
              <Zap className="w-2.5 h-2.5 fill-current animate-pulse" />
              {t("liveMatchesInProgress")}
            </div>
          )}

          <span className="ml-auto text-[10px] hidden sm:block" style={{ color: "var(--cat-text-muted)" }}>
            {t("updatesEvery15s")}
          </span>
        </div>
      )}

      {/* Победитель */}
      {!loading && finalMatch && (
        <WinnerBanner match={finalMatch} brand={currentMeta?.color ?? brand} tWinner={t("tournamentWinner")} />
      )}

      {/* Сетка плей-офф */}
      {!loading && current && current.rounds.length > 0 && (
        <div
          className="rounded-2xl border p-5"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
        >
          <div className="overflow-x-auto pb-4">
            <div className="flex items-start min-w-fit" style={{ gap: "0px" }}>
              {current.rounds.map((round, idx) => {
                const nextRound = current.rounds[idx + 1];
                return (
                  <RoundColumn
                    key={round.id}
                    round={round}
                    nextRoundMatchCount={nextRound?.matchCount ?? 0}
                    brand={currentMeta?.color ?? brand}
                    isLast={idx === current.rounds.length - 1}
                    totalRounds={current.rounds.length}
                    tFinal={t("final")}
                    locale={locale}
                    tMatchSingular={t("matchSingular")}
                    tMatchPlural={t("matchPlural")}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Легенда */}
      {!loading && current && current.rounds.some(r => r.matches.length > 0) && (
        <div className="flex flex-wrap gap-4 px-1 text-[10px]"
          style={{ color: "var(--cat-text-muted)" }}>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded"
              style={{ background: `${currentMeta?.color ?? brand}40`, border: `1px solid ${currentMeta?.color ?? brand}` }} />
            {t("legendWinner")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 border-dashed"
              style={{ borderColor: "var(--cat-card-border)" }} />
            {t("legendTBD")}
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 fill-current" style={{ color: currentMeta?.color ?? brand }} />
            {t("legendLive")}
          </span>
        </div>
      )}
    </div>
  );
}
