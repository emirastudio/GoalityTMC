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
  "Estonia": "\u{1F1EA}\u{1F1EA}", "EE": "\u{1F1EA}\u{1F1EA}", "EST": "\u{1F1EA}\u{1F1EA}",
  "Latvia": "\u{1F1F1}\u{1F1FB}", "LV": "\u{1F1F1}\u{1F1FB}", "LAT": "\u{1F1F1}\u{1F1FB}",
  "Lithuania": "\u{1F1F1}\u{1F1F9}", "LT": "\u{1F1F1}\u{1F1F9}", "LTU": "\u{1F1F1}\u{1F1F9}",
  "Finland": "\u{1F1EB}\u{1F1EE}", "FI": "\u{1F1EB}\u{1F1EE}", "FIN": "\u{1F1EB}\u{1F1EE}",
  "Sweden": "\u{1F1F8}\u{1F1EA}", "SE": "\u{1F1F8}\u{1F1EA}", "SWE": "\u{1F1F8}\u{1F1EA}",
  "Norway": "\u{1F1F3}\u{1F1F4}", "NO": "\u{1F1F3}\u{1F1F4}", "NOR": "\u{1F1F3}\u{1F1F4}",
  "Denmark": "\u{1F1E9}\u{1F1F0}", "DK": "\u{1F1E9}\u{1F1F0}", "DEN": "\u{1F1E9}\u{1F1F0}",
  "Germany": "\u{1F1E9}\u{1F1EA}", "DE": "\u{1F1E9}\u{1F1EA}", "GER": "\u{1F1E9}\u{1F1EA}",
  "Poland": "\u{1F1F5}\u{1F1F1}", "PL": "\u{1F1F5}\u{1F1F1}", "POL": "\u{1F1F5}\u{1F1F1}",
  "Ukraine": "\u{1F1FA}\u{1F1E6}", "UA": "\u{1F1FA}\u{1F1E6}", "UKR": "\u{1F1FA}\u{1F1E6}",
  "Russia": "\u{1F1F7}\u{1F1FA}", "RU": "\u{1F1F7}\u{1F1FA}", "RUS": "\u{1F1F7}\u{1F1FA}",
  "Belarus": "\u{1F1E7}\u{1F1FE}", "BY": "\u{1F1E7}\u{1F1FE}", "BLR": "\u{1F1E7}\u{1F1FE}",
};

function getFlag(country: string | null | undefined): string {
  if (!country) return "";
  return COUNTRY_FLAG[country] ?? "";
}

export default function TeamsPage() {
  const { org, tournament: t, classes } = useTournamentPublic();
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
    <div className="bg-white border border-gray-200 rounded-lg p-12 flex justify-center">
      <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const totalTeams = grouped.reduce((s, g) => s + g.teams.length, 0);
  const activeGroup = grouped.find(g => g.id === activeTab);

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
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Команды · {totalTeams} зарегистрировано
        </p>
      </div>

      {/* Class tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200">
        {grouped.filter(g => g.teams.length > 0).map(g => (
          <button
            key={g.id}
            onClick={() => setActiveTab(g.id)}
            className={`shrink-0 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === g.id
                ? "text-gray-900 border-gray-900"
                : "text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            {g.name}
            <span className="ml-1.5 text-[10px] opacity-60">({g.teams.length})</span>
          </button>
        ))}
      </div>

      {/* Team list */}
      <div className="p-4">
        {!activeGroup || activeGroup.teams.length === 0 ? (
          <p className="text-center py-8 text-sm text-gray-500">
            Команды ещё не зарегистрированы
          </p>
        ) : (
          <div className="space-y-1">
            {activeGroup.teams.map((team, idx) => (
              <div key={team.id} className="flex items-center gap-3 px-3 py-2.5 rounded border border-gray-100 bg-gray-50">
                <span className="text-xs font-mono w-5 shrink-0 text-right text-gray-400">
                  {idx + 1}
                </span>

                {team.club?.badgeUrl ? (
                  <img src={team.club.badgeUrl} alt="" className="w-8 h-8 rounded object-contain shrink-0 border border-gray-200" />
                ) : (
                  <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-[10px] font-bold bg-gray-200 text-gray-600">
                    {team.club?.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?"}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate leading-tight">
                    {team.name ?? team.club?.name ?? "—"}
                  </p>
                  {team.club?.city && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {team.club.city}
                    </p>
                  )}
                </div>

                {team.club?.country && (
                  <span className="text-lg shrink-0" title={team.club.country}>
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
