import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  teams,
  tournamentRegistrations,
  registrationPeople,
  people,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

type RouteCtx = { params: Promise<{ registrationId: string }> };

async function authorize(registrationId: number) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const registration = await db.query.tournamentRegistrations.findFirst({
    where: eq(tournamentRegistrations.id, registrationId),
  });
  if (!registration) {
    return { error: NextResponse.json({ error: "Registration not found" }, { status: 404 }) };
  }
  const team = await db.query.teams.findFirst({ where: eq(teams.id, registration.teamId) });
  if (!team || team.clubId !== session.clubId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, registration, team };
}

// GET — состав регистрации: все строки pivot + базовые данные person.
// Если в pivot нет строк (например, регистрация создана до 0018) — подтягиваем
// всех people команды в UI и клиент потом PUT-ом создаст pivot-строки.
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const { registrationId } = await params;
  const rid = parseInt(registrationId);
  const auth = await authorize(rid);
  if ("error" in auth) return auth.error;

  const rows = await db
    .select({
      id: registrationPeople.id,
      personId: registrationPeople.personId,
      firstName: people.firstName,
      lastName: people.lastName,
      dateOfBirth: people.dateOfBirth,
      personType: people.personType,
      position: people.position,
      role: people.role,
      email: people.email,
      phone: people.phone,
      includedInRoster: registrationPeople.includedInRoster,
      needsHotel: registrationPeople.needsHotel,
      shirtNumber: registrationPeople.shirtNumber,
      isResponsibleOnSite: registrationPeople.isResponsibleOnSite,
      allergies: registrationPeople.allergies,
      dietaryRequirements: registrationPeople.dietaryRequirements,
      medicalNotes: registrationPeople.medicalNotes,
    })
    .from(registrationPeople)
    .innerJoin(people, eq(people.id, registrationPeople.personId))
    .where(eq(registrationPeople.registrationId, rid))
    .orderBy(people.personType, people.lastName);

  // Счётчики проживания по типу.
  const accomRows = await db
    .select({ personType: people.personType, cnt: sql<number>`COUNT(*)::int` })
    .from(registrationPeople)
    .innerJoin(people, eq(people.id, registrationPeople.personId))
    .where(and(eq(registrationPeople.registrationId, rid), eq(registrationPeople.needsHotel, true)))
    .groupBy(people.personType);
  const by = Object.fromEntries(accomRows.map((r) => [r.personType, Number(r.cnt)]));

  return NextResponse.json({
    people: rows,
    counts: {
      playersInRoster: rows.filter((r) => r.personType === "player" && r.includedInRoster).length,
      staffInRoster: rows.filter((r) => r.personType === "staff" && r.includedInRoster).length,
      hotelPlayers: by.player ?? 0,
      hotelStaff: by.staff ?? 0,
      hotelAccompanying: by.accompanying ?? 0,
      hotelTotal: (by.player ?? 0) + (by.staff ?? 0) + (by.accompanying ?? 0),
    },
  });
}

// POST — добавить уже существующего person в ростер регистрации.
// body: { personId: number }
export async function POST(req: NextRequest, { params }: RouteCtx) {
  const { registrationId } = await params;
  const rid = parseInt(registrationId);
  const auth = await authorize(rid);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const personId = Number(body.personId);
  if (!personId) {
    return NextResponse.json({ error: "personId is required" }, { status: 400 });
  }

  // Проверим, что человек принадлежит команде этой регистрации.
  const person = await db.query.people.findFirst({ where: eq(people.id, personId) });
  if (!person || person.teamId !== auth.registration.teamId) {
    return NextResponse.json({ error: "Person not in team" }, { status: 403 });
  }

  const [row] = await db
    .insert(registrationPeople)
    .values({ registrationId: rid, personId })
    .onConflictDoNothing()
    .returning();

  return NextResponse.json({ ok: true, row: row ?? null });
}
