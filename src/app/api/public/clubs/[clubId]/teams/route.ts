import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, tournamentClasses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params;
  const cid = parseInt(clubId);
  if (isNaN(cid)) return NextResponse.json([]);

  const clubTeams = await db.query.teams.findMany({
    where: eq(teams.clubId, cid),
    orderBy: (t, { asc }) => [asc(t.name)],
  });

  const result = await Promise.all(
    clubTeams.map(async (team) => {
      let className = "";
      if (team.classId) {
        const cls = await db.query.tournamentClasses.findFirst({
          where: eq(tournamentClasses.id, team.classId),
        });
        className = cls?.name ?? "";
      }
      return { id: team.id, name: team.name, className };
    })
  );

  return NextResponse.json(result);
}
