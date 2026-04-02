import { getSession } from "@/lib/auth";
import { authorizeOrg, getOrgTournaments } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { teams, clubs, tournamentClasses } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import type { LucideProps } from "lucide-react";
import {
  Trophy, Users, Plus, ChevronRight, Sparkles, Star,
  Calendar, CheckCircle, Lock, ArrowRight, Zap,
  Globe, TrendingUp, CreditCard, MessageSquare, Building2,
} from "lucide-react";

type LucideIcon = React.ComponentType<LucideProps>;

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
    <div className="space-y-5 max-w-[1000px]">

      {/* ── Top header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--cat-accent)" }}>
              Goality TMC · {t("organizer")}
            </span>
          </div>
          <h1 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>
            {organization.name}
          </h1>
          {!isEmpty && (
            <p className="text-[13px] mt-0.5" style={{ color: "var(--cat-text-secondary)" }}>
              {tournaments.length} {t("tournaments").toLowerCase()} · {totalTeams} {t("teams").toLowerCase()} · {totalClubs} {t("clubs").toLowerCase()}
            </p>
          )}
        </div>
        <Link
          href={`/org/${orgSlug}/admin/tournaments`}
          className="cat-cta-glow inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 shrink-0"
          style={{
            background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))",
            color: "var(--cat-accent-text)",
            boxShadow: "0 4px 20px var(--cat-accent-glow)",
          }}
        >
          <Plus className="w-4 h-4" />
          {t("newTournament")}
        </Link>
      </div>

      {isEmpty ? (
        <>
          {/* ══ HERO — adapts to dark/light via cat-banner vars ══ */}
          <div
            className="cat-banner cat-hero-decor rounded-3xl overflow-hidden relative"
            style={{
              background: "linear-gradient(135deg, var(--cat-banner-from) 0%, var(--cat-banner-via) 50%, var(--cat-banner-to) 100%)",
              border: "1px solid var(--cat-card-border)",
            }}
          >
            {/* Glow orbs */}
            <div className="absolute top-[-10%] left-[-5%] w-[350px] h-[350px] rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, var(--cat-accent), transparent 70%)", opacity: 0.08, filter: "blur(30px)" }} />
            <div className="absolute bottom-[-15%] right-[-5%] w-[300px] h-[300px] rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, #8B5CF6, transparent 70%)", opacity: 0.06, filter: "blur(25px)" }} />

            {/* Floating decorative icons */}
            <div className="absolute top-[15%] right-[6%] cat-float-1 pointer-events-none" style={{ color: "var(--cat-accent)", opacity: 0.09 }}>
              <Trophy className="w-20 h-20" />
            </div>
            <div className="absolute bottom-[18%] right-[22%] cat-float-2 pointer-events-none" style={{ color: "var(--cat-accent)", opacity: 0.05 }}>
              <Users className="w-12 h-12" />
            </div>
            <div className="absolute top-[42%] right-[34%] cat-float-3 pointer-events-none" style={{ color: "#8B5CF6", opacity: 0.05 }}>
              <Star className="w-8 h-8" />
            </div>

            <div className="relative z-10 px-8 md:px-14 py-14 md:py-18 text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 border"
                style={{ background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-badge-open-border)" }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
                <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--cat-accent)" }}>
                  {t("heroFreeBadge")}
                </span>
              </div>

              {/* Headline */}
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-2" style={{ color: "var(--cat-text)" }}>
                {t("heroTitle")}{" "}
                <span
                  className="cat-gradient-text"
                  style={{
                    background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark), var(--cat-accent))",
                    backgroundSize: "200%",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {t("heroHighlight")}
                </span>
              </h2>
              <p className="text-[18px] font-semibold mb-5" style={{ color: "var(--cat-text-secondary)" }}>
                {t("heroSub")}
              </p>
              <p className="text-[14px] max-w-lg mx-auto leading-relaxed mb-8" style={{ color: "var(--cat-text-secondary)" }}>
                {t("heroDesc")}
              </p>

              {/* CTA */}
              <Link
                href={`/org/${orgSlug}/admin/tournaments`}
                className="cat-cta-glow inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-[15px] font-black transition-opacity hover:opacity-90"
                style={{
                  background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))",
                  color: "var(--cat-accent-text)",
                  boxShadow: "0 8px 30px var(--cat-accent-glow)",
                }}
              >
                <Plus className="w-4 h-4" />
                {t("heroCta")}
                <ArrowRight className="w-4 h-4" />
              </Link>

              {/* 3 benefit icons */}
              <div className="flex items-center justify-center gap-8 md:gap-14 mt-10">
                {([
                  { icon: Globe, key: "heroBenefit1" as const },
                  { icon: Users, key: "heroBenefit2" as const },
                  { icon: CheckCircle, key: "heroBenefit3" as const },
                ] as { icon: LucideIcon, key: "heroBenefit1" | "heroBenefit2" | "heroBenefit3" }[]).map(({ icon: Icon, key }) => (
                  <div key={key} className="flex flex-col items-center gap-2">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                      style={{ background: "var(--cat-badge-open-bg)", border: "1px solid var(--cat-badge-open-border)" }}>
                      <Icon className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
                    </div>
                    <p className="text-[11px] font-medium text-center" style={{ color: "var(--cat-text-muted)" }}>
                      {t(key)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══ 3-step guide ══ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([
              { step: "01", icon: Trophy, titleKey: "step1Title" as const, descKey: "step1Desc" as const, color: "var(--cat-accent)" },
              { step: "02", icon: Users, titleKey: "step2Title" as const, descKey: "step2Desc" as const, color: "#3B82F6" },
              { step: "03", icon: TrendingUp, titleKey: "step3Title" as const, descKey: "step3Desc" as const, color: "#8B5CF6" },
            ] as { step: string, icon: LucideIcon, titleKey: "step1Title" | "step2Title" | "step3Title", descKey: "step1Desc" | "step2Desc" | "step3Desc", color: string }[]).map(({ step, icon: Icon, titleKey, descKey, color }) => (
              <div key={step}
                className="cat-card cat-feature rounded-2xl p-6 border"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 cat-feature-icon"
                    style={{ background: color + "18", color }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--cat-text-muted)" }}>
                      {t("step")} {step}
                    </span>
                    <p className="text-[14px] font-bold mt-0.5" style={{ color: "var(--cat-text)" }}>{t(titleKey)}</p>
                    <p className="text-[12px] mt-1 leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>{t(descKey)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ══ "All in one" feature split ══ */}
          <div className="rounded-3xl overflow-hidden border"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* Left: text */}
              <div className="p-8 md:p-10 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest w-fit"
                  style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)", border: "1px solid var(--cat-badge-open-border)" }}>
                  <TrendingUp className="w-3.5 h-3.5" /> {t("allInOneBadge")}
                </div>
                <h3 className="text-2xl font-black mb-3" style={{ color: "var(--cat-text)" }}>
                  {t("allInOneTitle")}
                </h3>
                <p className="text-[13px] leading-relaxed mb-6" style={{ color: "var(--cat-text-secondary)" }}>
                  {t("allInOneDesc")}
                </p>
                <ul className="space-y-3">
                  {(["feature1", "feature2", "feature3", "feature4"] as const).map(key => (
                    <li key={key} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "var(--cat-badge-open-bg)" }}>
                        <CheckCircle className="w-3 h-3" style={{ color: "var(--cat-accent)" }} />
                      </div>
                      <span className="text-[13px]" style={{ color: "var(--cat-text-secondary)" }}>{t(key)}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/org/${orgSlug}/admin/tournaments`}
                  className="mt-7 inline-flex items-center gap-1.5 text-[13px] font-bold"
                  style={{ color: "var(--cat-accent)" }}>
                  {t("heroCta")} <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Right: mock dashboard — intentionally always dark */}
              <div className="p-8 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0A0E14, #0D1117)", borderLeft: "1px solid rgba(43,254,186,0.08)" }}>
                <div className="w-full max-w-xs space-y-3">
                  {([
                    { key: "dashStat1" as const, value: "24", icon: Building2, color: "#3B82F6" },
                    { key: "dashStat2" as const, value: "68", icon: Users, color: "#2BFEBA" },
                    { key: "dashStat3" as const, value: "€14 200", icon: CreditCard, color: "#F59E0B" },
                    { key: "dashStat4" as const, value: "142", icon: MessageSquare, color: "#8B5CF6" },
                  ] as { key: "dashStat1" | "dashStat2" | "dashStat3" | "dashStat4", value: string, icon: LucideIcon, color: string }[]).map(({ key, value, icon: Icon, color }, i) => (
                    <div key={key}
                      className="cat-card flex items-center gap-3 px-4 py-3 rounded-xl border"
                      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.07)", animationDelay: `${i * 80}ms` }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: color + "18", color }}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{t(key)}</p>
                        <p className="text-[15px] font-black text-white">{value}</p>
                      </div>
                      <TrendingUp className="w-3.5 h-3.5" style={{ color: "#2BFEBA" }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ══ TOURNAMENTS LIST (has tournaments) ══ */
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {([
              { labelKey: "tournaments" as const, value: tournaments.length, color: "#F59E0B", icon: Trophy },
              { labelKey: "clubs" as const, value: totalClubs, color: "#3B82F6", icon: Users },
              { labelKey: "teams" as const, value: totalTeams, color: "#10B981", icon: Users },
            ] as { labelKey: "tournaments" | "clubs" | "teams", value: number, color: string, icon: LucideIcon }[]).map(({ labelKey, value, color, icon: Icon }) => (
              <div key={labelKey}
                className="cat-card rounded-2xl p-5 border relative overflow-hidden"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.08] -translate-y-1/2 translate-x-1/2 pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${color}, transparent)` }} />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: color + "18", color }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>{value}</p>
                    <p className="text-[12px]" style={{ color: "var(--cat-text-muted)" }}>{t(labelKey)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tournament cards */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest mb-4" style={{ color: "var(--cat-text-muted)" }}>
              {t("yourTournaments")}
            </p>
            <div className="space-y-3">
              {tournamentCards.map((tournament) => (
                <Link
                  key={tournament.id}
                  href={`/org/${orgSlug}/admin/tournament/${tournament.id}`}
                  className="cat-card flex items-center gap-4 rounded-2xl p-5 border group"
                  style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, var(--cat-accent), var(--cat-accent-dark))" }}>
                    <Trophy className="w-6 h-6" style={{ color: "var(--cat-accent-text)" }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-bold text-[15px]" style={{ color: "var(--cat-text)" }}>{tournament.name}</h3>
                      <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={tournament.registrationOpen
                          ? { background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)", border: "1px solid var(--cat-badge-open-border)" }
                          : { background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)", border: "1px solid var(--cat-tag-border)" }
                        }>
                        <span className="w-1.5 h-1.5 rounded-full mr-0.5"
                          style={{ background: tournament.registrationOpen ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
                        {tournament.registrationOpen ? t("regOpen") : t("regClosed")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {([
                        { label: String(tournament.year), color: "#F59E0B", icon: Calendar },
                        { label: t("clubsCount").replace("{n}", String(tournament.clubCount)), color: "#3B82F6", icon: Users },
                        { label: t("teamsCount").replace("{n}", String(tournament.teamCount)), color: "#10B981", icon: Users },
                        { label: t("classesCount").replace("{n}", String(tournament.classCount)), color: "#8B5CF6", icon: Zap },
                      ] as { label: string, color: string, icon: LucideIcon }[]).map(({ label, color, icon: Icon }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: color + "15" }}>
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

      {/* ══ PREMIUM UPSELL — always shown ══ */}
      <div className="rounded-3xl overflow-hidden border relative"
        style={{ background: "linear-gradient(135deg, #0A0E14 0%, #0D1117 60%, rgba(43,254,186,0.04) 100%)", border: "1px solid rgba(43,254,186,0.10)" }}>
        {/* Shimmer gradient line on top */}
        <div className="h-[2px]"
          style={{ background: "linear-gradient(90deg, transparent, #2BFEBA, #3B82F6, #2BFEBA, transparent)" }} />

        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            {/* Features list */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4" style={{ color: "#F59E0B" }} />
                <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "#F59E0B" }}>
                  {t("premiumLabel")}
                </span>
              </div>
              <h3 className="text-xl font-black mb-1 text-white">{t("premiumTitle")}</h3>
              <p className="text-[13px] mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
                {t("premiumDesc")}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {([
                  { key: "premiumFree1" as const, free: true },
                  { key: "premiumFree2" as const, free: true },
                  { key: "premiumFree3" as const, free: true },
                  { key: "premiumPaid1" as const, free: false },
                  { key: "premiumPaid2" as const, free: false },
                  { key: "premiumPaid3" as const, free: false },
                ] as { key: "premiumFree1" | "premiumFree2" | "premiumFree3" | "premiumPaid1" | "premiumPaid2" | "premiumPaid3", free: boolean }[]).map(({ key, free }) => (
                  <div key={key} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={free
                        ? { background: "rgba(43,254,186,0.12)" }
                        : { background: "rgba(245,158,11,0.12)" }
                      }>
                      {free
                        ? <CheckCircle className="w-3 h-3" style={{ color: "#2BFEBA" }} />
                        : <Lock className="w-3 h-3" style={{ color: "#F59E0B" }} />
                      }
                    </div>
                    <span className="text-[12px]" style={{ color: free ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.35)" }}>
                      {t(key)}
                    </span>
                    {free && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: "rgba(43,254,186,0.15)", color: "#2BFEBA", border: "1px solid rgba(43,254,186,0.3)" }}>
                        FREE
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing box */}
            <div className="rounded-2xl p-6 flex flex-col items-center gap-4 text-center shrink-0 w-[190px]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1"
                  style={{ color: "rgba(255,255,255,0.35)" }}>
                  {t("premiumLabel")}
                </p>
                <p className="text-4xl font-black text-white leading-none">€49</p>
                <p className="text-[11px] mt-1.5 leading-tight" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {t("perMonth")}
                </p>
              </div>
              <button
                className="w-full px-4 py-2.5 rounded-xl text-[13px] font-black transition-all hover:opacity-90"
                style={{
                  background: "linear-gradient(90deg, #F59E0B, #D97706)",
                  color: "#000",
                  boxShadow: "0 4px 16px rgba(245,158,11,0.35)",
                }}>
                {t("premiumLearnMore")}
              </button>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                {t("premiumNoCommitment")}
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
