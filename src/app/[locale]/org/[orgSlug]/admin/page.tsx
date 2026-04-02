import { getSession } from "@/lib/auth";
import { authorizeOrg, getOrgTournaments } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { teams, clubs, tournamentClasses } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import {
  Trophy, Users, Plus, ChevronRight, Sparkles, Star,
  Calendar, CheckCircle, Lock, ArrowRight, Zap, Shield, Globe
} from "lucide-react";

type Props = {
  params: Promise<{ locale: string; orgSlug: string }>;
};

export default async function OrgDashboardPage({ params }: Props) {
  const { locale, orgSlug } = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") redirect(`/${locale}/login`);

  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) redirect(`/${locale}/login`);

  const t = await getTranslations("orgAdmin");

  const tournaments = await getOrgTournaments(organization.id);

  // Per-tournament stats
  const tournamentCards = await Promise.all(tournaments.map(async (tournament) => {
    const [teamCount] = await db.select({ value: count() }).from(teams).where(eq(teams.tournamentId, tournament.id));
    const [clubCount] = await db.select({ value: count() }).from(clubs).where(eq(clubs.tournamentId, tournament.id));
    const [classCount] = await db.select({ value: count() }).from(tournamentClasses).where(eq(tournamentClasses.tournamentId, tournament.id));
    return {
      ...tournament,
      teamCount: Number(teamCount?.value ?? 0),
      clubCount: Number(clubCount?.value ?? 0),
      classCount: Number(classCount?.value ?? 0),
    };
  }));

  const totalTeams = tournamentCards.reduce((s, t) => s + t.teamCount, 0);
  const totalClubs = tournamentCards.reduce((s, t) => s + t.clubCount, 0);

  const premiumFeatures = [
    { icon: Globe, text: "Публичная страница турнира", free: true },
    { icon: Users, text: "Неограниченные команды", free: true },
    { icon: CheckCircle, text: "Онлайн-регистрация клубов", free: true },
    { icon: Zap, text: "Расписание и результаты", free: false },
    { icon: Shield, text: "Платёжный модуль", free: false },
    { icon: Star, text: "Брендирование и партнёры", free: false },
  ];

  return (
    <div className="space-y-8 max-w-[1000px] relative">

      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-[0.06]"
        style={{ background: "radial-gradient(circle, var(--cat-accent), transparent 70%)", filter: "blur(40px)" }} />
      <div className="pointer-events-none absolute top-60 -left-10 w-64 h-64 rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(circle, #3B82F6, transparent 70%)", filter: "blur(30px)" }} />

      {/* Welcome header */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cat-accent)" }}>
            Goality TMC · Organizer
          </span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black" style={{ color: "var(--cat-text)" }}>{organization.name}</h1>
            <p className="text-[14px] mt-1" style={{ color: "var(--cat-text-secondary)" }}>
              {tournaments.length === 0
                ? "Создайте первый турнир и начните принимать заявки"
                : `${tournaments.length} ${tournaments.length === 1 ? "турнир" : "турнира"} · ${totalTeams} команд · ${totalClubs} клубов`
              }
            </p>
          </div>
          <Link
            href={`/org/${orgSlug}/admin/tournaments`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 hover:scale-105 shrink-0"
            style={{
              background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))",
              color: "var(--cat-accent-text)",
              boxShadow: "0 4px 20px var(--cat-accent-glow)",
            }}
          >
            <Plus className="w-4 h-4" />
            Новый турнир
          </Link>
        </div>
      </div>

      {/* Stats row — only if there are tournaments */}
      {tournaments.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Турниров", value: tournaments.length, color: "#F59E0B", icon: Trophy },
            { label: "Клубов", value: totalClubs, color: "#3B82F6", icon: Users },
            { label: "Команд", value: totalTeams, color: "#10B981", icon: Users },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="rounded-2xl p-5 border relative overflow-hidden"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}>
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.07] -translate-y-1/2 translate-x-1/2"
                style={{ background: `radial-gradient(circle, ${color}, transparent)` }} />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: color + "18", color }}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>{value}</p>
                  <p className="text-[12px]" style={{ color: "var(--cat-text-muted)" }}>{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tournament cards */}
      {tournamentCards.length > 0 ? (
        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-widest mb-4" style={{ color: "var(--cat-text-muted)" }}>
            Ваши турниры
          </h2>
          <div className="space-y-3">
            {tournamentCards.map((tournament) => (
              <Link
                key={tournament.id}
                href={`/org/${orgSlug}/admin/tournament/${tournament.id}`}
                className="flex items-center gap-4 rounded-2xl p-5 border transition-all hover:opacity-90 group"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}
              >
                {/* Tournament logo / icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, var(--cat-accent), var(--cat-accent-dark))" }}>
                  <Trophy className="w-6 h-6 text-white" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-[15px]" style={{ color: "var(--cat-text)" }}>{tournament.name}</h3>
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={tournament.registrationOpen
                        ? { background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)", border: "1px solid var(--cat-badge-open-border)" }
                        : { background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)", border: "1px solid var(--cat-tag-border)" }
                      }>
                      <span className="w-1.5 h-1.5 rounded-full"
                        style={{ background: tournament.registrationOpen ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
                      {tournament.registrationOpen ? "Регистрация открыта" : "Закрыта"}
                    </span>
                  </div>

                  {/* Mini stats */}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: "#F59E0B18" }}>
                        <Calendar className="w-3 h-3" style={{ color: "#F59E0B" }} />
                      </div>
                      <span className="text-[12px]" style={{ color: "var(--cat-text-secondary)" }}>{tournament.year}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: "#3B82F618" }}>
                        <Users className="w-3 h-3" style={{ color: "#3B82F6" }} />
                      </div>
                      <span className="text-[12px]" style={{ color: "var(--cat-text-secondary)" }}>{tournament.clubCount} клубов</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: "#10B98118" }}>
                        <Users className="w-3 h-3" style={{ color: "#10B981" }} />
                      </div>
                      <span className="text-[12px]" style={{ color: "var(--cat-text-secondary)" }}>{tournament.teamCount} команд</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: "#8B5CF618" }}>
                        <Trophy className="w-3 h-3" style={{ color: "#8B5CF6" }} />
                      </div>
                      <span className="text-[12px]" style={{ color: "var(--cat-text-secondary)" }}>{tournament.classCount} классов</span>
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 opacity-30 group-hover:opacity-70 transition-opacity shrink-0"
                  style={{ color: "var(--cat-text-secondary)" }} />
              </Link>
            ))}
          </div>
        </div>
      ) : (
        /* Empty state hero */
        <div className="relative rounded-3xl overflow-hidden border"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)", borderColor: "rgba(255,255,255,0.06)" }}>
          {/* Mesh background */}
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
          {/* Glow orbs */}
          <div className="absolute top-1/2 left-1/4 w-64 h-64 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, var(--cat-accent), transparent 60%)", filter: "blur(40px)" }} />
          <div className="absolute top-1/2 right-1/4 w-48 h-48 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #3B82F6, transparent 60%)", filter: "blur(30px)" }} />

          <div className="relative z-10 p-10 md:p-14 text-center">
            {/* Trophy icon */}
            <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--cat-accent), var(--cat-accent-dark))", boxShadow: "0 8px 32px var(--cat-accent-glow)" }}>
              <Trophy className="w-10 h-10 text-white" />
            </div>

            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full border"
              style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" }}>
              <Sparkles className="w-3 h-3" style={{ color: "var(--cat-accent)" }} />
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">Начните бесплатно</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-white mb-3 leading-tight">
              Создайте первый турнир
              <br /><span style={{ color: "var(--cat-accent)" }}>за 2 минуты</span>
            </h2>
            <p className="text-[14px] text-white/50 mb-8 max-w-md mx-auto leading-relaxed">
              Публичная страница, онлайн-регистрация клубов, управление командами — всё включено бесплатно
            </p>

            <Link
              href={`/org/${orgSlug}/admin/tournaments`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[14px] transition-all hover:opacity-90 hover:scale-105"
              style={{
                background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))",
                color: "var(--cat-accent-text)",
                boxShadow: "0 6px 24px var(--cat-accent-glow)",
              }}>
              <Plus className="w-4 h-4" />
              Создать турнир (бесплатно)
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* 3 quick benefits */}
            <div className="grid grid-cols-3 gap-4 mt-10 max-w-lg mx-auto">
              {[
                { icon: Globe, text: "Публичная страница" },
                { icon: Users, text: "Онлайн-заявки" },
                { icon: CheckCircle, text: "Управление командами" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}>
                    <Icon className="w-5 h-5 text-white/60" />
                  </div>
                  <p className="text-[11px] text-white/40 text-center leading-tight">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Premium plan upsell */}
      <div className="rounded-3xl overflow-hidden border relative"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        {/* Subtle gradient top strip */}
        <div className="h-1 w-full"
          style={{ background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark), #3B82F6)" }} />

        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4" style={{ color: "#F59E0B" }} />
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#F59E0B" }}>
                  Premium Plan
                </span>
              </div>
              <h3 className="text-xl font-black mb-1" style={{ color: "var(--cat-text)" }}>
                Больше возможностей для роста
              </h3>
              <p className="text-[13px] mb-5" style={{ color: "var(--cat-text-secondary)" }}>
                Расписание, результаты, платёжный модуль и партнёрский брендинг
              </p>

              <div className="grid grid-cols-2 gap-2">
                {premiumFeatures.map(({ icon: Icon, text, free }) => (
                  <div key={text} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={free
                        ? { background: "var(--cat-badge-open-bg)" }
                        : { background: "#F59E0B18" }
                      }>
                      {free
                        ? <CheckCircle className="w-3 h-3" style={{ color: "var(--cat-accent)" }} />
                        : <Lock className="w-3 h-3" style={{ color: "#F59E0B" }} />
                      }
                    </div>
                    <span className="text-[12px]" style={{ color: free ? "var(--cat-text-secondary)" : "var(--cat-text-muted)" }}>
                      {text}
                    </span>
                    {free && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)", border: "1px solid var(--cat-badge-open-border)" }}>
                        FREE
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* CTA box */}
            <div className="rounded-2xl p-6 flex flex-col items-center gap-4 text-center shrink-0 min-w-[200px]"
              style={{ background: "linear-gradient(135deg, #0f172a, #1e1b4b)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <p className="text-[11px] text-white/40 uppercase tracking-widest mb-1">Премиум</p>
                <p className="text-3xl font-black text-white">€49</p>
                <p className="text-[11px] text-white/40">в месяц за турнир</p>
              </div>
              <button
                className="w-full px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-90"
                style={{
                  background: "linear-gradient(90deg, #F59E0B, #D97706)",
                  color: "#000",
                  boxShadow: "0 4px 14px rgba(245,158,11,0.3)",
                }}>
                Узнать больше
              </button>
              <p className="text-[10px] text-white/30">Нет обязательств</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
