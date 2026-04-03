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
  CalendarDays,
  Layers,
  LogOut,
} from "lucide-react";

type Props = {
  orgSlug: string;
  orgName: string;
};

type NavItem = {
  key: string;
  icon: React.ElementType;
  href: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

export function OrgAdminSidebar({ orgSlug, orgName }: Props) {
  const t = useTranslations("nav");
  const tAdmin = useTranslations("orgAdmin");
  const pathname = usePathname();

  const basePath = `/org/${orgSlug}/admin`;

  const tournamentMatch = pathname.match(/\/tournament\/(\d+)/);
  const tournamentId = tournamentMatch ? parseInt(tournamentMatch[1]) : null;

  const [tournamentName, setTournamentName] = useState<string | null>(null);
  useEffect(() => {
    if (!tournamentId) { setTournamentName(null); return; }
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/name`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.name ? setTournamentName(d.name) : null)
      .catch(() => null);
  }, [tournamentId, orgSlug]);

  const orgNav: NavItem[] = [
    { key: "dashboard", icon: LayoutDashboard, href: basePath },
    { key: "tournaments", icon: Trophy, href: `${basePath}/tournaments` },
    { key: "settings", icon: Settings, href: `${basePath}/settings` },
  ];

  const base = `${basePath}/tournament/${tournamentId}`;

  const tournamentGroups: NavGroup[] = tournamentId
    ? [
        {
          label: "",
          items: [
            { key: "overview", icon: TableProperties, href: base },
          ],
        },
        {
          label: tAdmin("groupSport"),
          items: [
            { key: "format",   icon: Layers,      href: `${base}/format` },
            { key: "schedule", icon: CalendarDays, href: `${base}/schedule` },
            { key: "setup",    icon: Wrench,       href: `${base}/setup` },
          ],
        },
        {
          label: tAdmin("groupParticipants"),
          items: [
            { key: "registrations", icon: ClipboardList, href: `${base}/registrations` },
            { key: "teams",         icon: Users,          href: `${base}/teams` },
          ],
        },
        {
          label: tAdmin("groupFinance"),
          items: [
            { key: "servicesPackages", icon: Package, href: `${base}/services-packages` },
            { key: "payments",         icon: Wallet,  href: `${base}/payments` },
          ],
        },
        {
          label: tAdmin("groupOther"),
          items: [
            { key: "messages", icon: Mail,     href: `${base}/messages` },
            { key: "settings", icon: Settings, href: `${base}/settings` },
          ],
        },
      ]
    : [];

  const isItemActive = (key: string, href: string) => {
    if (key === "overview") return pathname === href;
    if (key === "settings") return pathname.startsWith(href) && pathname.endsWith("/settings");
    return pathname.startsWith(href);
  };

  const activeStyle = (isActive: boolean) => isActive
    ? {
        background: "rgba(0,0,0,0.05)",
        color: "var(--cat-text)",
        fontWeight: 600,
        borderLeft: "2px solid var(--cat-accent)",
        paddingLeft: "10px",
      }
    : {
        color: "var(--cat-text-secondary)",
        borderLeft: "2px solid transparent",
        paddingLeft: "10px",
      };

  return (
    <aside className="w-52 shrink-0 flex flex-col border-r" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>

      {/* Org header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--cat-card-border)" }}>
        <p className="text-xs font-semibold truncate" style={{ color: "var(--cat-text)" }}>{orgName}</p>
        <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>{tAdmin("adminPanel")}</p>
      </div>

      {/* Org nav */}
      <nav className="px-3 pt-3 space-y-0.5">
        {orgNav.map(({ key, icon: Icon, href }) => {
          const isActive = pathname === href || (key !== "dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={`org-${key}`}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-opacity"
              style={activeStyle(isActive)}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
              <span>{t(key)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Tournament section */}
      {tournamentGroups.length > 0 && (
        <div className="flex-1 overflow-y-auto pb-4">
          {/* Divider with accent */}
          <div className="mx-3 my-3" style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent, var(--cat-accent), transparent)",
            opacity: 0.4,
          }} />

          {/* Tournament name */}
          <div className="px-4 pb-2">
            <p className="text-[9px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("tournaments")}
            </p>
            <p className="text-xs font-semibold truncate" style={{ color: "var(--cat-accent)" }}>
              {tournamentName ?? "..."}
            </p>
          </div>

          {/* Grouped nav */}
          {tournamentGroups.map((group, gi) => (
            <div key={gi} className="mb-1">
              {group.label && (
                <p className="px-4 pt-2 pb-0.5 text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--cat-text-muted)", opacity: 0.6 }}>
                  {group.label}
                </p>
              )}
              <nav className="px-3 space-y-0.5">
                {group.items.map(({ key, icon: Icon, href }) => {
                  const isActive = isItemActive(key, href);
                  return (
                    <Link
                      key={`t-${key}`}
                      href={href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-opacity"
                      style={activeStyle(isActive)}
                    >
                      <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
                      <span>{t(key)}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      )}

      {/* Log out */}
      <div className="mt-auto px-3 py-3 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
        <Link
          href="/logout"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-opacity hover:opacity-70"
          style={{ color: "var(--cat-text-muted)", borderLeft: "2px solid transparent", paddingLeft: "10px" }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>{tAdmin("logOut")}</span>
        </Link>
      </div>
    </aside>
  );
}
