import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, tournamentClasses } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tournamentId = searchParams.get("tournamentId");

  let tournament;
  if (tournamentId) {
    // Specific tournament requested (from catalog link)
    tournament = await db.query.tournaments.findFirst({
      where: and(
        eq(tournaments.id, parseInt(tournamentId)),
        eq(tournaments.registrationOpen, true)
      ),
    });
  } else {
    // Legacy fallback: any open tournament
    tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.registrationOpen, true),
    });
  }

  if (!tournament) {
    return NextResponse.json({ error: "No tournament open" }, { status: 404 });
  }

  const classes = await db.query.tournamentClasses.findMany({
    where: eq(tournamentClasses.tournamentId, tournament.id),
    orderBy: (c, { asc }) => [asc(c.minBirthYear)],
  });

  return NextResponse.json({ tournament, classes });
}
