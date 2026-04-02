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
  confirmed: "bg-emerald-600",
  cancelled: "bg-red-400",
};

export function TeamHeader({
  teamName, regNumber, year,
  clubName, clubBadgeUrl, clubId, teams = [], classes = [], isTeamManager = false,
}: TeamHeaderProps) {
  const { inboxCount } = useTeam();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 md:px-6 h-14 gap-3">
        {/* Left: Logo + breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-600">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <span className="text-[15px] font-bold tracking-tight hidden sm:block text-gray-900">
              Kings Cup
            </span>
          </div>

          {teamName && (
            <>
              <span className="hidden md:block text-gray-300">/</span>
              <span className="text-sm font-medium hidden md:block truncate text-gray-600">
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
            <span className="text-[11px] font-semibold rounded-md px-2 py-1 hidden sm:inline text-gray-500 border border-gray-200">
              {year}
            </span>
          )}

          {/* Inbox badge */}
          {inboxCount > 0 && (
            <div className="relative">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100">
                <Bell className="w-4 h-4 text-gray-600" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-bold rounded-full flex items-center justify-center bg-emerald-600 text-white">
                {inboxCount > 9 ? "9+" : inboxCount}
              </span>
            </div>
          )}

          <LanguageSwitcher />

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer bg-gray-100"
            >
              <LogOut className="w-4 h-4 text-gray-600" />
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
          "md:hidden flex items-center gap-1.5 rounded-lg px-2 py-1.5 max-w-[180px] min-w-0 border border-gray-200 bg-gray-50",
          canSwitch && "hover:bg-gray-100 active:bg-gray-200"
        )}
      >
        {clubBadgeUrl ? (
          <img src={clubBadgeUrl} alt={clubName} className="w-5 h-5 rounded-md object-contain shrink-0" />
        ) : (
          <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 bg-emerald-50">
            <span className="text-[8px] font-bold text-emerald-600">{initials}</span>
          </div>
        )}
        <span className="text-[12px] font-semibold truncate flex-1 text-left text-gray-900">
          {activeTeam?.name ?? clubName}
        </span>
        {canSwitch && (
          <ChevronDown
            className={cn("w-3 h-3 shrink-0 transition-transform text-gray-400", open && "rotate-180")}
          />
        )}
      </button>

      {open && canSwitch && (
        <>
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl shadow-lg overflow-hidden md:hidden mx-4 bg-white border border-gray-200">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => { setTeamId(team.id); setOpen(false); }}
                className={cn(
                  "w-full text-left flex items-center gap-2.5 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0",
                  team.id === activeTeam?.id && "bg-gray-50"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", statusDot[team.status])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-gray-900">{team.name}</p>
                  <p className="text-xs text-gray-500">{team.className} · {t(team.status)}</p>
                </div>
                {team.id === activeTeam?.id && <Check className="w-4 h-4 shrink-0 text-emerald-600" />}
              </button>
            ))}
            {!isTeamManager && (
              <button
                onClick={() => { setOpen(false); setShowAddModal(true); }}
                className="w-full text-left flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors text-emerald-600 border-t border-gray-200"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">{t("addTeam")}</span>
              </button>
            )}
          </div>
        </>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">{t("addTeam")}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-medium text-gray-600 mb-1 block">{t("teamName")}</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder={`${clubName} U12`}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-gray-600 mb-1 block">{t("class")}</label>
                <select
                  value={newTeamClassId}
                  onChange={(e) => setNewTeamClassId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 bg-white"
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
                className="w-full mt-2 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-emerald-600 text-white hover:bg-emerald-700"
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
    <div className="flex items-center gap-0.5 rounded-lg p-0.5 border border-gray-200 bg-gray-50">
      {locales.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => router.replace(pathname, { locale: code })}
          className="px-1.5 py-1 text-[10px] font-semibold rounded-md hover:bg-gray-200 transition-colors cursor-pointer text-gray-500"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
