"use client";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Info, Users, BookOpen, Hotel, Handshake,
  MapPin, Clock, ArrowRight, ChevronRight, Shield, Trophy, Calendar,
  BarChart2,
} from "lucide-react";

type ClassInfo = {
  id: number;
  name: string;
  format: string | null;
  minBirthYear: number | null;
  maxBirthYear: number | null;
  maxPlayers: number | null;
  teamCount: number;
};

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
  classes?: ClassInfo[];
  clubCount?: number;
  teamCount?: number;
};

function fmtShort(d: string | null, locale: string) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

const countryFlags: Record<string, string> = {
  Estonia: "🇪🇪", Finland: "🇫🇮", Latvia: "🇱🇻", Sweden: "🇸🇪", Poland: "🇵🇱",
  Denmark: "🇩🇰", Lithuania: "🇱🇹", Germany: "🇩🇪", Spain: "🇪🇸", France: "🇫🇷",
  Italy: "🇮🇹", Netherlands: "🇳🇱", Portugal: "🇵🇹", Norway: "🇳🇴", Russia: "🇷🇺",
};

const DIV_COLORS = [
  "#3B82F6","#10B981","#8B5CF6","#F59E0B",
  "#EF4444","#06B6D4","#EC4899","#84CC16",
];

export function TournamentSidebar({
  orgSlug, tournamentSlug, tournamentName, orgName,
  logoUrl, registrationOpen, startDate, endDate, city, country,
  classes = [], clubCount = 0, teamCount = 0,
}: Props) {
  const pathname = usePathname();
  const t = useTranslations("tournament");
  const locale = useLocale();
  const base = `/t/${orgSlug}/${tournamentSlug}`;

  const navItems = [
    { key: "info",         label: t("navInfo"),         icon: Info,       href: base },
    { key: "teams",        label: t("navTeams"),        icon: Users,      href: `${base}/teams` },
    { key: "schedule",     label: t("navSchedule"),     icon: Calendar,   href: `${base}/schedule` },
    { key: "standings",    label: t("navStandings"),    icon: BarChart2,  href: `${base}/standings` },
    { key: "regulations",  label: t("navRegulations"),  icon: BookOpen,   href: `${base}/regulations` },
    { key: "participants", label: t("navParticipants"), icon: Hotel,      href: `${base}/participants` },
    { key: "partners",     label: t("navPartners"),     icon: Handshake,  href: `${base}/partners` },
  ];

  const flag = country ? (countryFlags[country] ?? "🌍") : null;
  const initials = tournamentName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <aside className="w-64 shrink-0">
      <div className="sticky top-4 space-y-3">

        {/* ── LOGO CARD — overlaps cover ── */}
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)" }}>

          {/* Logo hero area */}
          <div className="relative p-5 flex flex-col items-center text-center"
            style={{ borderBottom: "1px solid var(--cat-divider)" }}>
            {/* Accent glow behind logo */}
            <div className="absolute inset-x-0 top-0 h-20 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(43,254,186,0.15), transparent 70%)" }} />

            {/* Logo */}
            <div className="relative mb-3">
              {logoUrl ? (
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 shadow-xl"
                  style={{ borderColor: "rgba(43,254,186,0.4)", boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(43,254,186,0.1)" }}>
                  <img src={logoUrl} alt={tournamentName}
                    className="w-full h-full object-contain"
                    style={{ background: "linear-gradient(135deg, #0B1320, #0D1F12)" }} />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-black shadow-xl"
                  style={{ background: "linear-gradient(135deg, rgba(43,254,186,0.2), rgba(43,254,186,0.08))", border: "2px solid rgba(43,254,186,0.4)", color: "#2BFEBA" }}>
                  {initials}
                </div>
              )}
              {/* Live pulse if registration open */}
              {registrationOpen && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0A0E14] flex items-center justify-center"
                  style={{ background: "#2BFEBA" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                </div>
              )}
            </div>

            <p className="text-[15px] font-black leading-snug" style={{ color: "var(--cat-text)" }}>
              {tournamentName}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{orgName}</p>

            {/* Stats row */}
            {(clubCount > 0 || teamCount > 0) && (
              <div className="flex items-center gap-4 mt-3 pt-3 w-full justify-center" style={{ borderTop: "1px solid var(--cat-divider)" }}>
                <div className="text-center">
                  <p className="text-xl font-black" style={{ color: "var(--cat-text)" }}>{clubCount}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-faint)" }}>{t("statClubs")}</p>
                </div>
                <div className="w-px h-8" style={{ background: "var(--cat-divider)" }} />
                <div className="text-center">
                  <p className="text-xl font-black" style={{ color: "var(--cat-accent)" }}>{teamCount}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-faint)" }}>{t("statTeams")}</p>
                </div>
              </div>
            )}
          </div>

          {/* Dates + location */}
          <div className="px-4 py-3 space-y-2" style={{ borderBottom: "1px solid var(--cat-divider)" }}>
            {(startDate || endDate) && (
              <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--cat-text-secondary)" }}>
                <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-accent)" }} />
                <span className="font-medium">{fmtShort(startDate, locale)}{endDate ? ` — ${fmtShort(endDate, locale)}` : ""}</span>
              </div>
            )}
            {city && (
              <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--cat-text-secondary)" }}>
                <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-accent)" }} />
                <span>{flag && <span className="mr-1">{flag}</span>}{city}{country ? `, ${country}` : ""}</span>
              </div>
            )}
            <div className="pt-0.5">
              {registrationOpen ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border"
                  style={{ background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-badge-open-border)", color: "var(--cat-badge-open-text)" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {t("registrationOpen")}
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border"
                  style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)" }}>
                  <Clock className="w-3 h-3" /> {t("registrationClosed")}
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-2">
            {navItems.map(({ key, label, icon: Icon, href }) => {
              const isActive = key === "info" ? pathname === href : pathname.startsWith(href);
              return (
                <Link key={key} href={href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all mb-0.5"
                  style={isActive ? {
                    background: "var(--cat-pill-active-bg)",
                    color: "var(--cat-accent)",
                    fontWeight: 700,
                  } : {
                    color: "var(--cat-text-secondary)",
                  }}>
                  <Icon className="w-3.5 h-3.5 shrink-0"
                    style={{ color: isActive ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "var(--cat-accent)" }} />}
                </Link>
              );
            })}
          </nav>

          {/* CTA */}
          {registrationOpen && (
            <div className="p-3 pt-0">
              <Link href={`${base}/register`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[12px] font-black transition-opacity hover:opacity-90"
                style={{
                  background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))",
                  color: "var(--cat-accent-text)",
                  boxShadow: "0 4px 16px var(--cat-accent-glow)",
                }}>
                {t("registerCta")} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* ── Divisions ── */}
        {classes.length > 0 && (
          <div className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--cat-divider)" }}>
              <Shield className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
              <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--cat-text-muted)" }}>
                {t("divisions")}
              </p>
              <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-faint)" }}>
                {classes.length}
              </span>
            </div>
            <div className="p-2 space-y-0.5">
              {classes.map((cls, i) => {
                const color = DIV_COLORS[i % DIV_COLORS.length];
                return (
                  <Link
                    key={cls.id}
                    href={`${base}/d/${cls.id}`}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all group"
                    style={{ color: "var(--cat-text-secondary)" }}
                    onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                      (e.currentTarget as HTMLElement).style.background = `${color}12`;
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}>
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate" style={{ color: "var(--cat-text)" }}>
                        {cls.name}
                      </p>
                      {cls.format && (
                        <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                          {cls.format}
                          {cls.minBirthYear ? ` · ${cls.minBirthYear}` : ""}
                          {cls.maxBirthYear && cls.maxBirthYear !== cls.minBirthYear ? `–${cls.maxBirthYear}` : ""}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: `${color}20`, color, border: `1px solid ${color}35` }}>
                      {cls.teamCount}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Powered by */}
        <div className="flex items-center justify-center gap-1.5 py-1 opacity-30">
          <Trophy className="w-3 h-3" style={{ color: "var(--cat-text-faint)" }} />
          <span className="text-[10px]" style={{ color: "var(--cat-text-faint)" }}>Powered by Goality</span>
        </div>
      </div>
    </aside>
  );
}
