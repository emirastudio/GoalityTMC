"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  CheckCircle,
  Clock,
  Wallet,
  ArrowRight,
  MessageSquare,
  Settings,
} from "lucide-react";

interface DashboardData {
  totalTeams: number;
  confirmedTeams: number;
  pendingPayments: number;
  totalRevenue: string;
  recentTeams: {
    id: number;
    name: string;
    regNumber: number;
    status: string;
    createdAt: string;
    clubName: string;
    className: string;
  }[];
}

const statusVariant: Record<string, "default" | "success" | "gold" | "error"> =
  {
    draft: "default",
    open: "success",
    confirmed: "gold",
    cancelled: "error",
  };

export default function AdminDashboardPage() {
  const t = useTranslations("admin.dashboard");
  const tTeams = useTranslations("admin.teams");
  const tTeam = useTranslations("team");
  const tc = useTranslations("common");

  const router = useRouter();
  const locale = useLocale();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      key: "totalTeams" as const,
      value: data?.totalTeams ?? 0,
      icon: Users,
      color: "text-navy",
    },
    {
      key: "confirmedTeams" as const,
      value: data?.confirmedTeams ?? 0,
      icon: CheckCircle,
      color: "text-success",
    },
    {
      key: "pendingPayments" as const,
      value: data?.pendingPayments ?? 0,
      icon: Clock,
      color: "text-warning",
    },
    {
      key: "totalRevenue" as const,
      value: data ? `€${data.totalRevenue}` : "€0.00",
      icon: Wallet,
      color: "text-gold",
    },
  ];

  const quickLinks = [
    { href: "/admin/teams", label: tTeams("title"), icon: Users },
    { href: "/admin/messages", label: t("messages"), icon: MessageSquare },
    { href: "/admin/settings", label: t("settings"), icon: Settings },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <div className="animate-pulse flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface" />
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-surface rounded" />
                  <div className="h-6 w-12 bg-surface rounded" />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Card>
          <div className="animate-pulse space-y-4">
            <div className="h-5 w-40 bg-surface rounded" />
            <div className="h-4 w-full bg-surface rounded" />
            <div className="h-4 w-3/4 bg-surface rounded" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ key, value, icon: Icon, color }) => (
          <Card key={key}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-surface ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">{t(key)}</p>
                <p className="text-2xl font-bold text-text-primary">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent registrations */}
      <Card padding={false}>
        <div className="p-6 pb-0">
          <CardTitle>{tTeams("recentRegistrations")}</CardTitle>
        </div>
        {data?.recentTeams && data.recentTeams.length > 0 ? (
          <div className="mt-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-3 text-xs font-medium text-text-secondary uppercase">
                    {tTeam("teamName")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-secondary uppercase">
                    {tTeam("clubName")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-secondary uppercase">
                    {tTeam("class")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-secondary uppercase">
                    {tTeam("status")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-secondary uppercase">
                    {t("date")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentTeams.map((team) => (
                  <tr
                    key={team.id}
                    className="border-b border-border last:border-0 hover:bg-navy/5 cursor-pointer"
                    onClick={() => router.push(`/${locale}/admin/teams/${team.id}`)}
                  >
                    <td className="px-6 py-3 text-sm font-medium text-text-primary">
                      {team.name || "-"}
                    </td>
                    <td className="px-6 py-3 text-sm text-text-secondary">
                      {team.clubName || "-"}
                    </td>
                    <td className="px-6 py-3 text-sm text-text-secondary">
                      {team.className || "-"}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={statusVariant[team.status] ?? "default"}>
                        {tTeam(team.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-sm text-text-secondary">
                      {new Date(team.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-text-secondary text-sm">
            {tTeams("noTeams")}
          </div>
        )}
      </Card>

      {/* Quick actions */}
      <Card>
        <CardTitle>{t("quickActions")}</CardTitle>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-surface transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-navy" />
                <span className="text-sm font-medium text-text-primary">
                  {label}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-text-secondary group-hover:text-navy transition-colors" />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
