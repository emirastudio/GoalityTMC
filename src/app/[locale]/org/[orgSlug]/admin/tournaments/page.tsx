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
      {/* Заголовок */}
      <div className="flex items-center gap-3">
        <Link href={`/org/${orgSlug}/admin`}
          className="w-8 h-8 rounded-lg flex items-center justify-center th-card border th-border th-text-2 hover:th-bg shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-xs th-text-m">{organization.name}</p>
          <h1 className="text-xl font-bold th-text">{t("tournaments")}</h1>
        </div>
      </div>

      {/* Создать турнир */}
      <div className="th-card border th-border rounded-lg">
        <div className="px-4 py-3 border-b th-border">
          <p className="text-sm font-medium th-text">{t("newTournament")}</p>
        </div>
        <form action={createTournament} className="p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium th-text-2 mb-1">
                {t("tournamentName")}
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder={t("tournamentNamePlaceholder")}
                className="w-full rounded-lg px-3 py-2 text-sm th-input border th-border th-text outline-none focus:border-[var(--cat-accent)]"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium th-text-2 mb-1">
                {t("year")}
              </label>
              <input
                type="number"
                name="year"
                required
                defaultValue={new Date().getFullYear()}
                className="w-full rounded-lg px-3 py-2 text-sm th-input border th-border th-text outline-none focus:border-[var(--cat-accent)]"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shrink-0"
              style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}>
              <Plus className="w-4 h-4" />
              {t("create")}
            </button>
          </div>
        </form>
      </div>

      {/* Список турниров */}
      {tournaments.length > 0 ? (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide th-text-m mb-3">
            {t("yourTournaments")} · {tournaments.length}
          </h2>
          <div className="space-y-2">
            {tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                href={`/org/${orgSlug}/admin/tournament/${tournament.id}`}
                className="flex items-center gap-4 th-card border th-border rounded-lg p-4 hover:th-bg group transition-colors"
              >
                <Trophy className="w-5 h-5 shrink-0" style={{ color: "var(--cat-accent)" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-medium th-text">{tournament.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      tournament.registrationOpen
                        ? "bg-emerald-50 text-emerald-600"
                        : "th-tag"
                    }`}>
                      {tournament.registrationOpen ? t("regOpen") : t("regClosed")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs th-text-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {tournament.year}
                    </span>
                    <span>{tournament.clubCount} {t("clubs").toLowerCase()}</span>
                    <span>{tournament.teamCount} {t("teams").toLowerCase()}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 th-text-m group-hover:th-text-2 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="th-card border th-border rounded-lg p-12 text-center">
          <Trophy className="w-10 h-10 th-text-m mx-auto mb-3" />
          <p className="text-sm th-text-2">{t("noTournaments")}</p>
        </div>
      )}
    </div>
  );
}
