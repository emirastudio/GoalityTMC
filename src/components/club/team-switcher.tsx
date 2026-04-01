"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useTeam } from "@/lib/team-context";
import { ChevronDown, Check, Users, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";

type TeamSummary = {
  id: number;
  regNumber: number;
  name: string;
  className: string;
  status: "draft" | "open" | "confirmed" | "cancelled";
  playersCount: number;
  staffCount: number;
};

type ClassOption = {
  id: number;
  name: string;
};

interface TeamSwitcherProps {
  clubName: string;
  clubBadgeUrl: string | null;
  clubId: number;
  teams: TeamSummary[];
  classes: ClassOption[];
}

const statusDot: Record<string, string> = {
  draft:     "bg-gray-400",
  open:      "bg-emerald-500",
  confirmed: "bg-gold",
  cancelled: "bg-red-400",
};

export function TeamSwitcher({ clubName, clubBadgeUrl, clubId, teams, classes }: TeamSwitcherProps) {
  const t = useTranslations("team");
  const { teamId, setTeamId } = useTeam();
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamClassId, setNewTeamClassId] = useState("");
  const [adding, setAdding] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const activeTeam = teams.find((tm) => tm.id === teamId) ?? teams[0];

  // Close on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Club initials fallback
  const initials = clubName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleAddTeam() {
    if (!newTeamName.trim() || !newTeamClassId) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName.trim(), classId: newTeamClassId }),
      });
      if (res.ok) {
        const team = await res.json();
        setTeamId(team.id);
        setShowAddModal(false);
        setNewTeamName("");
        setNewTeamClassId("");
        router.refresh();
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Club header */}
      <div className="flex items-center gap-2.5 px-1">
        {clubBadgeUrl ? (
          <img
            src={clubBadgeUrl}
            alt={clubName}
            className="w-9 h-9 rounded-full object-contain bg-surface border border-border shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-navy/10 border border-navy/20 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-navy">{initials}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-text-primary truncate leading-tight">{clubName}</p>
          <p className="text-[10px] text-text-secondary leading-tight">{teams.length} {teams.length === 1 ? "team" : "teams"}</p>
        </div>
      </div>

      {/* Team dropdown */}
      {activeTeam && (
        <div ref={ref} className="relative">
          {/* Trigger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "w-full text-left rounded-xl border px-3 py-2.5 transition-all",
              open
                ? "border-navy bg-navy/5 shadow-sm"
                : "border-border hover:border-navy/30 hover:bg-surface/60 bg-white"
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full shrink-0", statusDot[activeTeam.status])} />
              <p className="text-[13px] font-semibold text-text-primary flex-1 truncate">
                {activeTeam.name || "—"}
              </p>
              <ChevronDown className={cn("w-3.5 h-3.5 text-text-secondary shrink-0 transition-transform", open && "rotate-180")} />
            </div>
            <div className="flex items-center gap-3 mt-1 ml-4">
              <span className="text-[11px] text-text-secondary font-medium">{activeTeam.className}</span>
              <span className="text-[11px] text-text-secondary flex items-center gap-0.5">
                <Users className="w-3 h-3" />&nbsp;{activeTeam.playersCount}
              </span>
            </div>
            <p className="text-[10px] text-text-secondary/60 mt-0.5 ml-4">{t(activeTeam.status)}</p>
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-xl border border-border shadow-lg overflow-hidden">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => { setTeamId(team.id); setOpen(false); }}
                  className={cn(
                    "w-full text-left flex items-start gap-2.5 px-3 py-2.5 hover:bg-surface transition-colors border-b border-border last:border-0",
                    team.id === activeTeam?.id && "bg-navy/5"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", statusDot[team.status])} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-text-primary truncate">{team.name}</p>
                    <p className="text-[11px] text-text-secondary">{team.className} · {t(team.status)}</p>
                  </div>
                  {team.id === activeTeam?.id && (
                    <Check className="w-3.5 h-3.5 text-navy shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
              {/* Add team button */}
              <button
                onClick={() => { setOpen(false); setShowAddModal(true); }}
                className="w-full text-left flex items-center gap-2 px-3 py-2.5 hover:bg-surface transition-colors text-navy border-t border-border"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-[13px] font-medium">{t("addTeam")}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* No teams - just show add button */}
      {!activeTeam && (
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-navy/30 px-3 py-3 text-navy hover:bg-navy/5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-[13px] font-medium">{t("addTeam")}</span>
        </button>
      )}

      {/* Add Team Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-text-primary">{t("addTeam")}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-surface rounded-lg">
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-medium text-text-secondary mb-1 block">{t("teamName")}</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  placeholder={`${clubName} U12`}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[12px] font-medium text-text-secondary mb-1 block">{t("class")}</label>
                <select
                  value={newTeamClassId}
                  onChange={e => setNewTeamClassId(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-navy bg-white"
                >
                  <option value="">{t("selectClass")}</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAddTeam}
                disabled={!newTeamName.trim() || !newTeamClassId || adding}
                className="w-full mt-2 rounded-lg bg-navy text-white py-2.5 text-sm font-medium hover:bg-navy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {adding ? "..." : t("addTeam")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
