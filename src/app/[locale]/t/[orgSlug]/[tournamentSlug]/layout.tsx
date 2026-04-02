import { db } from "@/db";
import { organizations, tournaments, tournamentClasses, clubs, teams } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { TournamentPublicProvider } from "@/lib/tournament-public-context";
import { TournamentTopbar } from "@/components/tournament/tournament-topbar";
import { TournamentSidebar } from "@/components/tournament/tournament-sidebar";

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

  const [clubCount] = await db.select({ count: count() }).from(clubs).where(eq(clubs.tournamentId, tournament.id));
  const [teamCount] = await db.select({ count: count() }).from(teams).where(eq(teams.tournamentId, tournament.id));

  const classesWithCounts = await Promise.all(classes.map(async (cls) => {
    const [tc] = await db.select({ count: count() }).from(teams)
      .where(and(eq(teams.tournamentId, tournament.id), eq(teams.classId, cls.id)));
    return { id: cls.id, name: cls.name, format: cls.format, minBirthYear: cls.minBirthYear, maxBirthYear: cls.maxBirthYear, maxPlayers: cls.maxPlayers, teamCount: Number(tc?.count ?? 0) };
  }));

  const days = tournament.startDate && tournament.endDate
    ? Math.ceil((new Date(tournament.endDate).getTime() - new Date(tournament.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : null;

  const brand = org.brandColor ?? "#272D2D";

  const data = {
    org: { name: org.name, slug: org.slug, logo: org.logo, brandColor: brand, city: org.city, country: org.country, contactEmail: org.contactEmail, website: org.website },
    tournament: { id: tournament.id, name: tournament.name, slug: tournament.slug, year: tournament.year, description: tournament.description, logoUrl: tournament.logoUrl, registrationOpen: tournament.registrationOpen, registrationDeadline: tournament.registrationDeadline ? tournament.registrationDeadline.toISOString() : null, startDate: tournament.startDate ? tournament.startDate.toISOString() : null, endDate: tournament.endDate ? tournament.endDate.toISOString() : null, currency: tournament.currency },
    stats: { clubCount: Number(clubCount?.count ?? 0), teamCount: Number(teamCount?.count ?? 0), classCount: classes.length, days },
    classes: classesWithCounts,
  };

  return (
    <ThemeProvider defaultTheme="light">
      <TournamentPublicProvider data={data}>
        <div className="min-h-screen bg-gray-50">
          <TournamentTopbar />

          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex gap-6">
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
              />

              <main className="flex-1 min-w-0">
                {children}
              </main>
            </div>
          </div>

          <footer className="border-t border-gray-200 bg-white mt-10">
            <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-gray-500">
              <span>&copy; {new Date().getFullYear()} {org.name}</span>
              <a href="/catalog" className="flex items-center gap-1.5 hover:text-gray-700">
                <img src="/logo.png" alt="" className="w-4 h-4 rounded" /> Goality TMC
              </a>
            </div>
          </footer>
        </div>
      </TournamentPublicProvider>
    </ThemeProvider>
  );
}
