import { getSession } from "@/lib/auth";
import { authorizeOrg, getOrgTournaments } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { teams, clubs } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Trophy, Users, Calendar, Plus } from "lucide-react";

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

  // Stats
  const totalTournaments = tournaments.length;
  let totalTeams = 0;
  let totalClubs = 0;

  for (const tournament of tournaments) {
    const [teamCount] = await db
      .select({ value: count() })
      .from(teams)
      .where(eq(teams.tournamentId, tournament.id));
    totalTeams += Number(teamCount?.value ?? 0);

    const [clubCount] = await db
      .select({ value: count() })
      .from(clubs)
      .where(eq(clubs.tournamentId, tournament.id));
    totalClubs += Number(clubCount?.value ?? 0);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{organization.name}</h1>
          <p className="text-text-secondary mt-1">{t("dashboardSubtitle")}</p>
        </div>
        <Link
          href={`/org/${orgSlug}/admin/tournaments`}
          className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("newTournament")}
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-navy" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{totalTournaments}</p>
              <p className="text-sm text-text-secondary">{t("tournaments")}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-navy" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{totalClubs}</p>
              <p className="text-sm text-text-secondary">{t("clubs")}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-navy" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{totalTeams}</p>
              <p className="text-sm text-text-secondary">{t("teams")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tournaments List */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">{t("yourTournaments")}</h2>
        {tournaments.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center">
            <Trophy className="w-12 h-12 text-text-secondary/30 mx-auto mb-4" />
            <p className="text-text-secondary">{t("noTournaments")}</p>
            <Link
              href={`/org/${orgSlug}/admin/tournaments`}
              className="inline-flex items-center gap-2 mt-4 text-navy font-medium hover:underline"
            >
              <Plus className="w-4 h-4" />
              {t("createFirst")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                href={`/org/${orgSlug}/admin/tournament/${tournament.id}`}
                className="flex items-center justify-between bg-white rounded-xl border border-border p-5 hover:border-navy/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-navy" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">{tournament.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {tournament.year}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        tournament.registrationOpen
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {tournament.registrationOpen ? t("regOpen") : t("regClosed")}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
