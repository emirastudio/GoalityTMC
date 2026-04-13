import { getSession } from "@/lib/auth";
import { authorizeOrg, getOrgTournaments } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { teams, tournamentRegistrations } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { Trophy, Calendar, ChevronRight, ArrowLeft, Users, Hourglass, Lock, Zap, Rocket, Crown, Gift } from "lucide-react";
import { TournamentsPageClient } from "./page-client";

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

  // For the "free slot used" check: only count tournaments NOT pending deletion
  const activeTournaments = rawTournaments.filter(
    (t) => !(t as any).deleteRequestedAt
  );
  const activeCount = activeTournaments.length;

  // Free seat = oldest active tournament
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

  function getPlanBadge(tournament: typeof rawTournaments[number]) {
    const plan = (tournament as any).plan as string ?? "free";
    if (plan !== "free") return PLAN_BADGE[plan] ?? PLAN_BADGE.free;
    const isFreeSeat = tournament.id === freeSeatId;
    if (isFreeSeat) return PLAN_BADGE.free;
    return { label: "Upgrade", color: "#DC2626", bg: "rgba(220,38,38,0.1)", Icon: Lock };
  }

  const tournaments = await Promise.all(
    rawTournaments.map(async (tournament) => {
      const [teamCount] = await db.select({ value: count() }).from(tournamentRegistrations).where(eq(tournamentRegistrations.tournamentId, tournament.id));
      const [clubCount] = await db.select({ value: sql<number>`COUNT(DISTINCT ${teams.clubId})` }).from(tournamentRegistrations).innerJoin(teams, eq(tournamentRegistrations.teamId, teams.id)).where(eq(tournamentRegistrations.tournamentId, tournament.id));
      return {
        ...tournament,
        teamCount: Number(teamCount?.value ?? 0),
        clubCount: Number(clubCount?.value ?? 0),
      };
    })
  );

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/org/${orgSlug}/admin`}
          className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all hover:opacity-80 shrink-0"
          style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)" }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{organization.name}</p>
          <h1 className="text-xl font-black" style={{ color: "var(--cat-text)" }}>{t("tournaments")}</h1>
        </div>
      </div>

      {/* Client: "New Tournament" button + modal */}
      <TournamentsPageClient orgSlug={orgSlug} locale={locale} existingCount={activeCount} />

      {/* Tournaments list */}
      {tournaments.length > 0 ? (
        <div>
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "var(--cat-text-muted)" }}>
            {t("yourTournaments")} · {tournaments.length}
          </p>
          <div className="space-y-2">
            {tournaments.map((tournament) => {
              const isPendingDelete = !!(tournament as any).deleteRequestedAt;
              const planBadge = getPlanBadge(tournament);
              const PlanBadgeIcon = planBadge.Icon;
              return (
              <Link
                key={tournament.id}
                href={`/org/${orgSlug}/admin/tournament/${tournament.id}`}
                className="flex items-center gap-4 rounded-2xl border p-4 transition-all group hover:opacity-90"
                style={{
                  background: "var(--cat-card-bg)",
                  borderColor: isPendingDelete ? "rgba(220,38,38,0.35)" : planBadge.label === "Upgrade" ? "rgba(220,38,38,0.25)" : "var(--cat-card-border)",
                  opacity: isPendingDelete ? 0.75 : 1,
                }}
              >
                {/* Logo or icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ background: isPendingDelete ? "rgba(220,38,38,0.08)" : "rgba(43,254,186,0.1)" }}>
                  {tournament.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tournament.logoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Trophy className="w-6 h-6" style={{ color: isPendingDelete ? "#DC2626" : "var(--cat-accent)" }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-black text-sm" style={{ color: "var(--cat-text)" }}>
                      {tournament.name}
                    </h3>
                    {isPendingDelete ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                        style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}>
                        <Hourglass className="w-2.5 h-2.5" />
                        {t("pendingDeletion")}
                      </span>
                    ) : (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={
                          tournament.registrationOpen
                            ? { background: "rgba(16,185,129,0.12)", color: "#10b981" }
                            : { background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }
                        }
                      >
                        {tournament.registrationOpen ? t("regOpen") : t("regClosed")}
                      </span>
                    )}
                    {/* Plan badge */}
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                      style={{ background: planBadge.bg, color: planBadge.color }}>
                      <PlanBadgeIcon className="w-2.5 h-2.5" />
                      {planBadge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: "var(--cat-text-muted)" }}>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {tournament.year}
                    </span>
                    {tournament.teamCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {tournament.teamCount}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                  style={{ color: "var(--cat-text-muted)" }} />
              </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed p-12 text-center"
          style={{ borderColor: "var(--cat-card-border)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(43,254,186,0.08)" }}>
            <Trophy className="w-8 h-8" style={{ color: "var(--cat-text-muted)" }} />
          </div>
          <p className="text-sm font-bold mb-1" style={{ color: "var(--cat-text)" }}>{t("noTournaments")}</p>
          <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("createFirst")}</p>
        </div>
      )}
    </div>
  );
}
