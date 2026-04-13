"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LayoutDashboard, Building2, Search, LogOut } from "lucide-react";

type Props = {
  clubName: string;
  clubBadge: string | null;
};

const NAV_ITEMS = [
  { key: "dashboard" as const, icon: LayoutDashboard, href: "/club/dashboard", exact: true },
  { key: "profile" as const, icon: Building2, href: "/club/profile", exact: false },
  { key: "findTournaments" as const, icon: Search, href: "/catalog", exact: false },
] as const;

export function ClubSidebar({ clubName, clubBadge }: Props) {
  const t = useTranslations("clubDashboard");
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside
      className="w-64 shrink-0 flex flex-col border-r overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
    >
      {/* Club header */}
      <div
        className="px-4 py-4 border-b flex items-center gap-3 shrink-0"
        style={{ borderColor: "var(--cat-card-border)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-black overflow-hidden"
          style={{
            background: clubBadge
              ? "var(--cat-tag-bg)"
              : "linear-gradient(135deg, var(--cat-accent), var(--cat-accent)cc)",
            color: "#000",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            border: clubBadge ? "1.5px solid var(--cat-card-border)" : "none",
          }}
        >
          {clubBadge ? (
            <img src={clubBadge} alt={clubName} className="w-full h-full object-cover" />
          ) : (
            clubName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate leading-tight" style={{ color: "var(--cat-text)" }}>
            {clubName}
          </p>
          <p className="text-[11px] leading-tight mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {t("title")}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-2 pt-3 space-y-0.5 flex-1">
        {NAV_ITEMS.map(({ key, icon: Icon, href, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={key}
              href={href}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all"
              style={{
                background: active ? "var(--cat-tag-bg)" : "transparent",
                color: active ? "var(--cat-text)" : "var(--cat-text-secondary)",
                fontWeight: active ? 600 : 400,
                borderLeft: `2px solid ${active ? "var(--cat-accent)" : "transparent"}`,
              }}
            >
              <Icon
                className="w-4 h-4 shrink-0"
                style={{ color: active ? "var(--cat-accent)" : "var(--cat-text-muted)" }}
              />
              <span>{t(key)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t shrink-0" style={{ borderColor: "var(--cat-card-border)" }}>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all hover:opacity-70 w-full cursor-pointer"
            style={{ color: "var(--cat-text-muted)", borderLeft: "2px solid transparent" }}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>{t("logout")}</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
