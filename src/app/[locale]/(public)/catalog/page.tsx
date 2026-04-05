import { db } from "@/db";
import { tournaments, organizations, teams, clubs, tournamentClasses } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { PublicNavHeader } from "@/components/ui/public-nav-header";
import { CatalogClient, type TournamentEntry } from "./catalog-client";

/* ─── Загрузка данных из БД ─── */
async function getEnrichedTournaments(): Promise<TournamentEntry[]> {
  try {
    const all = await db.query.tournaments.findMany({
      orderBy: (t, { desc }) => [desc(t.startDate)],
    });

    return await Promise.all(all.map(async (tournament) => {
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, tournament.organizationId),
      });
      const cls = await db.query.tournamentClasses.findMany({
        where: eq(tournamentClasses.tournamentId, tournament.id),
      });
      const [tc] = await db.select({ count: count() }).from(teams)
        .where(eq(teams.tournamentId, tournament.id));
      const [cc] = await db.select({ count: count() }).from(clubs)
        .where(eq(clubs.tournamentId, tournament.id));

      return {
        tournament: {
          id: tournament.id,
          name: tournament.name,
          slug: tournament.slug,
          year: tournament.year,
          registrationOpen: tournament.registrationOpen,
          startDate: tournament.startDate ? tournament.startDate.toISOString() : null,
          endDate: tournament.endDate ? tournament.endDate.toISOString() : null,
          logoUrl: tournament.logoUrl,
          coverUrl: (tournament as any).coverUrl ?? null,
        },
        org: org ? {
          name: org.name,
          slug: org.slug,
          logo: org.logo,
          city: org.city,
          country: org.country,
          brandColor: org.brandColor ?? "#2BFEBA",
        } : null,
        classes: cls.map(c => ({ id: c.id, name: c.name, format: c.format })),
        teamCount: Number(tc?.count ?? 0),
        clubCount: Number(cc?.count ?? 0),
      };
    }));
  } catch {
    return [];
  }
}

export default async function CatalogPage() {
  const entries = await getEnrichedTournaments();

  const stats = {
    tournaments: entries.length,
    teams: entries.reduce((s, e) => s + e.teamCount, 0),
    clubs: entries.reduce((s, e) => s + e.clubCount, 0),
    classes: entries.reduce((s, e) => s + e.classes.length, 0),
  };

  return (
    <ThemeProvider defaultTheme="dark">
      {/* Обёртка с фоном — чтобы backdrop-blur хедера видел тёмный фон, а не серый body */}
      <div className="min-h-screen" style={{ background: "var(--cat-bg)" }}>
        <PublicNavHeader />
        <CatalogClient entries={entries} stats={stats} />
      </div>
    </ThemeProvider>
  );
}
