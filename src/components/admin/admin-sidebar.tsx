"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Settings,
  LogOut,
  Shield,
} from "lucide-react";

const navItems = [
  { key: "dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
  { label: "Organizations", icon: Building2, href: "/admin/organizations" },
  { key: "settings", icon: Settings, href: "/admin/settings" },
] as const;

export function AdminSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-navy min-h-screen flex flex-col">
      <div className="p-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-mint flex items-center justify-center shrink-0">
          <span className="text-navy font-black text-[9px] leading-none">P.G.W.</span>
        </div>
        <span className="text-lg font-bold text-white tracking-tight">Goality</span>
      </div>
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const label = "key" in item ? t(item.key) : item.label;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/15 text-gold"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="w-4.5 h-4.5" />
              {label}
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
