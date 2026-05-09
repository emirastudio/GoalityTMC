import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { db } from "@/db";
import { clubUsers, clubUserTeams, clubs, tournaments, organizations, adminUsers, teams, tournamentRegistrations } from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth";
import { sendCoachJoinedNotification } from "@/lib/email";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { allowed, retryAfterSec } = checkRateLimit(`club-login:${ip}`, 10, 15 * 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterSec);

  const body = await req.json();
  const { email, password } = body as { email: string; password: string };
  // Optional: attach the signed-in user to a team during login. Sent
  // by the tournament-registration wizard when a returning coach
  // signs in but the club doesn't yet have them in the junction.
  // We accept BOTH:
  //   attachToTeamId: number — existing team in the SAME club
  //   attachNewTeam:  { name?, birthYear?, gender? } — create + attach
  // Mismatched club is silently ignored (no security leak — just no-op).
  const attachToTeamId: number | undefined = typeof body.attachToTeamId === "number" ? body.attachToTeamId : undefined;
  const attachNewTeam: { name?: string; birthYear?: number; gender?: "male" | "female" | "mixed" } | undefined =
    body.attachNewTeam && typeof body.attachNewTeam === "object" ? body.attachNewTeam : undefined;

  const user = await db.query.clubUsers.findFirst({
    where: eq(clubUsers.email, email.toLowerCase().trim()),
  });

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const club = await db.query.clubs.findFirst({
    where: eq(clubs.id, user.clubId),
  });

  // Find latest registration for any team belonging to this club
  const latestReg = await db
    .select({ tournamentId: tournamentRegistrations.tournamentId })
    .from(tournamentRegistrations)
    .innerJoin(teams, eq(teams.id, tournamentRegistrations.teamId))
    .where(eq(teams.clubId, user.clubId))
    .orderBy(desc(tournamentRegistrations.id))
    .limit(1);
  const tournamentId = latestReg[0]?.tournamentId ?? undefined;

  // Resolve organization from tournament
  let organizationId: number | undefined;
  let organizationSlug: string | undefined;
  if (tournamentId) {
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, tournamentId),
    });
    if (tournament?.organizationId) {
      organizationId = tournament.organizationId;
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, tournament.organizationId),
      });
      organizationSlug = org?.slug;
    }
  }

  // Attach to team if requested (registration wizard flow). Only honoured
  // when the team belongs to the user's own club. Silent no-op otherwise.
  let attachedTeamId: number | null = null;
  let attachStatus: "pending" | "approved" = "approved";
  let attachedTeamLabel: string | null = null;
  if (attachToTeamId) {
    const [t] = await db.select().from(teams).where(eq(teams.id, attachToTeamId));
    if (t && t.clubId === user.clubId) {
      attachedTeamId = t.id;
      attachStatus = "pending";
      attachedTeamLabel = t.name ?? `${t.birthYear ?? ""} ${t.gender}`.trim();
    }
  } else if (attachNewTeam) {
    const [created] = await db
      .insert(teams)
      .values({
        clubId: user.clubId,
        name: attachNewTeam.name?.toString().trim() || null,
        birthYear: attachNewTeam.birthYear ?? null,
        gender: (attachNewTeam.gender ?? "male") as "male" | "female" | "mixed",
      })
      .returning();
    attachedTeamId = created.id;
    attachStatus = "approved";
    attachedTeamLabel = created.name ?? `${created.birthYear ?? ""} ${created.gender}`.trim();
  }
  if (attachedTeamId) {
    await db
      .insert(clubUserTeams)
      .values({ clubUserId: user.id, teamId: attachedTeamId, status: attachStatus })
      .onConflictDoNothing();
    // Persist as currently active team.
    await db
      .update(clubUsers)
      .set({ teamId: attachedTeamId })
      .where(eq(clubUsers.id, user.id));

    // Notify club admins on a pending attach (existing team).
    if (attachStatus === "pending") {
      const club = await db.query.clubs.findFirst({ where: eq(clubs.id, user.clubId) });
      const admins = await db
        .select({ email: clubUsers.email })
        .from(clubUsers)
        .where(and(eq(clubUsers.clubId, user.clubId), isNull(clubUsers.teamId)));
      const dashboardLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://goalityfootball.com"}/en/club/dashboard`;
      for (const admin of admins) {
        if (!admin.email || admin.email.toLowerCase() === user.email.toLowerCase()) continue;
        sendCoachJoinedNotification({
          to: admin.email,
          clubName: club?.name ?? "—",
          coachName: user.name ?? null,
          coachEmail: user.email,
          teamLabel: attachedTeamLabel ?? "—",
          dashboardLink,
        }).catch((e) => console.error("[EMAIL] coach-joined notify failed:", e));
      }
    }
  }

  // Если у клубного пользователя есть super_admin аккаунт — ставим флаг
  const adminUser = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, email.toLowerCase().trim()),
  });
  const isSuper = adminUser?.role === "super_admin";

  const sessionTeamId = attachedTeamId ?? user.teamId ?? null;
  const token = createToken({
    userId: user.id,
    role: "club",
    clubId: user.clubId,
    tournamentId,
    organizationId,
    organizationSlug,
    ...(sessionTeamId ? { teamId: sessionTeamId } : {}),
    ...(isSuper ? { isSuper: true } : {}),
  });

  await setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    clubId: user.clubId,
    teamId: user.teamId ?? null,
    organizationSlug,
    hasTournament: !!tournamentId,
  });
}
