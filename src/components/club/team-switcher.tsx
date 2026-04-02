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
  dark?: boolean;
}

const statusDot: Record<string, string> = {
  draft:     "bg-gray-400",
  open:      "bg-emerald-500",
  confirmed: "bg-[var(--cat-accent)]",
  cancelled: "bg-red-400",
};

export function TeamSwitcher({ clubName, clubBadgeUrl, clubId, teams, classes, dark = false }: TeamSwitcherProps) {
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
            className={cn("w-9 h-9 rounded-xl object-contain shrink-0", dark ? "border border-white/10" : "th-bg th-border border")}
          />
        ) : (
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", dark ? "bg-mint/15 border border-mint/20" : "border")} style={!dark ? { background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-card-border)" } : undefined}>
            <span className={cn("text-[11px] font-bold", dark ? "text-mint" : "")} style={!dark ? { color: "var(--cat-accent)" } : undefined}>{initials}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className={cn("text-[13px] font-bold truncate leading-tight", dark ? "" : "th-text")} style={dark ? { color: "var(--cat-text)" } : undefined}>{clubName}</p>
          <p className={cn("text-[10px] leading-tight", dark ? "" : "th-text-2")} style={dark ? { color: "var(--cat-text-muted)" } : undefined}>{teams.length} {teams.length === 1 ? "team" : "teams"}</p>
        </div>
      </div>

      {/* Team dropdown */}
      {activeTeam && (
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "w-full text-left rounded-xl border px-3 py-2.5 transition-all",
              dark
                ? open
                  ? "border-mint/30"
                  : "hover:opacity-90"
                : open
                  ? "shadow-sm"
                  : "th-border hover:bg-surface/60 th-card"
            )}
            style={dark
              ? open
                ? { background: "var(--cat-tag-bg)" }
                : { borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }
              : open
                ? { borderColor: "var(--cat-accent)", background: "var(--cat-badge-open-bg)" }
                : undefined
            }
          >
            <div className="flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full shrink-0", statusDot[activeTeam.status])} />
              <p className={cn("text-[13px] font-semibold flex-1 truncate", !dark && "th-text")} style={dark ? { color: "var(--cat-text)" } : undefined}>
                {activeTeam.name || "—"}
              </p>
              <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 transition-transform", !dark && "th-text-2", open && "rotate-180")} style={dark ? { color: "var(--cat-text-muted)" } : undefined} />
            </div>
            <div className="flex items-center gap-3 mt-1 ml-4">
              <span className={cn("text-[11px] font-medium", !dark && "th-text-2")} style={dark ? { color: "var(--cat-text-muted)" } : undefined}>{activeTeam.className}</span>
              <span className={cn("text-[11px] flex items-center gap-0.5", !dark && "th-text-2")} style={dark ? { color: "var(--cat-text-muted)" } : undefined}>
                <Users className="w-3 h-3" />&nbsp;{activeTeam.playersCount}
              </span>
            </div>
          </button>

          {open && (
            <div className={cn("absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border th-border shadow-2xl overflow-hidden popup-bg")}>
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => { setTeamId(team.id); setOpen(false); }}
                  className={cn(
                    "w-full text-left flex items-start gap-2.5 px-3 py-2.5 transition-colors border-b last:border-0",
                    dark
                      ? cn("hover:opacity-90")
                      : cn("th-border hover:th-bg")
                  )}
                  style={dark
                    ? { borderColor: "var(--cat-card-border)", ...(team.id === activeTeam?.id ? { background: "var(--cat-tag-bg)" } : {}) }
                    : team.id === activeTeam?.id ? { background: "var(--cat-badge-open-bg)" } : undefined
                  }
                >
                  <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", statusDot[team.status])} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-[13px] font-medium truncate", !dark && "th-text")} style={dark ? { color: "var(--cat-text)" } : undefined}>{team.name}</p>
                    <p className={cn("text-[11px]", !dark && "th-text-2")} style={dark ? { color: "var(--cat-text-muted)" } : undefined}>{team.className} · {t(team.status)}</p>
                  </div>
                  {team.id === activeTeam?.id && (
                    <Check className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", dark ? "text-mint" : "")} style={!dark ? { color: "var(--cat-accent)" } : undefined} />
                  )}
                </button>
              ))}
              <button
                onClick={() => { setOpen(false); setShowAddModal(true); }}
                className={cn("w-full text-left flex items-center gap-2 px-3 py-2.5 transition-colors border-t", dark ? "text-mint hover:opacity-90" : "th-border hover:th-bg")}
                style={dark ? { borderColor: "var(--cat-card-border)" } : { color: "var(--cat-accent)" }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-[13px] font-medium">{t("addTeam")}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {!activeTeam && (
        <button
          onClick={() => setShowAddModal(true)}
          className={cn("w-full flex items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-3 transition-colors", dark ? "text-mint hover:opacity-90" : "")}
          style={dark ? { borderColor: "var(--cat-card-border)" } : { borderColor: "var(--cat-card-border)", color: "var(--cat-accent)" }}
        >
          <Plus className="w-4 h-4" />
          <span className="text-[13px] font-medium">{t("addTeam")}</span>
        </button>
      )}

      {/* Add Team Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={() => setShowAddModal(false)}>
          <div className="popup-bg rounded-2xl shadow-xl w-full max-w-sm mx-4 p-5 border th-border" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold th-text">{t("addTeam")}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:th-bg rounded-lg">
                <X className="w-4 h-4 th-text-2" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-medium th-text-2 mb-1 block">{t("teamName")}</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  placeholder={`${clubName} U12`}
                  className="w-full rounded-lg th-border border px-3 py-2 text-sm focus:outline-none"
                  style={{ background: "var(--cat-input-bg)" }}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[12px] font-medium th-text-2 mb-1 block">{t("class")}</label>
                <select
                  value={newTeamClassId}
                  onChange={e => setNewTeamClassId(e.target.value)}
                  className="w-full rounded-lg th-border border px-3 py-2 text-sm focus:outline-none"
                  style={{ background: "var(--cat-input-bg)" }}
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
                className="w-full mt-2 rounded-lg py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ background: "var(--cat-accent)", color: "var(--cat-text)" }}
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
