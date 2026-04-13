import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authorizeOrg, getOrgTournament } from "@/lib/tenant";
import { db } from "@/db";
import { tournamentClasses } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string; classId: string };

// GET /api/org/[orgSlug]/tournament/[tournamentId]/classes/[classId]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { orgSlug, tournamentId, classId } = await params;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tournament = await getOrgTournament(parseInt(tournamentId), organization.id);
  if (!tournament)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [cls] = await db
    .select({
      id:             tournamentClasses.id,
      name:           tournamentClasses.name,
      format:         tournamentClasses.format,
      minBirthYear:   tournamentClasses.minBirthYear,
      maxBirthYear:   tournamentClasses.maxBirthYear,
      maxPlayers:     tournamentClasses.maxPlayers,
      maxStaff:       tournamentClasses.maxStaff,
      maxTeams:       tournamentClasses.maxTeams,
      scheduleConfig: tournamentClasses.scheduleConfig,
      startDate:      tournamentClasses.startDate,
      endDate:        tournamentClasses.endDate,
    })
    .from(tournamentClasses)
    .where(
      and(
        eq(tournamentClasses.id, parseInt(classId)),
        eq(tournamentClasses.tournamentId, tournament.id)
      )
    )
    .limit(1);

  if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(cls);
}

// DELETE /api/org/[orgSlug]/tournament/[tournamentId]/classes/[classId]
// Удаляет дивизион (вместе со всеми стадиями через CASCADE в БД)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { orgSlug, tournamentId, classId } = await params;

  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tournament = await getOrgTournament(parseInt(tournamentId), organization.id);
  if (!tournament)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Убеждаемся что класс принадлежит этому турниру
  const [cls] = await db
    .select({ id: tournamentClasses.id })
    .from(tournamentClasses)
    .where(
      and(
        eq(tournamentClasses.id, parseInt(classId)),
        eq(tournamentClasses.tournamentId, tournament.id)
      )
    )
    .limit(1);

  if (!cls)
    return NextResponse.json({ error: "Division not found" }, { status: 404 });

  await db
    .delete(tournamentClasses)
    .where(eq(tournamentClasses.id, cls.id));

  return NextResponse.json({ ok: true });
}

// PATCH /api/org/[orgSlug]/tournament/[tournamentId]/classes/[classId]
// Обновляет название/параметры дивизиона
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { orgSlug, tournamentId, classId } = await params;

  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tournament = await getOrgTournament(parseInt(tournamentId), organization.id);
  if (!tournament)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, format, minBirthYear, maxBirthYear, maxPlayers, maxStaff, maxTeams, scheduleConfig, startDate, endDate } = body;

  const [updated] = await db
    .update(tournamentClasses)
    .set({
      ...(name           !== undefined && { name: name.trim() }),
      ...(format         !== undefined && { format: format || null }),
      ...(minBirthYear   !== undefined && { minBirthYear: minBirthYear ? Number(minBirthYear) : null }),
      ...(maxBirthYear   !== undefined && { maxBirthYear: maxBirthYear ? Number(maxBirthYear) : null }),
      ...(maxPlayers     !== undefined && { maxPlayers: Number(maxPlayers) }),
      ...(maxStaff       !== undefined && { maxStaff: Number(maxStaff) }),
      ...(maxTeams       !== undefined && { maxTeams: maxTeams ? Number(maxTeams) : null }),
      ...(scheduleConfig !== undefined && { scheduleConfig: scheduleConfig ?? null }),
      ...(startDate      !== undefined && { startDate: startDate ?? null }),
      ...(endDate        !== undefined && { endDate: endDate ?? null }),
    })
    .where(
      and(
        eq(tournamentClasses.id, parseInt(classId)),
        eq(tournamentClasses.tournamentId, tournament.id)
      )
    )
    .returning();

  if (!updated)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(updated);
}
