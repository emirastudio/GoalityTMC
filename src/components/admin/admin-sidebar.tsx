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
  Users,
  ClipboardList,
  BookOpen,
  Trophy,
  UserCheck,
  Activity,
  CreditCard,
  Sparkles,
} from "lucide-react";

const navItems = [
  { key: "dashboard",      icon: LayoutDashboard, href: "/admin/dashboard" },
  { key: "organizations",  icon: Building2,       href: "/admin/organizations" },
  { key: "clubs",          icon: UserCheck,       href: "/admin/clubs" },
  { key: "tournaments",    icon: Trophy,          href: "/admin/tournaments" },
  { key: "users",          icon: Users,           href: "/admin/users" },
  { key: "planOverrides",  icon: ClipboardList,   href: "/admin/plan-overrides" },
  { key: "planSales",      icon: CreditCard,      href: "/admin/plan-sales" },
  { key: "drawEvents",     icon: Sparkles,        href: "/admin/draw-events" },
  { key: "blog",           icon: BookOpen,        href: "/admin/blog" },
  { key: "health",         icon: Activity,        href: "/admin/health" },
  { key: "settings",       icon: Settings,        href: "/admin/settings" },
] as const;

export function AdminSidebar() {
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 min-h-screen flex flex-col border-r" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      <div className="p-4 flex items-center gap-3 border-b" style={{ borderColor: "var(--cat-card-border)" }}>
        <img src="/logo.png" alt="Goality" className="w-8 h-8 rounded-xl object-contain shrink-0" />
        <span className="text-[15px] font-bold tracking-tight" style={{ color: "var(--cat-text)" }}>Goality</span>
      </div>
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const label = t(item.key);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:opacity-90"
              style={isActive
                ? { background: "rgba(0,0,0,0.05)", color: "var(--cat-text)", fontWeight: 600, borderLeft: "2px solid var(--cat-accent)", paddingLeft: "10px" }
                : { color: "var(--cat-text-secondary)", borderLeft: "2px solid transparent", paddingLeft: "10px" }
              }
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
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:opacity-90 transition-colors w-full cursor-pointer"
            style={{ color: "var(--cat-text-muted)" }}
          >
            <LogOut className="w-4.5 h-4.5" />
            {tAuth("logout")}
          </button>
        </form>
      </div>
    </aside>
  );
}
