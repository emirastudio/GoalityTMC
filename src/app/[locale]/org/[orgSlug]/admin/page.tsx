import { getSession } from "@/lib/auth";
import { authorizeOrg, getOrgTournaments } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { teams, clubs } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Trophy, Users, Calendar, Plus, ChevronRight, TrendingUp, Sparkles } from "lucide-react";

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

  let totalTeams = 0;
  let totalClubs = 0;

  for (const tournament of tournaments) {
    const [teamCount] = await db.select({ value: count() }).from(teams).where(eq(teams.tournamentId, tournament.id));
    totalTeams += Number(teamCount?.value ?? 0);
    const [clubCount] = await db.select({ value: count() }).from(clubs).where(eq(clubs.tournamentId, tournament.id));
    totalClubs += Number(clubCount?.value ?? 0);
  }

  const stats = [
    { icon: Trophy, label: t("tournaments"), value: tournaments.length, color: "#F59E0B" },
    { icon: Users, label: t("clubs"), value: totalClubs, color: "#3B82F6" },
    { icon: Users, label: t("teams"), value: totalTeams, color: "#10B981" },
  ];

  return (
    <div className="space-y-8 max-w-[1000px]">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--cat-accent)" }}>
              Admin Panel
            </span>
          </div>
          <h1 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>{organization.name}</h1>
          <p className="text-[14px] mt-1" style={{ color: "var(--cat-text-secondary)" }}>{t("dashboardSubtitle")}</p>
        </div>
        <Link
          href={`/org/${orgSlug}/admin/tournaments`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))",
            color: "var(--cat-accent-text)",
            boxShadow: "0 4px 14px var(--cat-accent-glow)",
          }}
        >
          <Plus className="w-4 h-4" />
          {t("newTournament")}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-2xl p-5 border relative overflow-hidden"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.06] -translate-y-1/2 translate-x-1/2"
              style={{ background: `radial-gradient(circle, ${color}, transparent)` }} />
            <div className="flex items-center gap-3 relative z-10">
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

      {/* Tournaments list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-bold" style={{ color: "var(--cat-text)" }}>{t("yourTournaments")}</h2>
          <Link href={`/org/${orgSlug}/admin/tournaments`}
            className="text-[12px] font-medium hover:opacity-80 transition-opacity"
            style={{ color: "var(--cat-accent)" }}>
            {t("newTournament")} →
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <div className="rounded-2xl p-12 text-center border"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "var(--cat-badge-open-bg)" }}>
              <Trophy className="w-8 h-8" style={{ color: "var(--cat-accent)" }} />
            </div>
            <p className="text-[14px] mb-4" style={{ color: "var(--cat-text-secondary)" }}>{t("noTournaments")}</p>
            <Link href={`/org/${orgSlug}/admin/tournaments`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))", color: "var(--cat-accent-text)" }}>
              <Plus className="w-4 h-4" /> {t("createFirst")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                href={`/org/${orgSlug}/admin/tournament/${tournament.id}`}
                className="flex items-center justify-between rounded-2xl p-5 border transition-all hover:opacity-90 group"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "var(--cat-badge-open-bg)" }}>
                    <Trophy className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[14px]" style={{ color: "var(--cat-text)" }}>{tournament.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[12px]" style={{ color: "var(--cat-text-muted)" }}>
                        <Calendar className="w-3.5 h-3.5" />{tournament.year}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={tournament.registrationOpen
                          ? { background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)", border: "1px solid var(--cat-badge-open-border)" }
                          : { background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)", border: "1px solid var(--cat-tag-border)" }
                        }>
                        {tournament.registrationOpen ? t("regOpen") : t("regClosed")}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-80 transition-opacity"
                  style={{ color: "var(--cat-text-secondary)" }} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
