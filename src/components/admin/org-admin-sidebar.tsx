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
  Wrench,
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
    <aside className="w-52 shrink-0 flex flex-col border-r" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      {/* Org name context */}
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--cat-card-border)" }}>
        <p className="text-xs font-semibold truncate" style={{ color: "var(--cat-text)" }}>{orgName}</p>
        <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>{tAdmin("adminPanel")}</p>
      </div>

      {/* Org navigation */}
      <nav className="flex-1 px-3 pt-3 space-y-0.5">
        {orgNav.map(({ key, icon: Icon, href }) => {
          const isActive = pathname === href || (key !== "dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={`org-${key}`}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-opacity"
              style={isActive
                ? { background: "rgba(0,0,0,0.05)", color: "var(--cat-text)", fontWeight: 600, borderLeft: "2px solid var(--cat-accent)", paddingLeft: "10px" }
                : { color: "var(--cat-text-secondary)", borderLeft: "2px solid transparent", paddingLeft: "10px" }
              }
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
              <span>{t(key)}</span>
            </Link>
          );
        })}

        {/* Tournament section */}
        {tournamentNav.length > 0 && (
          <>
            <div className="pt-4 pb-1.5 px-3">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
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
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-opacity"
                  style={isActive
                    ? { background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)", fontWeight: 500 }
                    : { color: "var(--cat-text-secondary)" }
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
                  <span>{t(key)}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

    </aside>
  );
}
