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
          <div key={label} className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Registration status */}
      <div className={`rounded-lg p-4 flex items-center justify-between gap-4 border ${t.registrationOpen ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
        <div className="flex items-center gap-3">
          {t.registrationOpen
            ? <CheckCircle className="w-5 h-5 shrink-0 text-green-600" />
            : <Clock className="w-5 h-5 shrink-0 text-gray-400" />}
          <div>
            <p className={`text-sm font-semibold ${t.registrationOpen ? "text-green-700" : "text-gray-900"}`}>
              {t.registrationOpen ? "Регистрация открыта" : "Регистрация закрыта"}
            </p>
            {t.registrationDeadline && (
              <p className="text-xs text-gray-500 mt-0.5">
                Дедлайн: {fmt(t.registrationDeadline)}
              </p>
            )}
          </div>
        </div>
        {t.registrationOpen && (
          <Link href={`/t/${org.slug}/${t.slug}/register`}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded bg-gray-900 text-white hover:bg-gray-800">
            Зарегистрироваться <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* About + Key dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {t.description && (
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">О турнире</p>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{t.description}</p>
          </div>
        )}

        {(t.startDate || t.endDate || t.registrationDeadline) && (
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Ключевые даты</p>
            <div className="space-y-3">
              {t.registrationDeadline && (
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Дедлайн регистрации</p>
                    <p className="text-sm font-medium text-gray-900">{fmt(t.registrationDeadline)}</p>
                  </div>
                </div>
              )}
              {t.startDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Начало турнира</p>
                    <p className="text-sm font-medium text-gray-900">{fmt(t.startDate)}</p>
                  </div>
                </div>
              )}
              {t.endDate && (
                <div className="flex items-center gap-3">
                  <Trophy className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Конец турнира</p>
                    <p className="text-sm font-medium text-gray-900">{fmt(t.endDate)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Age classes */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">Возрастные категории · {classes.length} класса</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {classes.map(cls => (
            <div key={cls.id} className="flex items-center gap-2.5 p-3 rounded border border-gray-200 bg-gray-50">
              <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 text-xs font-bold bg-gray-200 text-gray-700">
                {cls.name.match(/\d+/)?.[0] ? `U${cls.name.match(/\d+/)?.[0]}` : cls.name.slice(0, 3)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{cls.name}</p>
                <p className="text-[10px] text-gray-500">
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

      {/* Clubs grid */}
      {clubs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">
            Участвующие клубы · {clubs.length} клуба
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {clubs.map((club) => (
              <div key={club.name} className="flex flex-col items-center gap-1.5">
                {club.badgeUrl ? (
                  <img src={club.badgeUrl} alt={club.name} className="w-10 h-10 rounded object-contain border border-gray-200" />
                ) : (
                  <div className="w-10 h-10 rounded flex items-center justify-center text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                    {club.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                )}
                <p className="text-[9px] text-center leading-tight line-clamp-2 text-gray-500">{club.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main partner banner */}
      <div className="bg-gray-100 border border-gray-200 rounded-lg p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Главный партнёр</p>
          <p className="text-lg font-bold text-gray-900">SportsMaster Estonia</p>
          <p className="text-sm text-gray-500 mt-0.5">Official Equipment Partner</p>
        </div>
        <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
          <Star className="w-7 h-7 text-gray-400" />
        </div>
      </div>

      {/* Contact */}
      {(org.contactEmail || org.website) && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Контакты</p>
          <div className="space-y-2">
            {org.contactEmail && (
              <a href={`mailto:${org.contactEmail}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                <Mail className="w-4 h-4 shrink-0" /> {org.contactEmail}
              </a>
            )}
            {org.website && (
              <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                <Globe className="w-4 h-4 shrink-0" /> {org.website}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
