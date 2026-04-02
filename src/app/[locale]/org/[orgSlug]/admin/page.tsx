import { getSession } from "@/lib/auth";
import { authorizeOrg, getOrgTournaments } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { teams, clubs, tournamentClasses } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Trophy, Users, Plus, ChevronRight, Calendar } from "lucide-react";

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
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("dashboard")}</h1>
          {!isEmpty && (
            <p className="text-sm text-gray-500 mt-1">
              {tournaments.length} {t("tournaments").toLowerCase()} · {totalTeams} {t("teams").toLowerCase()} · {totalClubs} {t("clubs").toLowerCase()}
            </p>
          )}
        </div>
        <Link
          href={`/org/${orgSlug}/admin/tournaments`}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          {t("newTournament")}
        </Link>
      </div>

      {isEmpty ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">{t("noTournaments")}</p>
          <Link
            href={`/org/${orgSlug}/admin/tournaments`}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            {t("heroCta")}
          </Link>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: t("tournaments"), value: tournaments.length, icon: Trophy },
              { label: t("clubs"), value: totalClubs, icon: Users },
              { label: t("teams"), value: totalTeams, icon: Users },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tournament list */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              {t("yourTournaments")}
            </h2>
            <div className="space-y-2">
              {tournamentCards.map((tournament) => (
                <Link
                  key={tournament.id}
                  href={`/org/${orgSlug}/admin/tournament/${tournament.id}`}
                  className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 group"
                >
                  <Trophy className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-medium text-gray-900">{tournament.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        tournament.registrationOpen
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {tournament.registrationOpen ? t("regOpen") : t("regClosed")}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {tournament.year}
                      </span>
                      <span>{tournament.clubCount} {t("clubs").toLowerCase()}</span>
                      <span>{tournament.teamCount} {t("teams").toLowerCase()}</span>
                      <span>{tournament.classCount} {t("classesCount").replace("{n}", String(tournament.classCount))}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
