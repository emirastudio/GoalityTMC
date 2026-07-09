import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { clubUsers, tournaments, organizations, adminUsers, teams, tournamentRegistrations, emailVerifications } from "@/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { createToken } from "@/lib/auth";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

// Google/Facebook OAuth already proves the visitor controls this inbox —
// don't make them re-prove it with a 6-digit email code on top. Insert a
// pre-verified emailVerifications row so /api/clubs/register's "recently
// verified" check passes without the code step. codeHash is a random,
// never-checked value (verifiedAt is what register/route.ts looks at).
async function markEmailVerifiedFromOAuth(email: string) {
  await db
    .update(emailVerifications)
    .set({ usedAt: new Date() })
    .where(and(eq(emailVerifications.email, email), isNull(emailVerifications.usedAt)));
  const codeHash = await bcrypt.hash(randomUUID(), 8);
  await db.insert(emailVerifications).values({
    email,
    codeHash,
    verifiedAt: new Date(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });
}

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

  // ── No club account for this email ──────────────────────
  // Do NOT silently create an account: that produced a passwordless
  // club with no consent and no legal acceptance, and auto-logged the
  // visitor in. Mirror the organizer path — send them to the explicit
  // registration flow (prefilled), where signing up IS the consent.
  // Google already proved they own this inbox, so skip the 6-digit
  // email code the manual-signup path still requires.
  await markEmailVerifiedFromOAuth(email);
  const params = new URLSearchParams({ oauth: "1", email, name: name || "" });
  return NextResponse.redirect(
    `${base}/${locale}/club/register?${params}`
  );
}
