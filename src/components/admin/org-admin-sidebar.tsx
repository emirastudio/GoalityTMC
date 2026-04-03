"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import {
  LayoutGrid,
  GitBranch,
  CalendarDays,
  SlidersHorizontal,
  FileText,
  Users,
  ShoppingBag,
  CreditCard,
  MessageSquare,
  Settings,
  LayoutDashboard,
  Trophy,
  LogOut,
} from "lucide-react";

// ─── Section color palette ────────────────────────────────────────────────────

const SECTION = {
  sport:        { color: "#3b82f6", bg: "rgba(59,130,246,0.10)"  },
  participants: { color: "#10b981", bg: "rgba(16,185,129,0.10)"  },
  finance:      { color: "#f59e0b", bg: "rgba(245,158,11,0.10)"  },
  other:        { color: "#8b5cf6", bg: "rgba(139,92,246,0.10)"  },
} as const;

type SectionKey = keyof typeof SECTION;

type NavItem = {
  key: string;
  icon: React.ElementType;
  href: string;
  section?: SectionKey;
};

type NavGroup = {
  labelKey: string;
  section: SectionKey;
  items: NavItem[];
};

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

  const [tournamentName, setTournamentName] = useState<string | null>(null);
  useEffect(() => {
    if (!tournamentId) { setTournamentName(null); return; }
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/name`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.name ? setTournamentName(d.name) : null)
      .catch(() => null);
  }, [tournamentId, orgSlug]);

  const orgNav: NavItem[] = [
    { key: "dashboard",    icon: LayoutDashboard, href: basePath },
    { key: "tournaments",  icon: Trophy,           href: `${basePath}/tournaments` },
    { key: "settings",     icon: Settings,         href: `${basePath}/settings` },
  ];

  const base = `${basePath}/tournament/${tournamentId}`;

  const overviewItem: NavItem = {
    key: "overview", icon: LayoutGrid, href: base,
  };

  const tournamentGroups: NavGroup[] = tournamentId ? [
    {
      labelKey: "groupSport",
      section: "sport",
      items: [
        { key: "format",   icon: GitBranch,        href: `${base}/format`,   section: "sport" },
        { key: "schedule", icon: CalendarDays,      href: `${base}/schedule`, section: "sport" },
        { key: "setup",    icon: SlidersHorizontal, href: `${base}/setup`,    section: "sport" },
      ],
    },
    {
      labelKey: "groupParticipants",
      section: "participants",
      items: [
        { key: "registrations", icon: FileText, href: `${base}/registrations`, section: "participants" },
        { key: "teams",         icon: Users,    href: `${base}/teams`,         section: "participants" },
      ],
    },
    {
      labelKey: "groupFinance",
      section: "finance",
      items: [
        { key: "servicesPackages", icon: ShoppingBag, href: `${base}/services-packages`, section: "finance" },
        { key: "payments",         icon: CreditCard,  href: `${base}/payments`,          section: "finance" },
      ],
    },
    {
      labelKey: "groupOther",
      section: "other",
      items: [
        { key: "messages", icon: MessageSquare, href: `${base}/messages`, section: "other" },
        { key: "settings", icon: Settings,      href: `${base}/settings`, section: "other" },
      ],
    },
  ] : [];

  const isItemActive = (key: string, href: string) => {
    if (key === "overview") return pathname === href;
    if (key === "settings" && href.endsWith("/settings")) return pathname.startsWith(href) && pathname.endsWith("/settings");
    return pathname.startsWith(href);
  };

  // Determine which section the current page belongs to (for overview accent)
  const activeSection: SectionKey | null = (() => {
    for (const g of tournamentGroups) {
      for (const item of g.items) {
        if (isItemActive(item.key, item.href)) return g.section;
      }
    }
    return null;
  })();

  const overviewActive = tournamentId ? pathname === base : false;

  return (
    <aside
      className="w-52 shrink-0 flex flex-col border-r"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
    >
      {/* ── Org header ── */}
      <div className="px-4 py-3.5 border-b flex items-center gap-3" style={{ borderColor: "var(--cat-card-border)" }}>
        {/* Org avatar */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-black"
          style={{
            background: "linear-gradient(135deg, var(--cat-accent), var(--cat-accent-alt, var(--cat-accent)))",
            color: "#000",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}>
          {orgName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold truncate leading-tight" style={{ color: "var(--cat-text)" }}>{orgName}</p>
          <p className="text-[10px] leading-tight mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{tAdmin("adminPanel")}</p>
        </div>
      </div>

      {/* ── Org nav ── */}
      <nav className="px-2 pt-2 space-y-0.5">
        {orgNav.map(({ key, icon: Icon, href }) => {
          const isActive = pathname === href || (key !== "dashboard" && pathname.startsWith(href) && !tournamentId);
          return (
            <Link
              key={`org-${key}`}
              href={href}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all"
              style={{
                background: isActive ? "var(--cat-tag-bg)" : "transparent",
                color: isActive ? "var(--cat-text)" : "var(--cat-text-secondary)",
                fontWeight: isActive ? 600 : 400,
                borderLeft: `2px solid ${isActive ? "var(--cat-accent)" : "transparent"}`,
              }}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: isActive ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
              <span className="text-xs">{t(key)}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Tournament section ── */}
      {tournamentId && (
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Accent divider */}
          <div className="mx-3 my-2.5" style={{
            height: "1px",
            background: `linear-gradient(90deg, transparent, ${activeSection ? SECTION[activeSection].color : "var(--cat-accent)"}, transparent)`,
            opacity: 0.5,
          }} />

          {/* Tournament label */}
          <div className="px-3 pb-1">
            <p className="text-[9px] font-bold uppercase tracking-widest leading-none mb-0.5" style={{ color: "var(--cat-text-muted)", opacity: 0.5 }}>
              {t("tournaments")}
            </p>
            <p className="text-[11px] font-bold truncate" style={{ color: "var(--cat-accent)" }}>
              {tournamentName ?? "..."}
            </p>
          </div>

          {/* Overview — special entry, uses current section color or accent */}
          <nav className="px-2 mt-1 mb-1">
            <Link
              href={base}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all"
              style={{
                background: overviewActive
                  ? (activeSection ? SECTION[activeSection].bg : "var(--cat-tag-bg)")
                  : "transparent",
                color: overviewActive ? "var(--cat-text)" : "var(--cat-text-secondary)",
                fontWeight: overviewActive ? 700 : 400,
                borderLeft: `2px solid ${overviewActive ? (activeSection ? SECTION[activeSection].color : "var(--cat-accent)") : "transparent"}`,
              }}
            >
              <LayoutGrid
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: overviewActive ? (activeSection ? SECTION[activeSection].color : "var(--cat-accent)") : "var(--cat-text-muted)" }}
              />
              <span className="text-xs">{t("overview")}</span>
            </Link>
          </nav>

          {/* Grouped sections */}
          {tournamentGroups.map((group) => {
            const { color, bg } = SECTION[group.section];
            return (
              <div key={group.section} className="mb-0.5">
                {/* Section label */}
                <div className="flex items-center gap-1.5 px-3 pt-2 pb-0.5">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                  <p className="text-[9px] font-black uppercase tracking-widest" style={{ color, opacity: 0.8 }}>
                    {tAdmin(group.labelKey)}
                  </p>
                </div>

                {/* Section items */}
                <nav className="px-2 space-y-0.5">
                  {group.items.map(({ key, icon: Icon, href }) => {
                    const isActive = isItemActive(key, href);
                    return (
                      <Link
                        key={`t-${key}`}
                        href={href}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-all"
                        style={{
                          background: isActive ? bg : "transparent",
                          color: isActive ? "var(--cat-text)" : "var(--cat-text-secondary)",
                          fontWeight: isActive ? 600 : 400,
                          borderLeft: `2px solid ${isActive ? color : "transparent"}`,
                        }}
                      >
                        <Icon
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: isActive ? color : "var(--cat-text-muted)" }}
                        />
                        <span className="text-xs">{t(key)}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Log out ── */}
      <div className="mt-auto px-2 py-2.5 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
        <Link
          href="/logout"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-all hover:opacity-70"
          style={{ color: "var(--cat-text-muted)", borderLeft: "2px solid transparent" }}
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>{tAdmin("logOut")}</span>
        </Link>
      </div>
    </aside>
  );
}
