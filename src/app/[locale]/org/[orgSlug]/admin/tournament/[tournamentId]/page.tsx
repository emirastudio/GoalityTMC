import { getSession } from "@/lib/auth";
import { authorizeOrg, getOrgTournament } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { teams, payments, tournamentClasses, tournamentFields, tournamentStages, tournamentRegistrations } from "@/db/schema";
import { eq, count, sum, sql } from "drizzle-orm";
import {
  Users, Wallet, Trophy, ArrowLeft, Settings,
  Package, Mail, ClipboardList, Wrench,
  ExternalLink, Link2, Share2, QrCode, Megaphone,
  Copy, MessageSquare, Send, LayoutGrid,
} from "lucide-react";
import { TournamentMediaUpload } from "@/components/admin/tournament-media-upload";
import { TournamentSetupChecklist, type ChecklistStep } from "@/components/admin/tournament-setup-checklist";

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

  const [teamCount] = await db.select({ value: count() }).from(tournamentRegistrations).where(eq(tournamentRegistrations.tournamentId, tournament.id));
  const [clubCount] = await db.select({ value: sql<number>`COUNT(DISTINCT ${teams.clubId})` }).from(tournamentRegistrations).innerJoin(teams, eq(tournamentRegistrations.teamId, teams.id)).where(eq(tournamentRegistrations.tournamentId, tournament.id));
  const [paymentSum] = await db
    .select({ value: sum(payments.amount) })
    .from(payments)
    .innerJoin(tournamentRegistrations, eq(payments.registrationId, tournamentRegistrations.id))
    .where(eq(tournamentRegistrations.tournamentId, tournament.id));

  /* Checklist data */
  const [classCount] = await db.select({ value: count() }).from(tournamentClasses).where(eq(tournamentClasses.tournamentId, tournament.id));
  const [fieldCount] = await db.select({ value: count() }).from(tournamentFields).where(eq(tournamentFields.tournamentId, tournament.id));
  const [stageCount] = await db.select({ value: count() }).from(tournamentStages).where(eq(tournamentStages.tournamentId, tournament.id));

  const basePath = `/org/${orgSlug}/admin/tournament/${tournamentId}`;

  /* Setup checklist steps */
  const checklistSteps: ChecklistStep[] = [
    { id: "tournament", done: true, href: `${basePath}/settings` },
    { id: "division",   done: Number(classCount?.value ?? 0) > 0, href: `${basePath}/setup` },
    { id: "fields",     done: Number(fieldCount?.value ?? 0) > 0,  href: `${basePath}/setup` },
    { id: "registration", done: !!tournament.registrationOpen,     href: `${basePath}/settings` },
    { id: "format",     done: Number(stageCount?.value ?? 0) > 0,  href: `${basePath}/setup` },
  ];

  /* Public registration URL */
  const registerUrl = `https://goality.ee/${locale}/t/${organization.slug}/${tournament.slug}/register`;
  const publicUrl   = `https://goality.ee/${locale}/t/${organization.slug}/${tournament.slug}`;

  const quickLinks = [
    { key: "registrations", icon: ClipboardList, href: `${basePath}/registrations`, color: "#10B981" },
    { key: "teams",         icon: Users,         href: `${basePath}/teams`,         color: "#3B82F6" },
    { key: "servicesPackages", icon: Package,    href: `${basePath}/offerings`,         color: "#F59E0B" },
    { key: "payments",      icon: Wallet,        href: `${basePath}/payments`,       color: "#8B5CF6" },
    { key: "messages",      icon: Mail,          href: `${basePath}/messages`,       color: "#EC4899" },
    { key: "setup",         icon: Wrench,        href: `${basePath}/setup`,          color: "#06B6D4" },
    { key: "settings",      icon: Settings,      href: `${basePath}/settings`,       color: "#84CC16" },
    { key: "planner",       icon: LayoutGrid,    href: `${basePath}/planner`,        color: "#06B6D4" },
  ];

  const stats = [
    { label: t("clubs"),    value: Number(clubCount?.value ?? 0),  icon: Users,   color: "#3B82F6" },
    { label: t("teams"),    value: Number(teamCount?.value ?? 0),   icon: Trophy,  color: "#10B981" },
    { label: t("payments"), value: `${tournament.currency ?? "EUR"} ${Number(paymentSum?.value ?? 0).toFixed(0)}`, icon: Wallet, color: "#F59E0B" },
  ];

  /* Invite channels */
  const inviteChannels = [
    {
      icon: MessageSquare,
      label: t("channelWhatsApp"),
      desc: t("shareViaWhatsapp"),
      color: "#25D366",
      href: `https://wa.me/?text=${encodeURIComponent(t("whatsappText", { name: tournament.name }) + `\n\n${registerUrl}`)}`,
    },
    {
      icon: Send,
      label: t("channelTelegram"),
      desc: t("shareViaTelegram"),
      color: "#0088CC",
      href: `https://t.me/share/url?url=${encodeURIComponent(registerUrl)}&text=${encodeURIComponent(t("telegramText", { name: tournament.name }))}`,
    },
    {
      icon: Mail,
      label: t("channelEmail"),
      desc: t("shareViaEmail"),
      color: "#6366F1",
      href: `mailto:?subject=${encodeURIComponent(t("emailSubject", { name: tournament.name }))}&body=${encodeURIComponent(t("emailBody", { name: tournament.name, url: registerUrl }))}`,
    },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href={`/org/${orgSlug}/admin`}
          className="w-8 h-8 rounded-lg flex items-center justify-center mt-1 th-card th-border border th-text-2 hover:th-bg shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold th-text">{tournament.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              tournament.registrationOpen
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400"
                : "th-tag"
            }`}>
              {tournament.registrationOpen ? t("regOpen") : t("regClosed")}
            </span>
          </div>
          <p className="text-sm th-text-2 mt-0.5">{organization.name} · {tournament.year}</p>
        </div>
        <Link href={publicUrl} target="_blank"
          className="inline-flex items-center gap-1.5 text-xs font-medium shrink-0"
          style={{ color: "var(--cat-accent)" }}>
          <ExternalLink className="w-3.5 h-3.5" /> {t("tournamentPage")}
        </Link>
      </div>

      {/* ── Setup checklist (hidden when all done) ── */}
      <TournamentSetupChecklist steps={checklistSteps} basePath={basePath} />

      {/* ── Media: cover + logo ── */}
      <TournamentMediaUpload
        orgSlug={orgSlug}
        tournamentId={tournament.id}
        initialCoverUrl={(tournament as any).coverUrl ?? null}
        initialLogoUrl={tournament.logoUrl ?? null}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="th-card border th-border rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-[40px] opacity-10"
              style={{ background: color }} />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${color}18` }}>
                <Icon className="w-4.5 h-4.5" style={{ color }} />
              </div>
              <div>
                <p className="text-2xl font-black th-text">{value}</p>
                <p className="text-xs th-text-2">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── INVITE & REFERRAL ── */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid var(--cat-divider)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--cat-badge-open-bg)" }}>
            <Megaphone className="w-4.5 h-4.5" style={{ color: "var(--cat-accent)" }} />
          </div>
          <div>
            <h2 className="text-sm font-black th-text">{t("inviteTeams")}</h2>
            <p className="text-[11px] th-text-2">{t("inviteTeamsDesc")}</p>
          </div>
          {tournament.registrationOpen && (
            <span className="ml-auto flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
              style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)", border: "1px solid var(--cat-badge-open-border)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" /> {t("registrationOpen")}
            </span>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* Registration link */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest mb-2 th-text-2">
              {t("registrationLinkLabel")}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-mono truncate"
                style={{ background: "var(--cat-input-bg)", borderColor: "var(--cat-input-border)", color: "var(--cat-text-secondary)" }}>
                <Link2 className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-accent)" }} />
                <span className="truncate text-[12px]">{registerUrl}</span>
              </div>
              {/* Copy button (client-side, use a tag for now) */}
              <a href={registerUrl} target="_blank"
                className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[12px] font-bold border transition-all hover:opacity-80"
                style={{ background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-badge-open-border)", color: "var(--cat-accent)" }}>
                <ExternalLink className="w-3.5 h-3.5" /> {t("open")}
              </a>
            </div>
          </div>

          {/* Share channels */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest mb-2 th-text-2">
              {t("shareLabel")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {inviteChannels.map(ch => (
                <a key={ch.label} href={ch.href} target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all hover:scale-[1.02] hover:opacity-80"
                  style={{ background: `${ch.color}12`, borderColor: `${ch.color}30` }}>
                  <ch.icon className="w-5 h-5" style={{ color: ch.color }} />
                  <span className="text-[11px] font-bold" style={{ color: ch.color }}>{ch.label}</span>
                </a>
              ))}
            </div>
          </div>

          {/* QR hint */}
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--cat-tag-bg)" }}>
            <QrCode className="w-8 h-8 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
            <div>
              <p className="text-[12px] font-bold th-text">{t("qrCode")}</p>
              <p className="text-[10px] th-text-2">{t("qrCodeSoon")}</p>
            </div>
          </div>

          {/* Referral stats summary */}
          <div className="grid grid-cols-3 gap-3 pt-1" style={{ borderTop: "1px solid var(--cat-divider)" }}>
            <div className="text-center">
              <p className="text-xl font-black th-text">{Number(clubCount?.value ?? 0)}</p>
              <p className="text-[10px] th-text-2">{t("clubsLabel")}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black" style={{ color: "var(--cat-accent)" }}>{Number(teamCount?.value ?? 0)}</p>
              <p className="text-[10px] th-text-2">{t("teamsLabel")}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black th-text">{Number(paymentSum?.value ?? 0) > 0 ? `${Number(paymentSum?.value ?? 0).toFixed(0)}€` : "—"}</p>
              <p className="text-[10px] th-text-2">{t("collectedLabel")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick navigation */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide th-text-m mb-3">
          {t("management")}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map(({ key, icon: Icon, href, color }) => (
            <Link key={key} href={href}
              className="flex flex-col items-center gap-2 th-card border th-border rounded-2xl p-4 text-center hover:th-bg transition-colors group">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: `${color}18` }}>
                <Icon className="w-4.5 h-4.5" style={{ color }} />
              </div>
              <span className="text-xs font-medium th-text-2">{tNav(key)}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
