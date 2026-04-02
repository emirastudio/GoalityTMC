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
  Calendar, CheckCircle, Lock, ArrowRight, Zap, Shield,
  Globe, TrendingUp, CreditCard, MessageSquare, Building2,
} from "lucide-react";

// Brand constants (same as landing page dark theme)
const MINT = "#2BFEBA";
const MINT_DARK = "#00D98F";
const DARK = "#0A0E14";
const DARK2 = "#0D1117";

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

  const totalTeams = tournamentCards.reduce((s, tc) => s + tc.teamCount, 0);
  const totalClubs = tournamentCards.reduce((s, tc) => s + tc.clubCount, 0);

  const isEmpty = tournaments.length === 0;

  return (
    <div className="space-y-6 max-w-[1000px]">

      {/* ── Top header bar ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--cat-accent)" }}>
              Goality TMC · Organizer
            </span>
          </div>
          <h1 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>
            {organization.name}
          </h1>
          {!isEmpty && (
            <p className="text-[13px] mt-0.5" style={{ color: "var(--cat-text-secondary)" }}>
              {tournaments.length} {tournaments.length === 1 ? "турнир" : "турнира"} · {totalTeams} команд · {totalClubs} клубов
            </p>
          )}
        </div>
        <Link
          href={`/org/${orgSlug}/admin/tournaments`}
          className="cat-cta-glow inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
          style={{
            background: `linear-gradient(90deg, ${MINT}, ${MINT_DARK})`,
            color: DARK,
            boxShadow: `0 4px 20px rgba(43,254,186,0.35)`,
          }}
        >
          <Plus className="w-4 h-4" />
          Новый турнир
        </Link>
      </div>

      {isEmpty ? (
        /* ══════════ EMPTY STATE HERO ══════════ */
        <>
          {/* Main hero block — brand dark + mint, like landing page */}
          <div
            className="cat-banner cat-hero-decor rounded-3xl overflow-hidden relative"
            style={{
              background: `linear-gradient(135deg, ${DARK} 0%, ${DARK2} 50%, rgba(43,254,186,0.06) 100%)`,
              border: "1px solid rgba(43,254,186,0.12)",
            }}
          >
            {/* Glow orbs */}
            <div className="absolute top-[-15%] left-[-5%] w-[400px] h-[400px] rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, ${MINT}, transparent 70%)`, opacity: 0.06, filter: "blur(30px)" }} />
            <div className="absolute bottom-[-20%] right-[-5%] w-[350px] h-[350px] rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, #8B5CF6, transparent 70%)", opacity: 0.05, filter: "blur(25px)" }} />

            {/* Floating decorative icons */}
            <div className="absolute top-[18%] right-[7%] cat-float-1 pointer-events-none" style={{ color: MINT, opacity: 0.07 }}>
              <Trophy className="w-20 h-20" />
            </div>
            <div className="absolute bottom-[20%] right-[22%] cat-float-2 pointer-events-none" style={{ color: MINT, opacity: 0.04 }}>
              <Users className="w-12 h-12" />
            </div>
            <div className="absolute top-[45%] right-[35%] cat-float-3 pointer-events-none" style={{ color: "#8B5CF6", opacity: 0.04 }}>
              <Star className="w-9 h-9" />
            </div>

            <div className="relative z-10 px-10 md:px-16 py-16 md:py-20 text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 border"
                style={{ background: `rgba(43,254,186,0.1)`, borderColor: `rgba(43,254,186,0.2)` }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: MINT }} />
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: MINT }}>
                  Начните бесплатно
                </span>
              </div>

              {/* Headline with gradient text */}
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[0.95] mb-6 text-white">
                Создайте первый{" "}
                <span
                  className="cat-gradient-text"
                  style={{
                    background: `linear-gradient(90deg, ${MINT}, #00E5FF, ${MINT})`,
                    backgroundSize: "200%",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  турнир
                </span>
                <br />
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.6em", fontWeight: 700, letterSpacing: "0.02em" }}>
                  за 2 минуты · бесплатно
                </span>
              </h2>

              <p className="text-[15px] max-w-xl mx-auto leading-relaxed mb-10" style={{ color: "rgba(255,255,255,0.45)" }}>
                Публичная страница турнира, онлайн-регистрация клубов,
                управление командами — всё включено без ограничений
              </p>

              {/* CTA */}
              <Link
                href={`/org/${orgSlug}/admin/tournaments`}
                className="cat-cta-glow inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-[15px] font-bold transition-opacity hover:opacity-90"
                style={{
                  background: `linear-gradient(90deg, ${MINT}, ${MINT_DARK})`,
                  color: DARK,
                  boxShadow: `0 8px 30px rgba(43,254,186,0.35)`,
                }}
              >
                <Plus className="w-4 h-4" />
                Создать турнир
                <ArrowRight className="w-4 h-4" />
              </Link>

              {/* 3 benefit icons row */}
              <div className="flex items-center justify-center gap-8 md:gap-16 mt-12">
                {[
                  { icon: Globe, label: "Публичная страница" },
                  { icon: Users, label: "Онлайн-заявки" },
                  { icon: CheckCircle, label: "Управление командами" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-2.5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(43,254,186,0.08)", border: "1px solid rgba(43,254,186,0.15)" }}>
                      <Icon className="w-5 h-5" style={{ color: MINT }} />
                    </div>
                    <p className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick steps guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: "01", icon: Trophy, title: "Создайте турнир", desc: "Укажите название, год и откройте регистрацию", color: MINT },
              { step: "02", icon: Users, title: "Клубы регистрируются", desc: "Делитесь ссылкой — клубы заходят сами из каталога", color: "#3B82F6" },
              { step: "03", icon: TrendingUp, title: "Управляйте данными", desc: "Команды, расписание, оплаты — всё в одном месте", color: "#8B5CF6" },
            ].map(({ step, icon: Icon, title, desc, color }) => (
              <div key={step} className="cat-card cat-feature rounded-2xl p-6 border relative overflow-hidden"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 cat-feature-icon"
                    style={{ background: color + "18", color }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black tracking-widest" style={{ color: "var(--cat-text-muted)" }}>
                      ШАГ {step}
                    </span>
                    <p className="text-[14px] font-bold mt-0.5" style={{ color: "var(--cat-text)" }}>{title}</p>
                    <p className="text-[12px] mt-1 leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mock dashboard preview */}
          <div className="rounded-3xl overflow-hidden border relative"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <div className="p-8 md:p-10 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest w-fit"
                  style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)", border: "1px solid var(--cat-badge-open-border)" }}>
                  <TrendingUp className="w-3.5 h-3.5" /> Для организаторов
                </div>
                <h3 className="text-2xl font-black mb-3" style={{ color: "var(--cat-text)" }}>
                  Всё в одной панели
                </h3>
                <p className="text-[13px] leading-relaxed mb-6" style={{ color: "var(--cat-text-secondary)" }}>
                  Принимайте заявки, общайтесь с клубами, отслеживайте оплаты — без электронных таблиц и мессенджеров
                </p>
                <ul className="space-y-2.5">
                  {["Онлайн-регистрация клубов", "Управление командами и игроками", "Сообщения и уведомления", "Финансовая отчётность"].map(item => (
                    <li key={item} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "var(--cat-badge-open-bg)" }}>
                        <CheckCircle className="w-3 h-3" style={{ color: "var(--cat-accent)" }} />
                      </div>
                      <span className="text-[13px]" style={{ color: "var(--cat-text-secondary)" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mock stats panel */}
              <div className="p-8 flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${DARK}, ${DARK2})`, borderLeft: "1px solid rgba(43,254,186,0.08)" }}>
                <div className="w-full max-w-xs space-y-3">
                  {[
                    { label: "Зарегистрировано клубов", value: "24", icon: Building2, color: "#3B82F6" },
                    { label: "Команд в турнире", value: "68", icon: Users, color: MINT },
                    { label: "Поступлений", value: "€14 200", icon: CreditCard, color: "#F59E0B" },
                    { label: "Сообщений", value: "142", icon: MessageSquare, color: "#8B5CF6" },
                  ].map(({ label, value, icon: Icon, color }, i) => (
                    <div key={label} className="cat-card flex items-center gap-3 px-4 py-3 rounded-xl border"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        borderColor: "rgba(255,255,255,0.07)",
                        animationDelay: `${i * 80}ms`,
                      }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: color + "18", color }}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</p>
                        <p className="text-[15px] font-black text-white">{value}</p>
                      </div>
                      <TrendingUp className="w-3.5 h-3.5" style={{ color: MINT }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ══════════ TOURNAMENTS LIST ══════════ */
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Турниров", value: tournaments.length, color: "#F59E0B", icon: Trophy },
              { label: "Клубов", value: totalClubs, color: "#3B82F6", icon: Users },
              { label: "Команд", value: totalTeams, color: "#10B981", icon: Users },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="cat-card rounded-2xl p-5 border relative overflow-hidden"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.07] -translate-y-1/2 translate-x-1/2"
                  style={{ background: `radial-gradient(circle, ${color}, transparent)` }} />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "18", color }}>
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

          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: "var(--cat-text-muted)" }}>
              Ваши турниры
            </p>
            <div className="space-y-3">
              {tournamentCards.map((tournament) => (
                <Link
                  key={tournament.id}
                  href={`/org/${orgSlug}/admin/tournament/${tournament.id}`}
                  className="cat-card flex items-center gap-4 rounded-2xl p-5 border transition-all hover:opacity-90 group"
                  style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `linear-gradient(135deg, var(--cat-accent), var(--cat-accent-dark))` }}>
                    <Trophy className="w-6 h-6" style={{ color: "var(--cat-accent-text)" }} />
                  </div>

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
                    <div className="flex items-center gap-4 mt-2">
                      {[
                        { label: String(tournament.year), color: "#F59E0B", icon: Calendar },
                        { label: `${tournament.clubCount} клубов`, color: "#3B82F6", icon: Users },
                        { label: `${tournament.teamCount} команд`, color: "#10B981", icon: Users },
                        { label: `${tournament.classCount} классов`, color: "#8B5CF6", icon: Trophy },
                      ].map(({ label, color, icon: Icon }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: color + "18" }}>
                            <Icon className="w-3 h-3" style={{ color }} />
                          </div>
                          <span className="text-[12px]" style={{ color: "var(--cat-text-secondary)" }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 opacity-30 group-hover:opacity-70 transition-opacity shrink-0"
                    style={{ color: "var(--cat-text-secondary)" }} />
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ══════════ PREMIUM UPSELL — always visible ══════════ */}
      <div className="rounded-3xl overflow-hidden border relative"
        style={{ background: `linear-gradient(135deg, ${DARK} 0%, ${DARK2} 60%, rgba(43,254,186,0.04) 100%)`, border: "1px solid rgba(43,254,186,0.10)" }}>
        {/* Shimmer line top */}
        <div className="h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${MINT}, #3B82F6, ${MINT}, transparent)` }} />

        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4" style={{ color: "#F59E0B" }} />
                <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "#F59E0B" }}>
                  Premium Plan
                </span>
              </div>
              <h3 className="text-xl font-black mb-1 text-white">Больше возможностей для роста</h3>
              <p className="text-[13px] mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
                Расписание, результаты, платёжный модуль и брендинг
              </p>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                {[
                  { text: "Публичная страница турнира", free: true },
                  { text: "Неограниченные команды", free: true },
                  { text: "Онлайн-регистрация клубов", free: true },
                  { text: "Расписание и результаты", free: false },
                  { text: "Платёжный модуль", free: false },
                  { text: "Брендинг и партнёры", free: false },
                ].map(({ text, free }) => (
                  <div key={text} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={free
                        ? { background: `rgba(43,254,186,0.12)` }
                        : { background: "rgba(245,158,11,0.12)" }
                      }>
                      {free
                        ? <CheckCircle className="w-3 h-3" style={{ color: MINT }} />
                        : <Lock className="w-3 h-3" style={{ color: "#F59E0B" }} />
                      }
                    </div>
                    <span className="text-[12px]" style={{ color: free ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)" }}>
                      {text}
                    </span>
                    {free && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: `rgba(43,254,186,0.15)`, color: MINT, border: `1px solid rgba(43,254,186,0.25)` }}>
                        FREE
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing CTA */}
            <div className="rounded-2xl p-6 flex flex-col items-center gap-4 text-center shrink-0 min-w-[180px]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Премиум</p>
                <p className="text-4xl font-black text-white">€49</p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>в месяц за турнир</p>
              </div>
              <button
                className="w-full px-4 py-2.5 rounded-xl text-[13px] font-black transition-all hover:opacity-90"
                style={{
                  background: "linear-gradient(90deg, #F59E0B, #D97706)",
                  color: "#000",
                  boxShadow: "0 4px 16px rgba(245,158,11,0.35)",
                }}>
                Узнать больше
              </button>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>Без обязательств</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
