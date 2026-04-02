"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
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

  // Загружаем название турнира при смене tournamentId
  const [tournamentName, setTournamentName] = useState<string | null>(null);
  useEffect(() => {
    if (!tournamentId) { setTournamentName(null); return; }
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/name`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.name ? setTournamentName(d.name) : null)
      .catch(() => null);
  }, [tournamentId, orgSlug]);

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

  const activeLink = (isActive: boolean) => isActive
    ? { background: "rgba(0,0,0,0.05)", color: "var(--cat-text)", fontWeight: 600, borderLeft: "2px solid var(--cat-accent)", paddingLeft: "10px" }
    : { color: "var(--cat-text-secondary)", borderLeft: "2px solid transparent", paddingLeft: "10px" };

  return (
    <aside className="w-52 shrink-0 flex flex-col border-r" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      {/* Название организации */}
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--cat-card-border)" }}>
        <p className="text-xs font-semibold truncate" style={{ color: "var(--cat-text)" }}>{orgName}</p>
        <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>{tAdmin("adminPanel")}</p>
      </div>

      {/* Навигация организации */}
      <nav className="px-3 pt-3 space-y-0.5">
        {orgNav.map(({ key, icon: Icon, href }) => {
          const isActive = pathname === href || (key !== "dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={`org-${key}`}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-opacity"
              style={activeLink(isActive)}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
              <span>{t(key)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Раздел турнира — появляется только внутри турнира */}
      {tournamentNav.length > 0 && (
        <>
          {/* Градиентный разделитель */}
          <div className="mx-3 my-3" style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent, var(--cat-accent), transparent)",
            opacity: 0.4,
          }} />

          {/* Название турнира */}
          <div className="px-4 pb-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("tournaments")}
            </p>
            <p className="text-xs font-semibold truncate" style={{ color: "var(--cat-accent)" }}>
              {tournamentName ?? "..."}
            </p>
          </div>

          {/* Навигация турнира */}
          <nav className="px-3 pb-3 space-y-0.5">
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
                  style={activeLink(isActive)}
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
                  <span>{t(key)}</span>
                </Link>
              );
            })}
          </nav>
        </>
      )}
    </aside>
  );
}
