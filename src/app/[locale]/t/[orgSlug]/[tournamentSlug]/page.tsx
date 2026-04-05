"use client";
import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  Calendar, Mail, Globe, Clock, CheckCircle, ArrowRight,
  Trophy, Users, Building2, Layers, Sparkles, MapPin,
} from "lucide-react";

function fmt(d: string | null, locale: string) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

type ClubEntry = { name: string; badgeUrl: string | null; city: string | null };

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

export default function TournamentInfoPage() {
  const { org, tournament: tourney, stats, classes } = useTournamentPublic();
  const t = useTranslations("tournament");
  const locale = useLocale();
  const [clubs, setClubs] = useState<ClubEntry[]>([]);

  useEffect(() => {
    fetch(`/api/public/t/${org.slug}/${tourney.slug}/teams`)
      .then(r => r.json())
      .then((d) => {
        const seen = new Set<string>();
        const result: ClubEntry[] = [];
        for (const g of d.grouped ?? []) {
          for (const team of g.teams ?? []) {
            if (team.club && !seen.has(team.club.name)) {
              seen.add(team.club.name);
              result.push(team.club);
            }
          }
        }
        setClubs(result);
      }).catch(() => {});
  }, [org.slug, tourney.slug]);

  const statItems = [
    { value: stats.teamCount,  label: t("statTeams"),   icon: Users,    color: "#3B82F6" },
    { value: stats.clubCount,  label: t("statClubs"),   icon: Building2, color: "#8B5CF6" },
    { value: stats.classCount, label: t("statClasses"), icon: Layers,  color: "#F59E0B" },
    { value: stats.days ?? "—", label: t("statDays"),   icon: Calendar,  color: "#2BFEBA" },
  ];

  return (
    <div className="space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {statItems.map(({ value, label, icon: Icon, color }) => (
          <div key={label}
            className="rounded-2xl p-4 border flex flex-col items-center text-center gap-2"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: color + "18" }}>
              <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-black leading-none" style={{ color: "var(--cat-text)" }}>{value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Registration status */}
      <div className="rounded-2xl p-4 border flex items-center justify-between gap-4"
        style={{
          background: tourney.registrationOpen
            ? "var(--cat-badge-open-bg)"
            : "var(--cat-tag-bg)",
          borderColor: tourney.registrationOpen
            ? "var(--cat-badge-open-border)"
            : "var(--cat-card-border)",
        }}>
        <div className="flex items-center gap-3">
          {tourney.registrationOpen
            ? <CheckCircle className="w-5 h-5 shrink-0" style={{ color: "var(--cat-accent)" }} />
            : <Clock className="w-5 h-5 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
          }
          <div>
            <p className="text-sm font-bold"
              style={{ color: tourney.registrationOpen ? "var(--cat-accent)" : "var(--cat-text)" }}>
              {tourney.registrationOpen ? t("registrationOpen") : t("registrationClosed")}
            </p>
            {tourney.registrationDeadline && (
              <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                {t("deadline")}: {fmt(tourney.registrationDeadline, locale)}
              </p>
            )}
          </div>
        </div>
        {tourney.registrationOpen && (
          <Link href={`/t/${org.slug}/${tourney.slug}/register`}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-black px-4 py-2 rounded-xl transition-opacity hover:opacity-90"
            style={{
              background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))",
              color: "var(--cat-accent-text)",
              boxShadow: "0 4px 16px var(--cat-accent-glow)",
            }}>
            {t("registerBtn")} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* About + Key dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tourney.description && (
          <div className="rounded-2xl p-5 border"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: "var(--cat-badge-open-bg)" }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest"
                style={{ color: "var(--cat-text-muted)" }}>{t("aboutTournament")}</p>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line"
              style={{ color: "var(--cat-text-secondary)" }}>{tourney.description}</p>
          </div>
        )}

        {(tourney.startDate || tourney.endDate || tourney.registrationDeadline) && (
          <div className="rounded-2xl p-5 border"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: "var(--cat-badge-open-bg)" }}>
                <Calendar className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest"
                style={{ color: "var(--cat-text-muted)" }}>{t("keyDates")}</p>
            </div>
            <div className="space-y-3">
              {tourney.registrationDeadline && (
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
                  <div>
                    <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{t("registrationDeadline")}</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>{fmt(tourney.registrationDeadline, locale)}</p>
                  </div>
                </div>
              )}
              {tourney.startDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
                  <div>
                    <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{t("tournamentStart")}</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>{fmt(tourney.startDate, locale)}</p>
                  </div>
                </div>
              )}
              {tourney.endDate && (
                <div className="flex items-center gap-3">
                  <Trophy className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
                  <div>
                    <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{t("tournamentEnd")}</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>{fmt(tourney.endDate, locale)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Age categories */}
      {classes.length > 0 && (
        <div className="rounded-2xl p-5 border"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "var(--cat-badge-open-bg)" }}>
              <Layers className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest"
              style={{ color: "var(--cat-text-muted)" }}>
              {t("ageCategories")} · {classes.length}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {classes.map(cls => {
              const ac = getAgeColor(cls.name);
              return (
                <div key={cls.id}
                  className="flex items-center gap-2.5 p-3 rounded-xl border"
                  style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black border"
                    style={{ background: ac.bg, color: ac.text, borderColor: ac.border }}>
                    {cls.name.replace(/[^U0-9]/gi, "").toUpperCase() || cls.name.slice(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold truncate" style={{ color: "var(--cat-text)" }}>{cls.name}</p>
                    <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                      {cls.minBirthYear && cls.maxBirthYear && cls.minBirthYear !== cls.maxBirthYear
                        ? `${cls.maxBirthYear}–${cls.minBirthYear} · ${cls.teamCount} ${t("teams")}`
                        : cls.minBirthYear
                        ? `${cls.minBirthYear} · ${cls.teamCount} ${t("teams")}`
                        : `${cls.teamCount} ${t("teams")}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Participating clubs */}
      {clubs.length > 0 && (
        <div className="rounded-2xl p-5 border"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "var(--cat-badge-open-bg)" }}>
              <Building2 className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest"
              style={{ color: "var(--cat-text-muted)" }}>
              {t("participatingClubs")} · {clubs.length}
            </p>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-7 gap-3">
            {clubs.map((club) => (
              <div key={club.name} className="flex flex-col items-center gap-1.5">
                {club.badgeUrl ? (
                  <img src={club.badgeUrl} alt={club.name}
                    className="w-10 h-10 rounded-xl object-contain border"
                    style={{ borderColor: "var(--cat-card-border)" }} />
                ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black border"
                    style={{ background: "var(--cat-tag-bg)", color: "var(--cat-accent)", borderColor: "var(--cat-card-border)" }}>
                    {club.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                )}
                <p className="text-[9px] text-center leading-tight line-clamp-2 w-full"
                  style={{ color: "var(--cat-text-muted)" }}>{club.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contacts */}
      {(org.contactEmail || org.website || org.city) && (
        <div className="rounded-2xl p-5 border"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "var(--cat-badge-open-bg)" }}>
              <MapPin className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest"
              style={{ color: "var(--cat-text-muted)" }}>{t("contacts")}</p>
          </div>
          <div className="space-y-2.5">
            {org.city && (
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--cat-text-secondary)" }}>
                <MapPin className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
                {org.city}{org.country ? `, ${org.country}` : ""}
              </div>
            )}
            {org.contactEmail && (
              <a href={`mailto:${org.contactEmail}`}
                className="flex items-center gap-2 text-sm transition-opacity hover:opacity-80"
                style={{ color: "var(--cat-accent)" }}>
                <Mail className="w-4 h-4 shrink-0" /> {org.contactEmail}
              </a>
            )}
            {org.website && (
              <a href={org.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm transition-opacity hover:opacity-80"
                style={{ color: "var(--cat-accent)" }}>
                <Globe className="w-4 h-4 shrink-0" /> {org.website}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
