import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubUsers, teams } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { getSession } from "@/lib/auth";

type RouteContext = { params: Promise<{ clubId: string }> };

// GET /api/clubs/[clubId]/managers — list team managers for this club
export async function GET(req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  const { clubId } = await params;
  const cid = parseInt(clubId);

  if (!session || session.role !== "club" || session.clubId !== cid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only club admins (no teamId) can see/manage managers
  if (session.teamId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const managers = await db
    .select({
      id: clubUsers.id,
      name: clubUsers.name,
      email: clubUsers.email,
      teamId: clubUsers.teamId,
      createdAt: clubUsers.createdAt,
    })
    .from(clubUsers)
    .where(and(eq(clubUsers.clubId, cid), isNotNull(clubUsers.teamId)));

  // Enrich with team names
  const enriched = await Promise.all(
    managers.map(async (m) => {
      let teamName: string | null = null;
      if (m.teamId) {
        const team = await db.query.teams.findFirst({
          where: eq(teams.id, m.teamId),
        });
        teamName = team?.name ?? null;
      }
      return { ...m, teamName };
    })
  );

  return NextResponse.json(enriched);
}
