import { TeamSidebar } from "@/components/team/team-sidebar";
import { MobileNav } from "@/components/team/mobile-nav";
import { TeamHeader } from "@/components/team/team-header";
import { TeamSwitcher } from "@/components/club/team-switcher";
import { TournamentSwitcher, type TournamentOption } from "@/components/team/tournament-switcher";
import { SidebarFooter } from "@/components/team/sidebar-footer";
import { TeamProvider } from "@/lib/team-context";
import { ImpersonationBanner } from "@/components/team/impersonation-banner";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { GlobalHeader, AdminHeaderActions } from "@/components/ui/global-header";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { clubs, teams, people, tournaments, tournamentClasses, inboxMessages, teamMessageReads, messageRecipients, tournamentRegistrations } from "@/db/schema";
import { eq, and, count, sql, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session || session.role !== "club" || !session.clubId) {
    redirect("/en/login");
  }

  const club = await db.query.clubs.findFirst({
    where: eq(clubs.id, session.clubId),
  });

  if (!club) redirect("/en/login");

  const clubTeams = await db.query.teams.findMany({
    where: eq(teams.clubId, club.id),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });

  // Load ALL registrations for club's teams (across all tournaments)
  const clubTeamIds = clubTeams.map((t) => t.id);
  const allRegistrations = clubTeamIds.length > 0
    ? await db.query.tournamentRegistrations.findMany({
        where: sql`${tournamentRegistrations.teamId} = ANY(ARRAY[${sql.join(clubTeamIds.map(id => sql`${id}`), sql`, `)}]::int[])`,
        orderBy: (r, { desc }) => [desc(r.createdAt)],
      })
    : [];

  // Guard: no tournament registrations → redirect to club dashboard
  if (allRegistrations.length === 0) {
    redirect("/en/club/dashboard");
  }

  // Determine which tournaments this club is registered in
  const allTournamentIds = [...new Set(allRegistrations.map(r => r.tournamentId))];

  // Read active tournament preference from cookie
  const cookieStore = await cookies();
  const prefTournamentId = parseInt(cookieStore.get("active_tournament_id")?.value ?? "0") || null;
  const clubTournamentId = (prefTournamentId && allTournamentIds.includes(prefTournamentId))
    ? prefTournamentId
    : allTournamentIds[0]!;

  // Fetch all tournament metadata for the switcher
  const allTournamentsData = await db.query.tournaments.findMany({
    where: sql`${tournaments.id} = ANY(ARRAY[${sql.join(allTournamentIds.map(id => sql`${id}`), sql`, `)}]::int[])`,
    columns: { id: true, name: true, logoUrl: true, year: true },
  });

  // Build tournament options for the switcher (count how many of MY teams are in each)
  const tournamentOptions: TournamentOption[] = allTournamentsData.map(t => ({
    id: t.id,
    name: t.name,
    logoUrl: t.logoUrl,
    year: t.year,
    teamsCount: allRegistrations.filter(r => r.tournamentId === t.id).length,
  }));
  const currentTournamentOption = tournamentOptions.find(t => t.id === clubTournamentId) ?? tournamentOptions[0]!;

  // Use only registrations for the ACTIVE tournament
  const registrations = allRegistrations.filter(r => r.tournamentId === clubTournamentId);

  // Build regByTeamId map for active tournament
  const regByTeamId = new Map<number, typeof registrations[0]>();
  for (const reg of registrations) {
    regByTeamId.set(reg.teamId, reg);
  }

  const classes = await db.query.tournamentClasses.findMany({
    where: eq(tournamentClasses.tournamentId, clubTournamentId),
    orderBy: (c, { asc }) => [asc(c.minBirthYear)],
  });

  // Get classes for these registrations
  const classIds = [...new Set(registrations.map((r) => r.classId).filter(Boolean))] as number[];
  const classesData = classIds.length > 0
    ? await db.query.tournamentClasses.findMany({ where: sql`${tournamentClasses.id} = ANY(ARRAY[${sql.join(classIds.map(id => sql`${id}`), sql`, `)}]::int[])` })
    : [];
  const classMap = new Map(classesData.map((c) => [c.id, c]));

  const activeTournamentId = clubTournamentId;

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

      const reg = regByTeamId.get(team.id);
      const className = reg?.classId ? (classMap.get(reg.classId)?.name ?? "") : "";

      // Build display name: priority = reg.displayName, then team.name, then derived
      const displayName = reg?.displayName ?? team.name ?? null;

      return {
        id: team.id,
        regNumber: reg?.regNumber ?? 0,
        name: team.name ?? "",
        displayName,
        birthYear: team.birthYear ?? null,
        gender: (team.gender ?? "male") as "male" | "female" | "mixed",
        squadAlias: reg?.squadAlias ?? "",
        className,
        status: reg?.status ?? "draft",
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
  if (activeTeam && clubTournamentId) {
    const activeReg = regByTeamId.get(activeTeam.id);
    const activeRegId = activeReg?.id ?? null;

    const [countRow] = await db
      .select({ value: sql<number>`COUNT(*)` })
      .from(inboxMessages)
      .where(
        and(
          eq(inboxMessages.tournamentId, clubTournamentId),
          or(
            eq(inboxMessages.sendToAll, true),
            activeRegId
              ? sql`EXISTS (
                  SELECT 1 FROM ${messageRecipients}
                  WHERE ${messageRecipients.messageId} = ${inboxMessages.id}
                  AND ${messageRecipients.registrationId} = ${activeRegId}
                )`
              : sql`false`
          ),
          activeRegId
            ? sql`NOT EXISTS (
                SELECT 1 FROM ${teamMessageReads}
                WHERE ${teamMessageReads.messageId} = ${inboxMessages.id}
                AND ${teamMessageReads.registrationId} = ${activeRegId}
              )`
            : sql`true`
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
      initialTournamentId={clubTournamentId}
      initialInboxCount={inboxCount}
      isTeamManager={isTeamManager}
    >
      {isImpersonating && <ImpersonationBanner clubName={club.name} />}

      <div className="flex flex-col min-h-screen" style={{ background: "var(--cat-bg)" }}>
        <GlobalHeader rightContent={<AdminHeaderActions isSuper={!!session.isSuper} currentArea="team" />} />

        <div className="flex flex-1 min-h-0">

        {/* ── Desktop Sidebar ───────────────────────────────── */}
        <aside className="hidden md:flex flex-col w-60 shrink-0 overflow-hidden border-r" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>

          {/* Tournament + Club / team switcher */}
          <div className="px-3 py-3 shrink-0 border-b space-y-2" style={{ borderColor: "var(--cat-card-border)" }}>
            {/* Tournament context */}
            <TournamentSwitcher
              current={currentTournamentOption}
              all={tournamentOptions}
            />

            {/* Club + team */}
            {isTeamManager ? (
              <div className="flex items-center gap-2.5 px-1">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                  style={{ background: "var(--badge-success-bg)", borderColor: "var(--badge-success-border)" }}>
                  <span className="text-[11px] font-bold" style={{ color: "var(--badge-success-color)" }}>{clubInitials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold truncate th-text">{club.name}</p>
                  <p className="text-[11px] truncate th-text-2">
                    {activeTeam?.displayName ?? activeTeam?.name ?? ""}
                    {activeTeam?.birthYear ? ` · ${activeTeam.birthYear}` : ""}
                  </p>
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
