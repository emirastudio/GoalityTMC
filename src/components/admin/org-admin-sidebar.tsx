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
  TableProperties,
  ClipboardList,
  LogOut,
  Wrench,
  ChevronRight,
} from "lucide-react";

type Props = {
  orgSlug: string;
  orgName: string;
};

export function OrgAdminSidebar({ orgSlug, orgName }: Props) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const basePath = `/org/${orgSlug}/admin`;

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
        { key: "servicesPackages", icon: Package, href: `${basePath}/tournament/${tournamentId}/services-packages` },
        { key: "payments", icon: Wallet, href: `${basePath}/tournament/${tournamentId}/payments` },
        { key: "messages", icon: Mail, href: `${basePath}/tournament/${tournamentId}/messages` },
        { key: "setup", icon: Wrench, href: `${basePath}/tournament/${tournamentId}/setup` },
        { key: "settings", icon: Settings, href: `${basePath}/tournament/${tournamentId}/settings` },
      ]
    : [];

  const initials = orgName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <aside className="w-60 shrink-0 bg-[#161A1A] min-h-screen flex flex-col border-r border-white/4">
      {/* Logo / Org name */}
      <div className="px-4 py-5 border-b border-white/6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-mint/15 border border-mint/20 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-black text-mint leading-none">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-white truncate leading-tight">{orgName}</p>
            <p className="text-[10px] text-white/35 leading-tight">Admin panel</p>
          </div>
        </div>
      </div>

      {/* Org navigation */}
      <nav className="flex-1 px-3 pt-3 space-y-0.5">
        {orgNav.map(({ key, icon: Icon, href }) => {
          const isActive = pathname === href || (key !== "dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={`org-${key}`}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all",
                isActive
                  ? "bg-mint/12 text-mint"
                  : "text-white/55 hover:bg-white/6 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{t(key)}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
            </Link>
          );
        })}

        {/* Tournament section */}
        {tournamentNav.length > 0 && (
          <>
            <div className="pt-4 pb-1.5 px-3">
              <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">
                {t("tournaments")}
              </span>
            </div>
            {tournamentNav.map(({ key, icon: Icon, href }) => {
              const isActive =
                key === "overview"
                  ? pathname === href
                  : key === "settings"
                  ? pathname.startsWith(href) && pathname.endsWith("/settings")
                  : pathname.startsWith(href);
              return (
                <Link
                  key={`t-${key}`}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all",
                    isActive
                      ? "bg-mint/12 text-mint"
                      : "text-white/55 hover:bg-white/6 hover:text-white"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{t(key)}</span>
                  {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/6">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-white/35 hover:text-white/70 hover:bg-white/6 transition-all w-full cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Log out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
