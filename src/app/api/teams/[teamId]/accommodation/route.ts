import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

type RouteContext = { params: Promise<{ teamId: string }> };

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

  return NextResponse.json({
    accomPlayers: team.accomPlayers ?? 0,
    accomStaff: team.accomStaff ?? 0,
    accomAccompanying: team.accomAccompanying ?? 0,
    accomCheckIn: team.accomCheckIn ?? null,
    accomCheckOut: team.accomCheckOut ?? null,
    accomNotes: team.accomNotes ?? null,
    accomDeclined: team.accomDeclined,
    accomConfirmed: team.accomConfirmed,
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

  const body = await req.json();
  const {
    accomPlayers,
    accomStaff,
    accomAccompanying,
    accomCheckIn,
    accomCheckOut,
    accomNotes,
    accomDeclined,
    accomConfirmed,
  } = body;

  const updates: Partial<{
    accomPlayers: number;
    accomStaff: number;
    accomAccompanying: number;
    accomCheckIn: string | null;
    accomCheckOut: string | null;
    accomNotes: string | null;
    accomDeclined: boolean;
    accomConfirmed: boolean;
  }> = {};

  if (accomPlayers !== undefined) updates.accomPlayers = Number(accomPlayers);
  if (accomStaff !== undefined) updates.accomStaff = Number(accomStaff);
  if (accomAccompanying !== undefined) updates.accomAccompanying = Number(accomAccompanying);
  if (accomCheckIn !== undefined) updates.accomCheckIn = accomCheckIn || null;
  if (accomCheckOut !== undefined) updates.accomCheckOut = accomCheckOut || null;
  if (accomNotes !== undefined) updates.accomNotes = accomNotes || null;
  if (accomDeclined !== undefined) updates.accomDeclined = Boolean(accomDeclined);
  if (accomConfirmed !== undefined) updates.accomConfirmed = Boolean(accomConfirmed);

  await db.update(teams).set(updates).where(eq(teams.id, tid));

  const updated = await db.query.teams.findFirst({ where: eq(teams.id, tid) });
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
