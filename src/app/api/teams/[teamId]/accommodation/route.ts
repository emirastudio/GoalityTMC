import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, tournamentRegistrations, registrationPeople, people, tournaments, teamOfferingDeals } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

type RouteContext = { params: Promise<{ teamId: string }> };

// Находим регистрацию команды в текущем турнире сессии
async function resolveRegistration(teamId: number, tournamentId: number | undefined) {
  if (!tournamentId) {
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

// Считаем проживающих per-category через pivot.
async function computeAccomCounts(registrationId: number) {
  const rows = await db
    .select({
      personType: people.personType,
      cnt: sql<number>`COUNT(*)::int`,
    })
    .from(registrationPeople)
    .innerJoin(people, eq(people.id, registrationPeople.personId))
    .where(and(eq(registrationPeople.registrationId, registrationId), eq(registrationPeople.needsHotel, true)))
    .groupBy(people.personType);
  const by = Object.fromEntries(rows.map((r) => [r.personType, Number(r.cnt)]));
  return {
    accomPlayers: by.player ?? 0,
    accomStaff: by.staff ?? 0,
    accomAccompanying: by.accompanying ?? 0,
  };
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

  // Отдаём «заявленные» цифры (accom_* на регистрации) — они же редактируются
  // в форме. Параллельно возвращаем роутерный counts (computed) как
  // `computedPlayers/computedStaff/computedAccompanying` — админ их видит как
  // информационный срез галок «в отель» на ростере.
  const computed = await computeAccomCounts(registration.id);
  return NextResponse.json({
    accomPlayers: registration.accomPlayers ?? 0,
    accomStaff: registration.accomStaff ?? 0,
    accomAccompanying: registration.accomAccompanying ?? 0,
    computedPlayers: computed.accomPlayers,
    computedStaff: computed.accomStaff,
    computedAccompanying: computed.accomAccompanying,
    accomCheckIn: registration.accomCheckIn ?? null,
    accomCheckOut: registration.accomCheckOut ?? null,
    accomNotes: registration.accomNotes ?? null,
    accomDeclined: registration.accomDeclined,
    accomConfirmed: registration.accomConfirmed,
  });
}

// PATCH принимает только поля, которые остались на tournament_registrations.
// Счётчики (accomPlayers/Staff/Accompanying) больше не редактируемы отсюда —
// они считаются из registration_people.needs_hotel. Чтобы изменить количество
// проживающих, клиент идёт на /api/registrations/[id]/roster/[personId]
// и щёлкает галку "нужен отель" на конкретном человеке.
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

  const clampNonNeg = (v: unknown) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  // Accommodation «demand» counts — club declares how many of each type
  // they want in the hotel. Used downstream by the v3 pricing calculator.
  if (body.accomPlayers !== undefined) updates.accomPlayers = clampNonNeg(body.accomPlayers);
  if (body.accomStaff !== undefined) updates.accomStaff = clampNonNeg(body.accomStaff);
  if (body.accomAccompanying !== undefined) updates.accomAccompanying = clampNonNeg(body.accomAccompanying);
  if (body.accomCheckIn !== undefined) updates.accomCheckIn = body.accomCheckIn || null;
  if (body.accomCheckOut !== undefined) updates.accomCheckOut = body.accomCheckOut || null;
  if (body.accomNotes !== undefined) updates.accomNotes = body.accomNotes || null;
  if (body.accomDeclined !== undefined) updates.accomDeclined = Boolean(body.accomDeclined);
  if (body.accomConfirmed !== undefined) updates.accomConfirmed = Boolean(body.accomConfirmed);

  if (Object.keys(updates).length > 0) {
    await db.update(tournamentRegistrations).set(updates).where(eq(tournamentRegistrations.id, registration.id));
  }

  // ─── Auto-assign default package on accom confirm ─────────
  // If the tournament has auto_assign_package_offering_id set AND this PATCH
  // just flipped accomConfirmed to true — create a published deal with that
  // offering (idempotent: skip if the deal already exists).
  if (updates.accomConfirmed === true) {
    const [tour] = await db
      .select({
        v3: tournaments.offeringsV3Enabled,
        autoOfferingId: tournaments.autoAssignPackageOfferingId,
      })
      .from(tournaments)
      .where(eq(tournaments.id, registration.tournamentId))
      .limit(1);
    if (tour?.v3 && tour.autoOfferingId) {
      const [existing] = await db
        .select({ id: teamOfferingDeals.id })
        .from(teamOfferingDeals)
        .where(and(
          eq(teamOfferingDeals.registrationId, registration.id),
          eq(teamOfferingDeals.offeringId, tour.autoOfferingId),
        ))
        .limit(1);
      if (!existing) {
        await db
          .insert(teamOfferingDeals)
          .values({
            registrationId: registration.id,
            offeringId: tour.autoOfferingId,
            state: "proposed",
            isPublished: true,
          });
      }
    }
  }

  const updated = await db.query.tournamentRegistrations.findFirst({
    where: eq(tournamentRegistrations.id, registration.id),
  });
  const counts = await computeAccomCounts(registration.id);

  return NextResponse.json({
    ...counts,
    accomCheckIn: updated?.accomCheckIn ?? null,
    accomCheckOut: updated?.accomCheckOut ?? null,
    accomNotes: updated?.accomNotes ?? null,
    accomDeclined: updated?.accomDeclined ?? false,
    accomConfirmed: updated?.accomConfirmed ?? false,
  });
}
