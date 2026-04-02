"use client";
import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Trophy, Clock, MapPin } from "lucide-react";

// MOCK DATA
const MOCK_UPCOMING = [
  { id: 1, homeTeam: "Tallinn FC", awayTeam: "Narva United", class: "U13", field: "Поле 1", time: "14 июн · 09:00" },
  { id: 2, homeTeam: "Haapsalu SC", awayTeam: "Pärnu FC", class: "U11", field: "Поле 2", time: "14 июн · 10:30" },
  { id: 3, homeTeam: "Tartu JK", awayTeam: "Viljandi FC", class: "U15", field: "Поле 1", time: "14 июн · 12:00" },
  { id: 4, homeTeam: "Rakvere JK", awayTeam: "Maardu FC", class: "U13", field: "Поле 3", time: "14 июн · 14:00" },
  { id: 5, homeTeam: "Sillamäe FC", awayTeam: "Jõhvi United", class: "U11", field: "Поле 2", time: "15 июн · 09:00" },
];

const MOCK_RESULTS = [
  { id: 6, homeTeam: "Tallinn FC", awayTeam: "Tartu JK", homeScore: 3, awayScore: 1, class: "U13", field: "Поле 1", time: "13 июн · 14:00" },
  { id: 7, homeTeam: "Pärnu FC", awayTeam: "Haapsalu SC", homeScore: 2, awayScore: 2, class: "U11", field: "Поле 2", time: "13 июн · 12:00" },
  { id: 8, homeTeam: "Viljandi FC", awayTeam: "Maardu FC", homeScore: 0, awayScore: 1, class: "U15", field: "Поле 1", time: "13 июн · 10:30" },
];

export default function SchedulePage() {
  const { org } = useTournamentPublic();
  const brand = org.brandColor;
  const [tab, setTab] = useState<"upcoming" | "results">("upcoming");

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
        <div className="flex" style={{ borderBottom: "1px solid var(--cat-divider)" }}>
          {(["upcoming", "results"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex-1 py-3 text-[13px] font-semibold transition-colors", tab === t ? "border-b-2" : "opacity-50")}
              style={{ color: tab === t ? brand : "var(--cat-text-secondary)", borderColor: tab === t ? brand : "transparent" }}>
              {t === "upcoming" ? "Предстоящие" : "Результаты"}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-3">
          {tab === "upcoming" && MOCK_UPCOMING.map(match => (
            <div key={match.id} className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: brand + "15", color: brand }}>{match.class}</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold" style={{ color: "var(--cat-text)" }}>{match.homeTeam}</p>
                  <span className="text-[11px] font-bold" style={{ color: "var(--cat-text-muted)" }}>vs</span>
                  <p className="text-[13px] font-semibold" style={{ color: "var(--cat-text)" }}>{match.awayTeam}</p>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                    <Clock className="w-3 h-3" />{match.time}
                  </span>
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                    <MapPin className="w-3 h-3" />{match.field}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {tab === "results" && MOCK_RESULTS.map(match => (
            <div key={match.id} className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: brand + "15", color: brand }}>{match.class}</span>
                  <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>{match.time} · {match.field}</span>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[13px] font-semibold flex-1 text-right" style={{ color: match.homeScore > match.awayScore ? "var(--cat-text)" : "var(--cat-text-secondary)" }}>{match.homeTeam}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xl font-black w-8 text-center" style={{ color: "var(--cat-text)" }}>{match.homeScore}</span>
                    <span className="text-sm" style={{ color: "var(--cat-text-muted)" }}>:</span>
                    <span className="text-xl font-black w-8 text-center" style={{ color: "var(--cat-text)" }}>{match.awayScore}</span>
                  </div>
                  <p className="text-[13px] font-semibold flex-1" style={{ color: match.awayScore > match.homeScore ? "var(--cat-text)" : "var(--cat-text-secondary)" }}>{match.awayTeam}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
