import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { clubUsers, clubs, tournaments, organizations, adminUsers, teams, tournamentRegistrations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createToken } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";

function getLocale(req: NextRequest): string {
  const acceptLang = req.headers.get("accept-language") ?? "";
  if (acceptLang.startsWith("ru")) return "ru";
  if (acceptLang.startsWith("et")) return "et";
  return "en";
}

function baseUrl(req: NextRequest): string {
  // Use AUTH_URL / NEXTAUTH_URL if set (production), otherwise fall back to request origin
  const envUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  return `${req.nextUrl.protocol}//${req.nextUrl.host}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const base = baseUrl(req);

  if (!session?.user?.email) {
    return NextResponse.redirect(`${base}/en/login`);
  }

  const email = session.user.email;
  const name = session.user.name ?? "";
  const locale = getLocale(req);
  const mode = req.nextUrl.searchParams.get("mode"); // "organizer" | null

  // ── Organizer OAuth ──────────────────────────────────────
  if (mode === "organizer") {
    const adminRow = await db
      .select({
        id: adminUsers.id,
        role: adminUsers.role,
        organizationId: adminUsers.organizationId,
        isSuper: adminUsers.role,
      })
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (adminRow) {
      // Existing organizer — look up org slug
      let organizationSlug: string | undefined;
      if (adminRow.organizationId) {
        const org = await db
          .select({ slug: organizations.slug })
          .from(organizations)
          .where(eq(organizations.id, adminRow.organizationId))
          .limit(1)
          .then((r) => r[0] ?? null);
        organizationSlug = org?.slug;
      }

      const token = createToken({
        userId: adminRow.id,
        role: "admin",
        organizationId: adminRow.organizationId ?? undefined,
        organizationSlug,
        isSuper: adminRow.role === "super_admin",
      });

      const destination = organizationSlug
        ? `/${locale}/org/${organizationSlug}/admin`
        : `/${locale}/admin/dashboard`;

      const response = NextResponse.redirect(`${base}${destination}`);
      response.cookies.set("goality_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 604800,
        path: "/",
      });
      return response;
    }

    // No organizer account — redirect to onboarding with pre-filled data
    const params = new URLSearchParams({ oauth: "1", email, name });
    return NextResponse.redirect(
      `${base}/${locale}/onboarding?${params}`
    );
  }

  // ── Club OAuth ───────────────────────────────────────────
  const clubUserRow = await db.query.clubUsers.findFirst({
    where: eq(clubUsers.email, email),
  });

  const clubUser = clubUserRow ?? null;

  if (clubUser) {
    // Find latest registration for any team belonging to this club
    const latestReg = await db
      .select({ tournamentId: tournamentRegistrations.tournamentId })
      .from(tournamentRegistrations)
      .innerJoin(teams, eq(teams.id, tournamentRegistrations.teamId))
      .where(eq(teams.clubId, clubUser.clubId))
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

    const token = createToken({
      userId: clubUser.id,
      role: "club",
      clubId: clubUser.clubId,
      teamId: clubUser.teamId ?? undefined,
      tournamentId,
      organizationId,
      organizationSlug,
    });

    const destination = tournamentId
      ? `/${locale}/team/overview`
      : `/${locale}/club/dashboard`;
    const response = NextResponse.redirect(`${base}${destination}`);
    response.cookies.set("goality_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 604800,
      path: "/",
    });
    return response;
  }

  // ── Auto-register new club via OAuth ────────────────────
  // One-click: Google/Facebook → account created → dashboard
  const clubSlug = `club-${Date.now()}`;
  const [newClub] = await db
    .insert(clubs)
    .values({
      name: name || "My Club",
      slug: clubSlug,
      contactName: name || null,
      contactEmail: email,
    })
    .returning();

  const [newUser] = await db
    .insert(clubUsers)
    .values({
      clubId: newClub.id,
      email,
      name: name || null,
      passwordHash: "",  // OAuth user — no password
      accessLevel: "write",
    })
    .returning();

  // Welcome email (fire & forget)
  sendWelcomeEmail({ to: email, clubName: newClub.name, contactName: name || null }).catch(
    (e) => console.error("[EMAIL] OAuth welcome send failed:", e),
  );

  const newToken = createToken({
    userId: newUser.id,
    role: "club",
    clubId: newClub.id,
  });

  const regResponse = NextResponse.redirect(
    `${base}/${locale}/club/dashboard`
  );
  regResponse.cookies.set("goality_token", newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 604800,
    path: "/",
  });
  return regResponse;
}
