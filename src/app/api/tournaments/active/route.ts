import { NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, tournamentClasses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.registrationOpen, true),
  });

  if (!tournament) {
    return NextResponse.json({ error: "No tournament open" }, { status: 404 });
  }

  const classes = await db.query.tournamentClasses.findMany({
    where: eq(tournamentClasses.tournamentId, tournament.id),
    orderBy: (c, { asc }) => [asc(c.minBirthYear)],
  });

  return NextResponse.json({ tournament, classes });
}
