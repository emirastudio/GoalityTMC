"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
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
  const tAdmin = useTranslations("orgAdmin");
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

  return (
    <aside className="w-60 shrink-0 min-h-screen flex flex-col border-r"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>

      {/* Logo / Org name */}
      <div className="px-4 py-4 border-b flex items-center gap-3"
        style={{ borderColor: "var(--cat-card-border)" }}>
        <img src="/logo.png" alt="Goality" className="w-8 h-8 rounded-xl object-contain shrink-0"
          style={{ boxShadow: "0 2px 8px var(--cat-accent-glow)" }} />
        <div className="min-w-0">
          <p className="text-[13px] font-bold truncate leading-tight" style={{ color: "var(--cat-text)" }}>{orgName}</p>
          <p className="text-[10px] leading-tight" style={{ color: "var(--cat-text-muted)" }}>{tAdmin("adminPanel")}</p>
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
              style={isActive
                ? { background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }
                : { color: "var(--cat-text-muted)" }
              }
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all hover:opacity-80"
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
              <span className="flex-1" style={{ color: isActive ? "var(--cat-accent)" : "var(--cat-text-secondary)" }}>{t(key)}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-50" style={{ color: "var(--cat-accent)" }} />}
            </Link>
          );
        })}

        {/* Tournament section */}
        {tournamentNav.length > 0 && (
          <>
            <div className="pt-4 pb-1.5 px-3">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--cat-text-muted)" }}>
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
                  style={isActive
                    ? { background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }
                    : { color: "var(--cat-text-muted)" }
                  }
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all hover:opacity-80"
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
                  <span className="flex-1" style={{ color: isActive ? "var(--cat-accent)" : "var(--cat-text-secondary)" }}>{t(key)}</span>
                  {isActive && <ChevronRight className="w-3 h-3 opacity-50" style={{ color: "var(--cat-accent)" }} />}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all w-full cursor-pointer hover:opacity-80"
            style={{ color: "var(--cat-text-muted)" }}
          >
            <LogOut className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
            <span>{tAdmin("logOut")}</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
