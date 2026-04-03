import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authorizeOrg, getOrgTournament } from "@/lib/tenant";
import { db } from "@/db";
import { tournamentClasses } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { orgSlug, tournamentId } = await params;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tournament = await getOrgTournament(parseInt(tournamentId), organization.id);
  if (!tournament)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const classes = await db
    .select({
      id: tournamentClasses.id,
      name: tournamentClasses.name,
      format: tournamentClasses.format,
      minBirthYear: tournamentClasses.minBirthYear,
    })
    .from(tournamentClasses)
    .where(eq(tournamentClasses.tournamentId, tournament.id))
    .orderBy(asc(tournamentClasses.id));

  return NextResponse.json(classes);
}
