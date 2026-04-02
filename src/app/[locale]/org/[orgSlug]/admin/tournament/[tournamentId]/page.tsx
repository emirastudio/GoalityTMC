import { getSession } from "@/lib/auth";
import { authorizeOrg, getOrgTournament } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { teams, clubs, payments } from "@/db/schema";
import { eq, count, sum } from "drizzle-orm";
import {
  Users, Wallet, Trophy, ArrowLeft, Settings,
  Package, Mail, ClipboardList, Wrench,
  ExternalLink,
} from "lucide-react";

type Props = {
  params: Promise<{ locale: string; orgSlug: string; tournamentId: string }>;
};

export default async function TournamentOverviewPage({ params }: Props) {
  const { locale, orgSlug, tournamentId } = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") redirect(`/${locale}/login`);

  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) redirect(`/${locale}/login`);

  const tournament = await getOrgTournament(parseInt(tournamentId), organization.id);
  if (!tournament) redirect(`/${locale}/org/${orgSlug}/admin/tournaments`);

  const t = await getTranslations("orgAdmin");
  const tNav = await getTranslations("nav");

  const [teamCount] = await db.select({ value: count() }).from(teams).where(eq(teams.tournamentId, tournament.id));
  const [clubCount] = await db.select({ value: count() }).from(clubs).where(eq(clubs.tournamentId, tournament.id));
  const [paymentSum] = await db
    .select({ value: sum(payments.amount) })
    .from(payments)
    .innerJoin(teams, eq(payments.teamId, teams.id))
    .where(eq(teams.tournamentId, tournament.id));

  const basePath = `/org/${orgSlug}/admin/tournament/${tournamentId}`;

  const quickLinks = [
    { key: "registrations", icon: ClipboardList, href: `${basePath}/registrations` },
    { key: "teams", icon: Users, href: `${basePath}/teams` },
    { key: "servicesPackages", icon: Package, href: `${basePath}/services-packages` },
    { key: "payments", icon: Wallet, href: `${basePath}/payments` },
    { key: "messages", icon: Mail, href: `${basePath}/messages` },
    { key: "setup", icon: Wrench, href: `${basePath}/setup` },
    { key: "settings", icon: Settings, href: `${basePath}/settings` },
  ];

  const stats = [
    { label: t("clubs"), value: Number(clubCount?.value ?? 0), icon: Users },
    { label: t("teams"), value: Number(teamCount?.value ?? 0), icon: Users },
    {
      label: t("payments"),
      value: `${tournament.currency ?? ""} ${Number(paymentSum?.value ?? 0).toFixed(0)}`,
      icon: Wallet,
    },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Заголовок турнира */}
      <div className="flex items-start gap-4">
        <Link href={`/org/${orgSlug}/admin`}
          className="w-8 h-8 rounded-lg flex items-center justify-center mt-1 th-card th-border border th-text-2 hover:th-bg shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold th-text">{tournament.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              tournament.registrationOpen
                ? "bg-emerald-50 text-emerald-600"
                : "th-tag"
            }`}>
              {tournament.registrationOpen ? t("regOpen") : t("regClosed")}
            </span>
          </div>
          <p className="text-sm th-text-2 mt-0.5">
            {organization.name} · {tournament.year}
          </p>
        </div>
        <Link
          href={`/t/${organization.slug}/${tournament.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium shrink-0"
          style={{ color: "var(--cat-accent)" }}
          target="_blank">
          <ExternalLink className="w-3.5 h-3.5" />
          {t("tournamentPage")}
        </Link>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="th-card border th-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 th-text-2" />
              <div>
                <p className="text-2xl font-bold th-text">{value}</p>
                <p className="text-xs th-text-2">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Быстрая навигация */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide th-text-m mb-3">
          {t("management")}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map(({ key, icon: Icon, href }) => (
            <Link
              key={key}
              href={href}
              className="flex flex-col items-center gap-2 th-card border th-border rounded-lg p-4 text-center hover:th-bg transition-colors"
            >
              <Icon className="w-5 h-5 th-text-2" />
              <span className="text-xs font-medium th-text-2">
                {tNav(key)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
