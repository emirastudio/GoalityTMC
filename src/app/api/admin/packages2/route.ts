import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { servicePackages, packageItems, packageAssignments } from "@/db/schema";
import { requireTournamentAdmin, isError } from "@/lib/api-auth";
import { eq, and, count, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;

  const packages = await db
    .select({
      id: servicePackages.id,
      tournamentId: servicePackages.tournamentId,
      name: servicePackages.name,
      nameRu: servicePackages.nameRu,
      nameEt: servicePackages.nameEt,
      description: servicePackages.description,
      descriptionRu: servicePackages.descriptionRu,
      descriptionEt: servicePackages.descriptionEt,
      isDefault: servicePackages.isDefault,
      createdAt: servicePackages.createdAt,
      itemsCount: sql<number>`(
        SELECT COUNT(*) FROM package_items
        WHERE package_items.package_id = ${servicePackages.id}
      )::int`,
      assignedTeams: count(packageAssignments.id),
    })
    .from(servicePackages)
    .leftJoin(
      packageAssignments,
      eq(packageAssignments.packageId, servicePackages.id)
    )
    .where(eq(servicePackages.tournamentId, ctx.tournament.id))
    .groupBy(servicePackages.id)
    .orderBy(servicePackages.createdAt);

  return NextResponse.json(packages);
}

export async function POST(req: NextRequest) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;

  const body = await req.json();

  const [created] = await db
    .insert(servicePackages)
    .values({
      tournamentId: ctx.tournament.id,
      name: body.name,
      nameRu: body.nameRu,
      nameEt: body.nameEt,
      description: body.description,
      descriptionRu: body.descriptionRu,
      descriptionEt: body.descriptionEt,
      isDefault: body.isDefault ?? false,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;

  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { id, ...fields } = body;

  const [updated] = await db
    .update(servicePackages)
    .set(fields)
    .where(and(eq(servicePackages.id, id), eq(servicePackages.tournamentId, ctx.tournament.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Check if any teams are assigned to this package
  const assignments = await db.query.packageAssignments.findMany({
    where: eq(packageAssignments.packageId, id),
  });

  if (assignments.length > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${assignments.length} team(s) assigned to this package`,
      },
      { status: 409 }
    );
  }

  const [deleted] = await db
    .delete(servicePackages)
    .where(and(eq(servicePackages.id, id), eq(servicePackages.tournamentId, ctx.tournament.id)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
