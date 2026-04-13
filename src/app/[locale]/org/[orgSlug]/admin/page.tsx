import { getSession } from "@/lib/auth";
import { authorizeOrg, getOrgTournaments } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { teams, tournamentClasses, tournamentRegistrations } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Trophy, Users, Plus, ChevronRight, Calendar, Wrench, Hourglass, AlertCircle, Lock, Zap, Rocket, Crown, Gift } from "lucide-react";
import { CancelDeleteButton } from "./cancel-delete-button";

type Props = {
  params: Promise<{ locale: string; orgSlug: string }>;
  searchParams: Promise<{ pendingDeletion?: string }>;
};

export default async function OrgDashboardPage({ params, searchParams }: Props) {
  const { locale, orgSlug } = await params;
  const { pendingDeletion } = await searchParams;

  const session = await getSession();
  if (!session || session.role !== "admin") redirect(`/${locale}/login`);

  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) redirect(`/${locale}/login`);

  if ((organization as any).type === "listing") {
    redirect(`/${locale}/org/${orgSlug}/admin/listing`);
  }

  const t = await getTranslations("orgAdmin");
  const tournaments = await getOrgTournaments(organization.id);

  const tournamentCards = await Promise.all(tournaments.map(async (tournament) => {
    const [teamCount] = await db.select({ value: count() }).from(tournamentRegistrations).where(eq(tournamentRegistrations.tournamentId, tournament.id));
    const [clubCount] = await db.select({ value: sql<number>`COUNT(DISTINCT ${teams.clubId})` }).from(tournamentRegistrations).innerJoin(teams, eq(tournamentRegistrations.teamId, teams.id)).where(eq(tournamentRegistrations.tournamentId, tournament.id));
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

  // Free seat = oldest active (non-pending-deletion) tournament
  const activeTournaments = tournamentCards.filter(t => !(t as any).deleteRequestedAt);
  const freeSeatId = activeTournaments.length > 0
    ? [...activeTournaments].sort((a, b) => new Date((a as any).createdAt).getTime() - new Date((b as any).createdAt).getTime())[0].id
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PLAN_BADGE: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
    starter: { label: "Starter", color: "#2563EB", bg: "rgba(37,99,235,0.12)", Icon: Rocket },
    pro:     { label: "Pro",     color: "#059669", bg: "rgba(5,150,105,0.12)",  Icon: Zap },
    elite:   { label: "Elite",   color: "#EA580C", bg: "rgba(234,88,12,0.12)",  Icon: Crown },
    free:    { label: "Free",    color: "#059669", bg: "rgba(5,150,105,0.12)",  Icon: Gift },
  };

  function getPlanBadge(tournament: typeof tournamentCards[number]) {
    const plan = (tournament as any).plan as string ?? "free";
    if (plan !== "free") return PLAN_BADGE[plan] ?? PLAN_BADGE.free;
    const isFreeSeat = tournament.id === freeSeatId;
    if (isFreeSeat) return PLAN_BADGE.free;
    return { label: "Upgrade", color: "#DC2626", bg: "rgba(220,38,38,0.1)", Icon: Lock };
  }

  return (
    <div className="space-y-6 w-full">
      {/* Редирект-уведомление: турнир заблокирован из-за запроса на удаление */}
      {pendingDeletion && (
        <div className="rounded-xl border px-4 py-3 flex items-start gap-3"
          style={{ background: "rgba(220,38,38,0.06)", borderColor: "rgba(220,38,38,0.25)" }}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#DC2626" }} />
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
              {t("tournamentLockedTitle")}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("tournamentLockedDesc")}
            </p>
          </div>
        </div>
      )}

      {/* Заголовок */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold th-text">{t("dashboard")}</h1>
          {!isEmpty && (
            <p className="text-sm th-text-2 mt-1">
              {tournaments.length} {t("tournaments").toLowerCase()} · {totalTeams} {t("teams").toLowerCase()} · {totalClubs} {t("clubs").toLowerCase()}
            </p>
          )}
        </div>
        <Link
          href={`/org/${orgSlug}/admin/tournaments`}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}
        >
          <Plus className="w-4 h-4" />
          {t("newTournament")}
        </Link>
      </div>

      {isEmpty ? (
        <div className="th-card border th-border rounded-lg p-12 text-center">
          <Trophy className="w-10 h-10 th-text-m mx-auto mb-3" />
          <p className="th-text-2 mb-4">{t("noTournaments")}</p>
          <Link
            href={`/org/${orgSlug}/admin/tournaments`}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}
          >
            <Plus className="w-4 h-4" />
            {t("heroCta")}
          </Link>
        </div>
      ) : (
        <>
          {/* Статистика */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: t("tournaments"), value: tournaments.length, icon: Trophy },
              { label: t("clubs"), value: totalClubs, icon: Users },
              { label: t("teams"), value: totalTeams, icon: Users },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="th-card border th-border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 th-text-2" />
                  <div>
                    <p className="text-2xl font-bold th-text">{value}</p>
                    <p className="text-xs th-text-2">{label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Список турниров */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide th-text-m mb-3">
              {t("yourTournaments")}
            </h2>
            <div className="space-y-2">
              {tournamentCards.map((tournament) => {
                const isPendingDelete = !!(tournament as any).deleteRequestedAt;
                const planBadge = getPlanBadge(tournament);
                const PlanBadgeIcon = planBadge.Icon;
                return (
                  <div key={tournament.id} className="flex items-center gap-2">
                    {isPendingDelete ? (
                      /* Pending-deletion: non-clickable card */
                      <div className="flex flex-1 items-center gap-4 th-card border rounded-lg p-4"
                        style={{ opacity: 0.65, borderColor: "rgba(220,38,38,0.3)", cursor: "default" }}>
                        <Trophy className="w-5 h-5 shrink-0" style={{ color: "#DC2626" }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-medium th-text">{tournament.name}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                              style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}>
                              <Hourglass className="w-3 h-3" />
                              {t("pendingDeletion")}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold"
                              style={{ background: planBadge.bg, color: planBadge.color }}>
                              <PlanBadgeIcon className="w-3 h-3" />
                              {planBadge.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs th-text-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {tournament.year}
                            </span>
                            <span>{t("classesCount").replace("{n}", String(tournament.classCount))}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Normal: clickable card */
                      <Link
                        href={`/org/${orgSlug}/admin/tournament/${tournament.id}`}
                        className="flex flex-1 items-center gap-4 th-card border th-border rounded-lg p-4 hover:th-bg group transition-colors"
                      >
                        <Trophy className="w-5 h-5 shrink-0" style={{ color: "var(--cat-accent)" }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-medium th-text">{tournament.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              tournament.registrationOpen ? "bg-emerald-50 text-emerald-600" : "th-tag"
                            }`}>
                              {tournament.registrationOpen ? t("regOpen") : t("regClosed")}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold"
                              style={{ background: planBadge.bg, color: planBadge.color }}>
                              <PlanBadgeIcon className="w-3 h-3" />
                              {planBadge.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs th-text-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {tournament.year}
                            </span>
                            <span>{tournament.clubCount} {t("clubs").toLowerCase()}</span>
                            <span>{tournament.teamCount} {t("teams").toLowerCase()}</span>
                            <span>{t("classesCount").replace("{n}", String(tournament.classCount))}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 th-text-m group-hover:th-text-2 shrink-0" />
                      </Link>
                    )}

                    {/* Right-side action button */}
                    {isPendingDelete ? (
                      <CancelDeleteButton
                        orgSlug={orgSlug}
                        tournamentId={tournament.id}
                        label={t("cancelRequest")}
                      />
                    ) : (
                      <Link
                        href={`/org/${orgSlug}/admin/tournament/${tournament.id}/setup`}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border th-border th-card hover:th-bg transition-colors"
                        style={{ color: "var(--cat-accent)" }}
                        title={t("setup")}
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t("setup")}</span>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
