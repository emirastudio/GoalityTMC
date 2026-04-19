import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  teams,
  tournamentRegistrations,
  registrationPeople,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

type RouteCtx = { params: Promise<{ registrationId: string; personId: string }> };

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

// PATCH — частичное обновление строки pivot.
// Принимает: includedInRoster, needsHotel, shirtNumber, isResponsibleOnSite,
// allergies, dietaryRequirements, medicalNotes.
export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const { registrationId, personId } = await params;
  const rid = parseInt(registrationId);
  const pid = parseInt(personId);
  const auth = await authorize(rid);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if ("includedInRoster" in body) updates.includedInRoster = !!body.includedInRoster;
  if ("needsHotel" in body) updates.needsHotel = !!body.needsHotel;
  if ("isResponsibleOnSite" in body) updates.isResponsibleOnSite = !!body.isResponsibleOnSite;
  if ("shirtNumber" in body) {
    updates.shirtNumber = body.shirtNumber !== null && body.shirtNumber !== ""
      ? Number(body.shirtNumber)
      : null;
  }
  if ("allergies" in body) updates.allergies = body.allergies?.trim() || null;
  if ("dietaryRequirements" in body) updates.dietaryRequirements = body.dietaryRequirements?.trim() || null;
  if ("medicalNotes" in body) updates.medicalNotes = body.medicalNotes?.trim() || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  updates.updatedAt = new Date();

  const [updated] = await db
    .update(registrationPeople)
    .set(updates)
    .where(
      and(
        eq(registrationPeople.registrationId, rid),
        eq(registrationPeople.personId, pid),
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

// DELETE — убрать человека из ростера этой регистрации.
// (person в клубном справочнике остаётся.)
export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const { registrationId, personId } = await params;
  const rid = parseInt(registrationId);
  const pid = parseInt(personId);
  const auth = await authorize(rid);
  if ("error" in auth) return auth.error;

  await db
    .delete(registrationPeople)
    .where(
      and(
        eq(registrationPeople.registrationId, rid),
        eq(registrationPeople.personId, pid),
      )
    );

  return NextResponse.json({ ok: true });
}
