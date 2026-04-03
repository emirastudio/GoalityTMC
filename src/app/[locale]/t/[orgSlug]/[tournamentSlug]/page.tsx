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

      {/* Статистика */}
      <div className="grid grid-cols-4 gap-3">
        {statItems.map(({ value, label }) => (
          <div key={label} className="rounded-lg p-4 text-center border"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <p className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Статус регистрации */}
      <div className="rounded-lg p-4 flex items-center justify-between gap-4 border"
        style={{
          background: t.registrationOpen ? `${brand}08` : "var(--cat-tag-bg)",
          borderColor: t.registrationOpen ? `${brand}40` : "var(--cat-card-border)",
        }}>
        <div className="flex items-center gap-3">
          {t.registrationOpen
            ? <CheckCircle className="w-5 h-5 shrink-0" style={{ color: brand }} />
            : <Clock className="w-5 h-5 shrink-0" style={{ color: "var(--cat-text-muted)" }} />}
          <div>
            <p className="text-sm font-semibold" style={{ color: t.registrationOpen ? brand : "var(--cat-text)" }}>
              {t.registrationOpen ? "Регистрация открыта" : "Регистрация закрыта"}
            </p>
            {t.registrationDeadline && (
              <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                Дедлайн: {fmt(t.registrationDeadline)}
              </p>
            )}
          </div>
        </div>
        {t.registrationOpen && (
          <Link href={`/t/${org.slug}/${t.slug}/register`}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg"
            style={{ background: brand, color: "#fff" }}>
            Зарегистрироваться <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* О турнире + ключевые даты */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {t.description && (
          <div className="rounded-lg p-5 border"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--cat-text-muted)" }}>О турнире</p>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--cat-text-secondary)" }}>{t.description}</p>
          </div>
        )}

        {(t.startDate || t.endDate || t.registrationDeadline) && (
          <div className="rounded-lg p-5 border"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--cat-text-muted)" }}>Ключевые даты</p>
            <div className="space-y-3">
              {t.registrationDeadline && (
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
                  <div>
                    <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>Дедлайн регистрации</p>
                    <p className="text-sm font-medium" style={{ color: "var(--cat-text)" }}>{fmt(t.registrationDeadline)}</p>
                  </div>
                </div>
              )}
              {t.startDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
                  <div>
                    <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>Начало турнира</p>
                    <p className="text-sm font-medium" style={{ color: "var(--cat-text)" }}>{fmt(t.startDate)}</p>
                  </div>
                </div>
              )}
              {t.endDate && (
                <div className="flex items-center gap-3">
                  <Trophy className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
                  <div>
                    <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>Конец турнира</p>
                    <p className="text-sm font-medium" style={{ color: "var(--cat-text)" }}>{fmt(t.endDate)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Возрастные категории */}
      <div className="rounded-lg p-5 border"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--cat-text-muted)" }}>
          Возрастные категории · {classes.length} класса
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {classes.map(cls => (
            <div key={cls.id} className="flex items-center gap-2.5 p-3 rounded-lg border"
              style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-black"
                style={{ background: `${brand}15`, color: brand }}>
                {cls.name.match(/\d+/)?.[0] ? `U${cls.name.match(/\d+/)?.[0]}` : cls.name.slice(0, 3)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: "var(--cat-text)" }}>{cls.name}</p>
                <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                  {cls.minBirthYear && cls.maxBirthYear && cls.minBirthYear !== cls.maxBirthYear
                    ? `${cls.maxBirthYear}–${cls.minBirthYear} · ${cls.teamCount} команд`
                    : cls.minBirthYear
                    ? `${cls.minBirthYear} · ${cls.teamCount} команд`
                    : `${cls.teamCount} команд`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Клубы */}
      {clubs.length > 0 && (
        <div className="rounded-lg p-5 border"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--cat-text-muted)" }}>
            Участвующие клубы · {clubs.length} клуба
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {clubs.map((club) => (
              <div key={club.name} className="flex flex-col items-center gap-1.5">
                {club.badgeUrl ? (
                  <img src={club.badgeUrl} alt={club.name} className="w-10 h-10 rounded object-contain border"
                    style={{ borderColor: "var(--cat-card-border)" }} />
                ) : (
                  <div className="w-10 h-10 rounded flex items-center justify-center text-xs font-bold border"
                    style={{ background: `${brand}10`, color: brand, borderColor: "var(--cat-card-border)" }}>
                    {club.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                )}
                <p className="text-[9px] text-center leading-tight line-clamp-2" style={{ color: "var(--cat-text-muted)" }}>{club.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Партнёр */}
      <div className="rounded-lg p-6 flex items-center justify-between gap-4 border"
        style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--cat-text-muted)" }}>Главный партнёр</p>
          <p className="text-lg font-bold" style={{ color: "var(--cat-text)" }}>SportsMaster Estonia</p>
          <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-secondary)" }}>Official Equipment Partner</p>
        </div>
        <div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "var(--cat-card-border)" }}>
          <Star className="w-7 h-7" style={{ color: "var(--cat-text-muted)" }} />
        </div>
      </div>

      {/* Контакты */}
      {(org.contactEmail || org.website) && (
        <div className="rounded-lg p-5 border"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--cat-text-muted)" }}>Контакты</p>
          <div className="space-y-2">
            {org.contactEmail && (
              <a href={`mailto:${org.contactEmail}`} className="flex items-center gap-2 text-sm hover:opacity-80"
                style={{ color: brand }}>
                <Mail className="w-4 h-4 shrink-0" /> {org.contactEmail}
              </a>
            )}
            {org.website && (
              <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:opacity-80"
                style={{ color: brand }}>
                <Globe className="w-4 h-4 shrink-0" /> {org.website}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
