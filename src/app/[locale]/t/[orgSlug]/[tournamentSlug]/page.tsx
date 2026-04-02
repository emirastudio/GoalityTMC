"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ThemeProvider, ThemeToggle } from "@/components/ui/theme-provider";
import {
  Calendar, MapPin, Users, Trophy, ArrowRight, Globe,
  CheckCircle, Clock, ChevronRight, Mail, Phone, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TournamentData = {
  org: { name: string; slug: string; logo: string | null; brandColor: string; city: string | null; country: string | null; contactEmail: string | null; website: string | null };
  tournament: { id: number; name: string; slug: string; year: number; description: string | null; logoUrl: string | null; registrationOpen: boolean; registrationDeadline: string | null; startDate: string | null; endDate: string | null; currency: string };
  classes: { id: number; name: string; format: string | null; minBirthYear: number | null; maxBirthYear: number | null; maxPlayers: number | null; teamCount: number }[];
  stats: { clubCount: number; teamCount: number; classCount: number; days: number | null };
};

function fmt(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function fmtShort(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

type Tab = "overview" | "classes" | "teams";

export default function TournamentPublicPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const tournamentSlug = params.tournamentSlug as string;
  const [data, setData] = useState<TournamentData | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/public/t/${orgSlug}/${tournamentSlug}`)
      .then(r => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then(d => d && setData(d));
  }, [orgSlug, tournamentSlug]);

  if (notFound) return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center">
      <div className="text-center">
        <Trophy className="w-12 h-12 text-border mx-auto mb-3" />
        <h1 className="text-lg font-bold text-text-primary mb-1">Tournament not found</h1>
        <Link href="/catalog" className="text-sm text-navy hover:underline">← Back to catalog</Link>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-mint border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { org, tournament: t, classes, stats } = data;
  const brand = org.brandColor || "#272D2D";

  return (
    <ThemeProvider defaultTheme="light">
    <div className="min-h-screen" style={{ background: "var(--cat-bg)" }}>

      {/* ── Navbar ──────────────────────────────────────── */}
      <header className="sticky top-0 z-30" style={{ background: "var(--cat-header-bg)", borderBottom: "1px solid var(--cat-header-border)" }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {org.logo ? (
              <img src={org.logo} alt={org.name} className="h-7 w-auto object-contain shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: brand }}>
                <span className="text-[10px] font-bold text-white">
                  {org.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                </span>
              </div>
            )}
            <span className="font-semibold text-[13px] text-text-primary truncate hidden sm:block">{t.name}</span>
          </div>

          {/* Nav tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {(["overview", "classes", "teams"] as Tab[]).map(key => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors capitalize",
                  tab === key ? "bg-[#F0F2F5] text-text-primary" : "text-text-secondary hover:text-text-primary"
                )}
              >
                {key === "overview" ? "Overview" : key === "classes" ? "Classes" : "Teams"}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            {t.registrationOpen && (
              <Link
                href={`/t/${orgSlug}/${tournamentSlug}/register`}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white px-4 py-2 rounded-xl transition-opacity hover:opacity-90"
                style={{ backgroundColor: brand }}
              >
                Register <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero banner ─────────────────────────────────── */}
      <div className="py-10 md:py-14" style={{ backgroundColor: brand }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Left: logo + title */}
            <div className="flex items-center gap-4">
              {t.logoUrl ? (
                <img src={t.logoUrl} alt={t.name} className="w-16 h-16 rounded-2xl object-contain bg-white/10 p-1" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                  <Trophy className="w-8 h-8 text-white/80" />
                </div>
              )}
              <div>
                <p className="text-white/60 text-[11px] font-semibold uppercase tracking-widest mb-1">{org.name}</p>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{t.name}</h1>
                <div className="flex items-center gap-3 mt-1.5">
                  {org.city && (
                    <span className="flex items-center gap-1 text-white/60 text-[12px]">
                      <MapPin className="w-3 h-3" /> {org.city}
                    </span>
                  )}
                  {t.startDate && (
                    <span className="flex items-center gap-1 text-white/60 text-[12px]">
                      <Calendar className="w-3 h-3" />
                      {fmtShort(t.startDate)}{t.endDate ? ` – ${fmtShort(t.endDate)}` : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: stats */}
            <div className="md:ml-auto flex items-center gap-5 md:gap-8">
              {[
                { value: stats.teamCount, label: "Teams" },
                { value: stats.classCount, label: "Classes" },
                { value: stats.days ?? "—", label: "Days" },
                { value: stats.clubCount, label: "Clubs" },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-[11px] text-white/50 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating card ───────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 -mt-5">
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}>

          {/* Mobile tabs */}
          <div className="flex md:hidden" style={{ borderBottom: "1px solid var(--cat-divider)" }}>
            {(["overview", "classes", "teams"] as Tab[]).map(key => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex-1 py-3 text-[12px] font-semibold transition-colors capitalize",
                  tab === key ? "border-b-2" : "opacity-50"
                )}
                style={{
                  color: tab === key ? "var(--cat-text)" : "var(--cat-text-secondary)",
                  borderColor: tab === key ? "var(--cat-accent)" : "transparent",
                }}
              >
                {key === "overview" ? "Info" : key === "classes" ? "Classes" : "Teams"}
              </button>
            ))}
          </div>

          <div className="p-5 md:p-6">
            {/* ── OVERVIEW tab ── */}
            {tab === "overview" && (
              <div className="space-y-6">
                {/* Registration status */}
                <div className="rounded-xl p-4 flex items-center justify-between gap-4" style={t.registrationOpen
                  ? { background: "var(--cat-badge-open-bg)", border: "1px solid var(--cat-badge-open-border)" }
                  : { background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)" }
                }>
                  <div className="flex items-center gap-3">
                    {t.registrationOpen
                      ? <CheckCircle className="w-5 h-5 shrink-0" style={{ color: "var(--cat-badge-open-text)" }} />
                      : <Clock className="w-5 h-5 shrink-0" style={{ color: "var(--cat-text-muted)" }} />}
                    <div>
                      <p className="text-sm font-semibold" style={{ color: t.registrationOpen ? "var(--cat-badge-open-text)" : "var(--cat-text)" }}>
                        {t.registrationOpen ? "Registration is open" : "Registration is closed"}
                      </p>
                      {t.registrationDeadline && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-secondary)" }}>
                          Deadline: {fmt(t.registrationDeadline)}
                        </p>
                      )}
                    </div>
                  </div>
                  {t.registrationOpen && (
                    <Link
                      href={`/t/${orgSlug}/${tournamentSlug}/register`}
                      className="shrink-0 inline-flex items-center gap-1.5 text-[13px] font-semibold text-white px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: brand }}
                    >
                      Register now <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                {/* Description */}
                {t.description && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--cat-text-muted)" }}>About</p>
                    <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--cat-text-secondary)" }}>{t.description}</p>
                  </div>
                )}

                {/* Key dates */}
                {(t.startDate || t.endDate || t.registrationDeadline) && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--cat-text-muted)" }}>Key dates</p>
                    <div className="space-y-2">
                      {t.registrationDeadline && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>Registration deadline</p>
                            <p className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>{fmt(t.registrationDeadline)}</p>
                          </div>
                        </div>
                      )}
                      {t.startDate && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                            <Calendar className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>Tournament starts</p>
                            <p className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>{fmt(t.startDate)}</p>
                          </div>
                        </div>
                      )}
                      {t.endDate && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                            <Trophy className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>Tournament ends</p>
                            <p className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>{fmt(t.endDate)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact */}
                {(org.contactEmail || org.website) && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--cat-text-muted)" }}>Contact</p>
                    <div className="space-y-2">
                      {org.contactEmail && (
                        <a href={`mailto:${org.contactEmail}`} className="flex items-center gap-2 text-sm hover:underline" style={{ color: "var(--cat-accent)" }}>
                          <Mail className="w-4 h-4 shrink-0" /> {org.contactEmail}
                        </a>
                      )}
                      {org.website && (
                        <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:underline" style={{ color: "var(--cat-accent)" }}>
                          <Globe className="w-4 h-4 shrink-0" /> {org.website}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── CLASSES tab ── */}
            {tab === "classes" && (
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--cat-text-muted)" }}>
                  {classes.length} age categories
                </p>
                {classes.map(cls => (
                  <div key={cls.id} className="cat-card flex items-center gap-4 p-4 rounded-xl" style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: brand + "18" }}>
                      <span className="text-[11px] font-bold" style={{ color: brand }}>
                        {cls.name.replace(/[^0-9U]/gi, "").slice(0, 4) || cls.name.slice(0, 3)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>{cls.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {cls.format && <span className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>{cls.format}</span>}
                        {cls.minBirthYear && cls.maxBirthYear && (
                          <span className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>{cls.maxBirthYear}–{cls.minBirthYear}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold cat-stat" style={{ color: "var(--cat-stat-value)" }}>{cls.teamCount}</p>
                      <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>teams</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── TEAMS tab ── */}
            {tab === "teams" && (
              <TeamsTab orgSlug={orgSlug} tournamentSlug={tournamentSlug} brand={brand} />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="cat-footer mt-10" style={{ background: "var(--cat-card-bg)" }}>
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between text-xs" style={{ color: "var(--cat-text-secondary)" }}>
          <span>© {new Date().getFullYear()} {org.name}</span>
          <a href="/catalog" className="flex items-center gap-1 hover:opacity-80 transition-opacity">
            <Trophy className="w-3 h-3" /> Goality TMC
          </a>
        </div>
      </footer>
    </div>
    </ThemeProvider>
  );
}

// ── Teams tab (lazy loaded) ─────────────────────────────
type TeamEntry = { id: number; regNumber: number; name: string | null; status: string; club: { name: string; badgeUrl: string | null; city: string | null; country: string | null } | null };
type GroupedClass = { id: number; name: string; format: string | null; teams: TeamEntry[] };

function TeamsTab({ orgSlug, tournamentSlug, brand }: { orgSlug: string; tournamentSlug: string; brand: string }) {
  const [grouped, setGrouped] = useState<GroupedClass[] | null>(null);

  useEffect(() => {
    fetch(`/api/public/t/${orgSlug}/${tournamentSlug}/teams`)
      .then(r => r.json())
      .then(d => setGrouped(d.grouped));
  }, [orgSlug, tournamentSlug]);

  if (!grouped) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-mint border-t-transparent rounded-full animate-spin" /></div>;

  const totalTeams = grouped.reduce((s, g) => s + g.teams.length, 0);

  if (totalTeams === 0) return (
    <div className="text-center py-10 text-text-secondary text-sm">No teams registered yet.</div>
  );

  return (
    <div className="space-y-6">
      {grouped.filter(g => g.teams.length > 0).map(cls => (
        <div key={cls.id}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1" style={{ background: "var(--cat-divider)" }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2" style={{ color: "var(--cat-text-muted)" }}>
              {cls.name} · {cls.teams.length} teams
            </span>
            <div className="h-px flex-1" style={{ background: "var(--cat-divider)" }} />
          </div>
          <div className="space-y-1.5">
            {cls.teams.map(team => (
              <div key={team.id} className="cat-card flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)" }}>
                <span className="text-[10px] font-mono w-6 shrink-0" style={{ color: "var(--cat-text-faint)" }}>#{team.regNumber}</span>
                {team.club?.badgeUrl ? (
                  <img src={team.club.badgeUrl} alt="" className="w-7 h-7 rounded-lg object-contain shrink-0" style={{ border: "1px solid var(--cat-card-border)" }} />
                ) : (
                  <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center" style={{ backgroundColor: brand + "18" }}>
                    <span className="text-[9px] font-bold" style={{ color: brand }}>
                      {team.club?.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?"}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--cat-text)" }}>{team.name ?? team.club?.name ?? "—"}</p>
                  {team.club?.city && <p className="text-[11px] truncate" style={{ color: "var(--cat-text-secondary)" }}>{team.club.city}</p>}
                </div>
                <span className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                  team.status === "confirmed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                  team.status === "open" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                  "bg-surface text-text-secondary border border-border"
                )}>
                  {team.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
