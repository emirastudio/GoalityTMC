import { db } from "@/db";
import { tournaments, organizations, teams, tournamentClasses, tournamentRegistrations, listingTournaments } from "@/db/schema";
import { eq, count, sql, or } from "drizzle-orm";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { PublicNavHeader } from "@/components/ui/public-nav-header";
import { CatalogClient, type TournamentEntry } from "./catalog-client";

/* ─── Загрузка данных из БД ─── */
async function getEnrichedTournaments(): Promise<TournamentEntry[]> {
  try {
    const allRaw = await db.query.tournaments.findMany({
      orderBy: (t, { desc }) => [desc(t.startDate)],
    });

    // Exclude soft-deleted and filter out free-plan tournaments that need an upgrade.
    // Rule: for each org, only the oldest active (non-deleted) free tournament is eligible.
    // Paid-plan tournaments are always eligible.
    const orgOldestFreeTournamentId: Record<number, number> = {};
    for (const t of allRaw) {
      if (t.deletedAt || (t as any).deleteRequestedAt) continue;
      if ((t.plan as string) !== "free") continue;
      const existing = orgOldestFreeTournamentId[t.organizationId];
      if (existing === undefined) {
        orgOldestFreeTournamentId[t.organizationId] = t.id;
      } else {
        // Keep the oldest (smallest createdAt)
        const existingT = allRaw.find(x => x.id === existing)!;
        if (new Date(t.createdAt).getTime() < new Date(existingT.createdAt).getTime()) {
          orgOldestFreeTournamentId[t.organizationId] = t.id;
        }
      }
    }

    const all = allRaw.filter(t => {
      if (t.deletedAt || (t as any).deleteRequestedAt) return false;
      if ((t.plan as string) !== "free") return true; // paid always eligible
      return t.id === orgOldestFreeTournamentId[t.organizationId];
    });

    const managed: TournamentEntry[] = await Promise.all(all.map(async (tournament) => {
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, tournament.organizationId),
      });
      const cls = await db.query.tournamentClasses.findMany({
        where: eq(tournamentClasses.tournamentId, tournament.id),
      });
      const [tc] = await db.select({ count: count() }).from(tournamentRegistrations)
        .where(eq(tournamentRegistrations.tournamentId, tournament.id));
      const [cc] = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${teams.clubId})` })
        .from(tournamentRegistrations)
        .innerJoin(teams, eq(tournamentRegistrations.teamId, teams.id))
        .where(eq(tournamentRegistrations.tournamentId, tournament.id));

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
          cardImageUrl: (tournament as any).cardImageUrl ?? null,
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

    // Also include active listing tournaments
    const activeListings = await db.query.listingTournaments.findMany({
      where: or(
        eq(listingTournaments.subscriptionStatus, "active"),
        eq(listingTournaments.subscriptionStatus, "trialing")
      ),
      orderBy: (lt, { desc }) => [desc(lt.startDate)],
      with: { organization: true },
    });

    const listingEntries: TournamentEntry[] = activeListings.map((lt) => {
      // Parse structured ageGroups and formats from JSON fields
      let ageGroups: { name: string; gender: string; minBirthYear: number; maxBirthYear: number }[] = [];
      let formats: string[] = [];
      try { ageGroups = JSON.parse(lt.ageGroups ?? "[]"); } catch { /* */ }
      try {
        const raw = JSON.parse(lt.formats ?? "[]");
        formats = Array.isArray(raw) ? raw : [];
      } catch { /* */ }

      // Map ageGroups to catalog classes (enables age filter)
      const classes = ageGroups.map((ag, i) => ({
        id: i,
        name: ag.name,
        format: formats[0] ?? null,
      }));

      return {
        tournament: {
          id: lt.id,
          name: lt.name,
          slug: lt.slug,
          year: lt.startDate ? new Date(lt.startDate).getFullYear() : new Date().getFullYear(),
          registrationOpen: false,
          startDate: lt.startDate ? new Date(lt.startDate).toISOString() : null,
          endDate: lt.endDate ? new Date(lt.endDate).toISOString() : null,
          logoUrl: lt.logoUrl,
          coverUrl: lt.coverUrl ?? null,
          cardImageUrl: (lt as any).cardImageUrl ?? null,
        },
        org: lt.organization ? {
          name: lt.organization.name,
          slug: lt.organization.slug,
          logo: lt.organization.logo,
          city: lt.city ?? lt.organization.city,
          country: lt.country ?? lt.organization.country,
          brandColor: lt.organization.brandColor ?? "#2BFEBA",
        } : null,
        classes,
        teamCount: 0,
        clubCount: 0,
        entryType: "listing" as const,
      };
    });

    return [...managed, ...listingEntries];
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
