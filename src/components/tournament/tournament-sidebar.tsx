"use client";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Info, Users, Calendar, BookOpen, Hotel, Handshake, Trophy, MapPin, CheckCircle, Clock, ArrowRight } from "lucide-react";

type Props = {
  orgSlug: string;
  tournamentSlug: string;
  tournamentName: string;
  orgName: string;
  logoUrl: string | null;
  brandColor: string;
  registrationOpen: boolean;
  startDate: string | null;
  endDate: string | null;
  city: string | null;
  country: string | null;
};

function fmtShort(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function TournamentSidebar({ orgSlug, tournamentSlug, tournamentName, orgName, logoUrl, brandColor, registrationOpen, startDate, endDate, city, country }: Props) {
  const pathname = usePathname();
  const base = `/t/${orgSlug}/${tournamentSlug}`;

  const navItems = [
    { key: "info", label: "Информация", icon: Info, href: base },
    { key: "teams", label: "Команды", icon: Users, href: `${base}/teams` },
    { key: "schedule", label: "Расписание", icon: Calendar, href: `${base}/schedule` },
    { key: "regulations", label: "Регламент", icon: BookOpen, href: `${base}/regulations` },
    { key: "participants", label: "Участникам", icon: Hotel, href: `${base}/participants` },
    { key: "partners", label: "Партнёры", icon: Handshake, href: `${base}/partners` },
  ];

  return (
    <aside className="w-56 shrink-0 -mt-20 relative z-10">
      <div className="sticky top-14 space-y-3">
        {/* Main card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}>
          {/* Logo */}
          <div className="px-4 pt-4 pb-3 flex flex-col items-center text-center" style={{ borderBottom: "1px solid var(--cat-divider)" }}>
            {logoUrl ? (
              <img src={logoUrl} alt={tournamentName} className="w-20 h-20 rounded-2xl object-contain mb-3"
                style={{ border: "3px solid var(--cat-card-border)", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }} />
            ) : (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-3 shrink-0"
                style={{ background: brandColor, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
                <Trophy className="w-9 h-9 text-white/80" />
              </div>
            )}
            <p className="text-[13px] font-bold leading-tight" style={{ color: "var(--cat-text)" }}>{tournamentName}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{orgName}</p>

            {/* Status badge */}
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
              style={registrationOpen
                ? { background: "var(--cat-badge-open-bg)", color: "var(--cat-badge-open-text)", border: "1px solid var(--cat-badge-open-border)" }
                : { background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)", border: "1px solid var(--cat-tag-border)" }
              }>
              {registrationOpen ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {registrationOpen ? "Reg. open" : "Reg. closed"}
            </div>

            {/* Dates & location */}
            <div className="mt-2 space-y-1 w-full text-left">
              {(startDate || endDate) && (
                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--cat-text-secondary)" }}>
                  <Calendar className="w-3 h-3 shrink-0" style={{ color: "var(--cat-accent)" }} />
                  <span>{fmtShort(startDate)}{endDate ? ` – ${fmtShort(endDate)}` : ""}</span>
                </div>
              )}
              {city && (
                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--cat-text-secondary)" }}>
                  <MapPin className="w-3 h-3 shrink-0" style={{ color: "var(--cat-accent)" }} />
                  <span>{city}{country ? `, ${country}` : ""}</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-2 space-y-0.5">
            {navItems.map(({ key, label, icon: Icon, href }) => {
              const isActive = key === "info" ? pathname === href : pathname.startsWith(href);
              return (
                <Link key={key} href={href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all",
                    isActive ? "font-semibold" : "hover:opacity-80"
                  )}
                  style={isActive
                    ? { background: brandColor + "18", color: brandColor }
                    : { color: "var(--cat-text-secondary)" }
                  }>
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Register CTA */}
          {registrationOpen && (
            <div className="p-3 pt-0">
              <Link href={`${base}/register`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[12px] font-bold transition-opacity hover:opacity-90"
                style={{ background: brandColor, color: "#ffffff" }}>
                Зарегистрироваться <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
