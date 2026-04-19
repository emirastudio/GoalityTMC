import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { people } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

type RouteCtx = { params: Promise<{ personId: string }> };

// PATCH — update a person
export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { personId } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  const fields = [
    "firstName","lastName","dateOfBirth","email","phone",
    "position","role","personType",
    "showPublicly",
  ] as const;

  for (const f of fields) {
    if (body[f] !== undefined) {
      if (f === "dateOfBirth") {
        updates[f] = body[f] ? new Date(body[f]) : null;
      } else {
        updates[f] = typeof body[f] === "string" ? (body[f].trim() || null) : body[f];
      }
    }
  }

  // Приватность детей: email/phone недопустимы для player.
  // Проверяем либо новый personType (если меняется), либо текущий.
  let effectiveType = updates.personType as string | undefined;
  if (!effectiveType) {
    const current = await db.query.people.findFirst({
      where: eq(people.id, Number(personId)),
      columns: { personType: true },
    });
    effectiveType = current?.personType;
  }
  if (effectiveType === "player") {
    if ("email" in updates) updates.email = null;
    if ("phone" in updates) updates.phone = null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [person] = await db
    .update(people)
    .set(updates)
    .where(eq(people.id, Number(personId)))
    .returning();

  if (!person) return NextResponse.json({ error: "Person not found" }, { status: 404 });

  return NextResponse.json({ person });
}

// DELETE — remove a person
export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { personId } = await params;

  const [deleted] = await db
    .delete(people)
    .where(eq(people.id, Number(personId)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Person not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
