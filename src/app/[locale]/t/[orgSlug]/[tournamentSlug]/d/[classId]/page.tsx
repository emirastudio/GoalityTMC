"use client";

import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Users, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

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

function statusBadge(status: string, tConfirmed: string, tPending: string) {
  if (status === "confirmed") {
    return (
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
        style={{ background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-badge-open-border)", color: "var(--cat-badge-open-text)" }}
      >
        {tConfirmed}
      </span>
    );
  }
  if (status === "open" || status === "pending") {
    return (
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
        style={{ background: "var(--badge-warning-bg)", borderColor: "var(--badge-warning-border)", color: "var(--badge-warning-color)" }}
      >
        {tPending}
      </span>
    );
  }
  return null;
}

export default function DivisionTeamsPage() {
  const { org, tournament: tourney } = useTournamentPublic();
  const params = useParams<{ classId: string }>();
  const classId = parseInt(params.classId ?? "0");
  const t = useTranslations("tournament");

  const [teams, setTeams] = useState<TeamEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    fetch(`/api/public/t/${org.slug}/${tourney.slug}/teams`)
      .then(r => r.ok ? r.json() : { grouped: [] })
      .then(data => {
        const g: GroupedClass[] = data.grouped ?? [];
        const cls = g.find(c => c.id === classId);
        setTeams(cls?.teams ?? []);
      })
      .finally(() => setLoading(false));
  }, [org.slug, tourney.slug, classId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2" style={{ color: "var(--cat-text-muted)" }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--cat-accent)" }} />
        <span className="text-sm">{t("loading")}</span>
      </div>
    );
  }

  if (!teams || teams.length === 0) {
    return (
      <div
        className="text-center py-16 rounded-2xl border"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "var(--cat-accent)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--cat-text-muted)" }}>
          {t("noTeamsRegistered")}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--cat-text-muted)" }}>
          {t("teamsWillAppearHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>

      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b" style={{ borderColor: "var(--cat-card-border)" }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
          {t("teamsRegisteredCount", { count: teams.length })}
        </p>
      </div>

      {/* Team list */}
      <div className="p-4">
        <div className="space-y-1">
          {teams.map((team, idx) => (
            <div
              key={team.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border"
              style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}
            >
              {/* Index */}
              <span className="text-xs font-mono w-5 shrink-0 text-right" style={{ color: "var(--cat-text-muted)" }}>
                {idx + 1}
              </span>

              {/* Reg number */}
              {team.regNumber > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)", border: "1px solid var(--cat-card-border)" }}>
                  #{team.regNumber}
                </span>
              )}

              {/* Badge */}
              {team.club?.badgeUrl ? (
                <img
                  src={team.club.badgeUrl}
                  alt=""
                  className="w-8 h-8 rounded object-contain shrink-0 border"
                  style={{ borderColor: "var(--cat-card-border)" }}
                />
              ) : (
                <div
                  className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-[10px] font-bold"
                  style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}
                >
                  {(team.club?.name ?? team.name ?? "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>
              )}

              {/* Name + club */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-tight" style={{ color: "var(--cat-text)" }}>
                  {team.name ?? team.club?.name ?? "—"}
                </p>
                {team.club?.name && team.name && team.name !== team.club.name && (
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                    {team.club.name}
                    {team.club.city ? ` · ${team.club.city}` : ""}
                  </p>
                )}
                {!team.name && team.club?.city && (
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                    {team.club.city}
                  </p>
                )}
              </div>

              {/* Country flag */}
              {team.club?.country && (
                <span className="text-lg shrink-0" title={team.club.country}>
                  {getFlag(team.club.country)}
                </span>
              )}

              {/* Status badge */}
              <div className="shrink-0">
                {statusBadge(team.status, t("statusConfirmed"), t("statusPending"))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
