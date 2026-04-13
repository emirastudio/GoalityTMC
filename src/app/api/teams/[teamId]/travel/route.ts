import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamTravel, teams, tournamentRegistrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

async function authorizeTeamAccess(teamId: string) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const tid = parseInt(teamId);
  const team = await db.query.teams.findFirst({ where: eq(teams.id, tid) });
  if (!team || team.clubId !== session.clubId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  // Load registration
  const registration = await db.query.tournamentRegistrations.findFirst({
    where: session.tournamentId
      ? and(eq(tournamentRegistrations.teamId, tid), eq(tournamentRegistrations.tournamentId, session.tournamentId))
      : eq(tournamentRegistrations.teamId, tid),
    orderBy: (r, { desc }) => [desc(r.id)],
  });
  if (!registration) {
    return { error: NextResponse.json({ error: "No registration found" }, { status: 404 }) };
  }

  return { tid, team, session, registration };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const auth = await authorizeTeamAccess(teamId);
  if ("error" in auth) return auth.error;

  const travel = await db.query.teamTravel.findFirst({
    where: eq(teamTravel.registrationId, auth.registration.id),
  });
  return NextResponse.json(travel ?? {});
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const auth = await authorizeTeamAccess(teamId);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const registrationId = auth.registration.id;

  const existing = await db.query.teamTravel.findFirst({
    where: eq(teamTravel.registrationId, registrationId),
  });

  if (existing) {
    const [updated] = await db
      .update(teamTravel)
      .set({
        arrivalType: body.arrivalType || null,
        arrivalDate: body.arrivalDate ? new Date(body.arrivalDate) : null,
        arrivalTime: body.arrivalTime || null,
        arrivalDetails: body.arrivalDetails || null,
        departureType: body.departureType || null,
        departureDate: body.departureDate ? new Date(body.departureDate) : null,
        departureTime: body.departureTime || null,
        departureDetails: body.departureDetails || null,
        updatedAt: new Date(),
      })
      .where(eq(teamTravel.registrationId, registrationId))
      .returning();
    return NextResponse.json(updated);
  }

  const [created] = await db
    .insert(teamTravel)
    .values({
      registrationId,
      arrivalType: body.arrivalType || null,
      arrivalDate: body.arrivalDate ? new Date(body.arrivalDate) : null,
      arrivalTime: body.arrivalTime || null,
      arrivalDetails: body.arrivalDetails || null,
      departureType: body.departureType || null,
      departureDate: body.departureDate ? new Date(body.departureDate) : null,
      departureTime: body.departureTime || null,
      departureDetails: body.departureDetails || null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
