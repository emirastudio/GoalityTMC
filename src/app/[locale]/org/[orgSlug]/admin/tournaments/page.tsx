import { getSession } from "@/lib/auth";
import { authorizeOrg, getOrgTournaments, slugify } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { tournaments as tournamentsTable, teams, clubs } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Link } from "@/i18n/navigation";
import { Trophy, Calendar, Plus, ChevronRight, ArrowLeft, Users } from "lucide-react";

type Props = {
  params: Promise<{ locale: string; orgSlug: string }>;
};

export default async function TournamentsPage({ params }: Props) {
  const { locale, orgSlug } = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") redirect(`/${locale}/login`);

  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) redirect(`/${locale}/login`);

  const t = await getTranslations("orgAdmin");
  const rawTournaments = await getOrgTournaments(organization.id);

  const tournaments = await Promise.all(rawTournaments.map(async (tournament) => {
    const [teamCount] = await db.select({ value: count() }).from(teams).where(eq(teams.tournamentId, tournament.id));
    const [clubCount] = await db.select({ value: count() }).from(clubs).where(eq(clubs.tournamentId, tournament.id));
    return { ...tournament, teamCount: Number(teamCount?.value ?? 0), clubCount: Number(clubCount?.value ?? 0) };
  }));

  async function createTournament(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "admin") return;
    const { authorized, organization } = await authorizeOrg(session, orgSlug);
    if (!authorized || !organization) return;
    const name = formData.get("name") as string;
    const year = parseInt(formData.get("year") as string);
    if (!name?.trim() || !year) return;
    const slug = slugify(name);
    await db.insert(tournamentsTable).values({
      organizationId: organization.id,
      name: name.trim(),
      slug,
      year,
      currency: organization.currency,
    });
    revalidatePath(`/${locale}/org/${orgSlug}/admin/tournaments`);
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/org/${orgSlug}/admin`}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-xs text-gray-400">{organization.name}</p>
          <h1 className="text-xl font-bold text-gray-900">{t("tournaments")}</h1>
        </div>
      </div>

      {/* Create tournament */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900">{t("newTournament")}</p>
        </div>
        <form action={createTournament} className="p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t("tournamentName")}
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder={t("tournamentNamePlaceholder")}
                className="w-full rounded-lg px-3 py-2 text-sm bg-gray-50 border border-gray-200 text-gray-900 outline-none focus:border-emerald-500"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t("year")}
              </label>
              <input
                type="number"
                name="year"
                required
                defaultValue={new Date().getFullYear()}
                className="w-full rounded-lg px-3 py-2 text-sm bg-gray-50 border border-gray-200 text-gray-900 outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 shrink-0">
              <Plus className="w-4 h-4" />
              {t("create")}
            </button>
          </div>
        </form>
      </div>

      {/* Tournament list */}
      {tournaments.length > 0 ? (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
            {t("yourTournaments")} · {tournaments.length}
          </h2>
          <div className="space-y-2">
            {tournaments.map((tournament) => (
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
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">{t("noTournaments")}</p>
        </div>
      )}
    </div>
  );
}
