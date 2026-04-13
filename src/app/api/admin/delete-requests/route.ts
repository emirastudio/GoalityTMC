import { NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, organizations } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq, isNotNull, isNull, desc } from "drizzle-orm";

// GET — list all pending delete requests
export async function GET() {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const rows = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      slug: tournaments.slug,
      year: tournaments.year,
      plan: tournaments.plan,
      registrationOpen: tournaments.registrationOpen,
      deleteRequestedAt: tournaments.deleteRequestedAt,
      deleteRequestReason: tournaments.deleteRequestReason,
      deletedAt: tournaments.deletedAt,
      orgId: organizations.id,
      orgName: organizations.name,
      orgSlug: organizations.slug,
    })
    .from(tournaments)
    .leftJoin(organizations, eq(organizations.id, tournaments.organizationId))
    .where(isNotNull(tournaments.deleteRequestedAt))
    .orderBy(desc(tournaments.deleteRequestedAt));

  return NextResponse.json({ requests: rows });
}
