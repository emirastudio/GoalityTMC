import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { clubUsers, clubs, tournaments, organizations, adminUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createToken } from "@/lib/auth";

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
  const rows = await db
    .select({
      id: clubUsers.id,
      clubId: clubUsers.clubId,
      teamId: clubUsers.teamId,
      organizationId: organizations.id,
      organizationSlug: organizations.slug,
    })
    .from(clubUsers)
    .innerJoin(clubs, eq(clubs.id, clubUsers.clubId))
    .innerJoin(tournaments, eq(tournaments.id, clubs.tournamentId))
    .innerJoin(organizations, eq(organizations.id, tournaments.organizationId))
    .where(eq(clubUsers.email, email))
    .limit(1);

  const clubUser = rows[0] ?? null;

  if (clubUser) {
    const token = createToken({
      userId: clubUser.id,
      role: "club",
      clubId: clubUser.clubId,
      teamId: clubUser.teamId ?? undefined,
      organizationId: clubUser.organizationId,
      organizationSlug: clubUser.organizationSlug,
    });

    const response = NextResponse.redirect(
      `${base}/${locale}/team/overview`
    );
    response.cookies.set("goality_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 604800,
      path: "/",
    });
    return response;
  }

  // New club user — redirect to registration
  const params = new URLSearchParams({ oauth: "1", email, name });
  return NextResponse.redirect(
    `${base}/${locale}/club/register?${params}`
  );
}
