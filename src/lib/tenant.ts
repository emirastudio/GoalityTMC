import { db } from "@/db";
import { organizations, tournaments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { type TokenPayload } from "./auth";

/**
 * Resolve organization by slug.
 */
export async function getOrganizationBySlug(slug: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
}

/**
 * Resolve organization by id.
 */
export async function getOrganizationById(id: number) {
  return db.query.organizations.findFirst({
    where: eq(organizations.id, id),
  });
}

/**
 * Check if session has access to the given organization.
 * Super admins can access any organization.
 * Org admins can only access their own organization.
 */
export async function authorizeOrg(
  session: TokenPayload,
  orgSlug: string
): Promise<{ authorized: boolean; organization?: typeof organizations.$inferSelect }> {
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) {
    return { authorized: false };
  }

  // Super admin can access any org
  if (session.isSuper) {
    return { authorized: true, organization: org };
  }

  // Org admin must belong to this org
  if (session.organizationId === org.id) {
    return { authorized: true, organization: org };
  }

  return { authorized: false };
}

/**
 * Get a tournament that belongs to the given organization.
 * Replaces the old getActiveTournament() pattern.
 */
export async function getOrgTournament(tournamentId: number, organizationId: number) {
  return db.query.tournaments.findFirst({
    where: and(
      eq(tournaments.id, tournamentId),
      eq(tournaments.organizationId, organizationId)
    ),
  });
}

/**
 * Get all tournaments for an organization.
 */
export async function getOrgTournaments(organizationId: number) {
  return db.query.tournaments.findMany({
    where: eq(tournaments.organizationId, organizationId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}

/**
 * Generate a URL-safe slug from a string.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Check if an org slug is available.
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const existing = await getOrganizationBySlug(slug);
  return !existing;
}
