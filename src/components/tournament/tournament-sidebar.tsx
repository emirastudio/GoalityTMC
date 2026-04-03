"use client";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Info, Users, Calendar, BookOpen, Hotel, Handshake, Trophy, MapPin, CheckCircle, Clock, ArrowRight, TrendingUp } from "lucide-react";

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
    { key: "info",        label: "Информация",  icon: Info,        href: base },
    { key: "teams",       label: "Команды",     icon: Users,       href: `${base}/teams` },
    { key: "schedule",    label: "Расписание",  icon: Calendar,    href: `${base}/schedule` },
    { key: "standings",   label: "Таблицы",     icon: TrendingUp,  href: `${base}/standings` },
    { key: "bracket",     label: "Сетка",       icon: Trophy,      href: `${base}/bracket` },
    { key: "regulations", label: "Регламент",   icon: BookOpen,    href: `${base}/regulations` },
    { key: "participants",label: "Участникам",  icon: Hotel,       href: `${base}/participants` },
    { key: "partners",    label: "Партнёры",    icon: Handshake,   href: `${base}/partners` },
  ];

  return (
    <aside className="w-56 shrink-0">
      <div className="sticky top-14 space-y-3">
        <div className="rounded-xl border overflow-hidden"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>

          {/* Лого + инфо */}
          <div className="px-4 pt-4 pb-3 flex flex-col items-center text-center border-b"
            style={{ borderColor: "var(--cat-card-border)" }}>
            {logoUrl ? (
              <img src={logoUrl} alt={tournamentName}
                className="w-16 h-16 rounded-xl object-contain mb-2 border"
                style={{ borderColor: "var(--cat-card-border)" }} />
            ) : (
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-2"
                style={{ background: `${brandColor}15` }}>
                <Trophy className="w-7 h-7" style={{ color: brandColor }} />
              </div>
            )}
            <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{tournamentName}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{orgName}</p>

            {/* Статус регистрации */}
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
              style={registrationOpen ? {
                background: `${brandColor}10`,
                color: brandColor,
                borderColor: `${brandColor}30`,
              } : {
                background: "var(--cat-tag-bg)",
                color: "var(--cat-text-muted)",
                borderColor: "var(--cat-card-border)",
              }}>
              {registrationOpen
                ? <><CheckCircle className="w-3 h-3" /> Reg. open</>
                : <><Clock className="w-3 h-3" /> Reg. closed</>
              }
            </div>

            {/* Даты и город */}
            <div className="mt-2 space-y-1 w-full text-left">
              {(startDate || endDate) && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--cat-text-muted)" }}>
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>{fmtShort(startDate)}{endDate ? ` – ${fmtShort(endDate)}` : ""}</span>
                </div>
              )}
              {city && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--cat-text-muted)" }}>
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>{city}{country ? `, ${country}` : ""}</span>
                </div>
              )}
            </div>
          </div>

          {/* Навигация */}
          <nav className="p-2 space-y-0.5">
            {navItems.map(({ key, label, icon: Icon, href }) => {
              const isActive = key === "info" ? pathname === href : pathname.startsWith(href);
              return (
                <Link key={key} href={href}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={isActive ? {
                    background: `${brandColor}15`,
                    color: brandColor,
                    fontWeight: 600,
                  } : {
                    color: "var(--cat-text-secondary)",
                  }}>
                  <Icon className="w-3.5 h-3.5 shrink-0"
                    style={{ color: isActive ? brandColor : "var(--cat-text-muted)" }} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* CTA регистрации */}
          {registrationOpen && (
            <div className="p-3 pt-0">
              <Link href={`${base}/register`}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-bold"
                style={{ background: brandColor, color: "#fff" }}>
                Зарегистрироваться <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
