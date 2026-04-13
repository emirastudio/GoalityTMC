import { NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, organizations, tournamentRegistrations } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq, sql, desc, count } from "drizzle-orm";

export async function GET() {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const rows = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      slug: tournaments.slug,
      year: tournaments.year,
      startDate: tournaments.startDate,
      endDate: tournaments.endDate,
      registrationOpen: tournaments.registrationOpen,
      plan: tournaments.plan,
      organizationId: organizations.id,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
      teamCount: sql<number>`COUNT(DISTINCT ${tournamentRegistrations.id})`,
      confirmedCount: sql<number>`COUNT(DISTINCT CASE WHEN ${tournamentRegistrations.status} = 'confirmed' THEN ${tournamentRegistrations.id} END)`,
    })
    .from(tournaments)
    .leftJoin(organizations, eq(organizations.id, tournaments.organizationId))
    .leftJoin(tournamentRegistrations, eq(tournamentRegistrations.tournamentId, tournaments.id))
    .groupBy(
      tournaments.id, tournaments.name, tournaments.slug, tournaments.year,
      tournaments.startDate, tournaments.endDate, tournaments.registrationOpen, tournaments.plan,
      organizations.id, organizations.name, organizations.slug,
    )
    .orderBy(desc(tournaments.id));

  return NextResponse.json({
    tournaments: rows.map((r) => ({
      ...r,
      teamCount: Number(r.teamCount),
      confirmedCount: Number(r.confirmedCount),
    })),
  });
}
