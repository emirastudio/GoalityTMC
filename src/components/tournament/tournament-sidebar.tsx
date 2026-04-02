"use client";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
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
    { key: "info", label: "Информация", icon: Info, href: base },
    { key: "teams", label: "Команды", icon: Users, href: `${base}/teams` },
    { key: "schedule", label: "Расписание", icon: Calendar, href: `${base}/schedule` },
    { key: "standings", label: "Таблицы", icon: TrendingUp, href: `${base}/standings` },
    { key: "bracket", label: "Сетка", icon: Trophy, href: `${base}/bracket` },
    { key: "regulations", label: "Регламент", icon: BookOpen, href: `${base}/regulations` },
    { key: "participants", label: "Участникам", icon: Hotel, href: `${base}/participants` },
    { key: "partners", label: "Партнёры", icon: Handshake, href: `${base}/partners` },
  ];

  return (
    <aside className="w-56 shrink-0">
      <div className="sticky top-14 space-y-3">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Logo + info */}
          <div className="px-4 pt-4 pb-3 flex flex-col items-center text-center border-b border-gray-200">
            {logoUrl ? (
              <img src={logoUrl} alt={tournamentName} className="w-16 h-16 rounded-lg object-contain mb-2 border border-gray-200" />
            ) : (
              <div className="w-16 h-16 rounded-lg flex items-center justify-center mb-2 bg-gray-100">
                <Trophy className="w-7 h-7 text-gray-400" />
              </div>
            )}
            <p className="text-sm font-semibold text-gray-900">{tournamentName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{orgName}</p>

            {/* Status */}
            <div className={cn(
              "mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
              registrationOpen ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"
            )}>
              {registrationOpen ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {registrationOpen ? "Reg. open" : "Reg. closed"}
            </div>

            {/* Dates & location */}
            <div className="mt-2 space-y-1 w-full text-left">
              {(startDate || endDate) && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="w-3 h-3 shrink-0 text-gray-400" />
                  <span>{fmtShort(startDate)}{endDate ? ` – ${fmtShort(endDate)}` : ""}</span>
                </div>
              )}
              {city && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <MapPin className="w-3 h-3 shrink-0 text-gray-400" />
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
                    "flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors",
                    isActive ? "bg-gray-100 text-gray-900 font-semibold" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}>
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
                className="flex items-center justify-center gap-2 w-full py-2 rounded text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800">
                Зарегистрироваться <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
