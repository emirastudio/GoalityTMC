import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, tournaments, tournamentFields, tournamentHotels, tournamentStadiums } from "@/db/schema";
import { eq, and, asc, isNull } from "drizzle-orm";

// GET /api/public/t/[orgSlug]/[tournamentSlug]/facilities
// Публичная информация о стадионах, площадках и отелях турнира
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentSlug: string }> }
) {
  const { orgSlug, tournamentSlug } = await params;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tournament = await db.query.tournaments.findFirst({
    where: and(
      eq(tournaments.organizationId, org.id),
      eq(tournaments.slug, tournamentSlug)
    ),
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [stadiums, standaloneFields, hotels] = await Promise.all([
    // Stadiums with their fields
    db.query.tournamentStadiums.findMany({
      where: eq(tournamentStadiums.tournamentId, tournament.id),
      orderBy: [asc(tournamentStadiums.sortOrder), asc(tournamentStadiums.id)],
      with: {
        fields: {
          orderBy: [asc(tournamentFields.sortOrder), asc(tournamentFields.id)],
        },
      },
    }),
    // Standalone fields (no stadium parent)
    db.select().from(tournamentFields)
      .where(and(
        eq(tournamentFields.tournamentId, tournament.id),
        isNull(tournamentFields.stadiumId)
      ))
      .orderBy(asc(tournamentFields.sortOrder), asc(tournamentFields.id)),
    // Hotels
    db.select().from(tournamentHotels)
      .where(eq(tournamentHotels.tournamentId, tournament.id))
      .orderBy(asc(tournamentHotels.sortOrder), asc(tournamentHotels.id)),
  ]);

  return NextResponse.json({ stadiums, standaloneFields, hotels });
}
