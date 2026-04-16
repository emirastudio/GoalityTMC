"use client";
import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";

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
};

function getFlag(country: string | null | undefined): string {
  if (!country) return "";
  return COUNTRY_FLAG[country] ?? "";
}

export default function TeamsPage() {
  const { org, tournament: tourney, classes } = useTournamentPublic();
  const t = useTranslations("tournament");
  const [grouped, setGrouped] = useState<GroupedClass[] | null>(null);
  const [activeTab, setActiveTab] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/public/t/${org.slug}/${tourney.slug}/teams`)
      .then(r => r.json())
      .then(d => {
        const g: GroupedClass[] = d.grouped ?? [];
        setGrouped(g);
        if (g.length > 0) setActiveTab(g[0].id);
      });
  }, [org.slug, tourney.slug]);

  if (!grouped) return (
    <div className="rounded-xl border p-12 flex justify-center"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      <div className="w-6 h-6 border-2 rounded-full animate-spin"
        style={{ borderColor: "var(--cat-card-border)", borderTopColor: "var(--cat-accent)" }} />
    </div>
  );

  const totalTeams = grouped.reduce((s, g) => s + g.teams.length, 0);
  const activeGroup = grouped.find(g => g.id === activeTab);

  function birthYearLabel(classId: number): string {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return "";
    if (cls.minBirthYear && cls.maxBirthYear && cls.minBirthYear !== cls.maxBirthYear)
      return `${cls.maxBirthYear}–${cls.minBirthYear}`;
    if (cls.minBirthYear) return String(cls.minBirthYear);
    return "";
  }

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>

      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b"
        style={{ borderColor: "var(--cat-card-border)" }}>
        <p className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--cat-text-muted)" }}>
          {t("teamsRegistered", { count: totalTeams })}
        </p>
      </div>

      {/* Class tabs */}
      <div className="flex overflow-x-auto border-b" style={{ borderColor: "var(--cat-card-border)" }}>
        {grouped.filter(g => g.teams.length > 0).map(g => (
          <button
            key={g.id}
            onClick={() => setActiveTab(g.id)}
            className="shrink-0 px-4 py-3 text-xs font-medium border-b-2 transition-colors"
            style={{
              color: activeTab === g.id ? "var(--cat-accent)" : "var(--cat-text-secondary)",
              borderBottomColor: activeTab === g.id ? "var(--cat-accent)" : "transparent",
            }}
          >
            {g.name}
            <span className="ml-1.5 text-[10px] opacity-60">({g.teams.length})</span>
          </button>
        ))}
      </div>

      {/* Team list */}
      <div className="p-4">
        {!activeGroup || activeGroup.teams.length === 0 ? (
          <p className="text-center py-8 text-sm" style={{ color: "var(--cat-text-muted)" }}>
            {t("noTeamsRegistered")}
          </p>
        ) : (
          <div className="space-y-1">
            {activeGroup.teams.map((team, idx) => (
              <Link key={team.id} href={`/t/${org.slug}/${tourney.slug}/teams/${team.id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all hover:opacity-80"
                style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", display: "flex" }}>
                <span className="text-xs font-mono w-5 shrink-0 text-right"
                  style={{ color: "var(--cat-text-muted)" }}>{idx + 1}</span>

                {team.club?.badgeUrl ? (
                  <img src={team.club.badgeUrl} alt="" className="w-8 h-8 rounded object-contain shrink-0 border"
                    style={{ borderColor: "var(--cat-card-border)" }} />
                ) : (
                  <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-[10px] font-bold"
                    style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}>
                    {team.club?.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?"}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-tight"
                    style={{ color: "var(--cat-text)" }}>
                    {team.name ?? team.club?.name ?? "—"}
                  </p>
                  {team.club?.city && (
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                      {team.club.city}
                    </p>
                  )}
                </div>

                {team.club?.country && (
                  <span className="text-lg shrink-0" title={team.club.country}>
                    {getFlag(team.club.country)}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 shrink-0 opacity-40" style={{ color: "var(--cat-text-muted)" }} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
