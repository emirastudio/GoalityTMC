"use client";
import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Calendar, Mail, Globe, Clock, CheckCircle, ArrowRight, Trophy, Star } from "lucide-react";

function fmt(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

type ClubEntry = { name: string; badgeUrl: string | null; city: string | null };

export default function TournamentInfoPage() {
  const { org, tournament: t, stats, classes } = useTournamentPublic();
  const brand = org.brandColor;
  const [clubs, setClubs] = useState<ClubEntry[]>([]);

  useEffect(() => {
    fetch(`/api/public/t/${org.slug}/${t.slug}/teams`)
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
      });
  }, [org.slug, t.slug]);

  const statItems = [
    { value: stats.teamCount, label: "Команд" },
    { value: stats.clubCount, label: "Клубов" },
    { value: stats.classCount, label: "Классов" },
    { value: stats.days ?? "—", label: "Дней" },
  ];

  return (
    <div className="space-y-4">

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {statItems.map(({ value, label }) => (
          <div key={label} className="rounded-2xl p-4 text-center"
            style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}>
            <p className="text-2xl font-black" style={{ color: brand }}>{value}</p>
            <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Registration status */}
      <div className="rounded-2xl p-4 flex items-center justify-between gap-4"
        style={t.registrationOpen
          ? { background: "var(--cat-badge-open-bg)", border: "1px solid var(--cat-badge-open-border)" }
          : { background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)" }
        }>
        <div className="flex items-center gap-3">
          {t.registrationOpen
            ? <CheckCircle className="w-5 h-5 shrink-0" style={{ color: "var(--cat-badge-open-text)" }} />
            : <Clock className="w-5 h-5 shrink-0" style={{ color: "var(--cat-text-muted)" }} />}
          <div>
            <p className="text-sm font-semibold" style={{ color: t.registrationOpen ? "var(--cat-badge-open-text)" : "var(--cat-text)" }}>
              {t.registrationOpen ? "Регистрация открыта" : "Регистрация закрыта"}
            </p>
            {t.registrationDeadline && (
              <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-secondary)" }}>
                Дедлайн: {fmt(t.registrationDeadline)}
              </p>
            )}
          </div>
        </div>
        {t.registrationOpen && (
          <Link href={`/t/${org.slug}/${t.slug}/register`}
            className="shrink-0 inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-xl text-white hover:opacity-90 transition-opacity"
            style={{ background: brand }}>
            Зарегистрироваться <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* About + Key dates in 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* About */}
        {t.description && (
          <div className="rounded-2xl p-5" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--cat-text-muted)" }}>О турнире</p>
            <p className="text-[13px] leading-relaxed whitespace-pre-line" style={{ color: "var(--cat-text-secondary)" }}>{t.description}</p>
          </div>
        )}

        {/* Key dates */}
        {(t.startDate || t.endDate || t.registrationDeadline) && (
          <div className="rounded-2xl p-5" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--cat-text-muted)" }}>Ключевые даты</p>
            <div className="space-y-3">
              {t.registrationDeadline && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 border border-amber-200">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>Дедлайн регистрации</p>
                    <p className="text-[13px] font-semibold" style={{ color: "var(--cat-text)" }}>{fmt(t.registrationDeadline)}</p>
                  </div>
                </div>
              )}
              {t.startDate && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 border border-blue-200">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>Начало турнира</p>
                    <p className="text-[13px] font-semibold" style={{ color: "var(--cat-text)" }}>{fmt(t.startDate)}</p>
                  </div>
                </div>
              )}
              {t.endDate && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-50 border border-emerald-200">
                    <Trophy className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>Конец турнира</p>
                    <p className="text-[13px] font-semibold" style={{ color: "var(--cat-text)" }}>{fmt(t.endDate)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Age classes */}
      <div className="rounded-2xl p-5" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: "var(--cat-text-muted)" }}>Возрастные категории · {classes.length} класса</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {classes.map(cls => (
            <div key={cls.id} className="flex items-center gap-2.5 p-3 rounded-xl" style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black"
                style={{ background: brand + "15", color: brand }}>
                {cls.name.match(/\d+/)?.[0] ? `U${cls.name.match(/\d+/)?.[0]}` : cls.name.slice(0, 3)}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold truncate" style={{ color: "var(--cat-text)" }}>{cls.name}</p>
                <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>{cls.teamCount} команд</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clubs logos grid */}
      {clubs.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: "var(--cat-text-muted)" }}>
            Участвующие клубы · {clubs.length} клуба
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {clubs.map((club) => (
              <div key={club.name} className="flex flex-col items-center gap-1.5 group">
                {club.badgeUrl ? (
                  <img src={club.badgeUrl} alt={club.name} className="w-12 h-12 rounded-xl object-contain"
                    style={{ border: "1px solid var(--cat-card-border)" }} />
                ) : (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[12px] font-bold"
                    style={{ background: brand + "18", color: brand, border: "1px solid " + brand + "30" }}>
                    {club.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                )}
                <p className="text-[9px] text-center leading-tight line-clamp-2" style={{ color: "var(--cat-text-muted)" }}>{club.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main partner banner (MOCK) */}
      <div className="rounded-2xl overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white, transparent 60%)" }} />
        <div className="relative z-10 p-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1">Главный партнёр</p>
            <p className="text-lg font-black text-white">SportsMaster Estonia</p>
            <p className="text-[13px] text-white/60 mt-0.5">Official Equipment Partner</p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
            <Star className="w-8 h-8 text-white/40" />
          </div>
        </div>
      </div>

      {/* Contact */}
      {(org.contactEmail || org.website) && (
        <div className="rounded-2xl p-5" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--cat-text-muted)" }}>Контакты</p>
          <div className="space-y-2">
            {org.contactEmail && (
              <a href={`mailto:${org.contactEmail}`} className="flex items-center gap-2 text-[13px] hover:opacity-80 transition-opacity" style={{ color: "var(--cat-accent)" }}>
                <Mail className="w-4 h-4 shrink-0" /> {org.contactEmail}
              </a>
            )}
            {org.website && (
              <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] hover:opacity-80 transition-opacity" style={{ color: "var(--cat-accent)" }}>
                <Globe className="w-4 h-4 shrink-0" /> {org.website}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
