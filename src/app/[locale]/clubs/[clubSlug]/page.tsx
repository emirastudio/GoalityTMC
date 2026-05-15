"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { PublicNavHeader } from "@/components/ui/public-nav-header";
import { MapPin, Globe, Trophy, ExternalLink, CheckCircle, ArrowRight, Users, Calendar } from "lucide-react";

type Registration = {
  teamId: number;
  teamName: string | null;
  tournamentId: number;
  tournamentName: string;
  tournamentSlug: string;
  tournamentYear: number;
  orgSlug: string;
  status: string;
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

  return (
    <div className="min-h-screen" style={{ background: "var(--cat-bg)" }}>
      <PublicNavHeader />

      {/* ── Cover ── */}
      <div className="relative w-full overflow-hidden" style={{ height: "260px" }}>
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(43,254,186,0.12) 0%, rgba(43,254,186,0.03) 40%, rgba(0,0,0,0.4) 100%)" }} />
        {/* grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 40px)" }} />
        <div className="absolute inset-x-0 bottom-0"
          style={{ height: "70%", background: "linear-gradient(to top, var(--cat-bg) 0%, transparent 100%)" }} />
        <div className="absolute inset-x-0 top-0 h-32"
          style={{ background: `radial-gradient(ellipse 60% 100% at 30% -10%, ${ACCENT}18 0%, transparent 70%)` }} />
      </div>

      {/* ── Content overlaps cover ── */}
      <div className="w-full md:w-[90%] md:max-w-[1200px] mx-auto px-4 md:px-0 relative z-10" style={{ marginTop: "-120px" }}>

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
            <p className="text-sm mb-6" style={{ color: "var(--cat-text-muted)" }}>This page doesn&apos;t exist or hasn&apos;t been set up yet.</p>
            <Link href="/catalog"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: ACCENT, color: "#000" }}>
              Browse tournaments
            </Link>
          </div>
        )}

        {club && (
          <div className="flex flex-col md:flex-row gap-6 items-start pb-16">

            {/* ── LEFT: club card ── */}
            <div className="w-full md:w-72 shrink-0 space-y-3">

              {/* Badge card */}
              <div className="rounded-2xl border overflow-hidden"
                style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(16px)", borderColor: `${ACCENT}30` }}>
                <div className="p-5 flex flex-col items-center text-center">
                  {/* Logo */}
                  <div className="relative mb-4">
                    {club.badgeUrl ? (
                      <img src={club.badgeUrl} alt={club.name}
                        className="w-24 h-24 rounded-2xl object-contain"
                        style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${ACCENT}20` }} />
                    ) : (
                      <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-black"
                        style={{ background: ACCENT + "15", color: ACCENT, border: `1px solid ${ACCENT}30` }}>
                        {club.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                    )}
                    {club.isVerified && (
                      <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: "var(--cat-bg)", border: `2px solid ${ACCENT}` }}>
                        <CheckCircle className="w-4 h-4" style={{ color: ACCENT }} />
                      </div>
                    )}
                  </div>

                  <h1 className="text-xl font-black leading-tight mb-1" style={{ color: "#fff" }}>{club.name}</h1>

                  {(club.city || club.country) && (
                    <p className="flex items-center justify-center gap-1.5 text-sm"
                      style={{ color: "rgba(255,255,255,0.5)" }}>
                      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: ACCENT }} />
                      {[club.city, club.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="border-t grid grid-cols-2"
                  style={{ borderColor: `${ACCENT}15` }}>
                  <div className="p-4 text-center border-r" style={{ borderColor: `${ACCENT}15` }}>
                    <p className="text-2xl font-black" style={{ color: ACCENT }}>{tournaments.length}</p>
                    <p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Tournaments
                    </p>
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-2xl font-black text-white">{club.registrations.length}</p>
                    <p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Teams
                    </p>
                  </div>
                </div>

                {/* Links */}
                {(club.website || club.instagram || club.facebook) && (
                  <div className="border-t p-4 flex flex-col gap-2" style={{ borderColor: `${ACCENT}15` }}>
                    {club.website && (
                      <a href={club.website.startsWith("http") ? club.website : `https://${club.website}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-75"
                        style={{ background: ACCENT + "12", color: ACCENT, border: `1px solid ${ACCENT}20` }}>
                        <Globe className="w-3.5 h-3.5" /> {club.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    )}
                    {club.instagram && (
                      <a href={`https://instagram.com/${club.instagram.replace(/^@/, "")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-75"
                        style={{ background: "rgba(225,48,108,0.08)", color: "#E1306C", border: "1px solid rgba(225,48,108,0.2)" }}>
                        <ExternalLink className="w-3.5 h-3.5" /> @{club.instagram.replace(/^@/, "")}
                      </a>
                    )}
                    {club.facebook && (
                      <a href={club.facebook.startsWith("http") ? club.facebook : `https://facebook.com/${club.facebook}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-75"
                        style={{ background: "rgba(24,119,242,0.08)", color: "#1877F2", border: "1px solid rgba(24,119,242,0.2)" }}>
                        <ExternalLink className="w-3.5 h-3.5" /> Facebook
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Back link */}
              <Link href="/catalog"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-75"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)", border: "1px solid var(--cat-card-border)" }}>
                ← All tournaments
              </Link>
            </div>

            {/* ── RIGHT: tournaments ── */}
            <div className="flex-1 min-w-0 space-y-3" style={{ paddingTop: "56px" }}>

              {tournaments.length === 0 ? (
                <div className="rounded-2xl border p-10 text-center"
                  style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                  <Trophy className="w-8 h-8 mx-auto mb-3 opacity-20" style={{ color: "var(--cat-text-muted)" }} />
                  <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>No tournaments yet</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <Trophy className="w-4 h-4" style={{ color: ACCENT }} />
                    <p className="text-sm font-black uppercase tracking-widest" style={{ color: "var(--cat-text-muted)" }}>
                      Tournaments · {tournaments.length}
                    </p>
                  </div>
                  {tournaments.map(t => (
                    <Link key={t.slug} href={`/t/${t.orgSlug}/${t.slug}`}
                      className="flex items-center justify-between px-5 py-4 rounded-2xl border group transition-all hover:border-[#2bfeba30]"
                      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                          style={{ background: ACCENT + "12", border: `1px solid ${ACCENT}25` }}>
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
                </>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
