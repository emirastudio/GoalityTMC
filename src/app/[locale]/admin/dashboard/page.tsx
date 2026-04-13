"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import {
  Building2, Users, Trophy, ClipboardList, TrendingUp, Euro,
  Calendar, ArrowRight, Loader2, BookOpen, Activity, UserCheck,
  CheckCircle, Clock,
} from "lucide-react";

type Stats = {
  counts: {
    orgs: number; clubs: number; teams: number; registrations: number;
    adminUsers: number; clubUsers: number; blogPosts: number; activeTournaments: number;
  };
  revenue: { total: number; thisMonth: number };
  activity: { newRegsLast7d: number; newClubsLast7d: number };
  planDistribution: { plan: string; cnt: number }[];
  recentRegistrations: {
    id: number; regNumber: string | null; status: string;
    createdAt: string; teamName: string | null; tournamentName: string | null;
  }[];
  recentClubs: {
    id: number; name: string; country: string | null; city: string | null;
    contactEmail: string | null; createdAt: string;
  }[];
  topOrgs: { id: number; name: string; slug: string; plan: string; regCount: number }[];
};

const PLAN_STYLE: Record<string, { bg: string; text: string }> = {
  elite:   { bg: "bg-amber-100",  text: "text-amber-800" },
  pro:     { bg: "bg-blue-100",   text: "text-blue-700"  },
  starter: { bg: "bg-green-100",  text: "text-green-700" },
  free:    { bg: "bg-gray-100",   text: "text-gray-600"  },
};

const STATUS_STYLE: Record<string, string> = {
  confirmed:  "bg-green-100 text-green-700",
  open:       "bg-blue-100 text-blue-700",
  draft:      "bg-gray-100 text-gray-500",
  cancelled:  "bg-red-100 text-red-700",
};

function fmt(n: number) {
  return n.toLocaleString("en-US");
}
function fmtEur(n: number) {
  return `€${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function SuperAdminDashboardPage() {
  const locale = useLocale();
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/super-stats")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin th-text-2" />
    </div>
  );
  if (!data) return <p className="th-text-2 py-12 text-center">Failed to load stats.</p>;

  const { counts, revenue, activity, planDistribution, recentRegistrations, recentClubs, topOrgs } = data;

  const kpis = [
    { label: "Organizations",       value: fmt(counts.orgs),           icon: Building2,     color: "text-indigo-600",  bg: "bg-indigo-50",  href: `/${locale}/admin/organizations` },
    { label: "Clubs",               value: fmt(counts.clubs),          icon: UserCheck,     color: "text-emerald-600", bg: "bg-emerald-50", href: `/${locale}/admin/clubs` },
    { label: "Teams",               value: fmt(counts.teams),          icon: Users,         color: "text-blue-600",    bg: "bg-blue-50",    href: null },
    { label: "Total Registrations", value: fmt(counts.registrations),  icon: ClipboardList, color: "text-purple-600",  bg: "bg-purple-50",  href: null },
    { label: "Revenue This Month",  value: fmtEur(revenue.thisMonth),  icon: TrendingUp,    color: "text-green-600",   bg: "bg-green-50",   href: null },
    { label: "Revenue All Time",    value: fmtEur(revenue.total),      icon: Euro,          color: "text-amber-600",   bg: "bg-amber-50",   href: null },
    { label: "Active Tournaments",  value: fmt(counts.activeTournaments), icon: Trophy,     color: "text-red-600",     bg: "bg-red-50",     href: `/${locale}/admin/tournaments` },
    { label: "Blog Posts (Live)",   value: fmt(counts.blogPosts),      icon: BookOpen,      color: "text-pink-600",    bg: "bg-pink-50",    href: `/${locale}/admin/blog` },
  ];

  const totalPlanCount = planDistribution.reduce((s, p) => s + Number(p.cnt), 0) || 1;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold th-text">Platform Dashboard</h1>
          <p className="th-text-2 mt-0.5 text-sm">Real-time overview of Goality TMC</p>
        </div>
        <div className="flex items-center gap-2 text-xs th-text-2">
          <Activity className="w-3.5 h-3.5 text-green-500" />
          <span className="text-green-600 font-medium">{counts.activeTournaments} live</span>
          <span>·</span>
          <span>+{activity.newRegsLast7d} regs this week</span>
          <span>·</span>
          <span>+{activity.newClubsLast7d} new clubs</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg, href }) => {
          const inner = (
            <div className={`th-card rounded-xl border th-border p-5 flex items-center gap-4 ${href ? "hover:border-navy/30 transition-colors" : ""}`}>
              <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold th-text">{value}</p>
                <p className="text-xs th-text-2 truncate">{label}</p>
              </div>
            </div>
          );
          return href ? (
            <Link key={label} href={href}>{inner}</Link>
          ) : (
            <div key={label}>{inner}</div>
          );
        })}
      </div>

      {/* Row 2: Plan distribution + Users */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Plan distribution */}
        <div className="th-card rounded-xl border th-border p-5">
          <h2 className="text-sm font-semibold th-text mb-4">Organization Plans</h2>
          <div className="space-y-3">
            {["elite","pro","starter","free"].map((plan) => {
              const found = planDistribution.find((p) => p.plan === plan);
              const cnt = Number(found?.cnt ?? 0);
              const pct = Math.round((cnt / totalPlanCount) * 100);
              const style = PLAN_STYLE[plan] ?? PLAN_STYLE.free;
              return (
                <div key={plan} className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold w-16 text-center ${style.bg} ${style.text}`}>{plan}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full bg-navy" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm th-text font-medium w-6 text-right">{cnt}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t th-border grid grid-cols-2 gap-3 text-center text-xs th-text-2">
            <div>
              <p className="text-lg font-bold th-text">{counts.adminUsers}</p>
              <p>Org Admins</p>
            </div>
            <div>
              <p className="text-lg font-bold th-text">{counts.clubUsers}</p>
              <p>Club Users</p>
            </div>
          </div>
        </div>

        {/* Top Orgs */}
        <div className="th-card rounded-xl border th-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold th-text">Top Organizations</h2>
            <Link href={`/${locale}/admin/organizations`} className="text-xs text-navy hover:underline flex items-center gap-1">
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {topOrgs.map((org) => {
              const style = PLAN_STYLE[org.plan] ?? PLAN_STYLE.free;
              return (
                <div key={org.id} className="flex items-center gap-3">
                  <Link
                    href={`/${locale}/org/${org.slug}/admin`}
                    className="flex-1 text-sm font-medium th-text hover:text-navy truncate"
                  >
                    {org.name}
                  </Link>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>{org.plan}</span>
                  <span className="text-xs th-text-2 w-16 text-right">{fmt(org.regCount)} regs</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Recent registrations + Recent clubs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent registrations */}
        <div className="th-card rounded-xl border th-border overflow-hidden">
          <div className="px-5 py-4 border-b th-border flex items-center justify-between">
            <h2 className="text-sm font-semibold th-text">Recent Registrations</h2>
            <span className="text-xs th-text-2">+{activity.newRegsLast7d} last 7d</span>
          </div>
          <div className="divide-y th-border">
            {recentRegistrations.length === 0 && (
              <p className="px-5 py-8 text-sm th-text-2 text-center">No registrations yet</p>
            )}
            {recentRegistrations.map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium th-text truncate">{r.teamName ?? "—"}</p>
                  <p className="text-xs th-text-2 truncate">{r.tournamentName ?? "—"}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLE[r.status] ?? STATUS_STYLE.draft}`}>
                    {r.status}
                  </span>
                  <p className="text-[10px] th-text-2 mt-0.5">{fmtDate(r.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent clubs */}
        <div className="th-card rounded-xl border th-border overflow-hidden">
          <div className="px-5 py-4 border-b th-border flex items-center justify-between">
            <h2 className="text-sm font-semibold th-text">New Clubs</h2>
            <Link href={`/${locale}/admin/clubs`} className="text-xs text-navy hover:underline flex items-center gap-1">
              All clubs <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y th-border">
            {recentClubs.length === 0 && (
              <p className="px-5 py-8 text-sm th-text-2 text-center">No clubs yet</p>
            )}
            {recentClubs.map((c) => (
              <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium th-text truncate">{c.name}</p>
                  <p className="text-xs th-text-2 truncate">
                    {[c.country, c.city].filter(Boolean).join(", ") || "—"}
                    {c.contactEmail ? ` · ${c.contactEmail}` : ""}
                  </p>
                </div>
                <p className="text-[10px] th-text-2 shrink-0">{fmtDate(c.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
