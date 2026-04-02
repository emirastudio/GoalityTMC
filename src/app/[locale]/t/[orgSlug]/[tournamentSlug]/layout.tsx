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

  // Hex to rgba helper for cover gradient
  const r = parseInt(brand.slice(1, 3), 16);
  const g = parseInt(brand.slice(3, 5), 16);
  const b = parseInt(brand.slice(5, 7), 16);
  const coverGradient = `linear-gradient(135deg, rgb(${r},${g},${b}) 0%, rgba(${Math.max(r-20,0)},${Math.max(g-20,0)},${Math.max(b-20,0)},1) 100%)`;

  return (
    <ThemeProvider defaultTheme="light">
      <TournamentPublicProvider data={data}>
        <div data-theme="light" style={{ background: "var(--cat-bg)", minHeight: "100vh" }}>
          {/* Global Goality topbar */}
          <TournamentTopbar />

          {/* Cover banner */}
          <div className="relative h-44 overflow-hidden" style={{ background: coverGradient }}>
            {/* Decorative mesh */}
            <div className="absolute inset-0 opacity-[0.08]"
              style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
            <div className="absolute inset-0"
              style={{ background: `radial-gradient(ellipse at 70% 50%, rgba(255,255,255,0.08) 0%, transparent 60%)` }} />
            {/* Org + tournament watermark */}
            <div className="absolute bottom-5 left-6">
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">{org.name}</p>
              <h1 className="text-2xl font-black text-white/20 leading-tight">{tournament.name}</h1>
            </div>
          </div>

          {/* Main content area */}
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex gap-5 items-start">
              {/* LEFT SIDEBAR - overlaps cover */}
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

              {/* RIGHT CONTENT - overlaps cover slightly less */}
              <main className="-mt-8 flex-1 min-w-0 pb-16">
                {children}
              </main>
            </div>
          </div>

          {/* Footer */}
          <footer className="border-t mt-10" style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
            <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between text-xs" style={{ color: "var(--cat-text-muted)" }}>
              <span>© {new Date().getFullYear()} {org.name}</span>
              <a href="/catalog" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity font-medium" style={{ color: "var(--cat-text-secondary)" }}>
                <img src="/logo.png" alt="" className="w-4 h-4 rounded" /> Goality TMC
              </a>
            </div>
          </footer>
        </div>
      </TournamentPublicProvider>
    </ThemeProvider>
  );
}
