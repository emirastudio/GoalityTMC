import { NextRequest, NextResponse } from "next/server";
import { getSession, type TokenPayload } from "./auth";
import { db } from "@/db";
import { tournaments, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type AdminContext = {
  session: TokenPayload;
  tournament: typeof tournaments.$inferSelect;
  organizationId: number;
};

/**
 * Replaces the old getActiveTournament() + auth check pattern.
 *
 * Resolves tournament from:
 * 1. ?tournamentId= query param (for tenant-scoped calls)
 * 2. First tournament with registrationOpen=true (legacy fallback)
 *
 * Checks:
 * - Session exists and role is "admin"
 * - Super admin can access any tournament
 * - Org admin can only access tournaments in their organization
 */
export async function requireTournamentAdmin(
  req: NextRequest
): Promise<AdminContext | NextResponse> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let tournament: typeof tournaments.$inferSelect | undefined;

  // Try to get tournamentId from query params
  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournamentId");

  if (tournamentId) {
    tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, parseInt(tournamentId)),
    }) ?? undefined;
  } else {
    // Legacy fallback: find active tournament
    // For org admins, scope to their organization
    if (session.organizationId) {
      tournament = await db.query.tournaments.findFirst({
        where: and(
          eq(tournaments.organizationId, session.organizationId),
          eq(tournaments.registrationOpen, true)
        ),
      }) ?? undefined;
    } else {
      // Super admin — find any active tournament
      tournament = await db.query.tournaments.findFirst({
        where: eq(tournaments.registrationOpen, true),
      }) ?? undefined;
    }
  }

  if (!tournament) {
    return NextResponse.json({ error: "No active tournament" }, { status: 404 });
  }

  // Authorization: org admin can only access their own tournaments
  if (!session.isSuper && session.organizationId) {
    if (tournament.organizationId !== session.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return {
    session,
    tournament,
    organizationId: tournament.organizationId,
  };
}

/**
 * Simple admin auth check (no tournament needed).
 */
export async function requireAdmin(): Promise<TokenPayload | NextResponse> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

/**
 * Check if result is a NextResponse (error).
 */
export function isError(result: unknown): result is NextResponse {
  return result instanceof NextResponse;
}
