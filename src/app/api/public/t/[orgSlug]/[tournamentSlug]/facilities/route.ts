import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, tournaments, tournamentFields, tournamentHotels } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

// GET /api/public/t/[orgSlug]/[tournamentSlug]/facilities
// Публичная информация о полях и отелях турнира
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

  const [fields, hotels] = await Promise.all([
    db.select().from(tournamentFields)
      .where(eq(tournamentFields.tournamentId, tournament.id))
      .orderBy(asc(tournamentFields.sortOrder), asc(tournamentFields.id)),
    db.select().from(tournamentHotels)
      .where(eq(tournamentHotels.tournamentId, tournament.id))
      .orderBy(asc(tournamentHotels.sortOrder), asc(tournamentHotels.id)),
  ]);

  return NextResponse.json({ fields, hotels });
}
