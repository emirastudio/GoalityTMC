import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { people, teams } from "@/db/schema";
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
  return { tid, team, session };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const auth = await authorizeTeamAccess(teamId);
  if ("error" in auth) return auth.error;

  const type = req.nextUrl.searchParams.get("type"); // player, staff, accompanying

  const conditions = [eq(people.teamId, parseInt(teamId))];
  if (type) {
    conditions.push(eq(people.personType, type as "player" | "staff" | "accompanying"));
  }

  const result = await db.query.people.findMany({
    where: and(...conditions),
    orderBy: (p, { asc }) => [asc(p.createdAt)],
  });

  return NextResponse.json(result);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const auth = await authorizeTeamAccess(teamId);
  if ("error" in auth) return auth.error;

  const body = await req.json();

  const [person] = await db
    .insert(people)
    .values({
      teamId: parseInt(teamId),
      personType: body.personType,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email || null,
      phone: body.phone || null,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
      shirtNumber: body.shirtNumber ? parseInt(body.shirtNumber) : null,
      position: body.position || null,
      role: body.role || null,
      isResponsibleOnSite: body.isResponsibleOnSite ?? false,
      allergies: body.allergies || null,
      dietaryRequirements: body.dietaryRequirements || null,
      medicalNotes: body.medicalNotes || null,
      needsHotel: body.needsHotel ?? false,
      needsTransfer: body.needsTransfer ?? false,
      showPublicly: body.showPublicly ?? false,
    })
    .returning();

  return NextResponse.json(person, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const auth = await authorizeTeamAccess(teamId);
  if ("error" in auth) return auth.error;

  const personId = req.nextUrl.searchParams.get("id");
  if (!personId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  const textFields = ["firstName", "lastName", "email", "phone", "position", "role", "allergies", "dietaryRequirements", "medicalNotes"] as const;
  for (const f of textFields) {
    if (f in body) updates[f] = body[f] || null;
  }
  if ("shirtNumber" in body) updates.shirtNumber = body.shirtNumber ? parseInt(body.shirtNumber) : null;
  if ("dateOfBirth" in body) updates.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
  if ("needsHotel" in body) updates.needsHotel = !!body.needsHotel;
  if ("needsTransfer" in body) updates.needsTransfer = !!body.needsTransfer;
  if ("isResponsibleOnSite" in body) updates.isResponsibleOnSite = !!body.isResponsibleOnSite;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(people)
    .set(updates)
    .where(and(eq(people.id, parseInt(personId)), eq(people.teamId, parseInt(teamId))))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const auth = await authorizeTeamAccess(teamId);
  if ("error" in auth) return auth.error;

  const personId = req.nextUrl.searchParams.get("id");
  if (!personId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await db.delete(people).where(
    and(
      eq(people.id, parseInt(personId)),
      eq(people.teamId, parseInt(teamId))
    )
  );

  return NextResponse.json({ ok: true });
}
