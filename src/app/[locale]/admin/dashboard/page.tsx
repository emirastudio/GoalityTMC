import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { organizations, tournaments, teams } from "@/db/schema";
import { count } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { Building2, Trophy, Users, ArrowRight } from "lucide-react";

export default async function SuperAdminDashboardPage() {
  const t = await getTranslations("superAdmin");

  const [orgCount] = await db.select({ value: count() }).from(organizations);
  const [tournamentCount] = await db.select({ value: count() }).from(tournaments);
  const [teamCount] = await db.select({ value: count() }).from(teams);

  const recentOrgs = await db.query.organizations.findMany({
    orderBy: (o, { desc }) => [desc(o.createdAt)],
    limit: 10,
  });

  const stats = [
    { label: t("totalOrganizations"), value: Number(orgCount?.value ?? 0), icon: Building2 },
    { label: t("totalTournaments"), value: Number(tournamentCount?.value ?? 0), icon: Trophy },
    { label: t("totalTeams"), value: Number(teamCount?.value ?? 0), icon: Users },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
        <p className="text-text-secondary mt-1">{t("subtitle")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-border p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-navy" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{value}</p>
                <p className="text-sm text-text-secondary">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Organizations List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">{t("organizations")}</h2>
          <Link
            href="/admin/organizations"
            className="text-sm text-navy font-medium hover:underline flex items-center gap-1"
          >
            {t("viewDetails")} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentOrgs.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center">
            <Building2 className="w-12 h-12 text-text-secondary/30 mx-auto mb-4" />
            <p className="text-text-secondary">{t("noOrganizations")}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-3 text-xs font-medium text-text-secondary uppercase">{t("orgName")}</th>
                  <th className="px-6 py-3 text-xs font-medium text-text-secondary uppercase">{t("country")}</th>
                  <th className="px-6 py-3 text-xs font-medium text-text-secondary uppercase">{t("plan")}</th>
                  <th className="px-6 py-3 text-xs font-medium text-text-secondary uppercase">{t("contact")}</th>
                  <th className="px-6 py-3 text-xs font-medium text-text-secondary uppercase">{t("createdAt")}</th>
                </tr>
              </thead>
              <tbody>
                {recentOrgs.map((org) => (
                  <tr key={org.id} className="border-b border-border last:border-0 hover:bg-navy/5">
                    <td className="px-6 py-3">
                      <Link
                        href={`/org/${org.slug}/admin`}
                        className="text-sm font-medium text-navy hover:underline"
                      >
                        {org.name}
                      </Link>
                      <p className="text-xs text-text-secondary">/{org.slug}</p>
                    </td>
                    <td className="px-6 py-3 text-sm text-text-secondary">
                      {org.country ?? "-"}{org.city ? `, ${org.city}` : ""}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        org.plan === "premium" ? "bg-gold/20 text-gold" :
                        org.plan === "basic" ? "bg-navy/10 text-navy" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {org.plan}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-text-secondary">
                      {org.contactEmail ?? "-"}
                    </td>
                    <td className="px-6 py-3 text-sm text-text-secondary">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
