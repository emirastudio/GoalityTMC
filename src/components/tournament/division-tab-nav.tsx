"use client";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Users, Calendar, TrendingUp, Trophy } from "lucide-react";

export function DivisionTabNav({ base }: { base: string }) {
  const pathname = usePathname();
  const t = useTranslations("tournament");

  const tabs = [
    { key: "teams",     label: t("navTeams"),     icon: Users,      suffix: "" },
    { key: "schedule",  label: t("navSchedule"),  icon: Calendar,   suffix: "/schedule" },
    { key: "standings", label: t("navStandings"), icon: TrendingUp, suffix: "/standings" },
    { key: "bracket",   label: t("navBracket"),   icon: Trophy,     suffix: "/bracket" },
  ];

  return (
    <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--cat-tag-bg)" }}>
      {tabs.map(tab => {
        const href = `${base}${tab.suffix}`;
        const isActive = tab.suffix === "" ? pathname === href || pathname === `${href}/` : pathname.startsWith(href);
        return (
          <Link
            key={tab.key}
            href={href}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold flex-1 justify-center transition-all"
            style={isActive ? {
              background: "var(--cat-card-bg)",
              color: "var(--cat-accent)",
              fontWeight: 700,
              boxShadow: "0 1px 4px rgba(0,0,0,0.2)"
            } : {
              color: "var(--cat-text-secondary)"
            }}
          >
            <tab.icon className="w-3.5 h-3.5 shrink-0" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
