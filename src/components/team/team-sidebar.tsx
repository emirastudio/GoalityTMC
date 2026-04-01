"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Mail,
  ShoppingCart,
  Wallet,
  Plane,
  Users,
  Shield,
  UserPlus,
  Building2,
  FileText,
  UserCircle,
  Package,
} from "lucide-react";
import { useTeam } from "@/lib/team-context";

type NavGroup = {
  labelKey?: string;
  items: { key: string; icon: React.ComponentType<{ className?: string }>; href: string; badge?: number }[];
};

interface TeamSidebarProps {
  className?: string;
}

export function TeamSidebar({ className }: TeamSidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { inboxCount } = useTeam();

  const groups: NavGroup[] = [
    {
      items: [
        { key: "overview", icon: LayoutDashboard, href: "/team/overview" },
        { key: "inbox", icon: Mail, href: "/team/inbox", badge: inboxCount },
      ],
    },
    {
      labelKey: "people",
      items: [
        { key: "players", icon: Users, href: "/team/players" },
        { key: "staff", icon: Shield, href: "/team/staff" },
        { key: "accompanying", icon: UserPlus, href: "/team/accompanying" },
      ],
    },
    {
      labelKey: "logistics",
      items: [
        { key: "services", icon: Package, href: "/team/services" },
        { key: "booking", icon: ShoppingCart, href: "/team/booking" },
        { key: "economy", icon: Wallet, href: "/team/economy" },
        { key: "travel", icon: Plane, href: "/team/travel" },
      ],
    },
    {
      items: [
        { key: "club", icon: Building2, href: "/team/club" },
        { key: "documents", icon: FileText, href: "/team/documents" },
        { key: "profile", icon: UserCircle, href: "/team/profile" },
      ],
    },
  ];

  return (
    <aside className={cn("w-full shrink-0", className)}>
      <nav className="space-y-4">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.labelKey && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                {t(group.labelKey)}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ key, icon: Icon, href, badge }) => {
                const isActive = pathname.startsWith(href);
                return (
                  <Link
                    key={key}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all",
                      isActive
                        ? "bg-mint/12 text-mint"
                        : "text-white/60 hover:bg-white/8 hover:text-white"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{t(key)}</span>
                    {badge !== undefined && badge > 0 && (
                      <span className="text-[10px] rounded-full px-1.5 py-0.5 font-bold bg-mint text-navy">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
