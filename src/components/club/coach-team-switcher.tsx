"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Check, Users } from "lucide-react";

type Team = {
  id: number;
  name: string | null;
  birthYear: number | null;
  gender: string;
  label: string;
};

// Sidebar switcher for coaches who manage 2+ teams in a SINGLE club
// (multi-team junction). Hidden for club admins (no junction rows) and
// single-team coaches. Persists selection via /api/clubs/me/switch-team
// which updates clubUsers.team_id and re-issues the JWT.
export function CoachTeamSwitcher() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeamId, setCurrentTeamId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetch("/api/clubs/me/teams")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setTeams(data.teams ?? []);
        setCurrentTeamId(data.currentTeamId ?? null);
      })
      .catch(() => {});
  }, []);

  if (teams.length < 2) return null;

  const current = teams.find((t) => t.id === currentTeamId) ?? teams[0];

  async function switchTo(teamId: number) {
    if (teamId === currentTeamId || switching) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/clubs/me/switch-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      if (res.ok) {
        // Hard reload — JWT lives in HttpOnly cookie, server pages must re-render.
        window.location.reload();
      }
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="relative px-3 pb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-all hover:opacity-80 cursor-pointer"
        style={{
          background: "var(--cat-tag-bg)",
          color: "var(--cat-text)",
          border: "1px solid var(--cat-card-border)",
        }}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Users className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-accent)" }} />
          <span className="truncate text-xs font-semibold">{current?.label}</span>
        </span>
        <ChevronDown
          className="w-3.5 h-3.5 shrink-0 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>
      {open && (
        <div
          className="absolute left-3 right-3 mt-1 z-20 rounded-xl overflow-hidden shadow-lg"
          style={{
            background: "var(--cat-card-bg)",
            border: "1px solid var(--cat-card-border)",
          }}
        >
          {teams.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTo(t.id)}
              disabled={switching}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:opacity-80 cursor-pointer text-left"
              style={{
                color: "var(--cat-text)",
                borderBottom: "1px solid var(--cat-card-border)",
              }}
            >
              <span className="truncate text-xs">{t.label}</span>
              {t.id === currentTeamId && (
                <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-accent)" }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
