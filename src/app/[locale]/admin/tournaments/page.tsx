"use client";

import { useEffect, useState, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { Trophy, Search, ExternalLink, Calendar, CheckCircle, Circle } from "lucide-react";

type Tournament = {
  id: number; name: string; slug: string; year: number;
  startDate: string | null; endDate: string | null;
  registrationOpen: boolean; plan: string;
  organizationId: number; organizationName: string; organizationSlug: string;
  teamCount: number; confirmedCount: number;
};

const PLAN_STYLE: Record<string, string> = {
  elite: "bg-amber-100 text-amber-800", pro: "bg-blue-100 text-blue-700",
  starter: "bg-green-100 text-green-700", free: "bg-gray-100 text-gray-600",
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminTournamentsListPage() {
  const locale = useLocale();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterOrg, setFilterOrg] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetch("/api/admin/tournaments-list")
      .then((r) => r.json())
      .then((d) => setTournaments(d.tournaments ?? []))
      .finally(() => setLoading(false));
  }, []);

  const orgs = useMemo(() => {
    const seen = new Map<string, string>();
    tournaments.forEach((t) => seen.set(t.organizationSlug, t.organizationName));
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [tournaments]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tournaments.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q) && !t.organizationName.toLowerCase().includes(q)) return false;
      if (filterOrg !== "all" && t.organizationSlug !== filterOrg) return false;
      if (filterStatus === "open" && !t.registrationOpen) return false;
      if (filterStatus === "closed" && t.registrationOpen) return false;
      return true;
    });
  }, [tournaments, search, filterOrg, filterStatus]);

  const totalTeams = filtered.reduce((s, t) => s + t.teamCount, 0);
  const totalConfirmed = filtered.reduce((s, t) => s + t.confirmedCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold th-text flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" /> All Tournaments
          </h1>
          <p className="th-text-2 text-sm mt-0.5">{filtered.length} tournaments · {totalTeams} registrations · {totalConfirmed} confirmed</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 th-text-2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-9 pr-4 py-2 text-sm border th-border rounded-lg th-card th-text w-52" />
        </div>
        <select value={filterOrg} onChange={(e) => setFilterOrg(e.target.value)} className="text-sm border th-border rounded-lg px-3 py-2 th-card th-text">
          <option value="all">All organizations</option>
          {orgs.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm border th-border rounded-lg px-3 py-2 th-card th-text">
          <option value="all">All statuses</option>
          <option value="open">Registration open</option>
          <option value="closed">Registration closed</option>
        </select>
      </div>
      {loading && <p className="text-sm th-text-2 py-12 text-center">Loading…</p>}
      {!loading && (
        <div className="th-card rounded-xl border th-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b th-border text-left">
                <th className="px-5 py-3 text-xs font-medium th-text-2 uppercase">Tournament</th>
                <th className="px-5 py-3 text-xs font-medium th-text-2 uppercase">Organization</th>
                <th className="px-5 py-3 text-xs font-medium th-text-2 uppercase">Plan</th>
                <th className="px-5 py-3 text-xs font-medium th-text-2 uppercase">Dates</th>
                <th className="px-5 py-3 text-xs font-medium th-text-2 uppercase text-center">Teams</th>
                <th className="px-5 py-3 text-xs font-medium th-text-2 uppercase text-center">Confirmed</th>
                <th className="px-5 py-3 text-xs font-medium th-text-2 uppercase text-center">Open</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} className="px-5 py-12 text-center th-text-2">No tournaments found</td></tr>}
              {filtered.map((t) => (
                <tr key={t.id} className="border-b th-border last:border-0 hover:bg-navy/5">
                  <td className="px-5 py-3">
                    <p className="font-medium th-text">{t.name}</p>
                    <p className="text-xs th-text-2">{t.year} · /{t.slug}</p>
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/${locale}/org/${t.organizationSlug}/admin`} className="text-sm text-navy hover:underline font-medium">{t.organizationName}</Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_STYLE[t.plan] ?? PLAN_STYLE.free}`}>{t.plan}</span>
                  </td>
                  <td className="px-5 py-3 text-xs th-text-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 shrink-0" />{fmtDate(t.startDate)}{t.endDate && t.endDate !== t.startDate && <> → {fmtDate(t.endDate)}</>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center font-medium th-text">{t.teamCount}</td>
                  <td className="px-5 py-3 text-center"><span className={t.confirmedCount > 0 ? "text-green-600 font-medium" : "th-text-2"}>{t.confirmedCount}</span></td>
                  <td className="px-5 py-3 text-center">
                    {t.registrationOpen ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <Circle className="w-4 h-4 th-text-2 mx-auto" />}
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/${locale}/org/${t.organizationSlug}/admin/tournament/${t.id}/teams`} className="p-1.5 rounded hover:bg-navy/10 transition-colors inline-block">
                      <ExternalLink className="w-4 h-4 th-text-2" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
