import { db } from "@/db";
import { tournaments, organizations, teams, clubs, tournamentClasses } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { Trophy, Calendar, MapPin, ArrowRight, Globe, Plus } from "lucide-react";

function formatDate(d: Date | string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function CatalogPage() {
  const allTournaments = await db.query.tournaments.findMany({
    orderBy: (t, { desc }) => [desc(t.startDate)],
  });

  const enriched = await Promise.all(
    allTournaments.map(async (tournament) => {
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, tournament.organizationId),
      });
      const classes = await db.query.tournamentClasses.findMany({
        where: eq(tournamentClasses.tournamentId, tournament.id),
      });
      const [teamCount] = await db.select({ count: count() }).from(teams).where(eq(teams.tournamentId, tournament.id));
      const [clubCount] = await db.select({ count: count() }).from(clubs).where(eq(clubs.tournamentId, tournament.id));
      return { tournament, org, classes, teamCount: Number(teamCount?.count ?? 0), clubCount: Number(clubCount?.count ?? 0) };
    })
  );

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      {/* Navbar */}
      <header className="bg-white border-b border-border sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-mint flex items-center justify-center">
              <Trophy className="w-4 h-4 text-[#0D1117]" />
            </div>
            <span className="font-bold text-text-primary text-[15px]">Goality TMC</span>
          </div>
          <Link href="/en/login" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-[#0D1117] py-14">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-mint text-[11px] font-semibold uppercase tracking-widest mb-3">Tournament Catalog</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Find Your Tournament</h1>
          <p className="text-white/50 text-sm max-w-md mx-auto">
            Browse football tournaments, view details and register your club online.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        {enriched.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-16 text-center">
            <Trophy className="w-12 h-12 text-border mx-auto mb-4" />
            <h2 className="text-base font-semibold text-text-primary mb-1">No tournaments yet</h2>
            <p className="text-sm text-text-secondary">Check back soon for upcoming events.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {enriched.map(({ tournament: t, org, classes, teamCount, clubCount }) => {
              const brand = org?.brandColor ?? "#272D2D";
              const href = org?.slug ? `/t/${org.slug}/${t.slug}` : `/club/register?tournamentId=${t.id}`;
              const initials = org?.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";

              return (
                <Link key={t.id} href={href} className="group block bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-all overflow-hidden">
                  <div className="h-1.5 w-full" style={{ backgroundColor: brand }} />
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      {org?.logo ? (
                        <img src={org.logo} alt={org.name} className="w-10 h-10 rounded-xl object-contain border border-border" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: brand + "20" }}>
                          <span className="text-[12px] font-bold" style={{ color: brand }}>{initials}</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-text-secondary truncate">{org?.name}</p>
                        <p className="text-[13px] font-bold text-text-primary truncate">{t.name}</p>
                      </div>
                      <div className="shrink-0">
                        {t.registrationOpen ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Open
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold bg-surface text-text-secondary border border-border rounded-full px-2 py-0.5">
                            Closed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="space-y-1.5 mb-4">
                      {(t.startDate || t.endDate) && (
                        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          {formatDate(t.startDate)}{t.endDate ? ` — ${formatDate(t.endDate)}` : ""}
                        </div>
                      )}
                      {org?.city && (
                        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          {org.city}{org.country ? `, ${org.country}` : ""}
                        </div>
                      )}
                    </div>

                    {/* Classes pills */}
                    {classes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {classes.slice(0, 5).map(c => (
                          <span key={c.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full border" style={{ borderColor: brand + "40", color: brand, backgroundColor: brand + "10" }}>
                            {c.name}
                          </span>
                        ))}
                        {classes.length > 5 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border text-text-secondary">
                            +{classes.length - 5}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Footer stats */}
                    <div className="flex items-center gap-3 pt-3 border-t border-border">
                      <div className="text-center flex-1">
                        <p className="text-sm font-bold text-text-primary">{teamCount}</p>
                        <p className="text-[10px] text-text-secondary">Teams</p>
                      </div>
                      <div className="w-px h-5 bg-border" />
                      <div className="text-center flex-1">
                        <p className="text-sm font-bold text-text-primary">{classes.length}</p>
                        <p className="text-[10px] text-text-secondary">Classes</p>
                      </div>
                      <div className="w-px h-5 bg-border" />
                      <div className="text-center flex-1">
                        <p className="text-sm font-bold text-text-primary">{clubCount}</p>
                        <p className="text-[10px] text-text-secondary">Clubs</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-border group-hover:text-text-secondary transition-colors ml-auto" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Organizer CTA */}
        <div className="mt-10 bg-[#0D1117] rounded-2xl p-8 text-center">
          <p className="text-white/50 text-[11px] font-semibold uppercase tracking-widest mb-2">For organizers</p>
          <h3 className="text-lg font-bold text-white mb-4">Want to host your own tournament?</h3>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 bg-mint text-[#0D1117] font-semibold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Get started free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-white mt-10">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between text-xs text-text-secondary">
          <span>© {new Date().getFullYear()} Goality Sport Group</span>
          <div className="flex items-center gap-1">
            <Globe className="w-3 h-3" />
            <span>Goality TMC</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
