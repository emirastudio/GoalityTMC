import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { services } from "@/db/schema";
import { requireTournamentAdmin, requireAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;

  const result = await db
    .select()
    .from(services)
    .where(eq(services.tournamentId, ctx.tournament.id))
    .orderBy(services.sortOrder);

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;

  const body = await req.json();

  const [created] = await db
    .insert(services)
    .values({
      tournamentId: ctx.tournament.id,
      name: body.name,
      nameRu: body.nameRu,
      nameEt: body.nameEt,
      icon: body.icon,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { id, ...fields } = body;

  const [updated] = await db
    .update(services)
    .set(fields)
    .where(eq(services.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(services)
    .where(eq(services.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
