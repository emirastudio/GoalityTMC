import { db } from "@/db";
import { organizations, tournaments, tournamentClasses, clubs, teams } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { TournamentPublicProvider } from "@/lib/tournament-public-context";
import { PublicNavHeader } from "@/components/ui/public-nav-header";
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

          {/* ── Full-width cover (image + gradients only, no title) ── */}
          <div
            className="relative w-full overflow-hidden"
            style={{
              height: "280px",
              background: tournament.coverUrl
                ? undefined
                : "linear-gradient(135deg, #0B1320 0%, #0D1F12 50%, #0B1320 100%)",
            }}
          >
            {/* Cover photo */}
            {tournament.coverUrl && (
              <img
                src={tournament.coverUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
            )}

            {/* Fallback: blurred logo when no cover */}
            {!tournament.coverUrl && tournament.logoUrl && (
              <img
                src={tournament.logoUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ opacity: 0.08, filter: "blur(60px)", transform: "scale(1.3)" }}
              />
            )}

            {/* Bottom gradient — strong so cards sit cleanly on top */}
            <div
              className="absolute inset-x-0 bottom-0 pointer-events-none"
              style={{
                height: "85%",
                background: tournament.coverUrl
                  ? "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.75) 35%, rgba(0,0,0,0.3) 65%, transparent 100%)"
                  : "linear-gradient(to bottom, transparent 0%, #0A0E14 85%)",
              }}
            />

            {/* Decorative glow (only without cover) */}
            {!tournament.coverUrl && (
              <>
                <div className="absolute inset-x-0 top-0 h-48 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse 80% 120% at 50% -10%, ${brand}35 0%, transparent 70%)` }} />
                <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
                  style={{ backgroundImage: `linear-gradient(${brand}80 1px, transparent 1px), linear-gradient(90deg, ${brand}80 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
              </>
            )}
          </div>

          {/* ── Content: sidebar OVERLAPS cover ── */}
          <div className="w-[90%] max-w-[1400px] mx-auto relative z-10" style={{ marginTop: "-116px" }}>
            <div className="flex gap-8 items-start">
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

              {/* Main content — cards overlap cover by ~half a card */}
              <main className="flex-1 min-w-0" style={{ paddingTop: "52px" }}>
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
