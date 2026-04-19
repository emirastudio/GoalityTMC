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

// Приватность детей: email/phone только для staff/accompanying.
// Дублирует CHECK constraint в БД (people_contacts_adults_only),
// но даёт человеческую ошибку ещё до попытки INSERT.
function stripChildContacts(personType: string | undefined, body: Record<string, unknown>) {
  if (personType === "player") {
    body.email = null;
    body.phone = null;
  }
  return body;
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
  stripChildContacts(body.personType, body);

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
      position: body.position || null,
      role: body.role || null,
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

  // Если в запросе обновляется personType, стрипаем контакты под новый тип.
  // Иначе берём текущий personType из БД для валидации.
  let effectiveType = body.personType as string | undefined;
  if (!effectiveType) {
    const current = await db.query.people.findFirst({
      where: and(eq(people.id, parseInt(personId)), eq(people.teamId, parseInt(teamId))),
      columns: { personType: true },
    });
    effectiveType = current?.personType;
  }
  stripChildContacts(effectiveType, body);

  const updates: Record<string, unknown> = {};

  const textFields = ["firstName", "lastName", "email", "phone", "position", "role"] as const;
  for (const f of textFields) {
    if (f in body) updates[f] = body[f] || null;
  }
  if ("dateOfBirth" in body) updates.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
  if ("showPublicly" in body) updates.showPublicly = !!body.showPublicly;

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
