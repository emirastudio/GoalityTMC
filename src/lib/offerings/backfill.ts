import { db } from "@/db";
import { teamOfferingDeals, tournamentRegistrations } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

/**
 * Attach a "required" offering to every active registration in the
 * tournament that doesn't already have a deal for it. Mirrors the
 * upsert-on-unique semantics of POST /deals (onConflictDoNothing on
 * [registrationId, offeringId]) so re-running this is always safe.
 *
 * "Active" = open or confirmed — draft/rejected/cancelled registrations
 * aren't real participants yet and shouldn't get billed.
 */
export async function backfillRequiredDeals(
  tournamentId: number,
  offeringId: number,
  createdBy: number,
): Promise<{ created: number }> {
  const regs = await db
    .select({ id: tournamentRegistrations.id })
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        inArray(tournamentRegistrations.status, ["open", "confirmed"]),
      ),
    );
  if (regs.length === 0) return { created: 0 };

  const inserted = await db
    .insert(teamOfferingDeals)
    .values(regs.map(r => ({
      registrationId: r.id,
      offeringId,
      state: "proposed" as const,
      dueDate: null,
      createdBy,
    })))
    .onConflictDoNothing({ target: [teamOfferingDeals.registrationId, teamOfferingDeals.offeringId] })
    .returning();

  return { created: inserted.length };
}
