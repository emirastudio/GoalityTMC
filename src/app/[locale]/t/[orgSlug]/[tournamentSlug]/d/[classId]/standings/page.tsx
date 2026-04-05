"use client";

import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Trophy, TrendingUp, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

// ─── Types ───────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────

function medalColor(pos: number): { bg: string; color: string } | null {
  if (pos === 1) return { bg: "#FFD70020", color: "#B8860B" };
  if (pos === 2) return { bg: "#C0C0C020", color: "#808080" };
  if (pos === 3) return { bg: "#CD7F3220", color: "#CD7F32" };
  return null;
}

// ─── Table row ───────────────────────────────────────────

function StandingsRow({ s, isFirst }: { s: Standing; isFirst: boolean }) {
  const medal = medalColor(s.position);

  return (
    <tr
      style={{
        background: medal ? medal.bg : isFirst ? "rgba(43,254,186,0.02)" : "transparent",
        borderBottom: "1px solid var(--cat-card-border)",
      }}
    >
      <td className="px-3 py-2.5 w-9 text-center">
        {medal ? (
          <span className="text-sm font-black" style={{ color: medal.color }}>{s.position}</span>
        ) : (
          <span className="text-sm font-semibold" style={{ color: "var(--cat-text-muted)" }}>{s.position}</span>
        )}
      </td>
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-2">
          {s.team?.club?.badgeUrl ? (
            <img src={s.team.club.badgeUrl} alt="" className="w-5 h-5 rounded object-contain shrink-0" />
          ) : (
            <div
              className="w-5 h-5 rounded shrink-0 flex items-center justify-center text-[8px] font-bold"
              style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}
            >
              {s.team?.name?.[0] ?? "?"}
            </div>
          )}
          <span className="text-sm font-semibold leading-tight" style={{ color: "var(--cat-text)" }}>
            {s.team?.name ?? "—"}
          </span>
        </div>
      </td>
      {[s.played, s.won, s.drawn, s.lost, s.goalsFor, s.goalsAgainst, s.goalDiff >= 0 ? `+${s.goalDiff}` : s.goalDiff].map((v, i) => (
        <td
          key={i}
          className="px-2 py-2.5 text-center text-xs tabular-nums"
          style={{
            color: i === 6
              ? (s.goalDiff > 0 ? "#22c55e" : s.goalDiff < 0 ? "#ef4444" : "var(--cat-text-muted)")
              : "var(--cat-text-secondary)",
          }}
        >
          {v}
        </td>
      ))}
      <td className="px-3 py-2.5 text-center w-10">
        <span className="text-sm font-black tabular-nums" style={{ color: "var(--cat-accent)" }}>
          {s.points}
        </span>
      </td>
    </tr>
  );
}

// ─── Group table ─────────────────────────────────────────

function GroupTable({ group, tGroup, tTeams, tNoData, tColTeam, colHeaders, colFull }: {
  group: Group;
  tGroup: string; tTeams: string; tNoData: string; tColTeam: string;
  colHeaders: string[]; colFull: string[];
}) {

  return (
    <div
      className="rounded-2xl overflow-hidden border"
      style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}
    >
      {/* Group header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 border-b"
        style={{ borderColor: "var(--cat-card-border)", background: "rgba(43,254,186,0.04)" }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
          style={{ background: "var(--cat-accent)", color: "#0A0E14" }}
        >
          {group.name}
        </div>
        <span className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
          {tGroup} {group.name}
        </span>
        <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
          · {group.standings.length} {tTeams}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--cat-tag-bg)", borderBottom: "1px solid var(--cat-card-border)" }}>
              <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide w-9"
                style={{ color: "var(--cat-text-muted)" }}>#</th>
              <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide"
                style={{ color: "var(--cat-text-muted)" }}>{tColTeam}</th>
              {colHeaders.map(h => (
                <th key={h} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide w-8"
                  style={{ color: "var(--cat-text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.standings.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-6 text-xs" style={{ color: "var(--cat-text-muted)" }}>
                  {tNoData}
                </td>
              </tr>
            )}
            {group.standings.map((s, idx) => (
              <StandingsRow key={s.position} s={s} isFirst={idx === 0} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────

export default function DivisionStandingsPage() {
  const { org, tournament: tourney } = useTournamentPublic();
  const params = useParams<{ classId: string }>();
  const classId = params.classId ?? "";
  const t = useTranslations("tournament");

  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<number | null>(null);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    function load(showLoader = false) {
      if (showLoader) setLoading(true);
      fetch(`/api/public/t/${org.slug}/${tourney.slug}/standings?classId=${classId}`)
        .then(r => r.ok ? r.json() : [])
        .then((data: Stage[]) => {
          if (cancelled) return;
          setStages(data);
          if (data.length > 0 && !activeStage) setActiveStage(data[0].id);
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    load(true);
    const interval = setInterval(() => load(false), 15000);
    return () => { cancelled = true; clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.slug, tourney.slug, classId]);

  const currentStage = stages.find(s => s.id === activeStage);
  const colAbbrs = [t("colPlayed"), t("colWon"), t("colDrawn"), t("colLost"), t("colGoalsFor"), t("colGoalsAgainst"), t("colGoalDiff"), t("colPoints")];
  const colFullNames = [t("colPlayed_full"), t("colWon_full"), t("colDrawn_full"), t("colLost_full"), t("colGoalsFor_full"), t("colGoalsAgainst_full"), t("colGoalDiff_full"), t("colPoints_full")];

  return (
    <div className="space-y-6">

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-2" style={{ color: "var(--cat-text-muted)" }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--cat-accent)" }} />
          <span className="text-sm">{t("loading")}</span>
        </div>
      )}

      {/* No data */}
      {!loading && stages.length === 0 && (
        <div
          className="text-center py-16 rounded-2xl border"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
        >
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "var(--cat-accent)" }} />
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
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--cat-tag-bg)" }}>
          {stages.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveStage(s.id)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={activeStage === s.id
                ? { background: "var(--cat-accent)", color: "#0A0E14", boxShadow: "0 0 10px var(--cat-accent-glow)" }
                : { color: "var(--cat-text-secondary)" }}
            >
              {s.nameRu ?? s.name}
            </button>
          ))}
        </div>
      )}

      {/* Groups */}
      {!loading && currentStage && (
        <div className="space-y-4">
          {currentStage.groups.length === 0 && (
            <div
              className="text-center py-10 rounded-2xl border"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
            >
              <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("groupsNotCreated")}</p>
            </div>
          )}
          {currentStage.groups.map(group => (
            <GroupTable
              key={group.id} group={group}
              tGroup={t("groupLabel")} tTeams={t("teams")}
              tNoData={t("noData")} tColTeam={t("colTeam")}
              colHeaders={colAbbrs} colFull={colFullNames}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      {!loading && stages.length > 0 && (
        <div className="flex flex-wrap gap-4 text-[10px] pt-2" style={{ color: "var(--cat-text-muted)" }}>
          {colAbbrs.map((abbr, i) => (
            <span key={abbr}><b>{abbr}</b> — {colFullNames[i]}</span>
          ))}
        </div>
      )}
    </div>
  );
}
