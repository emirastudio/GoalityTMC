import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, tournaments, tournamentStages, stageGroups } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

// GET /api/public/t/[orgSlug]/[tournamentSlug]/standings
// Публичные таблицы групп — без авторизации
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

  // Все групповые этапы с таблицами
  const stages = await db.query.tournamentStages.findMany({
    where: and(
      eq(tournamentStages.tournamentId, tournament.id),
      eq(tournamentStages.type, "group")
    ),
    orderBy: [asc(tournamentStages.order)],
    with: {
      groups: {
        orderBy: (g, { asc }) => [asc(g.order)],
        with: {
          standings: {
            orderBy: (s, { asc }) => [asc(s.position)],
            with: {
              team: {
                with: { club: true },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(stages);
}
