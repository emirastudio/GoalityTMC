"use client";
import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type TeamEntry = { id: number; regNumber: number; name: string | null; status: string; club: { name: string; badgeUrl: string | null; city: string | null } | null };
type GroupedClass = { id: number; name: string; format: string | null; teams: TeamEntry[] };

export default function TeamsPage() {
  const { org, tournament: t } = useTournamentPublic();
  const brand = org.brandColor;
  const [grouped, setGrouped] = useState<GroupedClass[] | null>(null);

  useEffect(() => {
    fetch(`/api/public/t/${org.slug}/${t.slug}/teams`)
      .then(r => r.json())
      .then(d => setGrouped(d.grouped));
  }, [org.slug, t.slug]);

  if (!grouped) return (
    <div className="rounded-2xl p-12 flex justify-center" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: brand, borderTopColor: "transparent" }} />
    </div>
  );

  const totalTeams = grouped.reduce((s, g) => s + g.teams.length, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: "var(--cat-text-muted)" }}>
          Команды · {totalTeams} зарегистрировано
        </p>

        {totalTeams === 0 ? (
          <div className="text-center py-8" style={{ color: "var(--cat-text-secondary)" }}>
            <p className="text-[13px]">Команды ещё не зарегистрированы</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.filter(g => g.teams.length > 0).map(cls => (
              <div key={cls.id}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1" style={{ background: "var(--cat-divider)" }} />
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2"
                    style={{ color: brand }}>
                    {cls.name} · {cls.teams.length} команд
                  </span>
                  <div className="h-px flex-1" style={{ background: "var(--cat-divider)" }} />
                </div>
                <div className="space-y-1.5">
                  {cls.teams.map(team => (
                    <div key={team.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)" }}>
                      <span className="text-[10px] font-mono w-6 shrink-0 text-right" style={{ color: "var(--cat-text-faint)" }}>#{team.regNumber}</span>
                      {team.club?.badgeUrl ? (
                        <img src={team.club.badgeUrl} alt="" className="w-8 h-8 rounded-lg object-contain shrink-0"
                          style={{ border: "1px solid var(--cat-card-border)" }} />
                      ) : (
                        <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold"
                          style={{ background: brand + "15", color: brand }}>
                          {team.club?.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: "var(--cat-text)" }}>{team.name ?? team.club?.name ?? "—"}</p>
                        {team.club?.city && <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{team.club.city}</p>}
                      </div>
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                        team.status === "confirmed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        team.status === "open" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                        "text-gray-500 border border-gray-200"
                      )}>{team.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
