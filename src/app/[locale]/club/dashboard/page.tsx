import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clubs, clubUsers, teams, tournamentRegistrations, tournaments } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Building2, Users, Trophy, Pencil, ExternalLink, Baby, User, Search,
} from "lucide-react";
import { InvitePanel } from "@/components/club/invite-panel";

const GENDER_COLORS: Record<string, string> = {
  male: "#3B82F6",
  female: "#EC4899",
  mixed: "#8B5CF6",
};
const GENDER_ICONS: Record<string, string> = { male: "♂", female: "♀", mixed: "⚥" };

export default async function ClubDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    redirect("/en/login");
  }

  const t = await getTranslations("clubDashboard");
  const locale = await getLocale();

  // 1. Club info
  const club = await db.query.clubs.findFirst({
    where: eq(clubs.id, session.clubId),
  });
  if (!club) redirect("/en/login");

  // Redirect to onboarding if not completed
  if (!club.onboardingComplete) {
    redirect(`/${locale}/club/onboarding`);
  }

  // 2. Club managers
  const managers = await db.query.clubUsers.findMany({
    where: eq(clubUsers.clubId, session.clubId),
    orderBy: (cu, { asc }) => [asc(cu.createdAt)],
  });

  // 3. Club teams — sorted by birthYear desc, then gender
  const clubTeams = await db.query.teams.findMany({
    where: eq(teams.clubId, session.clubId),
    orderBy: (t, { desc, asc }) => [desc(t.birthYear), asc(t.gender), asc(t.createdAt)],
  });

  // 4. Tournament registrations with tournament info
  const clubTeamIds = clubTeams.map((t) => t.id);

  type RegWithTournament = {
    regId: number;
    teamId: number;
    status: string;
    tournamentId: number;
    tournamentName: string;
    tournamentSlug: string;
  };

  let regsWithTournaments: RegWithTournament[] = [];

  if (clubTeamIds.length > 0) {
    const rows = await db
      .select({
        regId: tournamentRegistrations.id,
        teamId: tournamentRegistrations.teamId,
        status: tournamentRegistrations.status,
        tournamentId: tournaments.id,
        tournamentName: tournaments.name,
        tournamentSlug: tournaments.slug,
      })
      .from(tournamentRegistrations)
      .innerJoin(tournaments, eq(tournamentRegistrations.tournamentId, tournaments.id))
      .where(
        sql`${tournamentRegistrations.teamId} = ANY(ARRAY[${sql.join(
          clubTeamIds.map((id) => sql`${id}`),
          sql`, `,
        )}]::int[])`,
      );
    regsWithTournaments = rows;
  }

  // Group registrations by tournament
  const tournamentMap = new Map<
    number,
    { name: string; slug: string; teamCount: number; statuses: string[] }
  >();
  for (const reg of regsWithTournaments) {
    const existing = tournamentMap.get(reg.tournamentId);
    if (existing) {
      existing.teamCount++;
      existing.statuses.push(reg.status);
    } else {
      tournamentMap.set(reg.tournamentId, {
        name: reg.tournamentName,
        slug: reg.tournamentSlug,
        teamCount: 1,
        statuses: [reg.status],
      });
    }
  }

  const tournamentList = Array.from(tournamentMap.entries());

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>
        {t("title")}
      </h1>

      {/* ── Section 1: Club Profile Card ── */}
      <div
        className="rounded-2xl p-6 border"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <div className="flex items-start gap-4">
          {/* Badge */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 text-2xl font-black overflow-hidden"
            style={{
              background: club.badgeUrl
                ? "var(--cat-tag-bg)"
                : "linear-gradient(135deg, var(--cat-accent), var(--cat-accent)cc)",
              color: "#000",
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
              border: club.badgeUrl ? "2px solid var(--cat-card-border)" : "none",
            }}
          >
            {club.badgeUrl ? (
              <img src={club.badgeUrl} alt={club.name} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-8 h-8" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold" style={{ color: "var(--cat-text)" }}>
              {club.name}
            </h2>
            {(club.country || club.city) && (
              <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-secondary)" }}>
                {[club.city, club.country].filter(Boolean).join(", ")}
              </p>
            )}
            {club.contactEmail && (
              <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                {club.contactEmail}
              </p>
            )}
          </div>

          {/* Edit link */}
          <Link
            href="/club/profile"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
            style={{
              background: "var(--cat-tag-bg)",
              color: "var(--cat-accent)",
            }}
          >
            <Pencil className="w-3.5 h-3.5" />
            {t("editProfile")}
          </Link>
        </div>
      </div>

      {/* ── Section 2: Permanent Teams ── */}
      <div className="rounded-2xl border" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: clubTeams.length > 0 ? "1px solid var(--cat-divider)" : undefined }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--cat-text)" }}>
              <Users className="w-5 h-5 inline-block mr-2 -mt-0.5" style={{ color: "var(--cat-accent)" }} />
              {t("teamsTitle")}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("teamsDesc")}
            </p>
          </div>
          <Link href="/catalog"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all hover:opacity-80"
            style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}>
            <Search className="w-3.5 h-3.5" />
            {t("findTournament")}
          </Link>
        </div>

        {clubTeams.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("noTeams")}</p>
            <p className="text-[11px] mt-1" style={{ color: "var(--cat-text-faint)" }}>{t("noTeamsHint")}</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--cat-divider)" }}>
            {clubTeams.map((team) => {
              const gColor = GENDER_COLORS[team.gender] ?? "#64748b";
              const gIcon = GENDER_ICONS[team.gender] ?? "⚥";
              const teamRegs = regsWithTournaments.filter(r => r.teamId === team.id);
              const latestReg = teamRegs[teamRegs.length - 1] ?? null;
              const label = team.name ?? (team.birthYear ? String(team.birthYear) : t("adults"));
              return (
                <div key={team.id} className="flex items-center gap-4 px-6 py-3">
                  {/* Identity badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: `${gColor}18`, color: gColor, border: `1px solid ${gColor}30` }}>
                      {team.birthYear ? <Baby className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {team.birthYear ?? t("adults")} {gIcon}
                    </span>
                  </div>
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--cat-text)" }}>{label}</p>
                    {latestReg && (
                      <p className="text-[11px] truncate" style={{ color: "var(--cat-text-muted)" }}>
                        {latestReg.tournamentName}
                      </p>
                    )}
                  </div>
                  {/* Tournament count */}
                  {teamRegs.length > 0 && (
                    <span className="text-[11px] shrink-0" style={{ color: "var(--cat-text-faint)" }}>
                      {teamRegs.length} {teamRegs.length === 1 ? t("tournament") : t("tournaments")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 3: Team Managers ── */}
      <div
        className="rounded-2xl p-6 border"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--cat-text)" }}>
              <Users className="w-5 h-5 inline-block mr-2 -mt-0.5" style={{ color: "var(--cat-accent)" }} />
              {t("managersTitle")}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("managersDesc")}
            </p>
          </div>
          <InvitePanel
            clubId={session.clubId}
            t={{
              inviteManager: t("inviteManager"),
              inviteTitle: t("inviteTitle"),
              inviteDesc: t("inviteDesc"),
              generateLink: t("generateLink"),
              generateNew: t("generateNew"),
              copy: t("copy"),
              copied: t("copied"),
              sendEmail: t("sendEmail"),
              emailPlaceholder: t("emailPlaceholder"),
              sending: t("sending"),
              emailSent: t("emailSent"),
              emailError: t("emailError"),
              shareWhatsapp: t("shareWhatsapp"),
              shareTelegram: t("shareTelegram"),
              inviteExpires: t("inviteExpires"),
            }}
          />
        </div>

        {managers.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: "var(--cat-text-muted)" }}>
            {t("noManagers")}
          </p>
        ) : (
          <div className="space-y-2">
            {managers.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: "var(--cat-tag-bg)" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: "var(--cat-accent)", color: "#000" }}
                >
                  {(m.name ?? m.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--cat-text)" }}>
                    {m.name ?? m.email}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--cat-text-muted)" }}>
                    {m.email}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                  style={{
                    background: m.teamId ? "rgba(59,130,246,0.12)" : "rgba(16,185,129,0.12)",
                    color: m.teamId ? "#3b82f6" : "#10b981",
                  }}
                >
                  {m.teamId ? t("managerTeam") : t("clubAdmin")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 3: My Tournaments ── */}
      <div
        className="rounded-2xl p-6 border"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--cat-text)" }}>
          <Trophy className="w-5 h-5 inline-block mr-2 -mt-0.5" style={{ color: "var(--cat-accent)" }} />
          {t("tournamentsTitle")}
        </h2>

        {tournamentList.length === 0 ? (
          /* Empty state CTA */
          <div
            className="flex flex-col items-center text-center py-10 px-6 rounded-xl border-2 border-dashed"
            style={{ borderColor: "var(--cat-card-border)" }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--cat-tag-bg)" }}
            >
              <Trophy className="w-7 h-7" style={{ color: "var(--cat-accent)" }} />
            </div>
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--cat-text)" }}>
              {t("findFirstTitle")}
            </h3>
            <p className="text-sm mb-5 max-w-sm" style={{ color: "var(--cat-text-muted)" }}>
              {t("findFirstDesc")}
            </p>
            <Link
              href="/catalog"
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{
                background: "var(--cat-accent)",
                color: "#000",
                boxShadow: "0 2px 12px var(--cat-accent-glow)",
              }}
            >
              {t("browseTournaments")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tournamentList.map(([tid, info]) => (
              <div
                key={tid}
                className="rounded-xl p-4 border transition-all hover:opacity-90"
                style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}
              >
                <h3 className="text-sm font-bold truncate" style={{ color: "var(--cat-text)" }}>
                  {info.name}
                </h3>
                <p className="text-xs mt-1" style={{ color: "var(--cat-text-muted)" }}>
                  {t("teamsRegistered", { count: info.teamCount })}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Link
                    href="/team/overview"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                    style={{ background: "var(--cat-accent)", color: "#000" }}
                  >
                    <ExternalLink className="w-3 h-3" />
                    {t("openPortal")}
                  </Link>
                  {/* Status badges */}
                  {info.statuses.includes("confirmed") && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
                    >
                      Confirmed
                    </span>
                  )}
                  {info.statuses.includes("draft") && !info.statuses.includes("confirmed") && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}
                    >
                      Draft
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
