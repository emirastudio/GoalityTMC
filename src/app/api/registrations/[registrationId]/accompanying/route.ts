import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  teams,
  tournamentRegistrations,
  registrationPeople,
  people,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

type RouteCtx = { params: Promise<{ registrationId: string }> };

// POST — создать сопровождающего одной операцией:
// 1) вставить person (personType='accompanying') в справочник клуба,
// 2) добавить в pivot регистрации с нужными галками.
// body: { firstName, lastName, dateOfBirth?, email?, phone?, needsHotel?, includedInRoster? }
export async function POST(req: NextRequest, { params }: RouteCtx) {
  const { registrationId } = await params;
  const rid = parseInt(registrationId);

  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const registration = await db.query.tournamentRegistrations.findFirst({
    where: eq(tournamentRegistrations.id, rid),
  });
  if (!registration) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }
  const team = await db.query.teams.findFirst({ where: eq(teams.id, registration.teamId) });
  if (!team || team.clubId !== session.clubId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "firstName and lastName are required" }, { status: 400 });
  }

  // 1. person в справочнике клуба
  const [person] = await db
    .insert(people)
    .values({
      teamId: team.id,
      personType: "accompanying",
      firstName,
      lastName,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
    })
    .returning();

  // 2. pivot строка
  const [pivot] = await db
    .insert(registrationPeople)
    .values({
      registrationId: rid,
      personId: person.id,
      includedInRoster: body.includedInRoster ?? false, // сопровождающих обычно НЕ в протокол
      needsHotel: !!body.needsHotel,
    })
    .returning();

  return NextResponse.json({ person, pivot }, { status: 201 });
}
