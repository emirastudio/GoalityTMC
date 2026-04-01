import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { organizations, tournaments, teams } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { Building2, Trophy, Users } from "lucide-react";

export default async function OrganizationsPage() {
  const t = await getTranslations("superAdmin");

  const orgs = await db.query.organizations.findMany({
    orderBy: (o, { desc }) => [desc(o.createdAt)],
  });

  // Enrich with counts
  const enrichedOrgs = await Promise.all(
    orgs.map(async (org) => {
      const [tc] = await db.select({ value: count() }).from(tournaments).where(eq(tournaments.organizationId, org.id));
      const tournamentIds = await db.select({ id: tournaments.id }).from(tournaments).where(eq(tournaments.organizationId, org.id));
      let teamCount = 0;
      for (const t of tournamentIds) {
        const [tc] = await db.select({ value: count() }).from(teams).where(eq(teams.tournamentId, t.id));
        teamCount += Number(tc?.value ?? 0);
      }
      return {
        ...org,
        tournamentsCount: Number(tc?.value ?? 0),
        teamsCount: teamCount,
      };
    })
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">{t("organizations")}</h1>

      {enrichedOrgs.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <Building2 className="w-12 h-12 text-text-secondary/30 mx-auto mb-4" />
          <p className="text-text-secondary">{t("noOrganizations")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {enrichedOrgs.map((org) => (
            <Link
              key={org.id}
              href={`/org/${org.slug}/admin`}
              className="flex items-center justify-between bg-white rounded-xl border border-border p-5 hover:border-navy/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-navy/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-navy" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">{org.name}</h3>
                  <p className="text-sm text-text-secondary">
                    /{org.slug} &middot; {org.country ?? ""}{org.city ? `, ${org.city}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm text-text-secondary">
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" />
                  <span>{org.tournamentsCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>{org.teamsCount}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  org.plan === "premium" ? "bg-gold/20 text-gold" :
                  org.plan === "basic" ? "bg-navy/10 text-navy" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {org.plan}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
