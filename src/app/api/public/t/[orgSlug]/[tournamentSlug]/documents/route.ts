import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, tournaments, tournamentDocuments } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

// GET /api/public/t/[orgSlug]/[tournamentSlug]/documents
// Публичные документы турнира (регламент, правила и т.д.)
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

  const docs = await db.select().from(tournamentDocuments)
    .where(eq(tournamentDocuments.tournamentId, tournament.id))
    .orderBy(asc(tournamentDocuments.uploadedAt));

  return NextResponse.json(docs);
}
