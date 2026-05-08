import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { organizations, tournaments, tournamentRegistrations } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { OrganizationsListClient } from "./organizations-list-client";

export default async function OrganizationsPage() {
  const t = await getTranslations("superAdmin");

  const orgs = await db.query.organizations.findMany({
    orderBy: (o, { desc }) => [desc(o.createdAt)],
  });

  const enrichedOrgs = await Promise.all(
    orgs.map(async (org) => {
      const [tc] = await db.select({ value: count() }).from(tournaments).where(eq(tournaments.organizationId, org.id));
      const tournamentIds = await db.select({ id: tournaments.id }).from(tournaments).where(eq(tournaments.organizationId, org.id));
      let teamCount = 0;
      for (const tnm of tournamentIds) {
        const [reg] = await db.select({ value: count() }).from(tournamentRegistrations).where(eq(tournamentRegistrations.tournamentId, tnm.id));
        teamCount += Number(reg?.value ?? 0);
      }
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        country: org.country ?? null,
        city: org.city ?? null,
        plan: org.plan,
        eliteSubStatus: org.eliteSubStatus ?? null,
        eliteSubPeriodEnd: org.eliteSubPeriodEnd ? org.eliteSubPeriodEnd.toISOString() : null,
        eliteSubId: org.eliteSubId ?? null,
        tournamentsCount: Number(tc?.value ?? 0),
        teamsCount: teamCount,
      };
    })
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold th-text">{t("organizations")}</h1>
      <OrganizationsListClient initialOrgs={enrichedOrgs} />
    </div>
  );
}
