"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Crown, LogOut, ChevronDown, Check, Plus, X, Users } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTeam } from "@/lib/team-context";
import { cn } from "@/lib/utils";
import { useRouter as useNextRouter } from "next/navigation";

type TeamSummary = {
  id: number;
  name: string;
  className: string;
  status: "draft" | "open" | "confirmed" | "cancelled";
  playersCount: number;
};

type ClassOption = {
  id: number;
  name: string;
};

interface TeamHeaderProps {
  teamName?: string;
  regNumber?: number;
  year?: number;
  // Mobile team switcher
  clubName?: string;
  clubBadgeUrl?: string | null;
  clubId?: number;
  teams?: TeamSummary[];
  classes?: ClassOption[];
  isTeamManager?: boolean;
}

const statusDot: Record<string, string> = {
  draft:     "bg-gray-400",
  open:      "bg-emerald-500",
  confirmed: "bg-gold",
  cancelled: "bg-red-400",
};

export function TeamHeader({
  teamName, regNumber, year,
  clubName, clubBadgeUrl, clubId, teams = [], classes = [], isTeamManager = false,
}: TeamHeaderProps) {
  return (
    <header className="border-b border-border bg-white sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 gap-3">
        {/* Left: Logo (desktop) + Mobile team indicator */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Kings Cup logo — always */}
          <div className="flex items-center gap-2 shrink-0">
            <Crown className="w-5 h-5 md:w-6 md:h-6 text-gold" />
            <span className="text-base md:text-lg font-bold text-navy tracking-tight">Kings Cup</span>
          </div>

          {/* Desktop: team name + reg */}
          {teamName && (
            <span className="text-sm text-text-secondary font-medium hidden md:inline truncate">
              / {teamName}
            </span>
          )}

          {/* Mobile: club badge + active team + switcher */}
          {clubName && (
            <MobileTeamPill
              clubName={clubName}
              clubBadgeUrl={clubBadgeUrl ?? null}
              clubId={clubId ?? null}
              teams={teams}
              classes={classes}
              isTeamManager={isTeamManager}
            />
          )}
        </div>

        {/* Right: year badge + lang + logout */}
        <div className="flex items-center gap-2 shrink-0">
          {year && (
            <span className="text-[10px] font-semibold border border-border rounded px-1.5 py-0.5 text-text-secondary hidden sm:inline">
              {year}
            </span>
          )}
          <LanguageSwitcher />
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-text-secondary hover:text-text-primary cursor-pointer p-1">
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function MobileTeamPill({
  clubName, clubBadgeUrl, clubId, teams, classes, isTeamManager,
}: {
  clubName: string;
  clubBadgeUrl: string | null;
  clubId: number | null;
  teams: TeamSummary[];
  classes: ClassOption[];
  isTeamManager: boolean;
}) {
  const t = useTranslations("team");
  const { teamId, setTeamId } = useTeam();
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamClassId, setNewTeamClassId] = useState("");
  const [adding, setAdding] = useState(false);
  const nextRouter = useNextRouter();

  const activeTeam = teams.find((tm) => tm.id === teamId) ?? teams[0];
  const canSwitch = !isTeamManager && teams.length > 0;

  const initials = clubName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  async function handleAddTeam() {
    if (!newTeamName.trim() || !newTeamClassId || !clubId) return;
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
        nextRouter.refresh();
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      {/* Pill — mobile only */}
      <button
        onClick={() => canSwitch && setOpen((v) => !v)}
        className={cn(
          "md:hidden flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-1 max-w-[180px] min-w-0",
          canSwitch && "hover:border-navy/40 active:bg-navy/5"
        )}
      >
        {/* Club badge */}
        {clubBadgeUrl ? (
          <img src={clubBadgeUrl} alt={clubName} className="w-5 h-5 rounded-full object-contain shrink-0" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-navy/15 flex items-center justify-center shrink-0">
            <span className="text-[8px] font-bold text-navy">{initials}</span>
          </div>
        )}
        {/* Team name */}
        <span className="text-[12px] font-semibold text-text-primary truncate flex-1 text-left">
          {activeTeam?.name ?? clubName}
        </span>
        {/* Chevron for switcher */}
        {canSwitch && (
          <ChevronDown className={cn("w-3 h-3 text-text-secondary shrink-0 transition-transform", open && "rotate-180")} />
        )}
      </button>

      {/* Dropdown */}
      {open && canSwitch && (
        <>
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-border rounded-xl shadow-xl overflow-hidden md:hidden mx-4">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => { setTeamId(team.id); setOpen(false); }}
                className={cn(
                  "w-full text-left flex items-center gap-2.5 px-4 py-3 hover:bg-surface transition-colors border-b border-border last:border-0",
                  team.id === activeTeam?.id && "bg-navy/5"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", statusDot[team.status])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{team.name}</p>
                  <p className="text-xs text-text-secondary">{team.className} · {t(team.status)}</p>
                </div>
                {team.id === activeTeam?.id && <Check className="w-4 h-4 text-navy shrink-0" />}
              </button>
            ))}
            {/* Add team */}
            {!isTeamManager && (
              <button
                onClick={() => { setOpen(false); setShowAddModal(true); }}
                className="w-full text-left flex items-center gap-2 px-4 py-3 hover:bg-surface transition-colors text-navy border-t border-border"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">{t("addTeam")}</span>
              </button>
            )}
          </div>
        </>
      )}

      {/* Add team modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-5" onClick={(e) => e.stopPropagation()}>
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
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder={`${clubName} U12`}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-text-secondary mb-1 block">{t("class")}</label>
                <select
                  value={newTeamClassId}
                  onChange={(e) => setNewTeamClassId(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-navy bg-white"
                >
                  <option value="">{t("selectClass")}</option>
                  {classes.map((c) => (
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
    </>
  );
}

function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  const locales = [
    { code: "en", label: "EN" },
    { code: "ru", label: "RU" },
    { code: "et", label: "ET" },
  ];

  return (
    <div className="flex items-center gap-0.5 border border-border rounded-md p-0.5">
      {locales.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => router.replace(pathname, { locale: code })}
          className="px-1.5 py-0.5 text-[10px] font-semibold rounded hover:bg-surface transition-colors text-text-secondary hover:text-text-primary cursor-pointer"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
