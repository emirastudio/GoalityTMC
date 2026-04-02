"use client";
import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useEffect, useState } from "react";

type TeamEntry = {
  id: number;
  regNumber: number;
  name: string | null;
  status: string;
  club: { name: string; badgeUrl: string | null; city: string | null; country: string | null } | null;
};
type GroupedClass = { id: number; name: string; format: string | null; teams: TeamEntry[] };

const COUNTRY_FLAG: Record<string, string> = {
  "Estonia": "🇪🇪", "EE": "🇪🇪", "EST": "🇪🇪",
  "Latvia": "🇱🇻", "LV": "🇱🇻", "LAT": "🇱🇻",
  "Lithuania": "🇱🇹", "LT": "🇱🇹", "LTU": "🇱🇹",
  "Finland": "🇫🇮", "FI": "🇫🇮", "FIN": "🇫🇮",
  "Sweden": "🇸🇪", "SE": "🇸🇪", "SWE": "🇸🇪",
  "Norway": "🇳🇴", "NO": "🇳🇴", "NOR": "🇳🇴",
  "Denmark": "🇩🇰", "DK": "🇩🇰", "DEN": "🇩🇰",
  "Germany": "🇩🇪", "DE": "🇩🇪", "GER": "🇩🇪",
  "Poland": "🇵🇱", "PL": "🇵🇱", "POL": "🇵🇱",
  "Ukraine": "🇺🇦", "UA": "🇺🇦", "UKR": "🇺🇦",
  "Russia": "🇷🇺", "RU": "🇷🇺", "RUS": "🇷🇺",
  "Belarus": "🇧🇾", "BY": "🇧🇾", "BLR": "🇧🇾",
};

function getFlag(country: string | null | undefined): string {
  if (!country) return "";
  return COUNTRY_FLAG[country] ?? "";
}

export default function TeamsPage() {
  const { org, tournament: t, classes } = useTournamentPublic();
  const brand = org.brandColor;
  const [grouped, setGrouped] = useState<GroupedClass[] | null>(null);
  const [activeTab, setActiveTab] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/public/t/${org.slug}/${t.slug}/teams`)
      .then(r => r.json())
      .then(d => {
        const g: GroupedClass[] = d.grouped ?? [];
        setGrouped(g);
        if (g.length > 0) setActiveTab(g[0].id);
      });
  }, [org.slug, t.slug]);

  if (!grouped) return (
    <div className="rounded-2xl p-12 flex justify-center" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: brand, borderTopColor: "transparent" }} />
    </div>
  );

  const totalTeams = grouped.reduce((s, g) => s + g.teams.length, 0);
  const activeGroup = grouped.find(g => g.id === activeTab);

  // Birth year label from context classes
  function birthYearLabel(classId: number): string {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return "";
    if (cls.minBirthYear && cls.maxBirthYear && cls.minBirthYear !== cls.maxBirthYear) {
      return `${cls.maxBirthYear}–${cls.minBirthYear}`;
    }
    if (cls.minBirthYear) return String(cls.minBirthYear);
    return "";
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3" style={{ borderBottom: "1px solid var(--cat-divider)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--cat-text-muted)" }}>
          Команды · {totalTeams} зарегистрировано
        </p>
      </div>

      {/* Class tabs — horizontal scroll */}
      <div className="flex overflow-x-auto" style={{ borderBottom: "1px solid var(--cat-divider)" }}>
        {grouped.filter(g => g.teams.length > 0).map(g => (
          <button
            key={g.id}
            onClick={() => setActiveTab(g.id)}
            className="shrink-0 px-4 py-3 text-[12px] font-semibold transition-all border-b-2"
            style={{
              color: activeTab === g.id ? brand : "var(--cat-text-secondary)",
              borderColor: activeTab === g.id ? brand : "transparent",
              background: "transparent",
            }}
          >
            {g.name}
            <span className="ml-1.5 text-[10px] opacity-60">({g.teams.length})</span>
          </button>
        ))}
      </div>

      {/* Team list for active tab */}
      <div className="p-4">
        {!activeGroup || activeGroup.teams.length === 0 ? (
          <p className="text-center py-8 text-[13px]" style={{ color: "var(--cat-text-secondary)" }}>
            Команды ещё не зарегистрированы
          </p>
        ) : (
          <div className="space-y-1.5">
            {activeGroup.teams.map((team, idx) => (
              <div
                key={team.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)" }}
              >
                {/* Number */}
                <span className="text-[11px] font-mono w-5 shrink-0 text-right" style={{ color: "var(--cat-text-faint)" }}>
                  {idx + 1}
                </span>

                {/* Club badge */}
                {team.club?.badgeUrl ? (
                  <img
                    src={team.club.badgeUrl}
                    alt=""
                    className="w-9 h-9 rounded-xl object-contain shrink-0"
                    style={{ border: "1px solid var(--cat-card-border)" }}
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-[10px] font-bold"
                    style={{ background: brand + "15", color: brand }}
                  >
                    {team.club?.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?"}
                  </div>
                )}

                {/* Name + city */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate leading-tight" style={{ color: "var(--cat-text)" }}>
                    {team.name ?? team.club?.name ?? "—"}
                  </p>
                  {team.club?.city && (
                    <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                      {team.club.city}
                    </p>
                  )}
                </div>

                {/* Country flag */}
                {team.club?.country && (
                  <span className="text-xl shrink-0" title={team.club.country}>
                    {getFlag(team.club.country)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
