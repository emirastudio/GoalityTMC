import { Link } from "@/i18n/navigation";
import {
  Trophy, Calendar, MapPin, ArrowRight, Globe, Search, Users, Flag,
  Flame, Star, ChevronRight, Sparkles, Shield, Zap, Clock, Filter,
  TrendingUp, Award, Activity,
} from "lucide-react";
import { db } from "@/db";
import { tournaments, organizations, teams, clubs, tournamentClasses } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { ThemeToggle, ThemeProvider } from "@/components/ui/theme-provider";

/* ── Helpers ── */

function formatDateShort(d: Date | string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function daysUntil(d: Date | string | null): number | null {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  return diff > 0 ? diff : null;
}

function getAgeTagClass(name: string): string {
  const n = name.toLowerCase().replace(/[^u0-9]/g, "");
  if (n === "u8" || n === "u9") return "cat-age-u8";
  if (n === "u10" || n === "u11") return "cat-age-u10";
  if (n === "u12" || n === "u13") return "cat-age-u12";
  if (n === "u14" || n === "u15") return "cat-age-u14";
  if (n === "u16" || n === "u17") return "cat-age-u16";
  if (n === "u18" || n === "u19") return "cat-age-u18";
  return "";
}

/* Country → flag emoji */
const countryFlags: Record<string, string> = {
  Estonia: "\u{1F1EA}\u{1F1EA}", Finland: "\u{1F1EB}\u{1F1EE}", Latvia: "\u{1F1F1}\u{1F1FB}",
  Sweden: "\u{1F1F8}\u{1F1EA}", Poland: "\u{1F1F5}\u{1F1F1}", Denmark: "\u{1F1E9}\u{1F1F0}",
  Lithuania: "\u{1F1F1}\u{1F1F9}", Germany: "\u{1F1E9}\u{1F1EA}", Spain: "\u{1F1EA}\u{1F1F8}",
  France: "\u{1F1EB}\u{1F1F7}", Italy: "\u{1F1EE}\u{1F1F9}", Netherlands: "\u{1F1F3}\u{1F1F1}",
  Portugal: "\u{1F1F5}\u{1F1F9}", Norway: "\u{1F1F3}\u{1F1F4}", Russia: "\u{1F1F7}\u{1F1FA}",
  "Czech Republic": "\u{1F1E8}\u{1F1FF}", Austria: "\u{1F1E6}\u{1F1F9}", Belgium: "\u{1F1E7}\u{1F1EA}",
  Switzerland: "\u{1F1E8}\u{1F1ED}", Croatia: "\u{1F1ED}\u{1F1F7}", UK: "\u{1F1EC}\u{1F1E7}",
  "United Kingdom": "\u{1F1EC}\u{1F1E7}", Ireland: "\u{1F1EE}\u{1F1EA}", Iceland: "\u{1F1EE}\u{1F1F8}",
  Hungary: "\u{1F1ED}\u{1F1FA}", Romania: "\u{1F1F7}\u{1F1F4}", Bulgaria: "\u{1F1E7}\u{1F1EC}",
  Greece: "\u{1F1EC}\u{1F1F7}", Turkey: "\u{1F1F9}\u{1F1F7}", USA: "\u{1F1FA}\u{1F1F8}",
};

function getFlag(country: string | null | undefined): string {
  if (!country) return "\u{1F30D}";
  return countryFlags[country] ?? "\u{1F30D}";
}

/* ── Images ── */
const eventImages = [
  "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&h=340&fit=crop",
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=340&fit=crop",
  "https://images.unsplash.com/photo-1508098682722-e99c643e7f0b?w=600&h=340&fit=crop",
  "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=600&h=340&fit=crop",
  "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=600&h=340&fit=crop",
  "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=600&h=340&fit=crop",
  "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&h=340&fit=crop",
  "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=600&h=340&fit=crop",
];

/* ── Mock data ── */
const mockData = [
  { tournament: { id: 1, name: "Baltic Cup 2026", slug: "baltic-cup-2026", year: 2026, registrationOpen: true, startDate: "2026-06-15", endDate: "2026-06-20", logoUrl: null, organizationId: 1, description: null, registrationDeadline: null, currency: "EUR", createdAt: new Date(), updatedAt: new Date() }, org: { name: "Tallinn Football Academy", slug: "tfa", logo: null, city: "Tallinn", country: "Estonia", brandColor: "#059669" }, classes: [{ id: 1, name: "U10", tournamentId: 1 }, { id: 2, name: "U12", tournamentId: 1 }, { id: 3, name: "U14", tournamentId: 1 }, { id: 4, name: "U16", tournamentId: 1 }], teamCount: 48, clubCount: 24 },
  { tournament: { id: 2, name: "Helsinki Youth Festival", slug: "helsinki-youth-2026", year: 2026, registrationOpen: true, startDate: "2026-07-10", endDate: "2026-07-14", logoUrl: null, organizationId: 2, description: null, registrationDeadline: null, currency: "EUR", createdAt: new Date(), updatedAt: new Date() }, org: { name: "Nordic Sports Events", slug: "nse", logo: null, city: "Helsinki", country: "Finland", brandColor: "#6366F1" }, classes: [{ id: 5, name: "U8", tournamentId: 2 }, { id: 6, name: "U10", tournamentId: 2 }, { id: 7, name: "U12", tournamentId: 2 }], teamCount: 64, clubCount: 32 },
  { tournament: { id: 3, name: "Riga International Cup", slug: "riga-cup-2026", year: 2026, registrationOpen: false, startDate: "2026-05-01", endDate: "2026-05-04", logoUrl: null, organizationId: 3, description: null, registrationDeadline: null, currency: "EUR", createdAt: new Date(), updatedAt: new Date() }, org: { name: "Latvia Youth Football", slug: "lyf", logo: null, city: "Riga", country: "Latvia", brandColor: "#D97706" }, classes: [{ id: 8, name: "U11", tournamentId: 3 }, { id: 9, name: "U13", tournamentId: 3 }, { id: 10, name: "U15", tournamentId: 3 }, { id: 11, name: "U17", tournamentId: 3 }, { id: 12, name: "U19", tournamentId: 3 }], teamCount: 80, clubCount: 40 },
  { tournament: { id: 4, name: "Stockholm Spring Trophy", slug: "stockholm-spring-2026", year: 2026, registrationOpen: true, startDate: "2026-04-20", endDate: "2026-04-23", logoUrl: null, organizationId: 4, description: null, registrationDeadline: null, currency: "SEK", createdAt: new Date(), updatedAt: new Date() }, org: { name: "Swedish Football Events", slug: "sfe", logo: null, city: "Stockholm", country: "Sweden", brandColor: "#DB2777" }, classes: [{ id: 13, name: "U9", tournamentId: 4 }, { id: 14, name: "U11", tournamentId: 4 }], teamCount: 36, clubCount: 18 },
  { tournament: { id: 5, name: "Warsaw Champions League", slug: "warsaw-champions-2026", year: 2026, registrationOpen: true, startDate: "2026-08-05", endDate: "2026-08-10", logoUrl: null, organizationId: 5, description: null, registrationDeadline: null, currency: "PLN", createdAt: new Date(), updatedAt: new Date() }, org: { name: "Polish Football Association", slug: "pfa", logo: null, city: "Warsaw", country: "Poland", brandColor: "#DC2626" }, classes: [{ id: 15, name: "U12", tournamentId: 5 }, { id: 16, name: "U14", tournamentId: 5 }, { id: 17, name: "U16", tournamentId: 5 }], teamCount: 56, clubCount: 28 },
  { tournament: { id: 6, name: "Copenhagen Elite Cup", slug: "copenhagen-elite-2026", year: 2026, registrationOpen: false, startDate: "2026-03-15", endDate: "2026-03-18", logoUrl: null, organizationId: 6, description: null, registrationDeadline: null, currency: "DKK", createdAt: new Date(), updatedAt: new Date() }, org: { name: "Danish Youth Sports", slug: "dys", logo: null, city: "Copenhagen", country: "Denmark", brandColor: "#0891B2" }, classes: [{ id: 18, name: "U13", tournamentId: 6 }, { id: 19, name: "U15", tournamentId: 6 }], teamCount: 32, clubCount: 16 },
  { tournament: { id: 7, name: "Vilnius Summer Classic", slug: "vilnius-summer-2026", year: 2026, registrationOpen: true, startDate: "2026-07-25", endDate: "2026-07-29", logoUrl: null, organizationId: 7, description: null, registrationDeadline: null, currency: "EUR", createdAt: new Date(), updatedAt: new Date() }, org: { name: "Lithuanian FA Events", slug: "lfa", logo: null, city: "Vilnius", country: "Lithuania", brandColor: "#059669" }, classes: [{ id: 20, name: "U10", tournamentId: 7 }, { id: 21, name: "U12", tournamentId: 7 }, { id: 22, name: "U14", tournamentId: 7 }, { id: 23, name: "U16", tournamentId: 7 }], teamCount: 44, clubCount: 22 },
  { tournament: { id: 8, name: "Berlin Winter Indoor Cup", slug: "berlin-winter-2026", year: 2026, registrationOpen: true, startDate: "2026-12-10", endDate: "2026-12-12", logoUrl: null, organizationId: 8, description: null, registrationDeadline: null, currency: "EUR", createdAt: new Date(), updatedAt: new Date() }, org: { name: "German Youth Football", slug: "gyf", logo: null, city: "Berlin", country: "Germany", brandColor: "#7C3AED" }, classes: [{ id: 24, name: "U8", tournamentId: 8 }, { id: 25, name: "U10", tournamentId: 8 }, { id: 26, name: "U12", tournamentId: 8 }], teamCount: 40, clubCount: 20 },
];

/* ── DB fetch ── */
async function getEnrichedTournaments() {
  try {
    const all = await db.query.tournaments.findMany({ orderBy: (t, { desc }) => [desc(t.startDate)] });
    return await Promise.all(all.map(async (tournament) => {
      const org = await db.query.organizations.findFirst({ where: eq(organizations.id, tournament.organizationId) });
      const cls = await db.query.tournamentClasses.findMany({ where: eq(tournamentClasses.tournamentId, tournament.id) });
      const [tc] = await db.select({ count: count() }).from(teams).where(eq(teams.tournamentId, tournament.id));
      const [cc] = await db.select({ count: count() }).from(clubs).where(eq(clubs.tournamentId, tournament.id));
      return { tournament, org, classes: cls, teamCount: Number(tc?.count ?? 0), clubCount: Number(cc?.count ?? 0) };
    }));
  } catch { return null; }
}

/* ══════════════════════════════════════════════════ */

export default async function CatalogPage() {
  const dbData = await getEnrichedTournaments();
  const enriched = dbData ?? mockData;

  const totalTeams = enriched.reduce((s, e) => s + e.teamCount, 0);
  const totalClubs = enriched.reduce((s, e) => s + e.clubCount, 0);
  const totalClasses = enriched.reduce((s, e) => s + e.classes.length, 0);

  return (
    <ThemeProvider>
      <div className="min-h-screen transition-colors duration-300" style={{ background: "var(--cat-bg)" }}>

        {/* ═══════ Header ═══════ */}
        <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: "var(--cat-header-bg)", borderColor: "var(--cat-header-border)" }}>
          <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Goality" className="w-9 h-9 rounded-xl object-contain" style={{ boxShadow: "0 4px 14px var(--cat-accent-glow)" }} />
              <span className="font-bold text-[15px] tracking-tight" style={{ color: "var(--cat-text)" }}>Goality</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/catalog" className="text-[13px] font-medium relative" style={{ color: "var(--cat-text)" }}>
                Tournaments
                <span className="absolute bottom-[-18px] left-0 right-0 h-[2px] rounded-full" style={{ background: "var(--cat-accent)" }} />
              </Link>
              <Link href="#" className="text-[13px] font-medium hover:opacity-80 transition-opacity" style={{ color: "var(--cat-text-secondary)" }}>About</Link>
              <Link href="#" className="text-[13px] font-medium hover:opacity-80 transition-opacity" style={{ color: "var(--cat-text-secondary)" }}>For organizers</Link>
            </nav>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/login" className="text-[13px] font-medium hover:opacity-80 transition-opacity" style={{ color: "var(--cat-text-muted)" }}>Sign in</Link>
              <Link href="/onboarding" className="cat-cta-glow text-[13px] font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))", color: "var(--cat-accent-text)" }}>
                Get started
              </Link>
            </div>
          </div>
        </header>

        {/* ═══════ Hero ═══════ */}
        <section className="relative overflow-hidden cat-hero-decor">
          {/* Glow orbs */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[120px] pointer-events-none" style={{ background: "var(--cat-glow)" }} />
          <div className="absolute top-20 right-[15%] w-[200px] h-[200px] rounded-full blur-[80px] pointer-events-none" style={{ background: "rgba(139, 92, 246, 0.04)" }} />

          {/* Floating decorative icons */}
          <div className="absolute top-[20%] left-[5%] cat-float-1 pointer-events-none opacity-[0.08]" style={{ color: "var(--cat-accent)" }}>
            <Trophy className="w-8 h-8" />
          </div>
          <div className="absolute top-[50%] right-[8%] cat-float-2 pointer-events-none opacity-[0.06]" style={{ color: "var(--cat-accent)" }}>
            <Award className="w-6 h-6" />
          </div>
          <div className="absolute bottom-[20%] left-[15%] cat-float-3 pointer-events-none opacity-[0.05]" style={{ color: "var(--cat-accent)" }}>
            <Activity className="w-5 h-5" />
          </div>

          <div className="relative max-w-[1400px] mx-auto px-6 pt-16 pb-12">
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 border" style={{ background: "var(--cat-pill-active-bg)", borderColor: "var(--cat-pill-active-border)" }}>
                <Flame className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
                <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--cat-pill-active-text)" }}>Football Events</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4 tracking-tight" style={{ color: "var(--cat-text)" }}>
                Discover{" "}
                <span className="cat-gradient-text bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg, var(--cat-accent), #38BDF8, var(--cat-accent-dark), var(--cat-accent))", backgroundSize: "200% 200%" }}>
                  Tournaments
                </span>
              </h1>
              <p className="text-base max-w-md mx-auto leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>
                Browse youth football tournaments across Europe. View details, compare events, and register your club.
              </p>
            </div>

            {/* Search */}
            <div className="max-w-xl mx-auto mt-10">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5" style={{ color: "var(--cat-text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search tournaments, cities, countries..."
                  className="cat-search w-full rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:outline-none transition-all"
                  style={{ background: "var(--cat-input-bg)", border: "1px solid var(--cat-input-border)", color: "var(--cat-text)", boxShadow: "var(--cat-shadow)" }}
                />
              </div>
            </div>

            {/* Filter pills with icons */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {[
                { label: "All", icon: Filter },
                { label: "Upcoming", icon: Clock },
                { label: "Open", icon: Zap },
                { label: "Europe", icon: Globe },
                { label: "Indoor", icon: Shield },
              ].map((f, i) => (
                <button key={f.label} className="text-[12px] font-medium px-4 py-1.5 rounded-full border transition-all inline-flex items-center gap-1.5" style={i === 0 ? { background: "var(--cat-pill-active-bg)", borderColor: "var(--cat-pill-active-border)", color: "var(--cat-pill-active-text)" } : { background: "var(--cat-pill-bg)", borderColor: "var(--cat-pill-border)", color: "var(--cat-pill-text)" }}>
                  <f.icon className="w-3 h-3" />
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ Content ═══════ */}
        <div className="max-w-[1400px] mx-auto px-6 pb-16">

          {/* Stats strip */}
          <div className="flex items-center justify-center gap-10 mb-12">
            {[
              { n: enriched.length, l: "Tournaments", icon: Trophy },
              { n: totalTeams, l: "Teams", icon: Users },
              { n: totalClubs, l: "Clubs", icon: Flag },
              { n: totalClasses, l: "Age groups", icon: Award },
            ].map((s) => (
              <div key={s.l} className="text-center cat-stat">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <s.icon className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
                  <p className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>{s.n}</p>
                </div>
                <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{s.l}</p>
              </div>
            ))}
          </div>

          <div className="space-y-8">
            {/* ═══════ Cards grid ═══════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {enriched.map(({ tournament: t, org, classes, teamCount, clubCount }, idx) => {
                const brand = org?.brandColor ?? "#059669";
                const href = org?.slug ? `/t/${org.slug}/${t.slug}` : `/club/register?tournamentId=${t.id}`;
                const img = t.logoUrl || eventImages[idx % eventImages.length];
                const days = daysUntil(t.startDate);
                const isPopular = teamCount > 50;
                const initials = (org?.name ?? "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

                return (
                  <Link key={t.id} href={href} className="group relative rounded-2xl overflow-hidden cat-card" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}>
                    {/* Brand glow on hover */}
                    <div className="cat-card-glow" style={{ background: `radial-gradient(ellipse at 50% 0%, ${brand}15, transparent 70%)` }} />

                    {/* Image */}
                    <div className="relative h-40 overflow-hidden z-[1]">
                      <img src={img} alt={t.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      {/* Brand-tinted gradient overlay */}
                      <div className="absolute inset-0" style={{ background: `linear-gradient(to top, var(--cat-overlay-from), ${brand}20, transparent)` }} />

                      {/* Top-left badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        {isPopular && (
                          <span className="cat-hot-badge inline-flex items-center gap-1 text-[9px] font-bold backdrop-blur-md rounded-full px-2 py-0.5 border">
                            <TrendingUp className="w-2.5 h-2.5" />
                            Popular
                          </span>
                        )}
                        {days && days <= 30 && (
                          <span className="cat-countdown inline-flex items-center gap-1 text-[9px] font-bold backdrop-blur-md rounded-full px-2 py-0.5 border border-white/20 bg-black/30 text-white/80">
                            <Clock className="w-2.5 h-2.5" />
                            {days}d
                          </span>
                        )}
                      </div>

                      {/* Top-right status */}
                      <div className="absolute top-3 right-3">
                        {t.registrationOpen ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold backdrop-blur-md rounded-full px-2.5 py-1" style={{ background: "var(--cat-badge-open-bg)", border: "1px solid var(--cat-badge-open-border)", color: "var(--cat-badge-open-text)" }}>
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--cat-badge-open-dot)" }} />
                            Open
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold backdrop-blur-md rounded-full px-2.5 py-1" style={{ background: "var(--cat-badge-closed-bg)", border: "1px solid var(--cat-badge-closed-border)", color: "var(--cat-badge-closed-text)" }}>Closed</span>
                        )}
                      </div>

                      {/* Org avatar with ring glow */}
                      <div className="absolute bottom-3 left-4">
                        <div className="cat-org-ring w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20 overflow-hidden" style={{ "--ring-color": brand, backgroundColor: brand + "25" } as React.CSSProperties}>
                          {org?.logo ? (
                            <img src={org.logo} alt={org.name ?? ""} className="w-full h-full object-contain p-1" />
                          ) : (
                            <span className="text-[11px] font-bold text-white/90">{initials}</span>
                          )}
                        </div>
                      </div>

                      {/* Country flag circle */}
                      <div className="absolute bottom-3 right-4">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 bg-black/25 text-sm leading-none">
                          {getFlag(org?.country)}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="relative p-4 z-[1]">
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 truncate" style={{ color: "var(--cat-text-muted)" }}>{org?.name}</p>
                      <h3 className="text-[14px] font-bold leading-snug mb-3 line-clamp-2 transition-colors" style={{ color: "var(--cat-text)" }}>{t.name}</h3>

                      <div className="space-y-2 mb-4">
                        {(t.startDate || t.endDate) && (
                          <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--cat-text-secondary)" }}>
                            <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-icon-accent)" }} />
                            <span>
                              {formatDateShort(t.startDate)}{t.endDate ? ` — ${formatDateShort(t.endDate)}` : ""}
                              {t.startDate && <span className="ml-1" style={{ color: "var(--cat-text-faint)" }}>{new Date(t.startDate).getFullYear()}</span>}
                            </span>
                          </div>
                        )}
                        {org?.city && (
                          <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--cat-text-secondary)" }}>
                            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-icon-accent)" }} />
                            <span className="flex items-center gap-1.5">
                              <span className="text-[13px] leading-none">{getFlag(org.country)}</span>
                              {org.city}{org.country ? `, ${org.country}` : ""}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Age classes with colors */}
                      {classes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {classes.slice(0, 4).map((c) => (
                            <span key={c.id} className={`cat-age-tag text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getAgeTagClass(c.name)}`} style={!getAgeTagClass(c.name) ? { background: "var(--cat-tag-bg)", borderColor: "var(--cat-tag-border)", color: "var(--cat-tag-text)" } : undefined}>
                              {c.name}
                            </span>
                          ))}
                          {classes.length > 4 && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)", color: "var(--cat-text-muted)" }}>+{classes.length - 4}</span>
                          )}
                        </div>
                      )}

                      {/* Bottom stats */}
                      <div className="flex items-center gap-4 pt-3" style={{ borderTop: "1px solid var(--cat-divider)" }}>
                        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                          <Users className="w-3 h-3" />
                          <span><span className="font-semibold" style={{ color: "var(--cat-stat-value)" }}>{teamCount}</span> teams</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                          <Flag className="w-3 h-3" />
                          <span><span className="font-semibold" style={{ color: "var(--cat-stat-value)" }}>{clubCount}</span> clubs</span>
                        </div>
                        <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-all" style={{ color: "var(--cat-text-faint)" }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* ═══════ Banner ═══════ */}
            <div className="cat-banner rounded-2xl p-8 md:p-10 border" style={{ background: `linear-gradient(90deg, var(--cat-banner-from), var(--cat-banner-via), var(--cat-banner-to))`, borderColor: "var(--cat-card-border)" }}>
              <div className="relative flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-3 border" style={{ background: "var(--cat-pill-active-bg)", borderColor: "var(--cat-pill-active-border)" }}>
                    <Star className="w-3 h-3" style={{ color: "var(--cat-accent)" }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cat-pill-active-text)" }}>Featured</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2" style={{ color: "var(--cat-text)" }}>Host your own tournament</h3>
                  <p className="text-sm max-w-md" style={{ color: "var(--cat-text-secondary)" }}>
                    Create and manage professional football tournaments with Goality TMC. Registration, teams, payments — all in one place.
                  </p>
                </div>
                <Link href="/onboarding" className="cat-cta-glow shrink-0 inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl hover:opacity-90 transition-opacity" style={{ background: `linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))`, color: "var(--cat-accent-text)" }}>
                  <Sparkles className="w-4 h-4" /> Start free <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* ═══════ Feature cards ═══════ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { icon: Shield, title: "Verified organizers", desc: "All tournaments hosted by trusted organizations", color: "#059669" },
                { icon: Globe, title: "International events", desc: "Connect with clubs from across Europe and beyond", color: "#6366F1" },
                { icon: Trophy, title: "All age groups", desc: "From U8 to U19 — find the right competition level", color: "#D97706" },
              ].map((item) => (
                <div key={item.title} className="cat-feature rounded-2xl p-6 text-center border" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}>
                  <div className="cat-feature-icon w-11 h-11 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: item.color + "15" }}>
                    <item.icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <h4 className="text-[13px] font-bold mb-1" style={{ color: "var(--cat-text)" }}>{item.title}</h4>
                  <p className="text-[12px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════ Footer ═══════ */}
        <footer className="cat-footer" style={{ background: "var(--cat-card-bg)" }}>
          <div className="max-w-[1400px] mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, var(--cat-accent), var(--cat-accent-dark))` }}>
                  <Trophy className="w-3 h-3" style={{ color: "var(--cat-accent-text)" }} />
                </div>
                <span className="text-[13px] font-semibold" style={{ color: "var(--cat-text-secondary)" }}>Goality Sport Group</span>
              </div>
              <div className="flex items-center gap-6">
                {["Privacy", "Terms", "Contact"].map((l) => (
                  <Link key={l} href="#" className="text-[12px] hover:opacity-70 transition-opacity" style={{ color: "var(--cat-text-muted)" }}>{l}</Link>
                ))}
              </div>
              <p className="text-[11px]" style={{ color: "var(--cat-text-faint)" }}>© {new Date().getFullYear()} Goality TMC</p>
            </div>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}
