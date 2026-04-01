import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { tournaments, organizations, teams, clubs, tournamentClasses } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import {
  Trophy,
  Users,
  Calendar,
  MapPin,
  Building2,
  ArrowRight,
  Plus,
} from "lucide-react";

export default async function CatalogPage() {
  const t = await getTranslations("catalog");

  // Get all tournaments with registration open
  const allTournaments = await db.query.tournaments.findMany({
    where: eq(tournaments.registrationOpen, true),
    orderBy: (t, { asc }) => [asc(t.startDate)],
  });

  const enriched = await Promise.all(
    allTournaments.map(async (tournament) => {
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, tournament.organizationId),
      });

      const [teamCount] = await db
        .select({ value: count() })
        .from(teams)
        .where(eq(teams.tournamentId, tournament.id));

      const [clubCount] = await db
        .select({ value: count() })
        .from(clubs)
        .where(eq(clubs.tournamentId, tournament.id));

      const classes = await db.query.tournamentClasses.findMany({
        where: eq(tournamentClasses.tournamentId, tournament.id),
        orderBy: (c, { asc }) => [asc(c.minBirthYear)],
      });

      return { tournament, org, teamCount: Number(teamCount?.value ?? 0), clubCount: Number(clubCount?.value ?? 0), classes };
    })
  );

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-navy text-white">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-white/70 mt-2 text-lg">{t("subtitle")}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {enriched.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-16 text-center">
            <Trophy className="w-16 h-16 text-text-secondary/20 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">{t("noTournaments")}</h2>
            <p className="text-text-secondary">{t("checkBack")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {enriched.map(({ tournament, org, teamCount, clubCount, classes }) => (
              <div
                key={tournament.id}
                className="bg-white rounded-xl border border-border overflow-hidden hover:border-navy/30 transition-colors"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-text-primary">
                        {tournament.name}
                      </h2>

                      {org && (
                        <p className="text-sm text-text-secondary mt-1 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" />
                          {t("organizedBy")}: {org.name}
                          {org.country && ` · ${org.country}`}
                          {org.city && `, ${org.city}`}
                        </p>
                      )}

                      {tournament.description && (
                        <p className="text-text-secondary mt-3 text-sm leading-relaxed">
                          {tournament.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-text-secondary">
                        {tournament.startDate && tournament.endDate && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {t("dates")}:{" "}
                            {new Date(tournament.startDate).toLocaleDateString()} —{" "}
                            {new Date(tournament.endDate).toLocaleDateString()}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          {clubCount} {t("clubs")} · {teamCount} {t("teams")}
                        </span>
                      </div>

                      {classes.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                            {t("classes")}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {classes.map((cls) => (
                              <span
                                key={cls.name}
                                className="px-2.5 py-1 rounded-full bg-navy/5 text-navy text-xs font-medium"
                              >
                                {cls.name}
                                {cls.format ? ` (${cls.format})` : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="ml-6 shrink-0">
                      <Link
                        href={`/club/register?tournamentId=${tournament.id}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-light transition-colors"
                      >
                        {t("register")}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>

                {tournament.registrationDeadline && (
                  <div className="px-6 py-3 bg-gold/5 border-t border-gold/20 text-sm text-text-secondary">
                    {t("deadline")}:{" "}
                    <span className="font-medium text-text-primary">
                      {new Date(tournament.registrationDeadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CTA for organizers */}
        <div className="mt-12 bg-navy/5 rounded-xl border border-navy/10 p-8 text-center">
          <h3 className="text-lg font-semibold text-text-primary">{t("createYourOwn")}</h3>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 mt-4 rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("createCta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
