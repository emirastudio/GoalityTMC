import { db } from "@/db";
import { organizations, tournaments, tournamentClasses, teams, tournamentRegistrations } from "@/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { TournamentPublicProvider } from "@/lib/tournament-public-context";
import { PublicNavHeader } from "@/components/ui/public-nav-header";
import { TournamentSidebar } from "@/components/tournament/tournament-sidebar";
import { TournamentMobileTabs } from "@/components/tournament/tournament-mobile-tabs";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string; orgSlug: string; tournamentSlug: string }>;
};

export default async function TournamentLayout({ children, params }: Props) {
  const { locale, orgSlug, tournamentSlug } = await params;

  const org = await db.query.organizations.findFirst({ where: eq(organizations.slug, orgSlug) });
  if (!org) redirect(`/${locale}/catalog`);

  const tournament = await db.query.tournaments.findFirst({
    where: and(eq(tournaments.organizationId, org.id), eq(tournaments.slug, tournamentSlug)),
  });
  if (!tournament) redirect(`/${locale}/catalog`);

  const classes = await db.query.tournamentClasses.findMany({
    where: eq(tournamentClasses.tournamentId, tournament.id),
    orderBy: (c, { asc }) => [asc(c.minBirthYear)],
  });

  const [clubCount] = await db.select({ count: sql<number>`COUNT(DISTINCT ${teams.clubId})` }).from(tournamentRegistrations).innerJoin(teams, eq(tournamentRegistrations.teamId, teams.id)).where(eq(tournamentRegistrations.tournamentId, tournament.id));
  const [teamCount] = await db.select({ count: count() }).from(tournamentRegistrations).where(eq(tournamentRegistrations.tournamentId, tournament.id));

  const classesWithCounts = await Promise.all(classes.map(async (cls) => {
    const [tc] = await db.select({ count: count() }).from(tournamentRegistrations)
      .where(and(eq(tournamentRegistrations.tournamentId, tournament.id), eq(tournamentRegistrations.classId, cls.id)));
    return {
      id: cls.id,
      name: cls.name,
      format: cls.format,
      minBirthYear: cls.minBirthYear,
      maxBirthYear: cls.maxBirthYear,
      maxPlayers: cls.maxPlayers,
      teamCount: Number(tc?.count ?? 0),
    };
  }));

  const days = tournament.startDate && tournament.endDate
    ? Math.ceil((new Date(tournament.endDate).getTime() - new Date(tournament.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : null;

  const brand = org.brandColor ?? "#272D2D";
  const effectiveCover = tournament.coverUrl ?? "/defaults/tournament-cover-default.jpg";

  const data = {
    org: { name: org.name, slug: org.slug, logo: org.logo, brandColor: brand, city: org.city, country: org.country, contactEmail: org.contactEmail, website: org.website },
    tournament: { id: tournament.id, name: tournament.name, slug: tournament.slug, year: tournament.year, description: tournament.description, logoUrl: tournament.logoUrl, coverUrl: tournament.coverUrl ?? null, registrationOpen: tournament.registrationOpen, registrationDeadline: tournament.registrationDeadline ? tournament.registrationDeadline.toISOString() : null, startDate: tournament.startDate ? tournament.startDate.toISOString() : null, endDate: tournament.endDate ? tournament.endDate.toISOString() : null, currency: tournament.currency },
    stats: { clubCount: Number(clubCount?.count ?? 0), teamCount: Number(teamCount?.count ?? 0), classCount: classes.length, days },
    classes: classesWithCounts,
  };

  return (
    <ThemeProvider defaultTheme="dark">
      <TournamentPublicProvider data={data}>
        <div className="min-h-screen" style={{ background: "var(--cat-bg)" }}>
          <PublicNavHeader />
          <TournamentMobileTabs orgSlug={orgSlug} tournamentSlug={tournamentSlug} brandColor={brand} />

          {/* ── Full-width cover (image + gradients only, no title) ── */}
          <div
            className="relative w-full overflow-hidden"
            style={{ height: "280px" }}
          >
            {/* Cover photo — always shown (default if none uploaded) */}
            <img
              src={effectiveCover}
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />

            {/* Bottom gradient */}
            <div
              className="absolute inset-x-0 bottom-0 pointer-events-none"
              style={{
                height: "85%",
                background: "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.75) 35%, rgba(0,0,0,0.3) 65%, transparent 100%)",
              }}
            />

            {/* Brand glow overlay */}
            <div className="absolute inset-x-0 top-0 h-32 pointer-events-none"
              style={{ background: `radial-gradient(ellipse 80% 120% at 50% -10%, ${brand}25 0%, transparent 70%)` }} />
          </div>

          {/* ── Content: sidebar OVERLAPS cover ── */}
          <div className="w-full md:w-[90%] md:max-w-[1400px] mx-auto relative z-10 px-4 md:px-0" style={{ marginTop: "-116px" }}>
            {/* Desktop: sidebar + content side by side */}
            <div className="hidden md:flex gap-8 items-start">
              <TournamentSidebar
                orgSlug={orgSlug}
                tournamentSlug={tournamentSlug}
                tournamentName={tournament.name}
                orgName={org.name}
                logoUrl={tournament.logoUrl}
                brandColor={brand}
                registrationOpen={tournament.registrationOpen}
                startDate={tournament.startDate ? tournament.startDate.toISOString() : null}
                endDate={tournament.endDate ? tournament.endDate.toISOString() : null}
                city={org.city}
                country={org.country}
                classes={classesWithCounts}
                clubCount={Number(clubCount?.count ?? 0)}
                teamCount={Number(teamCount?.count ?? 0)}
              />
              <main className="flex-1 min-w-0" style={{ paddingTop: "52px" }}>
                {children}
              </main>
            </div>

            {/* Mobile: full-width stacked layout */}
            <div className="md:hidden" style={{ paddingTop: "52px" }}>
              {/* Compact tournament card on mobile */}
              <div className="rounded-2xl border mb-4 overflow-hidden" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(16px)", borderColor: `${brand}40` }}>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {tournament.logoUrl && (
                      <img src={tournament.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover border" style={{ borderColor: `${brand}40` }} />
                    )}
                    <div className="min-w-0">
                      <h1 className="text-base font-black truncate" style={{ color: "#fff" }}>{tournament.name}</h1>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>{org.name}</p>
                    </div>
                    {tournament.registrationOpen && (
                      <span className="ml-auto shrink-0 text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: `${brand}22`, color: brand, border: `1px solid ${brand}44` }}>
                        Open
                      </span>
                    )}
                  </div>
                  {/* Quick stats row */}
                  <div className="flex gap-4 text-center">
                    <div>
                      <p className="text-lg font-black" style={{ color: brand }}>{Number(clubCount?.count ?? 0)}</p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>Clubs</p>
                    </div>
                    <div>
                      <p className="text-lg font-black text-white">{Number(teamCount?.count ?? 0)}</p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>Teams</p>
                    </div>
                    {classes.length > 0 && (
                      <div>
                        <p className="text-lg font-black text-white">{classes.length}</p>
                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>Divisions</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Page content full-width */}
              <main className="w-full">
                {children}
              </main>
            </div>
          </div>

          <footer className="border-t mt-12" style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
            <div className="w-[90%] max-w-[1400px] mx-auto py-4 flex items-center justify-between text-xs" style={{ color: "var(--cat-text-muted)" }}>
              <span>&copy; {new Date().getFullYear()} {org.name}</span>
              <a href="/catalog" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                <img src="/logo.png" alt="" className="w-4 h-4 rounded" /> Goality TMC
              </a>
            </div>
          </footer>
        </div>
      </TournamentPublicProvider>
    </ThemeProvider>
  );
}
