import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { people, teams } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

type RouteCtx = { params: Promise<{ teamId: string }> };

// GET — list all people for a team
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { teamId } = await params;
  const rows = await db.query.people.findMany({
    where: eq(people.teamId, Number(teamId)),
    orderBy: (p, { asc }) => [asc(p.personType), asc(p.createdAt)],
  });
  return NextResponse.json(rows);
}

// POST — add a person to a team
export async function POST(req: NextRequest, { params }: RouteCtx) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { teamId } = await params;
  const teamIdNum = Number(teamId);

  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamIdNum) });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const body = await req.json();
  const {
    personType = "player",
    firstName,
    lastName,
    dateOfBirth,
    email,
    phone,
    shirtNumber,
    position,
    role,
    needsHotel = false,
    needsTransfer = false,
    showPublicly = false,
    allergies,
    dietaryRequirements,
    medicalNotes,
  } = body;

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "firstName and lastName are required" }, { status: 400 });
  }

  const [person] = await db.insert(people).values({
    teamId: teamIdNum,
    personType,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    shirtNumber: shirtNumber ? Number(shirtNumber) : null,
    position: position?.trim() || null,
    role: role?.trim() || null,
    needsHotel,
    needsTransfer,
    showPublicly,
    allergies: allergies?.trim() || null,
    dietaryRequirements: dietaryRequirements?.trim() || null,
    medicalNotes: medicalNotes?.trim() || null,
  }).returning();

  return NextResponse.json({ person }, { status: 201 });
}
