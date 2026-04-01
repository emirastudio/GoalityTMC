import { getSession } from "@/lib/auth";
import { authorizeOrg, getOrgTournaments, slugify } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { tournaments as tournamentsTable } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { Link } from "@/i18n/navigation";
import { Trophy, Calendar, Plus, ArrowLeft } from "lucide-react";

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
  const tournaments = await getOrgTournaments(organization.id);

  async function createTournament(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "admin") return;

    const { authorized, organization } = await authorizeOrg(session, orgSlug);
    if (!authorized || !organization) return;

    const name = formData.get("name") as string;
    const year = parseInt(formData.get("year") as string);
    const slug = slugify(name);

    await db.insert(tournamentsTable).values({
      organizationId: organization.id,
      name,
      slug,
      year,
      currency: organization.currency,
    });

    revalidatePath(`/${locale}/org/${orgSlug}/admin/tournaments`);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/org/${orgSlug}/admin`}
            className="text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">{t("tournaments")}</h1>
        </div>
      </div>

      {/* Create Tournament Form */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">{t("newTournament")}</h2>
        <form action={createTournament} className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              {t("tournamentName")}
            </label>
            <input
              type="text"
              name="name"
              required
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
              placeholder={t("tournamentNamePlaceholder")}
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              {t("year")}
            </label>
            <input
              type="number"
              name="year"
              required
              defaultValue={new Date().getFullYear()}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("create")}
          </button>
        </form>
      </div>

      {/* Tournaments List */}
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
    </div>
  );
}
