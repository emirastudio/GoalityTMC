import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, tournaments, tournamentStages, tournamentClasses, matches } from "@/db/schema";
import { eq, and, count, sql } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentSlug: string }> }
) {
  const { orgSlug, tournamentSlug } = await params;

  const org = await db.query.organizations.findFirst({ where: eq(organizations.slug, orgSlug) });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tournament = await db.query.tournaments.findFirst({
    where: and(eq(tournaments.organizationId, org.id), eq(tournaments.slug, tournamentSlug)),
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [stages, classes] = await Promise.all([
    db
      .select({
        id: tournamentStages.id,
        name: tournamentStages.name,
        nameRu: tournamentStages.nameRu,
        nameEt: tournamentStages.nameEt,
        order: tournamentStages.order,
        type: tournamentStages.type,
        status: tournamentStages.status,
        classId: tournamentStages.classId,
        total: count(matches.id),
        finished: sql<number>`COALESCE(SUM(CASE WHEN ${matches.status} IN ('finished','walkover') THEN 1 ELSE 0 END), 0)::int`,
      })
      .from(tournamentStages)
      .leftJoin(matches, and(eq(matches.stageId, tournamentStages.id), eq(matches.isPublic, true)))
      .where(eq(tournamentStages.tournamentId, tournament.id))
      .groupBy(
        tournamentStages.id, tournamentStages.name, tournamentStages.nameRu,
        tournamentStages.nameEt, tournamentStages.order, tournamentStages.type,
        tournamentStages.status, tournamentStages.classId,
      )
      .orderBy(tournamentStages.order),

    db
      .select({ id: tournamentClasses.id, name: tournamentClasses.name })
      .from(tournamentClasses)
      .where(eq(tournamentClasses.tournamentId, tournament.id))
      .orderBy(tournamentClasses.id),
  ]);

  const classMap = new Map(classes.map(c => [c.id, c.name]));

  // Group stages by classId; stages without classId go into null group
  const groupMap = new Map<number | null, { classId: number | null; className: string | null; stages: typeof stages }>();

  for (const s of stages) {
    const key = s.classId ?? null;
    if (!groupMap.has(key)) {
      groupMap.set(key, { classId: key, className: key ? (classMap.get(key) ?? null) : null, stages: [] });
    }
    groupMap.get(key)!.stages.push(s);
  }

  const groups = Array.from(groupMap.values()).map(g => ({
    ...g,
    stages: g.stages.map(s => ({
      ...s,
      total: Number(s.total),
      finished: Number(s.finished),
      pct: Number(s.total) > 0 ? Math.round((Number(s.finished) / Number(s.total)) * 100) : 0,
    })),
  }));

  return NextResponse.json({ groups });
}
