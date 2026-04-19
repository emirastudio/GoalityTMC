/**
 * Guards for offerings v3 API routes.
 * Ensures the tournament belongs to the caller's org AND has
 * offeringsV3Enabled = true. Returns either a ready-to-return 4xx
 * response, or the tournament row for further use.
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { authorizeOrg } from "@/lib/tenant";

export async function requireV3Tournament(params: {
  orgSlug: string;
  tournamentId: number;
}): Promise<
  | { error: NextResponse }
  | { tournament: typeof tournaments.$inferSelect; organizationId: number; userId: number; isSuper: boolean }
> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { authorized, organization } = await authorizeOrg(session, params.orgSlug);
  if (!authorized || !organization) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const [tour] = await db
    .select()
    .from(tournaments)
    .where(and(eq(tournaments.id, params.tournamentId), eq(tournaments.organizationId, organization.id)))
    .limit(1);
  if (!tour) {
    return { error: NextResponse.json({ error: "Tournament not found" }, { status: 404 }) };
  }
  if (!tour.offeringsV3Enabled) {
    return {
      error: NextResponse.json(
        { error: "Offerings v3 is not enabled for this tournament", code: "v3_disabled" },
        { status: 409 }
      ),
    };
  }
  return { tournament: tour, organizationId: organization.id, userId: session.userId, isSuper: session.isSuper ?? false };
}
