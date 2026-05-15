"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { PublicNavHeader } from "@/components/ui/public-nav-header";
import {
  MapPin, Globe, Trophy, ExternalLink,
  CheckCircle, ArrowRight, Users, Calendar, Shield,
} from "lucide-react";

type Registration = {
  teamId: number;
  teamName: string | null;
  tournamentId: number;
  tournamentName: string;
  tournamentSlug: string;
  tournamentYear: number;
  orgSlug: string;
};

type ClubData = {
  id: number;
  name: string;
  slug: string | null;
  city: string | null;
  country: string | null;
  badgeUrl: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  isVerified: boolean;
  registrations: Registration[];
};

const ACCENT = "#2BFEBA";

const countryFlags: Record<string, string> = {
  Estonia: "🇪🇪", Finland: "🇫🇮", Latvia: "🇱🇻", Sweden: "🇸🇪", Poland: "🇵🇱",
  Denmark: "🇩🇰", Lithuania: "🇱🇹", Germany: "🇩🇪", Spain: "🇪🇸", France: "🇫🇷",
  Italy: "🇮🇹", Netherlands: "🇳🇱", Portugal: "🇵🇹", Norway: "🇳🇴", Russia: "🇷🇺",
};

export default function ClubPublicPage() {
  const { clubSlug } = useParams<{ clubSlug: string }>();
  const [club, setClub] = useState<ClubData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/clubs/by-slug?slug=${encodeURIComponent(clubSlug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setClub(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [clubSlug]);

  const byTournament = club?.registrations.reduce<Record<string, {
    name: string; slug: string; orgSlug: string; year: number; teams: string[];
  }>>((acc, r) => {
    const key = String(r.tournamentId);
    if (!acc[key]) acc[key] = { name: r.tournamentName, slug: r.tournamentSlug, orgSlug: r.orgSlug, year: r.tournamentYear, teams: [] };
    const label = r.teamName ?? r.tournamentName;
    if (!acc[key].teams.includes(label)) acc[key].teams.push(label);
    return acc;
  }, {}) ?? {};

  const tournaments = Object.values(byTournament).sort((a, b) => b.year - a.year);

  const initials = club ? club.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "";
  const flag = club?.country ? (countryFlags[club.country] ?? "") : "";

  return (
    <div className="min-h-screen" style={{ background: "var(--cat-bg)" }}>
      <PublicNavHeader />

      {/* ── Cover strip — same as tournament layout ── */}
      <div className="relative w-full overflow-hidden" style={{ height: "280px" }}>
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #0B1320 0%, #0A1A14 50%, #0B1320 100%)" }} />
        {/* bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{ height: "85%", background: "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.75) 35%, rgba(0,0,0,0.3) 65%, transparent 100%)" }} />
        {/* brand glow */}
        <div className="absolute inset-x-0 top-0 h-32 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 80% 120% at 50% -10%, ${ACCENT}25 0%, transparent 70%)` }} />
      </div>

      {/* ── Content overlaps cover — exact same as layout.tsx ── */}
      <div className="w-full md:w-[90%] md:max-w-[1400px] mx-auto relative z-10 px-4 md:px-0" style={{ marginTop: "-116px" }}>

        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: ACCENT }} />
          </div>
        )}

        {!loading && !club && (
          <div className="rounded-2xl border p-16 text-center"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: "var(--cat-text-muted)" }} />
            <p className="text-xl font-black mb-2" style={{ color: "var(--cat-text)" }}>Club not found</p>
            <p className="text-sm mb-6" style={{ color: "var(--cat-text-muted)" }}>This page doesn&apos;t exist yet.</p>
            <Link href="/catalog" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black"
              style={{ background: ACCENT, color: "#000" }}>Browse tournaments</Link>
          </div>
        )}

        {club && (
          <div className="hidden md:flex gap-8 items-start">

            {/* ── SIDEBAR — copied from TournamentSidebar ── */}
            <aside className="w-64 shrink-0">
              <div className="sticky top-4 space-y-3">

                <div className="rounded-2xl border overflow-hidden"
                  style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)" }}>

                  {/* Logo hero */}
                  <div className="relative p-5 flex flex-col items-center text-center"
                    style={{ borderBottom: "1px solid var(--cat-divider)" }}>
                    <div className="absolute inset-x-0 top-0 h-20 pointer-events-none"
                      style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(43,254,186,0.15), transparent 70%)" }} />

                    <div className="relative mb-3">
                      {club.badgeUrl ? (
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 shadow-xl"
                          style={{ borderColor: "rgba(43,254,186,0.4)", boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(43,254,186,0.1)" }}>
                          <img src={club.badgeUrl} alt={club.name} className="w-full h-full object-contain"
                            style={{ background: "linear-gradient(135deg, #0B1320, #0D1F12)" }} />
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-black shadow-xl"
                          style={{ background: "linear-gradient(135deg, rgba(43,254,186,0.2), rgba(43,254,186,0.08))", border: "2px solid rgba(43,254,186,0.4)", color: ACCENT }}>
                          {initials}
                        </div>
                      )}
                      {club.isVerified && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                          style={{ background: "var(--cat-bg)", borderColor: ACCENT }}>
                          <CheckCircle className="w-3 h-3" style={{ color: ACCENT }} />
                        </div>
                      )}
                    </div>

                    <p className="text-[15px] font-black leading-snug" style={{ color: "var(--cat-text)" }}>{club.name}</p>

                    {(club.city || club.country) && (
                      <p className="flex items-center justify-center gap-1 text-[11px] mt-1" style={{ color: "var(--cat-text-muted)" }}>
                        <MapPin className="w-3 h-3 shrink-0" style={{ color: ACCENT }} />
                        {flag && <span>{flag}</span>}
                        {[club.city, club.country].filter(Boolean).join(", ")}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3 pt-3 w-full justify-center" style={{ borderTop: "1px solid var(--cat-divider)" }}>
                      <div className="text-center">
                        <p className="text-xl font-black" style={{ color: "var(--cat-accent)" }}>{tournaments.length}</p>
                        <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-faint)" }}>Tournaments</p>
                      </div>
                      <div className="w-px h-8" style={{ background: "var(--cat-divider)" }} />
                      <div className="text-center">
                        <p className="text-xl font-black" style={{ color: "var(--cat-text)" }}>{club.registrations.length}</p>
                        <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-faint)" }}>Teams</p>
                      </div>
                    </div>
                  </div>

                  {/* Links */}
                  {(club.website || club.instagram || club.facebook) && (
                    <div className="p-3 space-y-1" style={{ borderBottom: "1px solid var(--cat-divider)" }}>
                      {club.website && (
                        <a href={club.website.startsWith("http") ? club.website : `https://${club.website}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-all hover:opacity-75"
                          style={{ color: "var(--cat-text-secondary)" }}>
                          <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: ACCENT }} />
                          {club.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      )}
                      {club.instagram && (
                        <a href={`https://instagram.com/${club.instagram.replace(/^@/, "")}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-all hover:opacity-75"
                          style={{ color: "var(--cat-text-secondary)" }}>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" style={{ color: "#E1306C" }} />
                          @{club.instagram.replace(/^@/, "")}
                        </a>
                      )}
                      {club.facebook && (
                        <a href={club.facebook.startsWith("http") ? club.facebook : `https://facebook.com/${club.facebook}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-all hover:opacity-75"
                          style={{ color: "var(--cat-text-secondary)" }}>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" style={{ color: "#1877F2" }} />
                          Facebook
                        </a>
                      )}
                    </div>
                  )}

                  {/* Back */}
                  <div className="p-3">
                    <Link href="/catalog"
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-[12px] font-semibold transition-opacity hover:opacity-75"
                      style={{ color: "var(--cat-text-muted)" }}>
                      ← All tournaments
                    </Link>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 py-1 opacity-30">
                  <Trophy className="w-3 h-3" style={{ color: "var(--cat-text-faint)" }} />
                  <span className="text-[10px]" style={{ color: "var(--cat-text-faint)" }}>Powered by Goality</span>
                </div>
              </div>
            </aside>

            {/* ── MAIN content ── */}
            <main className="flex-1 min-w-0 space-y-4" style={{ paddingTop: "52px" }}>

              {tournaments.length === 0 ? (
                <div className="rounded-2xl border p-12 text-center"
                  style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                  <Trophy className="w-8 h-8 mx-auto mb-3 opacity-20" style={{ color: "var(--cat-text-muted)" }} />
                  <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>No tournaments yet</p>
                </div>
              ) : (
                <div className="rounded-2xl border overflow-hidden"
                  style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                  <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid var(--cat-divider)" }}>
                    <Shield className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                    <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--cat-text-muted)" }}>
                      Tournaments · {tournaments.length}
                    </p>
                  </div>
                  <div className="divide-y" style={{ borderColor: "var(--cat-divider)" }}>
                    {tournaments.map(t => (
                      <Link key={t.slug} href={`/t/${t.orgSlug}/${t.slug}`}
                        className="flex items-center justify-between px-5 py-4 group transition-all"
                        style={{ color: "inherit" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--cat-tag-bg)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                            style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}25` }}>
                            <Calendar className="w-4 h-4" style={{ color: ACCENT }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate" style={{ color: "var(--cat-text)" }}>{t.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Users className="w-3 h-3 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
                              <p className="text-xs truncate" style={{ color: "var(--cat-text-muted)" }}>
                                {t.teams.join(" · ")}
                              </p>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 shrink-0 ml-4 opacity-30 group-hover:opacity-100 transition-opacity"
                          style={{ color: ACCENT }} />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </main>
          </div>
        )}

        {/* ── MOBILE ── */}
        {club && (
          <div className="md:hidden space-y-4 pb-12" style={{ paddingTop: "52px" }}>
            <div className="rounded-2xl border overflow-hidden"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(16px)", borderColor: `${ACCENT}40` }}>
              <div className="p-4 flex items-center gap-3">
                {club.badgeUrl ? (
                  <img src={club.badgeUrl} alt={club.name} className="w-12 h-12 rounded-xl object-contain"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT}20` }} />
                ) : (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                    style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}30` }}>{initials}</div>
                )}
                <div className="min-w-0">
                  <p className="text-base font-black truncate text-white">{club.name}</p>
                  {(club.city || club.country) && (
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{[club.city, club.country].filter(Boolean).join(", ")}</p>
                  )}
                </div>
              </div>
              <div className="flex border-t" style={{ borderColor: `${ACCENT}20` }}>
                <div className="flex-1 p-3 text-center border-r" style={{ borderColor: `${ACCENT}20` }}>
                  <p className="text-lg font-black" style={{ color: ACCENT }}>{tournaments.length}</p>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Tournaments</p>
                </div>
                <div className="flex-1 p-3 text-center">
                  <p className="text-lg font-black text-white">{club.registrations.length}</p>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Teams</p>
                </div>
              </div>
            </div>

            {tournaments.map(t => (
              <Link key={t.slug} href={`/t/${t.orgSlug}/${t.slug}`}
                className="flex items-center justify-between px-4 py-3.5 rounded-2xl border"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "var(--cat-text)" }}>{t.name}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--cat-text-muted)" }}>{t.teams.join(" · ")}</p>
                </div>
                <ArrowRight className="w-4 h-4 shrink-0 ml-3" style={{ color: ACCENT }} />
              </Link>
            ))}
          </div>
        )}

      </div>

      <footer className="border-t mt-12" style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
        <div className="w-[90%] max-w-[1400px] mx-auto py-4 flex items-center justify-between text-xs" style={{ color: "var(--cat-text-muted)" }}>
          <span>{club?.name}</span>
          <a href="/catalog" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="" className="w-4 h-4 rounded" /> Goality TMC
          </a>
        </div>
      </footer>
    </div>
  );
}
