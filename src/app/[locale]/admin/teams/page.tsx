"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Link2,
  Search,
  Users,
  Check,
  ChevronDown,
} from "lucide-react";

interface Team {
  id: number;
  name: string;
  regNumber: number;
  status: "draft" | "open" | "confirmed" | "cancelled";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  club: {
    id: number;
    name: string;
    badgeUrl: string | null;
  };
  class: {
    id: number;
    name: string;
  };
  playerCount: number;
  staffCount: number;
  orderTotal: string;
  paidTotal: string;
  balance: string;
}

const statusVariant: Record<string, "default" | "success" | "gold" | "error"> =
  {
    draft: "default",
    open: "success",
    confirmed: "gold",
    cancelled: "error",
  };

const allStatuses = ["open", "confirmed", "cancelled"] as const;

export default function AdminTeamsPage() {
  const t = useTranslations("admin.teams");
  const tTeam = useTranslations("team");
  const tc = useTranslations("common");
  const router = useRouter();
  const locale = useLocale();

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusDropdown, setStatusDropdown] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchTeams = useCallback(() => {
    fetch("/api/admin/teams")
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json)) setTeams(json);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setStatusDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = teams.filter(
    (team) =>
      team.name?.toLowerCase().includes(search.toLowerCase()) ||
      team.club?.name?.toLowerCase().includes(search.toLowerCase()) ||
      team.regNumber?.toString().includes(search)
  );

  async function handleStatusChange(
    teamId: number,
    newStatus: string
  ) {
    setStatusDropdown(null);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchTeams();
      }
    } catch {
      // silently fail
    }
  }

  async function handleCopyInvite(clubId: number, teamId: number) {
    try {
      const res = await fetch("/api/admin/generate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId }),
      });
      const data = await res.json();
      if (data.inviteUrl) {
        await navigator.clipboard.writeText(data.inviteUrl);
        setCopiedId(teamId);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch {
      // silently fail
    }
  }

  function exportCSV() {
    const headers = [
      "Reg#",
      "Club",
      "Team",
      "Class",
      "Players",
      "Staff",
      "Order Total",
      "Paid",
      "Balance",
      "Status",
    ];
    const rows = filtered.map((team) => [
      team.regNumber,
      team.club?.name ?? "",
      team.name ?? "",
      team.class?.name ?? "",
      team.playerCount,
      team.staffCount,
      team.orderTotal,
      team.paidTotal,
      team.balance,
      team.status,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell);
            return str.includes(",") || str.includes('"')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teams-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
        </div>
        <Card>
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-full bg-surface rounded-lg" />
            <div className="h-6 w-full bg-surface rounded" />
            <div className="h-6 w-3/4 bg-surface rounded" />
            <div className="h-6 w-full bg-surface rounded" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={exportCSV}>
            <Download className="w-4 h-4" />
            {t("export")}
          </Button>
        </div>
      </div>

      <Card padding={false}>
        {/* Search bar */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder={tc("search") + "..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                    #
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                    {tTeam("clubName")}
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                    {tTeam("teamName")}
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                    {tTeam("class")}
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                    {t("players")}
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                    {t("balance")}
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                    {tTeam("status")}
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                    {tc("actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((team) => {
                  const balance = parseFloat(team.balance);
                  return (
                    <tr
                      key={team.id}
                      onClick={() => router.push(`/${locale}/admin/teams/${team.id}`)}
                      className="border-b border-border last:border-0 hover:bg-navy/5 cursor-pointer"
                    >
                      {/* Reg number */}
                      <td className="px-4 py-3">
                        <Badge variant="gold">{team.regNumber}</Badge>
                      </td>

                      {/* Club with badge */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {team.club?.badgeUrl ? (
                            <img
                              src={team.club.badgeUrl}
                              alt=""
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center">
                              <Users className="w-3 h-3 text-text-secondary" />
                            </div>
                          )}
                          <span className="text-sm text-text-primary">
                            {team.club?.name || "-"}
                          </span>
                        </div>
                      </td>

                      {/* Team name */}
                      <td className="px-4 py-3 text-sm font-medium text-text-primary">
                        {team.name || (
                          <span className="text-text-secondary">-</span>
                        )}
                      </td>

                      {/* Class */}
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {team.class?.name || "-"}
                      </td>

                      {/* Players */}
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {team.playerCount}
                      </td>

                      {/* Balance */}
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-medium ${
                            balance >= 0 ? "text-success" : "text-error"
                          }`}
                        >
                          {balance >= 0 ? "" : "-"}€
                          {Math.abs(balance).toFixed(2)}
                        </span>
                      </td>

                      {/* Status (clickable) */}
                      <td className="px-4 py-3 relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() =>
                            setStatusDropdown(
                              statusDropdown === team.id ? null : team.id
                            )
                          }
                          className="inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Badge
                            variant={
                              statusVariant[team.status] ?? "default"
                            }
                          >
                            {tTeam(team.status)}
                            <ChevronDown className="w-3 h-3" />
                          </Badge>
                        </button>

                        {statusDropdown === team.id && (
                          <div
                            ref={dropdownRef}
                            className="absolute z-20 mt-1 left-4 bg-white rounded-lg border border-border shadow-lg py-1 min-w-[140px]"
                          >
                            {allStatuses.map((s) => (
                              <button
                                key={s}
                                onClick={() =>
                                  handleStatusChange(team.id, s)
                                }
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-surface flex items-center gap-2 cursor-pointer ${
                                  team.status === s
                                    ? "font-medium text-navy"
                                    : "text-text-primary"
                                }`}
                              >
                                {team.status === s && (
                                  <Check className="w-3 h-3" />
                                )}
                                <Badge
                                  variant={statusVariant[s] ?? "default"}
                                >
                                  {tTeam(s)}
                                </Badge>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() =>
                            handleCopyInvite(team.club?.id, team.id)
                          }
                          className="text-navy hover:text-navy-light text-xs flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === team.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-success" />
                              <span className="text-success">
                                {t("copied")}
                              </span>
                            </>
                          ) : (
                            <>
                              <Link2 className="w-3.5 h-3.5" />
                              {t("copyLink")}
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-text-secondary text-sm">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {search ? t("noResults") : t("noTeams")}
          </div>
        )}
      </Card>
    </div>
  );
}
