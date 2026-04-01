"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Mail,
  Settings,
  Trophy,
  Wallet,
  Package,
  Layers,
  TableProperties,
  ClipboardList,
  LogOut,
  Building2,
  Wrench,
} from "lucide-react";

type Props = {
  orgSlug: string;
  orgName: string;
};

export function OrgAdminSidebar({ orgSlug, orgName }: Props) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const basePath = `/org/${orgSlug}/admin`;

  // Extract tournamentId from URL: /org/[slug]/admin/tournament/[id]/...
  const tournamentMatch = pathname.match(/\/tournament\/(\d+)/);
  const tournamentId = tournamentMatch ? parseInt(tournamentMatch[1]) : null;

  const orgNav = [
    { key: "dashboard", icon: LayoutDashboard, href: basePath },
    { key: "tournaments", icon: Trophy, href: `${basePath}/tournaments` },
    { key: "settings", icon: Settings, href: `${basePath}/settings` },
  ];

  const tournamentNav = tournamentId
    ? [
        { key: "overview", icon: TableProperties, href: `${basePath}/tournament/${tournamentId}` },
        { key: "registrations", icon: ClipboardList, href: `${basePath}/tournament/${tournamentId}/registrations` },
        { key: "teams", icon: Users, href: `${basePath}/tournament/${tournamentId}/teams` },
        { key: "services", icon: Package, href: `${basePath}/tournament/${tournamentId}/services` },
        { key: "packages", icon: Layers, href: `${basePath}/tournament/${tournamentId}/packages` },
        { key: "payments", icon: Wallet, href: `${basePath}/tournament/${tournamentId}/payments` },
        { key: "messages", icon: Mail, href: `${basePath}/tournament/${tournamentId}/messages` },
        { key: "settings", icon: Settings, href: `${basePath}/tournament/${tournamentId}/settings` },
        { key: "setup", icon: Wrench, href: `${basePath}/tournament/${tournamentId}/setup` },
      ]
    : [];

  return (
    <aside className="w-60 shrink-0 bg-navy min-h-screen flex flex-col">
      <div className="p-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-mint flex items-center justify-center shrink-0">
          <span className="text-navy font-black text-[9px] leading-none">P.G.W.</span>
        </div>
        <span className="text-lg font-bold text-white tracking-tight truncate">{orgName}</span>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {orgNav.map(({ key, icon: Icon, href }) => {
          const isActive = pathname === href || (key !== "dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={`org-${key}`}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/15 text-gold"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="w-4.5 h-4.5" />
              {t(key)}
            </Link>
          );
        })}

        {tournamentNav.length > 0 && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                {t("tournaments")}
              </span>
            </div>
            {tournamentNav.map(({ key, icon: Icon, href }) => {
              const isActive = pathname.startsWith(href) && (key === "settings" ? pathname.endsWith("/settings") : true);
              return (
                <Link
                  key={`t-${key}`}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/15 text-gold"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {t(key)}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-3 mt-auto">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-colors w-full cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5" />
            {t("dashboard") === "Dashboard" ? "Log out" : "Выйти"}
          </button>
        </form>
      </div>
    </aside>
  );
}
