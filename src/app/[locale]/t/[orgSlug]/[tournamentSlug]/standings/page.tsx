"use client";

import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useEffect, useState } from "react";
import { Trophy, TrendingUp, Loader2 } from "lucide-react";

// ─── Типы ───────────────────────────────────────────────

interface Standing {
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  team?: { name: string; club?: { badgeUrl?: string | null; name?: string | null } | null } | null;
}

interface Group {
  id: number;
  name: string;
  order: number;
  standings: Standing[];
}

interface Stage {
  id: number;
  name: string;
  nameRu?: string | null;
  order: number;
  groups: Group[];
}

// ─── Строка таблицы ─────────────────────────────────────

function medalColor(pos: number, brand: string): { bg: string; color: string } | null {
  if (pos === 1) return { bg: "#FFD70020", color: "#B8860B" };
  if (pos === 2) return { bg: "#C0C0C020", color: "#808080" };
  if (pos === 3) return { bg: "#CD7F3220", color: "#CD7F32" };
  return null;
}

function StandingsRow({ s, brand, isFirst }: { s: Standing; brand: string; isFirst: boolean }) {
  const medal = medalColor(s.position, brand);
  const isPromotion = s.position <= 2; // условно — топ-2 выходят

  return (
    <tr
      style={{
        background: medal ? medal.bg : isFirst ? `${brand}04` : "transparent",
        borderBottom: "1px solid var(--cat-card-border)",
      }}
    >
      {/* Позиция */}
      <td className="px-3 py-2.5 w-9 text-center">
        {medal ? (
          <span className="text-sm font-black" style={{ color: medal.color }}>{s.position}</span>
        ) : (
          <span className="text-sm font-semibold" style={{ color: "var(--cat-text-muted)" }}>{s.position}</span>
        )}
      </td>

      {/* Команда */}
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-2">
          {s.team?.club?.badgeUrl ? (
            <img src={s.team.club.badgeUrl} alt="" className="w-5 h-5 rounded object-contain shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded shrink-0 flex items-center justify-center text-[8px] font-bold"
              style={{ background: `${brand}15`, color: brand }}>
              {s.team?.name?.[0] ?? "?"}
            </div>
          )}
          <span className="text-sm font-semibold leading-tight" style={{ color: "var(--cat-text)" }}>
            {s.team?.name ?? "—"}
          </span>
        </div>
      </td>

      {/* Статистика */}
      {[s.played, s.won, s.drawn, s.lost, s.goalsFor, s.goalsAgainst, s.goalDiff >= 0 ? `+${s.goalDiff}` : s.goalDiff].map((v, i) => (
        <td key={i} className="px-2 py-2.5 text-center text-xs tabular-nums"
          style={{ color: i === 6 ? (s.goalDiff > 0 ? "#22c55e" : s.goalDiff < 0 ? "#ef4444" : "var(--cat-text-muted)") : "var(--cat-text-secondary)" }}>
          {v}
        </td>
      ))}

      {/* Очки */}
      <td className="px-3 py-2.5 text-center w-10">
        <span className="text-sm font-black tabular-nums" style={{ color: brand }}>
          {s.points}
        </span>
      </td>
    </tr>
  );
}

// ─── Таблица группы ─────────────────────────────────────

function GroupTable({ group, brand }: { group: Group; brand: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border"
      style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>

      {/* Шапка группы */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b"
        style={{ borderColor: "var(--cat-card-border)", background: `${brand}08` }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
          style={{ background: brand, color: "#fff" }}>
          {group.name}
        </div>
        <span className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
          Группа {group.name}
        </span>
        <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
          · {group.standings.length} команд
        </span>
      </div>

      {/* Таблица */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--cat-tag-bg)", borderBottom: "1px solid var(--cat-card-border)" }}>
              <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide w-9"
                style={{ color: "var(--cat-text-muted)" }}>#</th>
              <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide"
                style={{ color: "var(--cat-text-muted)" }}>Команда</th>
              {["И", "В", "Н", "П", "ГЗ", "ГП", "РМ", "О"].map(h => (
                <th key={h} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide w-8"
                  style={{ color: "var(--cat-text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.standings.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-6 text-xs" style={{ color: "var(--cat-text-muted)" }}>
                  Нет данных
                </td>
              </tr>
            )}
            {group.standings.map((s, idx) => (
              <StandingsRow key={s.position} s={s} brand={brand} isFirst={idx === 0} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Легенда */}
      {group.standings.some(s => s.position <= 2) && (
        <div className="px-4 py-2 border-t flex items-center gap-4 text-[10px]"
          style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)" }}>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#FFD700" }} />
            1–2: Выход в плей-офф
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Главная страница ───────────────────────────────────

export default function StandingsPage() {
  const { org, tournament: t } = useTournamentPublic();
  const brand = org.brandColor;

  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/t/${org.slug}/${t.slug}/standings`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Stage[]) => {
        setStages(data);
        if (data.length > 0) setActiveStage(data[0].id);
      })
      .finally(() => setLoading(false));
  }, [org.slug, t.slug]);

  const currentStage = stages.find(s => s.id === activeStage);

  return (
    <div className="space-y-6">

      {/* Заголовок */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${brand}15` }}>
          <TrendingUp className="w-5 h-5" style={{ color: brand }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--cat-text)" }}>Таблицы</h1>
          <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>Групповые этапы</p>
        </div>
      </div>

      {/* Загрузка */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-2" style={{ color: "var(--cat-text-muted)" }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Загрузка...</span>
        </div>
      )}

      {/* Нет данных */}
      {!loading && stages.length === 0 && (
        <div className="text-center py-16 rounded-2xl border"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: brand }} />
          <p className="text-sm font-medium" style={{ color: "var(--cat-text-muted)" }}>
            Таблицы ещё не заполнены
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--cat-text-muted)" }}>
            Данные появятся после старта группового этапа
          </p>
        </div>
      )}

      {/* Переключатель этапов */}
      {!loading && stages.length > 1 && (
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--cat-tag-bg)" }}>
          {stages.map(s => (
            <button key={s.id} onClick={() => setActiveStage(s.id)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={activeStage === s.id
                ? { background: brand, color: "#fff", boxShadow: `0 0 10px ${brand}40` }
                : { color: "var(--cat-text-secondary)" }}>
              {s.nameRu ?? s.name}
            </button>
          ))}
        </div>
      )}

      {/* Группы текущего этапа */}
      {!loading && currentStage && (
        <div className="space-y-4">
          {currentStage.groups.length === 0 && (
            <div className="text-center py-10 rounded-2xl border"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>Группы ещё не созданы</p>
            </div>
          )}
          {currentStage.groups.map(group => (
            <GroupTable key={group.id} group={group} brand={brand} />
          ))}
        </div>
      )}

      {/* Расшифровка колонок */}
      {!loading && stages.length > 0 && (
        <div className="flex flex-wrap gap-4 text-[10px] pt-2" style={{ color: "var(--cat-text-muted)" }}>
          {[["И","Игры"],["В","Выиграл"],["Н","Ничья"],["П","Проиграл"],["ГЗ","Голы забитые"],["ГП","Голы пропущенные"],["РМ","Разница мячей"],["О","Очки"]].map(([abbr, full]) => (
            <span key={abbr}><b>{abbr}</b> — {full}</span>
          ))}
        </div>
      )}
    </div>
  );
}
