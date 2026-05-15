"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { PublicNavHeader } from "@/components/ui/public-nav-header";
import { MapPin, Globe, Trophy, ExternalLink, CheckCircle } from "lucide-react";

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
  const { clubSlug, locale } = useParams<{ clubSlug: string; locale: string }>();
  const [club, setClub] = useState<ClubData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/clubs/by-slug?slug=${encodeURIComponent(clubSlug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setClub(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [clubSlug]);

  // Group registrations by tournament
  const byTournament = club?.registrations.reduce<Record<string, { name: string; slug: string; orgSlug: string; year: number; teams: string[] }>>(
    (acc, r) => {
      const key = String(r.tournamentId);
      if (!acc[key]) acc[key] = { name: r.tournamentName, slug: r.tournamentSlug, orgSlug: r.orgSlug, year: r.tournamentYear, teams: [] };
      const teamLabel = r.teamName ?? r.tournamentName;
      if (!acc[key].teams.includes(teamLabel)) acc[key].teams.push(teamLabel);
      return acc;
    }, {}
  ) ?? {};

  const tournaments = Object.values(byTournament).sort((a, b) => b.year - a.year);

  return (
    <div className="min-h-screen" style={{ background: "var(--cat-bg)" }}>
      <PublicNavHeader />

      <div className="w-full md:w-[90%] md:max-w-[900px] mx-auto px-4 py-8">
        {loading && (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--cat-accent)" }} />
          </div>
        )}

        {!loading && !club && (
          <div className="text-center py-24" style={{ color: "var(--cat-text-muted)" }}>
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-bold">Club not found</p>
          </div>
        )}

        {club && (
          <div className="space-y-4">
            {/* Header card */}
            <div className="rounded-2xl p-6 border flex items-center gap-5"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              {club.badgeUrl ? (
                <img src={club.badgeUrl} alt={club.name} className="w-20 h-20 rounded-2xl object-contain border shrink-0"
                  style={{ borderColor: "var(--cat-card-border)" }} />
              ) : (
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black border shrink-0"
                  style={{ background: "var(--cat-tag-bg)", color: "var(--cat-accent)", borderColor: "var(--cat-card-border)" }}>
                  {club.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>{club.name}</h1>
                  {club.isVerified && (
                    <CheckCircle className="w-5 h-5 shrink-0" style={{ color: "var(--cat-accent)" }} />
                  )}
                </div>
                {(club.city || club.country) && (
                  <p className="flex items-center gap-1.5 text-sm mt-1" style={{ color: "var(--cat-text-muted)" }}>
                    <MapPin className="w-3.5 h-3.5" />
                    {[club.city, club.country].filter(Boolean).join(", ")}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {club.website && (
                    <a href={club.website.startsWith("http") ? club.website : `https://${club.website}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
                      style={{ color: "var(--cat-accent)" }}>
                      <Globe className="w-3.5 h-3.5" /> Website
                    </a>
                  )}
                  {club.instagram && (
                    <a href={`https://instagram.com/${club.instagram.replace(/^@/, "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
                      style={{ color: "var(--cat-accent)" }}>
                      <ExternalLink className="w-3.5 h-3.5" /> Instagram
                    </a>
                  )}
                  {club.facebook && (
                    <a href={club.facebook.startsWith("http") ? club.facebook : `https://facebook.com/${club.facebook}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
                      style={{ color: "var(--cat-accent)" }}>
                      <ExternalLink className="w-3.5 h-3.5" /> Facebook
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Tournaments */}
            {tournaments.length > 0 && (
              <div className="rounded-2xl p-5 border"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: "var(--cat-badge-open-bg)" }}>
                    <Trophy className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-widest"
                    style={{ color: "var(--cat-text-muted)" }}>Tournaments · {tournaments.length}</p>
                </div>
                <div className="space-y-2">
                  {tournaments.map(t => (
                    <Link key={t.slug} href={`/t/${t.orgSlug}/${t.slug}`}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border transition-all hover:opacity-80"
                      style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>{t.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                          {t.teams.join(" · ")}
                        </p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
