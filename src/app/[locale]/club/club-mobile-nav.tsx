"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutDashboard, Trophy, Star, Building2, Search,
  Menu, X, LogOut, ChevronRight,
} from "lucide-react";

type Props = {
  clubName: string;
  clubBadge: string | null;
};

const BOTTOM_TABS = [
  { key: "dashboard" as const, icon: LayoutDashboard, href: "/club/dashboard", exact: true },
  { key: "tournaments" as const, icon: Trophy, href: "/club/tournaments", exact: false },
  { key: "subscriptions" as const, icon: Star, href: "/club/subscriptions", exact: false },
  { key: "profile" as const, icon: Building2, href: "/club/profile", exact: false },
];

const DRAWER_ITEMS = [
  ...BOTTOM_TABS,
  { key: "findTournaments" as const, icon: Search, href: "/catalog", exact: false },
];

export function ClubMobileNav({ clubName, clubBadge }: Props) {
  const t = useTranslations("clubDashboard");
  const tAdmin = useTranslations("orgAdmin");
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  function closeAndNav() {
    setDrawerOpen(false);
  }

  return (
    <>
      {/* ── Bottom tab bar ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t md:hidden safe-area-pb"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <div className="flex items-stretch" style={{ height: "60px" }}>
          {BOTTOM_TABS.map(({ key, icon: Icon, href, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={key}
                href={href}
                onClick={() => setDrawerOpen(false)}
                className="flex flex-col items-center justify-center gap-1 flex-1 relative transition-all"
                style={{ color: active ? "var(--cat-accent)" : "var(--cat-text-muted)" }}
              >
                {active && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
                    style={{ width: 28, height: 3, background: "var(--cat-accent)" }}
                  />
                )}
                <Icon className="w-[22px] h-[22px]" />
                <span style={{ fontSize: "10px", fontWeight: active ? 700 : 500, lineHeight: 1 }}>
                  {t(key)}
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

      {/* ── Drawer backdrop ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Drawer panel ── */}
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

        {/* Club info */}
        <div className="px-4 pb-3 flex items-center gap-3 border-b" style={{ borderColor: "var(--cat-card-border)" }}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-black overflow-hidden"
            style={{
              background: clubBadge ? "var(--cat-tag-bg)" : "linear-gradient(135deg, var(--cat-accent)cc, var(--cat-accent)88)",
              border: clubBadge ? "1.5px solid var(--cat-card-border)" : "none",
            }}
          >
            {clubBadge
              ? <img src={clubBadge} alt={clubName} className="w-full h-full object-cover" />
              : <span style={{ color: "#000" }}>{clubName.charAt(0).toUpperCase()}</span>}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "var(--cat-text)" }}>{clubName}</p>
            <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{t("title")}</p>
          </div>
        </div>

        <div className="px-3 py-3 space-y-1">
          {DRAWER_ITEMS.map(({ key, icon: Icon, href, exact }) => {
            const active = isActive(href, exact);
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
        </div>

        {/* Logout */}
        <div className="px-3 pb-4 border-t pt-2" style={{ borderColor: "var(--cat-card-border)" }}>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all w-full cursor-pointer"
              style={{ color: "var(--cat-text-muted)" }}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>{t("logout")}</span>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
