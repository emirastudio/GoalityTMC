import { getSession } from "@/lib/auth";
import { authorizeOrg, getOrgTournaments, slugify } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { tournaments as tournamentsTable, teams, clubs } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Link } from "@/i18n/navigation";
import { Trophy, Calendar, Plus, ChevronRight, ArrowLeft, Users, Sparkles } from "lucide-react";

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
    <div className="space-y-6 max-w-[800px]">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/org/${orgSlug}/admin`}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles className="w-3 h-3" style={{ color: "var(--cat-accent)" }} />
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--cat-accent)" }}>
              {organization.name}
            </span>
          </div>
          <h1 className="text-xl font-black" style={{ color: "var(--cat-text)" }}>{t("tournaments")}</h1>
        </div>
      </div>

      {/* Create tournament card */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}>
        {/* Card header */}
        <div className="px-6 py-4 border-b flex items-center gap-3"
          style={{ borderColor: "var(--cat-divider)", background: "var(--cat-tag-bg)" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--cat-accent), var(--cat-accent-dark))" }}>
            <Plus className="w-4 h-4" style={{ color: "var(--cat-accent-text)" }} />
          </div>
          <div>
            <p className="text-[13px] font-bold" style={{ color: "var(--cat-text)" }}>{t("newTournament")}</p>
            <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{t("tournamentNamePlaceholder")}</p>
          </div>
        </div>

        {/* Form */}
        <form action={createTournament} className="p-6">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-2"
                style={{ color: "var(--cat-text-muted)" }}>
                {t("tournamentName")}
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder={t("tournamentNamePlaceholder")}
                className="cat-search w-full rounded-xl px-4 py-2.5 text-[13px] outline-none transition-all"
                style={{
                  background: "var(--cat-input-bg)",
                  border: "1px solid var(--cat-input-border)",
                  color: "var(--cat-text)",
                }}
              />
            </div>
            <div className="w-28">
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-2"
                style={{ color: "var(--cat-text-muted)" }}>
                {t("year")}
              </label>
              <input
                type="number"
                name="year"
                required
                defaultValue={new Date().getFullYear()}
                className="cat-search w-full rounded-xl px-4 py-2.5 text-[13px] outline-none transition-all"
                style={{
                  background: "var(--cat-input-bg)",
                  border: "1px solid var(--cat-input-border)",
                  color: "var(--cat-text)",
                }}
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-opacity hover:opacity-90 shrink-0"
              style={{
                background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))",
                color: "var(--cat-accent-text)",
                boxShadow: "0 3px 12px var(--cat-accent-glow)",
              }}>
              <Plus className="w-4 h-4" />
              {t("create")}
            </button>
          </div>
        </form>
      </div>

      {/* Tournament list */}
      {tournaments.length > 0 ? (
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: "var(--cat-text-muted)" }}>
            {t("yourTournaments")} · {tournaments.length}
          </p>
          <div className="space-y-3">
            {tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                href={`/org/${orgSlug}/admin/tournament/${tournament.id}`}
                className="cat-card flex items-center gap-4 rounded-2xl p-5 border group"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, var(--cat-accent), var(--cat-accent-dark))" }}>
                  <Trophy className="w-5 h-5" style={{ color: "var(--cat-accent-text)" }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <h3 className="font-bold text-[15px]" style={{ color: "var(--cat-text)" }}>{tournament.name}</h3>
                    <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
                      style={tournament.registrationOpen
                        ? { background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)", border: "1px solid var(--cat-badge-open-border)" }
                        : { background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)", border: "1px solid var(--cat-tag-border)" }
                      }>
                      <span className="w-1.5 h-1.5 rounded-full"
                        style={{ background: tournament.registrationOpen ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
                      {tournament.registrationOpen ? t("regOpen") : t("regClosed")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--cat-text-secondary)" }}>
                      <Calendar className="w-3.5 h-3.5" style={{ color: "var(--cat-text-muted)" }} />
                      {tournament.year}
                    </span>
                    <span className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--cat-text-secondary)" }}>
                      <Users className="w-3.5 h-3.5" style={{ color: "#3B82F6" }} />
                      {tournament.clubCount} {t("clubs").toLowerCase()}
                    </span>
                    <span className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--cat-text-secondary)" }}>
                      <Users className="w-3.5 h-3.5" style={{ color: "#10B981" }} />
                      {tournament.teamCount} {t("teams").toLowerCase()}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 opacity-30 group-hover:opacity-70 transition-opacity shrink-0"
                  style={{ color: "var(--cat-text-secondary)" }} />
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-12 text-center border"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "var(--cat-badge-open-bg)" }}>
            <Trophy className="w-7 h-7" style={{ color: "var(--cat-accent)" }} />
          </div>
          <p className="text-[13px]" style={{ color: "var(--cat-text-secondary)" }}>{t("noTournaments")}</p>
        </div>
      )}
    </div>
  );
}
