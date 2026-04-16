"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Trophy } from "lucide-react";

export type TournamentOption = {
  id: number;
  name: string;
  logoUrl: string | null;
  year: number;
  teamsCount: number; // how many of MY teams are in this tournament
};

interface TournamentSwitcherProps {
  current: TournamentOption;
  all: TournamentOption[];
}

export function TournamentSwitcher({ current, all }: TournamentSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function switchTo(id: number) {
    if (id === current.id || switching) return;
    setSwitching(true);
    setOpen(false);
    try {
      await fetch("/api/team/switch-tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId: id }),
      });
      router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  // Single tournament — just show a badge, no dropdown needed
  if (all.length <= 1) {
    return (
      <div
        className="flex items-center gap-2 px-2.5 py-2 rounded-xl"
        style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}
      >
        {current.logoUrl ? (
          <img src={current.logoUrl} alt={current.name} className="w-5 h-5 rounded object-contain shrink-0" />
        ) : (
          <Trophy className="w-4 h-4 shrink-0" style={{ color: "var(--cat-accent)" }} />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold truncate" style={{ color: "var(--cat-text)" }}>
            {current.name}
          </p>
          <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
            {current.year} · {current.teamsCount} {current.teamsCount === 1 ? "team" : "teams"}
          </p>
        </div>
      </div>
    );
  }

  // Multiple tournaments — dropdown
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all text-left"
        style={{
          background: open ? "var(--cat-badge-open-bg)" : "var(--cat-tag-bg)",
          border: open ? "1px solid var(--cat-accent)" : "1px solid var(--cat-card-border)",
          opacity: switching ? 0.6 : 1,
        }}
      >
        {current.logoUrl ? (
          <img src={current.logoUrl} alt={current.name} className="w-5 h-5 rounded object-contain shrink-0" />
        ) : (
          <Trophy className="w-4 h-4 shrink-0" style={{ color: "var(--cat-accent)" }} />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold truncate" style={{ color: "var(--cat-text)" }}>
            {current.name}
          </p>
          <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
            {current.year} · {current.teamsCount} {current.teamsCount === 1 ? "team" : "teams"}
          </p>
        </div>
        <ChevronDown
          className="w-3.5 h-3.5 shrink-0 transition-transform"
          style={{ color: "var(--cat-text-muted)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl overflow-hidden shadow-xl"
          style={{ border: "1px solid var(--cat-card-border)", background: "var(--cat-card-bg)" }}
        >
          <p className="text-[10px] font-semibold uppercase px-3 pt-2.5 pb-1" style={{ color: "var(--cat-text-muted)" }}>
            Your tournaments
          </p>
          {all.map(t => (
            <button
              key={t.id}
              onClick={() => switchTo(t.id)}
              className="w-full text-left flex items-center gap-2 px-3 py-2.5 transition-colors border-t"
              style={{
                borderColor: "var(--cat-card-border)",
                background: t.id === current.id ? "var(--cat-badge-open-bg)" : "transparent",
              }}
            >
              {t.logoUrl ? (
                <img src={t.logoUrl} alt={t.name} className="w-5 h-5 rounded object-contain shrink-0" />
              ) : (
                <Trophy className="w-4 h-4 shrink-0" style={{ color: t.id === current.id ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate" style={{ color: "var(--cat-text)" }}>{t.name}</p>
                <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                  {t.year} · {t.teamsCount} {t.teamsCount === 1 ? "team" : "teams"}
                </p>
              </div>
              {t.id === current.id && (
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--cat-accent)" }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
