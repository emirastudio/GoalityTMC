import { getSession } from "@/lib/auth";
import { authorizeOrg, getOrgTournament } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { teams, clubs, payments } from "@/db/schema";
import { eq, count, sum } from "drizzle-orm";
import {
  Users,
  Wallet,
  Trophy,
  ArrowLeft,
  Settings,
  Package,
  Mail,
  ClipboardList,
  Layers,
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

  // Stats
  const [teamCount] = await db
    .select({ value: count() })
    .from(teams)
    .where(eq(teams.tournamentId, tournament.id));

  const [clubCount] = await db
    .select({ value: count() })
    .from(clubs)
    .where(eq(clubs.tournamentId, tournament.id));

  const [paymentSum] = await db
    .select({ value: sum(payments.amount) })
    .from(payments)
    .innerJoin(teams, eq(payments.teamId, teams.id))
    .where(eq(teams.tournamentId, tournament.id));

  const basePath = `/org/${orgSlug}/admin/tournament/${tournamentId}`;

  const quickLinks = [
    { key: "teams", icon: Users, href: `${basePath}/teams` },
    { key: "services", icon: Package, href: `${basePath}/services` },
    { key: "packages", icon: Layers, href: `${basePath}/packages` },
    { key: "payments", icon: Wallet, href: `${basePath}/payments` },
    { key: "messages", icon: Mail, href: `${basePath}/messages` },
    { key: "registrations", icon: ClipboardList, href: `${basePath}/registrations` },
    { key: "settings", icon: Settings, href: `${basePath}/settings` },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href={`/org/${orgSlug}/admin`}
          className="th-text-2 hover:th-text"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold th-text">{tournament.name}</h1>
          <p className="th-text-2 text-sm">
            {tournament.year} &middot;{" "}
            <span className={tournament.registrationOpen ? "text-green-600" : "text-gray-500"}>
              {tournament.registrationOpen ? t("regOpen") : t("regClosed")}
            </span>
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="th-card rounded-xl border th-border p-6">
          <p className="text-2xl font-bold th-text">{Number(clubCount?.value ?? 0)}</p>
          <p className="text-sm th-text-2">{t("clubs")}</p>
        </div>
        <div className="th-card rounded-xl border th-border p-6">
          <p className="text-2xl font-bold th-text">{Number(teamCount?.value ?? 0)}</p>
          <p className="text-sm th-text-2">{t("teams")}</p>
        </div>
        <div className="th-card rounded-xl border th-border p-6">
          <p className="text-2xl font-bold th-text">
            {tournament.currency} {Number(paymentSum?.value ?? 0).toFixed(0)}
          </p>
          <p className="text-sm th-text-2">{t("payments")}</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickLinks.map(({ key, icon: Icon, href }) => (
          <Link
            key={key}
            href={href}
            className="flex flex-col items-center gap-2 th-card rounded-xl border th-border p-5 hover:border-navy/30 transition-colors"
          >
            <Icon className="w-6 h-6 text-navy" />
            <span className="text-sm font-medium th-text">{t(key)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
