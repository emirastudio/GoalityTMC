"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutDashboard, Trophy, Receipt, Settings, Menu, X,
  LayoutGrid, ClipboardList, Users, SlidersHorizontal,
  GitBranch, CalendarDays, CreditCard, MessageSquare,
  ShoppingBag, Radio, FileText, LogOut, ChevronRight,
  Zap, Lock, MapPin, Hotel,
} from "lucide-react";

type Props = {
  orgSlug: string;
  orgName: string;
  orgLogo?: string | null;
};

export function OrgAdminMobileNav({ orgSlug, orgName, orgLogo }: Props) {
  const t = useTranslations("nav");
  const tAdmin = useTranslations("orgAdmin");
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const basePath = `/org/${orgSlug}/admin`;
  const tournamentMatch = pathname.match(/\/tournament\/(\d+)/);
  const tournamentId = tournamentMatch ? tournamentMatch[1] : null;
  const base = tournamentId ? `${basePath}/tournament/${tournamentId}` : null;

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  // ── Bottom tab items change based on context ──────────────────────────────
  const orgTabs = [
    { key: "dashboard",   icon: LayoutDashboard, href: basePath,              exact: true },
    { key: "tournaments", icon: Trophy,           href: `${basePath}/tournaments` },
    { key: "billing",     icon: Receipt,          href: `${basePath}/billing` },
    { key: "settings",    icon: Settings,         href: `${basePath}/settings` },
  ];

  const tournamentTabs = base ? [
    { key: "overview",       icon: LayoutGrid,       href: base,                        exact: true },
    { key: "registrations",  icon: ClipboardList,    href: `${base}/registrations` },
    { key: "teams",          icon: Users,            href: `${base}/teams` },
    { key: "setup",          icon: SlidersHorizontal,href: `${base}/setup` },
  ] : [];

  const tabs = tournamentId ? tournamentTabs : orgTabs;

  // ── Drawer sections (full nav) ────────────────────────────────────────────
  const drawerOrgItems = [
    { key: "dashboard",   icon: LayoutDashboard, href: basePath,                  exact: true },
    { key: "tournaments", icon: Trophy,           href: `${basePath}/tournaments` },
    { key: "billing",     icon: Receipt,          href: `${basePath}/billing` },
    { key: "settings",    icon: Settings,         href: `${basePath}/settings` },
  ];

  const drawerTournamentItems = base ? [
    { key: "overview",          icon: LayoutGrid,        href: base,                        exact: true,  color: "var(--cat-accent)" },
    { key: "planner",           icon: CalendarDays,      href: `${base}/planner`,            exact: false, color: "#06b6d4" },
    { key: "registrations",     icon: FileText,          href: `${base}/registrations`,      exact: false, color: "#10b981" },
    { key: "teams",             icon: Users,             href: `${base}/teams`,              exact: false, color: "#10b981" },
    { key: "servicesPackages",  icon: ShoppingBag,       href: `${base}/offerings`,  exact: false, color: "#ec4899" },
    { key: "stadiums",          icon: MapPin,            href: `${base}/stadiums`,           exact: false, color: "#ec4899" },
    { key: "hotels",            icon: Hotel,             href: `${base}/hotels`,             exact: false, color: "#ec4899" },
    { key: "payments",          icon: CreditCard,        href: `${base}/payments`,           exact: false, color: "#f59e0b" },
    { key: "messagesLabel",     icon: MessageSquare,     href: `${base}/messages`,           exact: false, color: "#8b5cf6" },
    { key: "setup",             icon: SlidersHorizontal, href: `${base}/setup`,              exact: false, color: "#8b5cf6" },
    { key: "settings",         icon: Settings,          href: `${base}/settings`,           exact: false, color: "#8b5cf6" },
  ] : [];

  function closeAndNav() {
    setDrawerOpen(false);
  }

  return (
    <>
      {/* ── Bottom tab bar ────────────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t md:hidden safe-area-pb"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <div className="flex items-stretch" style={{ height: "60px" }}>
          {tabs.map(({ key, icon: Icon, href, exact }) => {
            const active = exact ? pathname === href : isActive(href);
            return (
              <Link
                key={key}
                href={href}
                onClick={() => setDrawerOpen(false)}
                className="flex flex-col items-center justify-center gap-1 flex-1 relative transition-all"
                style={{ color: active ? "var(--cat-accent)" : "var(--cat-text-muted)" }}
              >
                {/* Active indicator dot */}
                {active && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
                    style={{ width: 28, height: 3, background: "var(--cat-accent)" }}
                  />
                )}
                <Icon className="w-[22px] h-[22px]" />
                <span style={{ fontSize: "10px", fontWeight: active ? 700 : 500, lineHeight: 1 }}>
                  {key === "messagesLabel" ? t("messagesLabel") : (t as any)(key)}
                </span>
              </Link>
            );
          })}

          {/* ── More / Hamburger ── */}
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="flex flex-col items-center justify-center gap-1 flex-1 transition-all"
            style={{ color: drawerOpen ? "var(--cat-accent)" : "var(--cat-text-muted)" }}
          >
            {drawerOpen
              ? <X className="w-[22px] h-[22px]" />
              : <Menu className="w-[22px] h-[22px]" />}
            <span style={{ fontSize: "10px", fontWeight: 500, lineHeight: 1 }}>
              {drawerOpen ? tAdmin("close") : tAdmin("more")}
            </span>
          </button>
        </div>
      </nav>

      {/* ── Drawer backdrop ───────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Drawer panel ─────────────────────────────────────────────────── */}
      <div
        className="fixed left-0 right-0 z-50 md:hidden rounded-t-3xl shadow-2xl overflow-hidden transition-transform duration-300"
        style={{
          bottom: "calc(60px + env(safe-area-inset-bottom, 0px))",
          background: "var(--cat-card-bg)",
          border: "1px solid var(--cat-card-border)",
          borderBottom: "none",
          transform: drawerOpen ? "translateY(0)" : "translateY(110%)",
          maxHeight: "75vh",
          overflowY: "auto",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--cat-text-muted)", opacity: 0.35 }} />
        </div>

        {/* Org info */}
        <div className="px-4 pb-3 flex items-center gap-3 border-b" style={{ borderColor: "var(--cat-card-border)" }}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-black overflow-hidden"
            style={{
              background: orgLogo ? "var(--cat-tag-bg)" : "linear-gradient(135deg, var(--cat-accent)cc, var(--cat-accent)88)",
              border: orgLogo ? "1.5px solid var(--cat-card-border)" : "none",
            }}
          >
            {orgLogo
              ? <img src={orgLogo} alt={orgName} className="w-full h-full object-cover" />
              : <span style={{ color: "#000" }}>{orgName.charAt(0).toUpperCase()}</span>}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "var(--cat-text)" }}>{orgName}</p>
            <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{tAdmin("adminPanel")}</p>
          </div>
        </div>

        <div className="px-3 py-3 space-y-1">
          {/* Org-level nav */}
          {!tournamentId && (
            <>
              <p className="text-[10px] font-black uppercase tracking-widest px-2 mb-2" style={{ color: "var(--cat-text-muted)" }}>
                {tAdmin("organization")}
              </p>
              {drawerOrgItems.map(({ key, icon: Icon, href, exact }) => {
                const active = exact ? pathname === href : isActive(href);
                return (
                  <Link
                    key={key}
                    href={href}
                    onClick={closeAndNav}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all"
                    style={{
                      background: active ? "var(--cat-tag-bg)" : "transparent",
                      color: active ? "var(--cat-text)" : "var(--cat-text-secondary)",
                      borderLeft: `2px solid ${active ? "var(--cat-accent)" : "transparent"}`,
                    }}
                  >
                    <Icon className="w-4 h-4 shrink-0" style={{ color: active ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
                    <span className="flex-1">{t(key)}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-40" style={{ color: "var(--cat-text-muted)" }} />
                  </Link>
                );
              })}
            </>
          )}

          {/* Tournament nav */}
          {tournamentId && drawerTournamentItems.length > 0 && (
            <>
              <p className="text-[10px] font-black uppercase tracking-widest px-2 mb-2" style={{ color: "var(--cat-text-muted)" }}>
                {t("tournaments")}
              </p>
              {drawerTournamentItems.map(({ key, icon: Icon, href, exact, color }) => {
                const active = exact ? pathname === href : isActive(href);
                return (
                  <Link
                    key={key}
                    href={href}
                    onClick={closeAndNav}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all"
                    style={{
                      background: active ? `${color}15` : "transparent",
                      color: active ? "var(--cat-text)" : "var(--cat-text-secondary)",
                      borderLeft: `2px solid ${active ? color : "transparent"}`,
                    }}
                  >
                    <Icon className="w-4 h-4 shrink-0" style={{ color: active ? color : "var(--cat-text-muted)" }} />
                    <span className="flex-1">{key === "messagesLabel" ? t("messagesLabel") : (t as any)(key)}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-40" style={{ color: "var(--cat-text-muted)" }} />
                  </Link>
                );
              })}

              {/* Back to org */}
              <div className="border-t pt-2 mt-1" style={{ borderColor: "var(--cat-card-border)" }}>
                <Link
                  href={basePath}
                  onClick={closeAndNav}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all"
                  style={{ color: "var(--cat-text-muted)" }}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span>{t("dashboard")}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40 ml-auto" />
                </Link>
              </div>
            </>
          )}

          {/* Upgrade hint */}
          <div className="pt-2">
            <Link
              href={`${basePath}/billing`}
              onClick={closeAndNav}
              className="flex items-center gap-2 rounded-xl px-3 py-3 text-xs font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, #7C3AED15, #6D28D910)",
                border: "1px dashed #7C3AED50",
                color: "#7C3AED",
              }}
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>{tAdmin("upgradeToUnlock")}</span>
            </Link>
          </div>
        </div>

        {/* Logout */}
        <div className="px-3 pb-4 border-t pt-2" style={{ borderColor: "var(--cat-card-border)" }}>
          <Link
            href="/logout"
            onClick={closeAndNav}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all"
            style={{ color: "var(--cat-text-muted)" }}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>{tAdmin("logOut")}</span>
          </Link>
        </div>
      </div>
    </>
  );
}
