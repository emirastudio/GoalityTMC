/**
 * Team display-name resolver.
 *
 * `teams.name` is often NULL for teams created through club batch-registration —
 * the human-readable label lives in `tournamentRegistrations.displayName` and
 * is scoped to a specific tournament. This helper builds a teamId → name map
 * for one tournament so API responses can fall back to the right label.
 */

import { db } from "@/db";
import { tournamentRegistrations } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export async function resolveTeamDisplayNames(
  tournamentId: number,
  teamIds: number[]
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (teamIds.length === 0) return map;
  const rows = await db
    .select({
      teamId: tournamentRegistrations.teamId,
      displayName: tournamentRegistrations.displayName,
    })
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        inArray(tournamentRegistrations.teamId, teamIds)
      )
    );
  for (const r of rows) {
    if (r.displayName) map.set(r.teamId, r.displayName);
  }
  return map;
}
