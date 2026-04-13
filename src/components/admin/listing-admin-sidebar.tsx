"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Trophy, Zap, LogOut } from "lucide-react"; // Zap used for upgrade link

type Props = {
  orgSlug: string;
  orgName: string;
  orgLogo: string | null;
};

const NAV = [
  { key: "dashboard", label: "My Tournaments", icon: Trophy, href: (slug: string) => `/org/${slug}/admin/listing`, exact: false },
];

export function ListingAdminSidebar({ orgSlug, orgName, orgLogo }: Props) {
  const pathname = usePathname();
  const t = useTranslations("adminListing");

  return (
    <aside
      className="w-60 shrink-0 flex flex-col border-r overflow-hidden"
      style={{
        background: "#1C2121",
        borderColor: "var(--cat-card-border)",
        width: 240,
      }}
    >
      {/* Org header */}
      <div
        className="px-4 py-4 border-b flex items-center gap-3 shrink-0"
        style={{ borderColor: "var(--cat-card-border)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-black overflow-hidden"
          style={{
            background: orgLogo
              ? "var(--cat-tag-bg)"
              : "linear-gradient(135deg, var(--cat-accent), var(--cat-accent)cc)",
            color: "#000",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            border: orgLogo ? "1.5px solid var(--cat-card-border)" : "none",
          }}
        >
          {orgLogo
            ? <img src={orgLogo} alt={orgName} className="w-full h-full object-cover" />
            : orgName.charAt(0).toUpperCase()
          }
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate leading-tight" style={{ color: "var(--cat-text)" }}>
            {orgName}
          </p>
          <p className="text-[11px] leading-tight mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {t("listingPortal")}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-2 pt-3 space-y-0.5 flex-1">
        {NAV.map(({ key, label, icon: Icon, href, exact }) => {
          const target = href(orgSlug);
          const active = exact ? pathname === target : pathname.startsWith(target);
          return (
            <Link
              key={key}
              href={target}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all"
              style={{
                background:  active ? "var(--cat-tag-bg)" : "transparent",
                color:       active ? "var(--cat-text)" : "var(--cat-text-secondary)",
                fontWeight:  active ? 600 : 400,
                borderLeft:  `2px solid ${active ? "var(--cat-accent)" : "transparent"}`,
              }}
            >
              <Icon
                className="w-4 h-4 shrink-0"
                style={{ color: active ? "var(--cat-accent)" : "var(--cat-text-muted)" }}
              />
              <span>{t("pageTitle")}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-3 pt-2 space-y-1 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
        {/* Subtle upgrade link — only shows intent, not a push */}
        <Link
          href={`/org/${orgSlug}/admin/billing`}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-all hover:opacity-70"
          style={{ color: "var(--cat-text-muted)" }}
        >
          <Zap className="w-3.5 h-3.5 shrink-0" />
          {t("switchToFull")}
        </Link>

        {/* Log out */}
        <Link
          href="/logout"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all hover:opacity-70"
          style={{ color: "var(--cat-text-muted)" }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>{t("logOut")}</span>
        </Link>
      </div>
    </aside>
  );
}
