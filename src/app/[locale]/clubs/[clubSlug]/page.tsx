"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { PublicNavHeader } from "@/components/ui/public-nav-header";
import { MapPin, Globe, Trophy, ExternalLink, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";

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

  const ACCENT = "#2BFEBA";

  return (
    <div className="min-h-screen" style={{ background: "var(--cat-bg)" }}>
      <PublicNavHeader />

      {/* Cover strip */}
      <div className="relative w-full overflow-hidden" style={{ height: "180px" }}>
        <div className="absolute inset-0" style={{
          background: "linear-gradient(135deg, rgba(43,254,186,0.08) 0%, rgba(43,254,186,0.02) 50%, transparent 100%)"
        }} />
        <div className="absolute inset-x-0 bottom-0" style={{
          height: "80%",
          background: "linear-gradient(to top, var(--cat-bg) 0%, transparent 100%)"
        }} />
      </div>

      <div className="w-full md:w-[90%] md:max-w-[900px] mx-auto px-4" style={{ marginTop: "-100px" }}>
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: ACCENT }} />
          </div>
        )}

        {!loading && !club && (
          <div className="text-center py-24" style={{ color: "var(--cat-text-muted)" }}>
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-xl font-black mb-1" style={{ color: "var(--cat-text)" }}>Club not found</p>
            <p className="text-sm mb-6">This club page doesn&apos;t exist or hasn&apos;t been set up yet.</p>
            <Link href="/catalog" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: ACCENT + "15", color: ACCENT, border: `1px solid ${ACCENT}30` }}>
              <ArrowLeft className="w-4 h-4" /> Browse tournaments
            </Link>
          </div>
        )}

        {club && (
          <div className="space-y-4 pb-12">

            {/* Main card */}
            <div className="rounded-2xl border overflow-hidden"
              style={{ background: "var(--cat-card-bg)", borderColor: `${ACCENT}25` }}>

              {/* Badge + name row */}
              <div className="p-6 flex items-start gap-5">
                {/* Badge */}
                <div className="relative shrink-0">
                  {club.badgeUrl ? (
                    <img src={club.badgeUrl} alt={club.name}
                      className="w-24 h-24 rounded-2xl object-contain border"
                      style={{ borderColor: "var(--cat-card-border)", background: "rgba(255,255,255,0.04)" }} />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-2xl font-black border"
                      style={{ background: ACCENT + "12", color: ACCENT, borderColor: ACCENT + "30" }}>
                      {club.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                  )}
                  {club.isVerified && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: "var(--cat-bg)", border: `2px solid ${ACCENT}` }}>
                      <CheckCircle className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pt-1">
                  <h1 className="text-2xl font-black leading-tight" style={{ color: "var(--cat-text)" }}>
                    {club.name}
                  </h1>
                  {(club.city || club.country) && (
                    <p className="flex items-center gap-1.5 text-sm mt-1.5" style={{ color: "var(--cat-text-muted)" }}>
                      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: ACCENT }} />
                      {[club.city, club.country].filter(Boolean).join(", ")}
                    </p>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center gap-4 mt-3">
                    <div className="text-center">
                      <p className="text-lg font-black leading-none" style={{ color: ACCENT }}>{tournaments.length}</p>
                      <p className="text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
                        Tournaments
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-black leading-none" style={{ color: "var(--cat-text)" }}>
                        {club.registrations.length}
                      </p>
                      <p className="text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
                        Teams
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Links bar */}
              {(club.website || club.instagram || club.facebook) && (
                <div className="px-6 pb-5 flex items-center gap-2 flex-wrap">
                  {club.website && (
                    <a href={club.website.startsWith("http") ? club.website : `https://${club.website}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-75"
                      style={{ background: ACCENT + "12", color: ACCENT, border: `1px solid ${ACCENT}25` }}>
                      <Globe className="w-3 h-3" /> Website
                    </a>
                  )}
                  {club.instagram && (
                    <a href={`https://instagram.com/${club.instagram.replace(/^@/, "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-75"
                      style={{ background: "rgba(225,48,108,0.1)", color: "#E1306C", border: "1px solid rgba(225,48,108,0.2)" }}>
                      <ExternalLink className="w-3 h-3" /> Instagram
                    </a>
                  )}
                  {club.facebook && (
                    <a href={club.facebook.startsWith("http") ? club.facebook : `https://facebook.com/${club.facebook}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-75"
                      style={{ background: "rgba(24,119,242,0.1)", color: "#1877F2", border: "1px solid rgba(24,119,242,0.2)" }}>
                      <ExternalLink className="w-3 h-3" /> Facebook
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Tournaments */}
            {tournaments.length > 0 && (
              <div className="rounded-2xl p-5 border"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: ACCENT + "15" }}>
                    <Trophy className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-widest"
                    style={{ color: "var(--cat-text-muted)" }}>
                    Tournaments · {tournaments.length}
                  </p>
                </div>
                <div className="space-y-2">
                  {tournaments.map(t => (
                    <Link key={t.slug} href={`/t/${t.orgSlug}/${t.slug}`}
                      className="flex items-center justify-between px-4 py-3.5 rounded-xl border group transition-all hover:border-[#2bfeba40]"
                      style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: "var(--cat-text)" }}>
                          {t.name}
                        </p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--cat-text-muted)" }}>
                          {t.teams.join(" · ")}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 shrink-0 ml-3 opacity-40 group-hover:opacity-100 transition-opacity"
                        style={{ color: ACCENT }} />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Back link */}
            <div className="pt-2">
              <Link href="/catalog"
                className="inline-flex items-center gap-2 text-xs transition-opacity hover:opacity-75"
                style={{ color: "var(--cat-text-muted)" }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Browse all tournaments
              </Link>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
