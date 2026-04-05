"use client";

import { useState, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import {
  Trophy, Calendar, MapPin, ArrowRight, Globe, Search, Users, Flag,
  Flame, Star, ChevronRight, Sparkles, Shield, Zap, Clock, Filter,
  TrendingUp, Award, X, CheckCircle, SlidersHorizontal, ChevronDown,
  Building2, Target,
} from "lucide-react";

/* ─── Types ─── */
export type TournamentEntry = {
  tournament: {
    id: number; name: string; slug: string; year: number;
    registrationOpen: boolean;
    startDate: string | null; endDate: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
  };
  org: {
    name: string; slug: string; logo: string | null;
    city: string | null; country: string | null; brandColor: string;
  } | null;
  classes: { id: number; name: string; format: string | null }[];
  teamCount: number;
  clubCount: number;
};

/* ─── Helpers ─── */
function formatDate(d: string | null, locale: string) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

function daysUntil(d: string | null): number | null {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  return diff > 0 ? diff : null;
}

const countryFlags: Record<string, string> = {
  Estonia: "🇪🇪", Finland: "🇫🇮", Latvia: "🇱🇻", Sweden: "🇸🇪", Poland: "🇵🇱",
  Denmark: "🇩🇰", Lithuania: "🇱🇹", Germany: "🇩🇪", Spain: "🇪🇸", France: "🇫🇷",
  Italy: "🇮🇹", Netherlands: "🇳🇱", Portugal: "🇵🇹", Norway: "🇳🇴", Russia: "🇷🇺",
  "Czech Republic": "🇨🇿", Austria: "🇦🇹", Belgium: "🇧🇪", Switzerland: "🇨🇭",
  Croatia: "🇭🇷", UK: "🇬🇧", "United Kingdom": "🇬🇧", Ireland: "🇮🇪", Iceland: "🇮🇸",
};

function getFlag(country: string | null | undefined) {
  if (!country) return "🌍";
  return countryFlags[country] ?? "🌍";
}

const AGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  U8:  { bg: "rgba(236,72,153,0.12)", text: "#EC4899", border: "rgba(236,72,153,0.25)" },
  U9:  { bg: "rgba(236,72,153,0.12)", text: "#EC4899", border: "rgba(236,72,153,0.25)" },
  U10: { bg: "rgba(99,102,241,0.12)", text: "#818CF8", border: "rgba(99,102,241,0.25)" },
  U11: { bg: "rgba(99,102,241,0.12)", text: "#818CF8", border: "rgba(99,102,241,0.25)" },
  U12: { bg: "rgba(59,130,246,0.12)", text: "#60A5FA", border: "rgba(59,130,246,0.25)" },
  U13: { bg: "rgba(59,130,246,0.12)", text: "#60A5FA", border: "rgba(59,130,246,0.25)" },
  U14: { bg: "rgba(16,185,129,0.12)", text: "#34D399", border: "rgba(16,185,129,0.25)" },
  U15: { bg: "rgba(16,185,129,0.12)", text: "#34D399", border: "rgba(16,185,129,0.25)" },
  U16: { bg: "rgba(245,158,11,0.12)", text: "#FBBF24", border: "rgba(245,158,11,0.25)" },
  U17: { bg: "rgba(245,158,11,0.12)", text: "#FBBF24", border: "rgba(245,158,11,0.25)" },
  U18: { bg: "rgba(239,68,68,0.12)",  text: "#F87171", border: "rgba(239,68,68,0.25)" },
  U19: { bg: "rgba(239,68,68,0.12)",  text: "#F87171", border: "rgba(239,68,68,0.25)" },
};

function getAgeColor(name: string) {
  const key = name.replace(/[^U0-9]/gi, "").toUpperCase();
  return AGE_COLORS[key] ?? { bg: "var(--cat-tag-bg)", text: "var(--cat-tag-text)", border: "var(--cat-tag-border)" };
}

/* ─── Tournament card images ─── */
const IMAGES = [
  "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=700&h=400&fit=crop",
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=700&h=400&fit=crop",
  "https://images.unsplash.com/photo-1508098682722-e99c643e7f0b?w=700&h=400&fit=crop",
  "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=700&h=400&fit=crop",
  "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=700&h=400&fit=crop",
  "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=700&h=400&fit=crop",
  "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=700&h=400&fit=crop",
  "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=700&h=400&fit=crop",
];

/* ─── Tournament card ─── */
function TournamentCard({ entry, idx, t, locale }: {
  entry: TournamentEntry;
  idx: number;
  t: ReturnType<typeof useTranslations<"catalog">>;
  locale: string;
}) {
  const { tournament: tourney, org, classes, teamCount, clubCount } = entry;
  const brand = org?.brandColor ?? "#2BFEBA";
  const href = org?.slug ? `/t/${org.slug}/${tourney.slug}` : `/catalog`;
  // Cover photo for banner; logoUrl as small avatar; fallback to stock photos
  const coverImg = tourney.coverUrl ?? IMAGES[idx % IMAGES.length];
  const avatarImg = tourney.logoUrl ?? org?.logo ?? null;
  const days = daysUntil(tourney.startDate);
  const isHot = teamCount > 40;
  const initials = (org?.name ?? "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Link href={href}
      className="group relative rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1"
      style={{
        background: "var(--cat-card-bg)",
        border: "1px solid var(--cat-card-border)",
        boxShadow: "var(--cat-card-shadow)",
      }}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
        style={{ boxShadow: `0 0 0 1px ${brand}40, 0 8px 32px ${brand}12` }} />

      {/* Photo */}
      <div className="relative h-44 overflow-hidden shrink-0">
        <img src={coverImg} alt={tourney.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />

        {/* Gradient over photo */}
        <div className="absolute inset-0"
          style={{ background: `linear-gradient(to top, ${brand}60 0%, ${brand}10 40%, transparent 70%)` }} />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 40%)" }} />

        {/* HOT badge */}
        {isHot && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-sm"
            style={{ background: "rgba(239,68,68,0.85)", color: "#fff" }}>
            <Flame className="w-2.5 h-2.5" /> Hot
          </div>
        )}

        {/* Days countdown */}
        {days && days <= 30 && !isHot && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold backdrop-blur-sm"
            style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.9)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <Clock className="w-2.5 h-2.5" /> {t("daysUntil", { days })}
          </div>
        )}

        {/* Registration status */}
        <div className="absolute top-3 right-3">
          {tourney.registrationOpen ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm"
              style={{ background: "rgba(43,254,186,0.2)", border: "1px solid rgba(43,254,186,0.4)", color: "#2BFEBA" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {t("statusOpen")}
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}>
              {t("statusClosed")}
            </div>
          )}
        </div>

        {/* Org logo + country flag */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20 overflow-hidden"
            style={{ background: brand + "30" }}>
            {avatarImg
              ? <img src={avatarImg} alt={tourney.name} className="w-full h-full object-cover" />
              : <span className="text-[11px] font-bold text-white">{initials}</span>
            }
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm text-[12px]"
            style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {getFlag(org?.country)}
            {org?.city && <span className="text-[10px] text-white/80 ml-0.5">{org.city}</span>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        {/* Organizer */}
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 truncate"
          style={{ color: "var(--cat-text-muted)" }}>
          {org?.name ?? t("organizerFallback")}
        </p>

        {/* Title */}
        <h3 className="text-[15px] font-bold leading-snug mb-3 line-clamp-2"
          style={{ color: "var(--cat-text)" }}>
          {tourney.name}
        </h3>

        {/* Dates */}
        {(tourney.startDate || tourney.endDate) && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: brand + "18" }}>
              <Calendar className="w-3.5 h-3.5" style={{ color: brand }} />
            </div>
            <span className="text-[12px]" style={{ color: "var(--cat-text-secondary)" }}>
              {formatDate(tourney.startDate, locale)}
              {tourney.endDate ? ` — ${formatDate(tourney.endDate, locale)}` : ""}
              {tourney.startDate && <span className="ml-1.5" style={{ color: "var(--cat-text-muted)" }}>{new Date(tourney.startDate).getFullYear()}</span>}
            </span>
          </div>
        )}

        {/* Age categories */}
        {classes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {classes.slice(0, 5).map((c) => {
              const ac = getAgeColor(c.name);
              return (
                <span key={c.id}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                  style={{ background: ac.bg, color: ac.text, borderColor: ac.border }}>
                  {c.name}
                </span>
              );
            })}
            {classes.length > 5 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)", color: "var(--cat-text-muted)" }}>
                +{classes.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Bottom stats */}
        <div className="flex items-center gap-4 mt-auto pt-3"
          style={{ borderTop: "1px solid var(--cat-divider)" }}>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
            <Users className="w-3 h-3" />
            <span><b style={{ color: "var(--cat-text-secondary)" }}>{teamCount}</b> {t("teams")}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
            <Building2 className="w-3 h-3" />
            <span><b style={{ color: "var(--cat-text-secondary)" }}>{clubCount}</b> {t("clubs")}</span>
          </div>
          <div className="ml-auto w-7 h-7 rounded-full flex items-center justify-center transition-all group-hover:translate-x-0.5"
            style={{ background: brand + "18", color: brand }}>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Filter pill ─── */
function FilterPill({
  active, onClick, children
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 inline-flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-2 rounded-xl border transition-all"
      style={active
        ? { background: "var(--cat-pill-active-bg)", borderColor: "var(--cat-pill-active-border)", color: "var(--cat-pill-active-text)" }
        : { background: "var(--cat-pill-bg)", borderColor: "var(--cat-pill-border)", color: "var(--cat-pill-text)" }
      }
    >
      {children}
    </button>
  );
}

/* ─── Main component ─── */
export function CatalogClient({ entries, stats }: {
  entries: TournamentEntry[];
  stats: { tournaments: number; teams: number; clubs: number; classes: number };
}) {
  const t = useTranslations("catalog");
  const locale = useLocale();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [ageFilter, setAgeFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  /* Unique countries and ages from data */
  const countries = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => { if (e.org?.country) set.add(e.org.country); });
    return Array.from(set).sort();
  }, [entries]);

  const ageGroups = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => e.classes.forEach(c => {
      const key = c.name.replace(/[^U0-9]/gi, "").toUpperCase();
      if (key.startsWith("U")) set.add(key);
    }));
    return Array.from(set).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
  }, [entries]);

  /* Filtering */
  const filtered = useMemo(() => {
    return entries.filter(({ tournament: tourney, org, classes }) => {
      if (search) {
        const q = search.toLowerCase();
        const match = tourney.name.toLowerCase().includes(q)
          || (org?.city ?? "").toLowerCase().includes(q)
          || (org?.country ?? "").toLowerCase().includes(q)
          || (org?.name ?? "").toLowerCase().includes(q);
        if (!match) return false;
      }
      if (statusFilter === "open" && !tourney.registrationOpen) return false;
      if (statusFilter === "closed" && tourney.registrationOpen) return false;
      if (countryFilter !== "all" && org?.country !== countryFilter) return false;
      if (ageFilter !== "all") {
        const hasAge = classes.some(c => c.name.replace(/[^U0-9]/gi, "").toUpperCase() === ageFilter);
        if (!hasAge) return false;
      }
      return true;
    });
  }, [entries, search, statusFilter, countryFilter, ageFilter]);

  const hasActiveFilters = statusFilter !== "all" || countryFilter !== "all" || ageFilter !== "all";

  function resetFilters() {
    setStatusFilter("all");
    setCountryFilter("all");
    setAgeFilter("all");
    setSearch("");
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: "var(--cat-bg)" }}>

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-[0.06]"
            style={{ background: "radial-gradient(ellipse, #2BFEBA, transparent 65%)" }} />
          <div className="absolute top-[10%] left-[3%] w-[300px] h-[300px] opacity-[0.04]"
            style={{ background: "radial-gradient(circle, #8B5CF6, transparent 70%)" }} />
          <div className="absolute top-[20%] right-[5%] w-[250px] h-[250px] opacity-[0.03]"
            style={{ background: "radial-gradient(circle, #3B82F6, transparent 70%)" }} />
        </div>

        {/* Floating icons */}
        <div className="absolute top-[25%] left-[4%] opacity-[0.07] pointer-events-none animate-[float1_6s_ease-in-out_infinite]"
          style={{ color: "var(--cat-accent)" }}>
          <Trophy className="w-10 h-10" />
        </div>
        <div className="absolute top-[50%] right-[6%] opacity-[0.05] pointer-events-none animate-[float2_8s_ease-in-out_infinite]"
          style={{ color: "var(--cat-accent)" }}>
          <Award className="w-8 h-8" />
        </div>

        <div className="relative max-w-[1400px] mx-auto px-6 pt-16 pb-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 border"
            style={{ background: "var(--cat-pill-active-bg)", borderColor: "var(--cat-pill-active-border)" }}>
            <Flame className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
            <span className="text-[11px] font-black uppercase tracking-widest"
              style={{ color: "var(--cat-pill-active-text)" }}>
              Football Tournaments
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[0.95] mb-4">
            <span style={{ color: "var(--cat-text)" }}>{t("heroHeadingFind")}</span>{" "}
            <span style={{
              background: "linear-gradient(90deg, #2BFEBA, #00E5FF, #2BFEBA)",
              backgroundSize: "200%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>{t("heroHeadingTournament")}</span>
          </h1>
          <p className="text-[15px] max-w-xl mx-auto leading-relaxed mb-10"
            style={{ color: "var(--cat-text-secondary)" }}>
            {t("heroSubtitle")}
          </p>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: "var(--cat-text-muted)" }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-2xl pl-12 pr-12 py-4 text-[14px] focus:outline-none transition-all"
              style={{
                background: "var(--cat-input-bg)",
                border: "1px solid var(--cat-input-border)",
                color: "var(--cat-text)",
                boxShadow: "0 0 0 0 transparent",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100">
                <X className="w-4 h-4" style={{ color: "var(--cat-text-muted)" }} />
              </button>
            )}
          </div>

          {/* Horizontal filters */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
            {/* Status */}
            <FilterPill active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
              <Filter className="w-3 h-3" /> {t("filterAll")}
            </FilterPill>
            <FilterPill active={statusFilter === "open"} onClick={() => setStatusFilter("open")}>
              <Zap className="w-3 h-3" /> {t("filterOpen")}
            </FilterPill>
            <FilterPill active={statusFilter === "closed"} onClick={() => setStatusFilter("closed")}>
              <Shield className="w-3 h-3" /> {t("filterClosed")}
            </FilterPill>

            {/* Separator */}
            <div className="w-px h-5 mx-1" style={{ background: "var(--cat-divider)" }} />

            {/* Countries */}
            {countries.slice(0, 5).map(c => (
              <FilterPill key={c} active={countryFilter === c} onClick={() => setCountryFilter(countryFilter === c ? "all" : c)}>
                {getFlag(c)} {c}
              </FilterPill>
            ))}
            {countries.length > 5 && (
              <FilterPill active={false} onClick={() => setShowFilters(!showFilters)}>
                <Globe className="w-3 h-3" /> {t("filterMoreCountries")} <ChevronDown className="w-3 h-3" />
              </FilterPill>
            )}

            {/* Separator */}
            <div className="w-px h-5 mx-1" style={{ background: "var(--cat-divider)" }} />

            {/* Age */}
            {ageGroups.slice(0, 6).map(a => (
              <FilterPill key={a} active={ageFilter === a} onClick={() => setAgeFilter(ageFilter === a ? "all" : a)}>
                {a}
              </FilterPill>
            ))}
          </div>

          {/* Extended filters (more countries and ages) */}
          {showFilters && (
            <div className="max-w-2xl mx-auto mt-3 p-4 rounded-2xl border"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              <div className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-left"
                  style={{ color: "var(--cat-text-muted)" }}>{t("allCountries")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {countries.map(c => (
                    <FilterPill key={c} active={countryFilter === c} onClick={() => setCountryFilter(countryFilter === c ? "all" : c)}>
                      {getFlag(c)} {c}
                    </FilterPill>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-left"
                  style={{ color: "var(--cat-text-muted)" }}>{t("allAgeGroups")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {ageGroups.map(a => (
                    <FilterPill key={a} active={ageFilter === a} onClick={() => setAgeFilter(ageFilter === a ? "all" : a)}>
                      {a}
                    </FilterPill>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active filter reset */}
          {hasActiveFilters && (
            <button onClick={resetFilters}
              className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: "rgba(239,68,68,0.1)", color: "#F87171", border: "1px solid rgba(239,68,68,0.2)" }}>
              <X className="w-3 h-3" /> {t("resetFilters")}
            </button>
          )}
        </div>
      </section>

      {/* CONTENT */}
      <div className="max-w-[1400px] mx-auto px-6 pb-16">

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          {[
            { n: stats.tournaments, label: t("statTournaments"), icon: Trophy, color: "#2BFEBA" },
            { n: stats.teams,       label: t("statTeams"),       icon: Users,  color: "#3B82F6" },
            { n: stats.clubs,       label: t("statClubs"),       icon: Flag,   color: "#8B5CF6" },
            { n: stats.classes,     label: t("statCategories"),  icon: Award,  color: "#F59E0B" },
          ].map(s => (
            <div key={s.label}
              className="flex items-center gap-3 p-4 rounded-2xl border"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: s.color + "18" }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-black leading-none" style={{ color: "var(--cat-text)" }}>{s.n}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Results heading */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "var(--cat-text-secondary)" }}>
              {filtered.length === entries.length
                ? t("resultsAll", { count: entries.length })
                : t("resultsFiltered", { filtered: filtered.length, total: entries.length })}
            </p>
          </div>
          {hasActiveFilters && (
            <p className="text-[12px]" style={{ color: "var(--cat-text-muted)" }}>
              {t("filtersApplied")}
            </p>
          )}
        </div>

        {/* Cards grid */}
        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: "var(--cat-text)" }} />
            <p className="text-[15px] font-semibold mb-2" style={{ color: "var(--cat-text)" }}>
              {t("noFound")}
            </p>
            <p className="text-[13px] mb-6" style={{ color: "var(--cat-text-muted)" }}>
              {t("noFoundHint")}
            </p>
            <button onClick={resetFilters}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold"
              style={{ background: "var(--cat-pill-active-bg)", color: "var(--cat-pill-active-text)", border: "1px solid var(--cat-pill-active-border)" }}>
              <X className="w-4 h-4" /> {t("resetFilters")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((entry, idx) => (
              <TournamentCard key={entry.tournament.id} entry={entry} idx={idx} t={t} locale={locale} />
            ))}
          </div>
        )}

        {/* Organizers banner */}
        <div className="mt-12 relative rounded-2xl overflow-hidden p-8 md:p-10 border"
          style={{
            background: "linear-gradient(135deg, rgba(43,254,186,0.07) 0%, rgba(10,14,20,0) 50%, rgba(139,92,246,0.05) 100%)",
            borderColor: "rgba(43,254,186,0.2)",
          }}>
          {/* Glow */}
          <div className="absolute top-0 left-0 w-[400px] h-[200px] pointer-events-none opacity-[0.06]"
            style={{ background: "radial-gradient(ellipse at top left, #2BFEBA, transparent 70%)" }} />

          <div className="relative flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4 border"
                style={{ background: "var(--cat-pill-active-bg)", borderColor: "var(--cat-pill-active-border)" }}>
                <Star className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
                <span className="text-[10px] font-black uppercase tracking-wider"
                  style={{ color: "var(--cat-pill-active-text)" }}>
                  {t("bannerForOrganizers")}
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black mb-3" style={{ color: "var(--cat-text)" }}>
                {t("bannerHeading")}
              </h3>
              <p className="text-[14px] max-w-md leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>
                {t("bannerDesc")}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-5">
                {[t("bannerFeat1"), t("bannerFeat2"), t("bannerFeat3")].map(feat => (
                  <div key={feat} className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
                    <span className="text-[12px] font-medium" style={{ color: "var(--cat-text-secondary)" }}>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 shrink-0">
              <Link href="/onboarding"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-[14px] font-black transition-opacity hover:opacity-90"
                style={{
                  background: "linear-gradient(90deg, #2BFEBA, #00D98F)",
                  color: "#0A0E14",
                  boxShadow: "0 8px 30px rgba(43,254,186,0.3)",
                }}>
                <Sparkles className="w-4 h-4" /> {t("bannerCta")}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/pricing"
                className="text-[12px] font-semibold transition-opacity hover:opacity-80"
                style={{ color: "var(--cat-text-muted)" }}>
                {t("bannerPricing")} →
              </Link>
            </div>
          </div>
        </div>

        {/* Benefit cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
          {[
            {
              icon: Shield, color: "#2BFEBA",
              title: t("benefitVerifiedTitle"),
              desc: t("benefitVerifiedDesc"),
            },
            {
              icon: Globe, color: "#6366F1",
              title: t("benefitInternationalTitle"),
              desc: t("benefitInternationalDesc"),
            },
            {
              icon: Trophy, color: "#F59E0B",
              title: t("benefitAgeTitle"),
              desc: t("benefitAgeDesc"),
            },
          ].map(item => (
            <div key={item.title}
              className="rounded-2xl p-6 text-center border transition-all hover:scale-[1.01]"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: item.color + "18" }}>
                <item.icon className="w-6 h-6" style={{ color: item.color }} />
              </div>
              <h4 className="text-[14px] font-bold mb-2" style={{ color: "var(--cat-text)" }}>{item.title}</h4>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t" style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
        <div className="max-w-[1400px] mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #2BFEBA, #00D98F)" }}>
              <Trophy className="w-3.5 h-3.5 text-[#0A0E14]" />
            </div>
            <span className="text-[13px] font-bold" style={{ color: "var(--cat-text-secondary)" }}>
              Goality Sport Group
            </span>
          </div>
          <div className="flex items-center gap-6">
            {[
              { label: t("footerHome"),        href: "/" },
              { label: t("footerPricing"),     href: "/pricing" },
              { label: t("footerOrganizers"),  href: "/onboarding" },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="text-[12px] hover:opacity-80 transition-opacity"
                style={{ color: "var(--cat-text-muted)" }}>
                {l.label}
              </Link>
            ))}
          </div>
          <p className="text-[11px]" style={{ color: "var(--cat-text-faint)" }}>
            © {new Date().getFullYear()} Goality TMC
          </p>
        </div>
      </footer>

    </div>
  );
}
