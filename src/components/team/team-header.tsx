"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Crown, LogOut, ChevronDown, Check, Plus, X, Users, Bell } from "lucide-react";
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
  clubName?: string;
  clubBadgeUrl?: string | null;
  clubId?: number;
  teams?: TeamSummary[];
  classes?: ClassOption[];
  isTeamManager?: boolean;
}

const statusDot: Record<string, string> = {
  draft:     "bg-gray-400",
  open:      "bg-emerald-400",
  confirmed: "bg-mint",
  cancelled: "bg-red-400",
};

export function TeamHeader({
  teamName, regNumber, year,
  clubName, clubBadgeUrl, clubId, teams = [], classes = [], isTeamManager = false,
}: TeamHeaderProps) {
  const { inboxCount } = useTeam();

  return (
    <header className="border-b border-white/6 bg-[#1C2121] sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 md:px-6 h-14 gap-3">
        {/* Left: Logo + breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-mint flex items-center justify-center">
              <Crown className="w-4 h-4 text-navy" />
            </div>
            <span className="text-[15px] font-bold text-white tracking-tight hidden sm:block">Kings Cup</span>
          </div>

          {teamName && (
            <>
              <span className="text-white/20 hidden md:block">/</span>
              <span className="text-sm text-white/60 font-medium hidden md:block truncate">
                {teamName}
              </span>
            </>
          )}

          {/* Mobile: club pill + team switcher */}
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

        {/* Right: year + notifications + lang + logout */}
        <div className="flex items-center gap-1.5 shrink-0">
          {year && (
            <span className="text-[11px] font-semibold border border-white/10 rounded-md px-2 py-1 text-white/40 hidden sm:inline">
              {year}
            </span>
          )}

          {/* Inbox badge */}
          {inboxCount > 0 && (
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-white/6 flex items-center justify-center">
                <Bell className="w-4 h-4 text-white/60" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-mint text-navy text-[9px] font-bold rounded-full flex items-center justify-center">
                {inboxCount > 9 ? "9+" : inboxCount}
              </span>
            </div>
          )}

          <LanguageSwitcher />

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-8 h-8 rounded-lg bg-white/6 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-white/60" />
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
      <button
        onClick={() => canSwitch && setOpen((v) => !v)}
        className={cn(
          "md:hidden flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/6 px-2 py-1.5 max-w-[180px] min-w-0",
          canSwitch && "hover:bg-white/10 active:bg-white/15"
        )}
      >
        {clubBadgeUrl ? (
          <img src={clubBadgeUrl} alt={clubName} className="w-5 h-5 rounded-md object-contain shrink-0" />
        ) : (
          <div className="w-5 h-5 rounded-md bg-mint/20 flex items-center justify-center shrink-0">
            <span className="text-[8px] font-bold text-mint">{initials}</span>
          </div>
        )}
        <span className="text-[12px] font-semibold text-white/80 truncate flex-1 text-left">
          {activeTeam?.name ?? clubName}
        </span>
        {canSwitch && (
          <ChevronDown className={cn("w-3 h-3 text-white/40 shrink-0 transition-transform", open && "rotate-180")} />
        )}
      </button>

      {open && canSwitch && (
        <>
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#1C2121] border border-white/10 rounded-xl shadow-2xl overflow-hidden md:hidden mx-4">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => { setTeamId(team.id); setOpen(false); }}
                className={cn(
                  "w-full text-left flex items-center gap-2.5 px-4 py-3 hover:bg-white/6 transition-colors border-b border-white/6 last:border-0",
                  team.id === activeTeam?.id && "bg-white/6"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", statusDot[team.status])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/90 truncate">{team.name}</p>
                  <p className="text-xs text-white/40">{team.className} · {t(team.status)}</p>
                </div>
                {team.id === activeTeam?.id && <Check className="w-4 h-4 text-mint shrink-0" />}
              </button>
            ))}
            {!isTeamManager && (
              <button
                onClick={() => { setOpen(false); setShowAddModal(true); }}
                className="w-full text-left flex items-center gap-2 px-4 py-3 hover:bg-white/6 transition-colors text-mint border-t border-white/10"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">{t("addTeam")}</span>
              </button>
            )}
          </div>
        </>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-text-primary">{t("addTeam")}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-surface rounded-lg">
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
                  className="w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-text-secondary mb-1 block">{t("class")}</label>
                <select
                  value={newTeamClassId}
                  onChange={(e) => setNewTeamClassId(e.target.value)}
                  className="w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-navy bg-white"
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
                className="w-full mt-2 rounded-xl bg-navy text-white py-2.5 text-sm font-semibold hover:bg-navy-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
    <div className="flex items-center gap-0.5 border border-white/10 rounded-lg p-0.5 bg-white/4">
      {locales.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => router.replace(pathname, { locale: code })}
          className="px-1.5 py-1 text-[10px] font-semibold rounded-md hover:bg-white/10 transition-colors text-white/40 hover:text-white/80 cursor-pointer"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
