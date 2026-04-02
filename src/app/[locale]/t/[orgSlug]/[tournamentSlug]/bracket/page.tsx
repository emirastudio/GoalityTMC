"use client";

import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useEffect, useState } from "react";
import { Trophy, Loader2, ChevronRight } from "lucide-react";

// ─── Типы ───────────────────────────────────────────────

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
  shortName?: string | null;
  order: number;
  matchCount: number;
  isTwoLegged: boolean;
  hasThirdPlace: boolean;
  matches: BracketMatch[];
}

interface BracketStage {
  stage: { id: number; name: string; nameRu?: string | null; status: string };
  rounds: BracketRound[];
}

// ─── Карточка матча в сетке ──────────────────────────────

function BracketMatchCard({ match, brand, isFinal }: { match: BracketMatch; brand: string; isFinal?: boolean }) {
  const isFinished = match.status === "finished";
  const isLive = match.status === "live";

  const homeWon = isFinished && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWon = isFinished && (match.awayScore ?? 0) > (match.homeScore ?? 0);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--cat-card-bg)",
        border: `1px solid ${isLive ? brand : isFinal ? `${brand}50` : "var(--cat-card-border)"}`,
        boxShadow: isFinal
          ? `0 4px 20px ${brand}25`
          : isLive
          ? `0 0 14px ${brand}30`
          : "0 1px 3px rgba(0,0,0,0.04)",
        minWidth: "160px",
      }}
    >
      {/* Статус */}
      {isLive && (
        <div className="flex justify-center py-1" style={{ background: brand }}>
          <span className="text-[9px] font-bold text-white uppercase tracking-widest animate-pulse">● LIVE</span>
        </div>
      )}

      {/* Хозяева */}
      <div className="flex items-center gap-2 px-3 py-2 border-b"
        style={{
          borderColor: "var(--cat-card-border)",
          background: homeWon ? `${brand}08` : "transparent",
        }}>
        {match.homeTeam?.club?.badgeUrl
          ? <img src={match.homeTeam.club.badgeUrl} alt="" className="w-4 h-4 rounded object-contain shrink-0" />
          : <div className="w-4 h-4 rounded shrink-0" style={{ background: `${brand}20` }} />
        }
        <span className="flex-1 text-xs font-semibold leading-tight truncate"
          style={{ color: homeWon ? "var(--cat-text)" : "var(--cat-text-secondary)" }}>
          {match.homeTeam?.name ?? "TBD"}
        </span>
        {(isFinished || isLive) && (
          <span className="text-sm font-black tabular-nums ml-1"
            style={{ color: homeWon ? brand : "var(--cat-text-muted)" }}>
            {match.homeScore ?? 0}
          </span>
        )}
      </div>

      {/* Гости */}
      <div className="flex items-center gap-2 px-3 py-2"
        style={{ background: awayWon ? `${brand}08` : "transparent" }}>
        {match.awayTeam?.club?.badgeUrl
          ? <img src={match.awayTeam.club.badgeUrl} alt="" className="w-4 h-4 rounded object-contain shrink-0" />
          : <div className="w-4 h-4 rounded shrink-0" style={{ background: `${brand}20` }} />
        }
        <span className="flex-1 text-xs font-semibold leading-tight truncate"
          style={{ color: awayWon ? "var(--cat-text)" : "var(--cat-text-secondary)" }}>
          {match.awayTeam?.name ?? "TBD"}
        </span>
        {(isFinished || isLive) && (
          <span className="text-sm font-black tabular-nums ml-1"
            style={{ color: awayWon ? brand : "var(--cat-text-muted)" }}>
            {match.awayScore ?? 0}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Сетка плей-офф ─────────────────────────────────────

function BracketGrid({ rounds, brand }: { rounds: BracketRound[]; brand: string }) {
  if (rounds.length === 0) {
    return (
      <div className="text-center py-10 rounded-2xl border"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>Раунды ещё не настроены</p>
      </div>
    );
  }

  // rounds уже отсортированы по order desc (R32 → R16 → QF → SF → F)
  const isFinalRound = (r: BracketRound) =>
    r.shortName?.toLowerCase().includes("fin") || r.name.toLowerCase().includes("final");

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 items-start min-w-fit">
        {rounds.map((round, rIdx) => {
          const isLast = rIdx === rounds.length - 1;
          const isFinal = isFinalRound(round);
          const emptySlots = round.matchCount - round.matches.length;
          const allSlots = [
            ...round.matches,
            ...Array(emptySlots > 0 ? emptySlots : 0).fill(null),
          ];

          return (
            <div key={round.id} className="flex items-start gap-4">
              <div className="flex flex-col gap-3" style={{ minWidth: "180px" }}>
                {/* Название раунда */}
                <div className="text-center">
                  <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                    style={{ background: isFinal ? `${brand}20` : "var(--cat-tag-bg)", color: isFinal ? brand : "var(--cat-text-muted)" }}>
                    {round.nameRu ?? round.shortName ?? round.name}
                  </span>
                  <p className="text-[9px] mt-1" style={{ color: "var(--cat-text-muted)" }}>
                    {round.matchCount} матч.
                  </p>
                </div>

                {/* Матчи раунда */}
                <div className="space-y-3">
                  {allSlots.map((match, mIdx) =>
                    match ? (
                      <BracketMatchCard key={match.id} match={match} brand={brand} isFinal={isFinal} />
                    ) : (
                      <div key={`empty-${mIdx}`} className="rounded-xl border-2 border-dashed flex items-center justify-center py-5"
                        style={{ borderColor: "var(--cat-card-border)", minWidth: "160px" }}>
                        <span className="text-[10px] font-medium" style={{ color: "var(--cat-text-muted)" }}>TBD</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Соединительная стрелка между раундами */}
              {!isLast && (
                <div className="flex items-center self-center mt-8">
                  <ChevronRight className="w-4 h-4" style={{ color: "var(--cat-card-border)" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Главная страница ───────────────────────────────────

export default function BracketPage() {
  const { org, tournament: t } = useTournamentPublic();
  const brand = org.brandColor;

  const [data, setData] = useState<BracketStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/t/${org.slug}/${t.slug}/bracket`)
      .then(r => r.ok ? r.json() : [])
      .then((d: BracketStage[]) => {
        setData(d);
        if (d.length > 0) setActiveStage(d[0].stage.id);
      })
      .finally(() => setLoading(false));
  }, [org.slug, t.slug]);

  const current = data.find(d => d.stage.id === activeStage);

  return (
    <div className="space-y-6">

      {/* Заголовок */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${brand}15` }}>
          <Trophy className="w-5 h-5" style={{ color: brand }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--cat-text)" }}>Турнирная сетка</h1>
          <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>Плей-офф</p>
        </div>
      </div>

      {/* Загрузка */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-2" style={{ color: "var(--cat-text-muted)" }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Загрузка...</span>
        </div>
      )}

      {/* Пусто */}
      {!loading && data.length === 0 && (
        <div className="text-center py-16 rounded-2xl border"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: brand }} />
          <p className="text-sm font-medium" style={{ color: "var(--cat-text-muted)" }}>
            Турнирная сетка ещё не готова
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--cat-text-muted)" }}>
            Появится после жеребьёвки плей-офф
          </p>
        </div>
      )}

      {/* Переключатель этапов плей-офф */}
      {!loading && data.length > 1 && (
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--cat-tag-bg)" }}>
          {data.map(d => (
            <button key={d.stage.id} onClick={() => setActiveStage(d.stage.id)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={activeStage === d.stage.id
                ? { background: brand, color: "#fff", boxShadow: `0 0 10px ${brand}40` }
                : { color: "var(--cat-text-secondary)" }}>
              {d.stage.nameRu ?? d.stage.name}
            </button>
          ))}
        </div>
      )}

      {/* Статус этапа */}
      {!loading && current && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full"
            style={{
              background: current.stage.status === "active" ? "#22c55e"
                : current.stage.status === "finished" ? "var(--cat-text-muted)"
                : "var(--cat-card-border)",
            }} />
          <span className="text-xs font-medium" style={{ color: "var(--cat-text-muted)" }}>
            {current.stage.status === "active" ? "Этап идёт"
              : current.stage.status === "finished" ? "Этап завершён"
              : "Подготовка"}
          </span>
        </div>
      )}

      {/* Сетка */}
      {!loading && current && (
        <BracketGrid rounds={current.rounds} brand={brand} />
      )}

      {/* Легенда */}
      {!loading && current && current.rounds.some(r => r.matches.some(m => m.status === "finished" || m.status === "live")) && (
        <div className="flex flex-wrap gap-4 text-[10px] pt-2" style={{ color: "var(--cat-text-muted)" }}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" /> Победитель выделен
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: brand, animation: "pulse 1s infinite" }} /> Live матч
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 border-2 border-dashed rounded" style={{ borderColor: "var(--cat-card-border)" }} /> Место не определено
          </span>
        </div>
      )}
    </div>
  );
}
