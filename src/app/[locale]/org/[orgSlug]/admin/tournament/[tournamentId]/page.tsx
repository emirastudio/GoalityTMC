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
  Package, Mail, ClipboardList, Layers, Wrench,
  TableProperties, ChevronRight, ExternalLink,
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
    { key: "registrations", icon: ClipboardList, href: `${basePath}/registrations`, color: "#3B82F6" },
    { key: "teams", icon: Users, href: `${basePath}/teams`, color: "#10B981" },
    { key: "servicesPackages", icon: Package, href: `${basePath}/services-packages`, color: "#8B5CF6" },
    { key: "payments", icon: Wallet, href: `${basePath}/payments`, color: "#F59E0B" },
    { key: "messages", icon: Mail, href: `${basePath}/messages`, color: "#EF4444" },
    { key: "setup", icon: Wrench, href: `${basePath}/setup`, color: "#06B6D4" },
    { key: "settings", icon: Settings, href: `${basePath}/settings`, color: "#9CA3AF" },
  ];

  const stats = [
    { label: t("clubs"), value: Number(clubCount?.value ?? 0), color: "#3B82F6", icon: Users },
    { label: t("teams"), value: Number(teamCount?.value ?? 0), color: "#10B981", icon: Users },
    {
      label: t("payments"),
      value: `${tournament.currency ?? ""} ${Number(paymentSum?.value ?? 0).toFixed(0)}`,
      color: "#F59E0B",
      icon: Wallet,
    },
  ];

  return (
    <div className="space-y-6 max-w-[900px]">

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href={`/org/${orgSlug}/admin`}
          className="w-8 h-8 rounded-lg flex items-center justify-center mt-1 transition-all hover:opacity-70 shrink-0"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>{tournament.name}</h1>
            <span className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full"
              style={tournament.registrationOpen
                ? { background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)", border: "1px solid var(--cat-badge-open-border)" }
                : { background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)", border: "1px solid var(--cat-tag-border)" }
              }>
              <span className="w-1.5 h-1.5 rounded-full"
                style={{ background: tournament.registrationOpen ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
              {tournament.registrationOpen ? t("regOpen") : t("regClosed")}
            </span>
          </div>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--cat-text-secondary)" }}>
            {organization.name} · {tournament.year}
          </p>
        </div>
        {/* Public link */}
        <Link
          href={`/t/${organization.slug}/${tournament.slug}`}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-xl transition-opacity hover:opacity-80 shrink-0"
          style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)", border: "1px solid var(--cat-badge-open-border)" }}
          target="_blank">
          <ExternalLink className="w-3.5 h-3.5" />
          {t("tournamentPage")}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, color, icon: Icon }) => (
          <div key={label}
            className="cat-card rounded-2xl p-5 border relative overflow-hidden"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none opacity-[0.08] -translate-y-1/2 translate-x-1/2"
              style={{ background: `radial-gradient(circle, ${color}, transparent)` }} />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: color + "18", color }}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black leading-tight" style={{ color: "var(--cat-text)" }}>{value}</p>
                <p className="text-[12px]" style={{ color: "var(--cat-text-muted)" }}>{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick nav */}
      <div>
        <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: "var(--cat-text-muted)" }}>
          {t("management")}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map(({ key, icon: Icon, href, color }) => (
            <Link
              key={key}
              href={href}
              className="cat-card cat-feature flex flex-col items-center gap-3 rounded-2xl p-5 border text-center"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center cat-feature-icon"
                style={{ background: color + "18", color }}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[12px] font-semibold leading-tight" style={{ color: "var(--cat-text-secondary)" }}>
                {tNav(key)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
