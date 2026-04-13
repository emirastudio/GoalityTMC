"use client";

import { usePathname, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Info, Users, BookOpen, Hotel, Handshake } from "lucide-react";

type Props = {
  orgSlug: string;
  tournamentSlug: string;
  brandColor: string;
};

export function TournamentMobileTabs({ orgSlug, tournamentSlug, brandColor }: Props) {
  const t = useTranslations("tournament");
  const pathname = usePathname();

  const base = `/t/${orgSlug}/${tournamentSlug}`;
  const brand = brandColor ?? "#2BFEBA";

  const tabs = [
    { key: "info",         label: t("navInfo"),         icon: Info,      href: base,                    exact: true },
    { key: "teams",        label: t("navTeams"),        icon: Users,     href: `${base}/teams`,         exact: false },
    { key: "regulations",  label: t("navRegulations"),  icon: BookOpen,  href: `${base}/regulations`,   exact: false },
    { key: "participants", label: t("navParticipants"), icon: Hotel,     href: `${base}/participants`,  exact: false },
    { key: "partners",     label: t("navPartners"),     icon: Handshake, href: `${base}/partners`,      exact: false },
  ];

  return (
    <div
      className="md:hidden sticky top-14 z-30 border-b overflow-x-auto"
      style={{
        background: "rgba(10,14,20,0.92)",
        backdropFilter: "blur(12px)",
        borderColor: "rgba(255,255,255,0.08)",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      <div className="flex gap-1 px-3 py-2" style={{ minWidth: "max-content" }}>
        {tabs.map(({ key, label, icon: Icon, href, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={key}
              href={href}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
              style={{
                background: active ? `${brand}22` : "transparent",
                color: active ? brand : "rgba(255,255,255,0.5)",
                border: active ? `1px solid ${brand}44` : "1px solid transparent",
                minHeight: "36px",
              }}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
