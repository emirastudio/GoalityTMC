import { TeamHeader } from "@/components/team/team-header";
import { TeamSidebar } from "@/components/team/team-sidebar";
import { MobileNav } from "@/components/team/mobile-nav";
import { TeamSwitcher } from "@/components/club/team-switcher";
import { TeamProvider } from "@/lib/team-context";
import { SiteFooter } from "@/components/ui/site-footer";
import { ImpersonationBanner } from "@/components/team/impersonation-banner";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { clubs, teams, people, tournamentClasses, inboxMessages, teamMessageReads, messageRecipients, tournaments } from "@/db/schema";
import { eq, and, count, sql, notInArray, or } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session || session.role !== "club" || !session.clubId) {
    redirect("/en/login");
  }

  const club = await db.query.clubs.findFirst({
    where: eq(clubs.id, session.clubId),
  });

  if (!club) redirect("/en/login");

  // Get tournament classes for "add team" modal
  const classes = await db.query.tournamentClasses.findMany({
    where: eq(tournamentClasses.tournamentId, club.tournamentId),
    orderBy: (c, { asc }) => [asc(c.minBirthYear)],
  });

  // Get all teams for this club
  const clubTeams = await db.query.teams.findMany({
    where: eq(teams.clubId, club.id),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });

  // Enrich with player counts and class names
  const enrichedTeams = await Promise.all(
    clubTeams.map(async (team) => {
      const [pc] = await db
        .select({ count: count() })
        .from(people)
        .where(and(eq(people.teamId, team.id), eq(people.personType, "player")));
      const [sc] = await db
        .select({ count: count() })
        .from(people)
        .where(and(eq(people.teamId, team.id), eq(people.personType, "staff")));

      let className = "";
      if (team.classId) {
        const cls = await db.query.tournamentClasses.findFirst({
          where: eq(tournamentClasses.id, team.classId),
        });
        className = cls?.name ?? "";
      }

      return {
        id: team.id,
        regNumber: team.regNumber,
        name: team.name ?? "",
        className,
        status: team.status,
        playersCount: Number(pc?.count ?? 0),
        staffCount: Number(sc?.count ?? 0),
      };
    })
  );

  // Тренер команды видит только свою команду
  const isTeamManager = !!session.teamId;
  const isImpersonating = !!session.impersonating;
  const activeTeam = isTeamManager
    ? enrichedTeams.find((t) => t.id === session.teamId) ?? enrichedTeams[0]
    : enrichedTeams[0];

  // Unread inbox count for active team (only messages visible to this team)
  let inboxCount = 0;
  if (activeTeam) {
    const [countRow] = await db
      .select({ value: sql<number>`COUNT(*)` })
      .from(inboxMessages)
      .where(
        and(
          eq(inboxMessages.tournamentId, club.tournamentId),
          or(
            eq(inboxMessages.sendToAll, true),
            sql`EXISTS (
              SELECT 1 FROM ${messageRecipients}
              WHERE ${messageRecipients.messageId} = ${inboxMessages.id}
              AND ${messageRecipients.teamId} = ${activeTeam.id}
            )`
          ),
          sql`NOT EXISTS (
            SELECT 1 FROM ${teamMessageReads}
            WHERE ${teamMessageReads.messageId} = ${inboxMessages.id}
            AND ${teamMessageReads.teamId} = ${activeTeam.id}
          )`
        )
      );
    inboxCount = Number(countRow?.value ?? 0);
  }

  return (
    <TeamProvider
      initialTeamId={activeTeam?.id ?? null}
      initialClubId={club.id}
      initialTournamentId={club.tournamentId}
      initialInboxCount={inboxCount}
      isTeamManager={isTeamManager}
    >
      <div className="flex flex-col min-h-screen">
        {isImpersonating && <ImpersonationBanner clubName={club.name} />}
        <TeamHeader
          teamName={activeTeam?.name}
          regNumber={activeTeam?.regNumber}
          year={2026}
          clubName={club.name}
          clubBadgeUrl={club.badgeUrl ?? null}
          clubId={club.id}
          teams={enrichedTeams.map(t => ({
            id: t.id,
            name: t.name,
            className: t.className,
            status: t.status,
            playersCount: t.playersCount,
          }))}
          classes={classes.map(c => ({ id: c.id, name: c.name }))}
          isTeamManager={isTeamManager}
        />
        <div className="flex flex-1">
          {/* Desktop sidebar */}
          <div className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-white">
            <div className="p-4 border-b border-border">
              {isTeamManager ? (
                /* Тренер команды — показываем только название без переключения */
                <div className="flex items-center gap-2.5 px-1">
                  <div className="w-9 h-9 rounded-full bg-navy/10 border border-navy/20 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-navy">
                      {club.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-text-primary truncate leading-tight">{club.name}</p>
                    <p className="text-[11px] text-text-secondary leading-tight truncate">{activeTeam?.name}</p>
                  </div>
                </div>
              ) : (
                <TeamSwitcher
                  clubName={club.name}
                  clubBadgeUrl={club.badgeUrl ?? null}
                  clubId={club.id}
                  teams={enrichedTeams}
                  classes={classes.map(c => ({ id: c.id, name: c.name }))}
                />
              )}
            </div>
            <div className="p-3 flex-1">
              <TeamSidebar />
            </div>
          </div>
          {/* Main content — extra bottom padding on mobile for bottom nav */}
          <main className="flex-1 p-4 md:p-6 bg-surface pb-20 md:pb-6 flex flex-col">
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </main>
        </div>
        {/* Mobile bottom nav */}
        <MobileNav />
      </div>
    </TeamProvider>
  );
}
