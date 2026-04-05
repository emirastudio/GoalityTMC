"use client";

import { useTournamentPublic } from "@/lib/tournament-public-context";
import { Link } from "@/i18n/navigation";
import { Trophy, ArrowRight } from "lucide-react";

function parseClassColor(name: string) {
  const upper = name.toUpperCase();
  if (upper.startsWith("B") || upper.startsWith("U")) return "#3B82F6";
  if (upper.startsWith("G")) return "#EC4899";
  const palette = ["#8B5CF6","#F59E0B","#10B981","#06B6D4","#EF4444"];
  return palette[name.charCodeAt(0) % palette.length];
}

export default function BracketRedirectPage() {
  const { org, tournament: tourney, classes } = useTournamentPublic();
  const base = `/t/${org.slug}/${tourney.slug}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--cat-badge-open-bg)" }}>
          <Trophy className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--cat-text)" }}>Сетка плей-офф</h1>
          <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>Выберите дивизион</p>
        </div>
      </div>

      <div className="rounded-2xl border p-5 space-y-3"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--cat-text-secondary)" }}>
          Сетки плей-офф доступны по каждому дивизиону отдельно:
        </p>
        <div className="space-y-2">
          {classes.map(cls => {
            const color = parseClassColor(cls.name);
            return (
              <Link
                key={cls.id}
                href={`${base}/d/${cls.id}/bracket`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:opacity-90"
                style={{ background: `${color}10`, borderColor: `${color}30` }}>
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="flex-1 text-sm font-semibold" style={{ color: "var(--cat-text)" }}>{cls.name}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: `${color}20`, color }}>
                  {cls.teamCount} команд
                </span>
                <ArrowRight className="w-4 h-4 shrink-0" style={{ color }} />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
