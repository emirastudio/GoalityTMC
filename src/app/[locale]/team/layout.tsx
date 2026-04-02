import { TeamSidebar } from "@/components/team/team-sidebar";
import { MobileNav } from "@/components/team/mobile-nav";
import { TeamHeader } from "@/components/team/team-header";
import { TeamSwitcher } from "@/components/club/team-switcher";
import { SidebarFooter } from "@/components/team/sidebar-footer";
import { TeamProvider } from "@/lib/team-context";
import { ImpersonationBanner } from "@/components/team/impersonation-banner";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { GlobalHeader, AdminHeaderActions } from "@/components/ui/global-header";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { clubs, teams, people, tournamentClasses, inboxMessages, teamMessageReads, messageRecipients } from "@/db/schema";
import { eq, and, count, sql, or } from "drizzle-orm";
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

  const classes = await db.query.tournamentClasses.findMany({
    where: eq(tournamentClasses.tournamentId, club.tournamentId),
    orderBy: (c, { asc }) => [asc(c.minBirthYear)],
  });

  const clubTeams = await db.query.teams.findMany({
    where: eq(teams.clubId, club.id),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });

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

  const isTeamManager = !!session.teamId;
  const isImpersonating = !!session.impersonating;
  const activeTeam = isTeamManager
    ? enrichedTeams.find((t) => t.id === session.teamId) ?? enrichedTeams[0]
    : enrichedTeams[0];

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

  const clubInitials = club.name
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <ThemeProvider defaultTheme="light">
    <TeamProvider
      initialTeamId={activeTeam?.id ?? null}
      initialClubId={club.id}
      initialTournamentId={club.tournamentId}
      initialInboxCount={inboxCount}
      isTeamManager={isTeamManager}
    >
      {isImpersonating && <ImpersonationBanner clubName={club.name} />}

      <div className="flex flex-col min-h-screen" style={{ background: "var(--cat-bg)" }}>
        <GlobalHeader rightContent={<AdminHeaderActions isSuper={!!session.isSuper} currentArea="team" />} />

        <div className="flex flex-1 min-h-0">

        {/* ── Desktop Sidebar ───────────────────────────────── */}
        <aside className="hidden md:flex flex-col w-60 shrink-0 overflow-hidden border-r" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>

          {/* Club / team switcher */}
          <div className="px-4 py-4 shrink-0 border-b" style={{ borderColor: "var(--cat-card-border)" }}>
            {isTeamManager ? (
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <span className="text-[12px] font-bold text-emerald-600">{clubInitials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold truncate text-gray-900">{club.name}</p>
                  <p className="text-[11px] truncate text-gray-500">{activeTeam?.name}</p>
                </div>
              </div>
            ) : (
              <TeamSwitcher
                clubName={club.name}
                clubBadgeUrl={club.badgeUrl ?? null}
                clubId={club.id}
                teams={enrichedTeams}
                classes={classes.map((c) => ({ id: c.id, name: c.name }))}
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex-1 px-3 py-3 overflow-y-auto">
            <TeamSidebar />
          </div>

          {/* Lang + Logout */}
          <SidebarFooter />
        </aside>

        {/* ── Right side ───────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Mobile header only */}
          <div className="md:hidden">
            <TeamHeader
              teamName={activeTeam?.name}
              regNumber={activeTeam?.regNumber}
              year={2026}
              clubName={club.name}
              clubBadgeUrl={club.badgeUrl ?? null}
              clubId={club.id}
              teams={enrichedTeams.map((t) => ({
                id: t.id,
                name: t.name,
                className: t.className,
                status: t.status,
                playersCount: t.playersCount,
              }))}
              classes={classes.map((c) => ({ id: c.id, name: c.name }))}
              isTeamManager={isTeamManager}
            />
          </div>

          {/* Main content */}
          <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8">
            {children}
          </main>
        </div>
        </div> {/* end flex row */}
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </TeamProvider>
    </ThemeProvider>
  );
}
