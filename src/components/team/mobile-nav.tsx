"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, ShoppingCart, Wallet, Menu, X,
  Mail, Shield, UserPlus, Plane, Building2, FileText, UserCircle,
} from "lucide-react";
import { useTeam } from "@/lib/team-context";

export function MobileNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { inboxCount } = useTeam();

  // Bottom bar — 5 main tabs
  const mainItems = [
    { key: "overview",  icon: LayoutDashboard, href: "/team/overview" },
    { key: "players",   icon: Users,           href: "/team/players" },
    { key: "booking",   icon: ShoppingCart,    href: "/team/booking" },
    { key: "economy",   icon: Wallet,          href: "/team/economy" },
  ];

  // "More" drawer — everything else
  const moreItems = [
    { key: "inbox",        icon: Mail,       href: "/team/inbox",    badge: inboxCount },
    { key: "staff",        icon: Shield,     href: "/team/staff" },
    { key: "accompanying", icon: UserPlus,   href: "/team/accompanying" },
    { key: "travel",       icon: Plane,      href: "/team/travel" },
    { key: "club",         icon: Building2,  href: "/team/club" },
    { key: "documents",    icon: FileText,   href: "/team/documents" },
    { key: "profile",      icon: UserCircle, href: "/team/profile" },
  ];

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border md:hidden safe-area-pb">
        <div className="flex items-stretch h-16">
          {mainItems.map(({ key, icon: Icon, href }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={key}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 text-[10px] font-medium transition-colors",
                  active ? "text-navy" : "text-text-secondary"
                )}
              >
                <Icon className={cn("w-5 h-5", active ? "text-navy" : "text-text-secondary")} />
                <span>{t(key)}</span>
                {active && <span className="absolute bottom-0 w-6 h-0.5 bg-navy rounded-t-full" />}
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 text-[10px] font-medium transition-colors",
              moreOpen ? "text-navy" : "text-text-secondary"
            )}
          >
            {moreOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span>{moreOpen ? t("settings") : "More"}</span>
          </button>
        </div>
      </nav>

      {/* More drawer */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/20 md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-border rounded-t-2xl shadow-2xl md:hidden">
            <div className="p-4">
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
              <div className="grid grid-cols-3 gap-2">
                {moreItems.map(({ key, icon: Icon, href, badge }) => {
                  const active = pathname.startsWith(href);
                  return (
                    <Link
                      key={key}
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-colors relative",
                        active
                          ? "bg-navy text-white"
                          : "bg-surface text-text-secondary hover:bg-surface/80"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-center leading-tight">{t(key)}</span>
                      {badge !== undefined && badge > 0 && (
                        <span className="absolute top-2 right-2 w-4 h-4 bg-gold text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
