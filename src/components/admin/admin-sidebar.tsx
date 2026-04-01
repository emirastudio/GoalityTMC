"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Mail,
  Settings,
  Trophy,
  Wallet,
  Crown,
  LogOut,
  Package,
  Layers,
  TableProperties,
  ClipboardList,
} from "lucide-react";

const navItems = [
  { key: "dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
  { key: "overview", icon: TableProperties, href: "/admin/overview" },
  { key: "registrations", icon: ClipboardList, href: "/admin/registrations" },
  { key: "teams", icon: Users, href: "/admin/teams" },
  { key: "services", icon: Package, href: "/admin/services" },
  { key: "packages", icon: Layers, href: "/admin/packages" },
  { key: "payments", icon: Wallet, href: "/admin/payments" },
  { key: "messages", icon: Mail, href: "/admin/messages" },
  { key: "tournaments", icon: Trophy, href: "/admin/tournaments" },
  { key: "settings", icon: Settings, href: "/admin/settings" },
] as const;

export function AdminSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-navy min-h-screen flex flex-col">
      <div className="p-5 flex items-center gap-2">
        <Crown className="w-7 h-7 text-gold" />
        <span className="text-lg font-bold text-white tracking-tight">Kings Cup</span>
      </div>
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ key, icon: Icon, href }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={key}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/15 text-gold"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="w-4.5 h-4.5" />
              {t(key)}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 mt-auto">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-colors w-full cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5" />
            {t("dashboard") === "Dashboard" ? "Log out" : "Выйти"}
          </button>
        </form>
      </div>
    </aside>
  );
}
