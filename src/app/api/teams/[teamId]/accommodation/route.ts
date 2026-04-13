import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, tournamentRegistrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

type RouteContext = { params: Promise<{ teamId: string }> };

// Находим регистрацию команды в текущем турнире сессии
async function resolveRegistration(teamId: number, tournamentId: number | undefined) {
  if (!tournamentId) {
    // Fallback: берём последнюю регистрацию
    return db.query.tournamentRegistrations.findFirst({
      where: eq(tournamentRegistrations.teamId, teamId),
      orderBy: (r, { desc }) => [desc(r.id)],
    });
  }
  return db.query.tournamentRegistrations.findFirst({
    where: and(
      eq(tournamentRegistrations.teamId, teamId),
      eq(tournamentRegistrations.tournamentId, tournamentId)
    ),
  });
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "club") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  const tid = parseInt(teamId);

  const team = await db.query.teams.findFirst({ where: eq(teams.id, tid) });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (team.clubId !== session.clubId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const registration = await resolveRegistration(tid, session.tournamentId);
  if (!registration) return NextResponse.json({ error: "Registration not found" }, { status: 404 });

  return NextResponse.json({
    accomPlayers: registration.accomPlayers ?? 0,
    accomStaff: registration.accomStaff ?? 0,
    accomAccompanying: registration.accomAccompanying ?? 0,
    accomCheckIn: registration.accomCheckIn ?? null,
    accomCheckOut: registration.accomCheckOut ?? null,
    accomNotes: registration.accomNotes ?? null,
    accomDeclined: registration.accomDeclined,
    accomConfirmed: registration.accomConfirmed,
  });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "club") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  const tid = parseInt(teamId);

  const team = await db.query.teams.findFirst({ where: eq(teams.id, tid) });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (team.clubId !== session.clubId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const registration = await resolveRegistration(tid, session.tournamentId);
  if (!registration) return NextResponse.json({ error: "Registration not found" }, { status: 404 });

  const body = await req.json();
  const updates: Partial<{
    accomPlayers: number; accomStaff: number; accomAccompanying: number;
    accomCheckIn: string | null; accomCheckOut: string | null;
    accomNotes: string | null; accomDeclined: boolean; accomConfirmed: boolean;
  }> = {};

  if (body.accomPlayers !== undefined) updates.accomPlayers = Number(body.accomPlayers);
  if (body.accomStaff !== undefined) updates.accomStaff = Number(body.accomStaff);
  if (body.accomAccompanying !== undefined) updates.accomAccompanying = Number(body.accomAccompanying);
  if (body.accomCheckIn !== undefined) updates.accomCheckIn = body.accomCheckIn || null;
  if (body.accomCheckOut !== undefined) updates.accomCheckOut = body.accomCheckOut || null;
  if (body.accomNotes !== undefined) updates.accomNotes = body.accomNotes || null;
  if (body.accomDeclined !== undefined) updates.accomDeclined = Boolean(body.accomDeclined);
  if (body.accomConfirmed !== undefined) updates.accomConfirmed = Boolean(body.accomConfirmed);

  await db.update(tournamentRegistrations).set(updates).where(eq(tournamentRegistrations.id, registration.id));

  const updated = await db.query.tournamentRegistrations.findFirst({
    where: eq(tournamentRegistrations.id, registration.id),
  });

  return NextResponse.json({
    accomPlayers: updated?.accomPlayers ?? 0,
    accomStaff: updated?.accomStaff ?? 0,
    accomAccompanying: updated?.accomAccompanying ?? 0,
    accomCheckIn: updated?.accomCheckIn ?? null,
    accomCheckOut: updated?.accomCheckOut ?? null,
    accomNotes: updated?.accomNotes ?? null,
    accomDeclined: updated?.accomDeclined ?? false,
    accomConfirmed: updated?.accomConfirmed ?? false,
  });
}
