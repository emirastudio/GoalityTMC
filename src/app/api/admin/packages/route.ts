import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, servicePackages, packageAssignments } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, count, sql } from "drizzle-orm";

async function getActiveTournament() {
  return db.query.tournaments.findFirst({
    where: eq(tournaments.registrationOpen, true),
  });
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournament = await getActiveTournament();
  if (!tournament) {
    return NextResponse.json({ error: "No active tournament" }, { status: 404 });
  }

  const packages = await db
    .select({
      id: servicePackages.id,
      tournamentId: servicePackages.tournamentId,
      name: servicePackages.name,
      nameRu: servicePackages.nameRu,
      nameEt: servicePackages.nameEt,
      description: servicePackages.description,
      isDefault: servicePackages.isDefault,
      accommodationOptionId: servicePackages.accommodationOptionId,
      includeAccommodation: servicePackages.includeAccommodation,
      includeTransfer: servicePackages.includeTransfer,
      includeRegistration: servicePackages.includeRegistration,
      includeMeals: servicePackages.includeMeals,
      createdAt: servicePackages.createdAt,
      assignedTeams: count(packageAssignments.id),
      publishedTeams: sql<number>`COUNT(CASE WHEN ${packageAssignments.isPublished} = true THEN 1 END)::int`,
    })
    .from(servicePackages)
    .leftJoin(packageAssignments, eq(packageAssignments.packageId, servicePackages.id))
    .where(eq(servicePackages.tournamentId, tournament.id))
    .groupBy(servicePackages.id)
    .orderBy(servicePackages.createdAt);

  return NextResponse.json(packages);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournament = await getActiveTournament();
  if (!tournament) {
    return NextResponse.json({ error: "No active tournament" }, { status: 404 });
  }

  const body = await req.json();

  const [created] = await db
    .insert(servicePackages)
    .values({
      tournamentId: tournament.id,
      name: body.name,
      nameRu: body.nameRu,
      nameEt: body.nameEt,
      description: body.description,
      isDefault: body.isDefault ?? false,
      accommodationOptionId: body.accommodationOptionId ?? null,
      includeAccommodation: body.includeAccommodation ?? true,
      includeTransfer: body.includeTransfer ?? true,
      includeRegistration: body.includeRegistration ?? true,
      includeMeals: body.includeMeals ?? true,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { id, ...fields } = body;

  const [updated] = await db
    .update(servicePackages)
    .set(fields)
    .where(eq(servicePackages.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  let id = Number(searchParams.get("id"));

  if (!id) {
    const body = await req.json().catch(() => ({}));
    id = body.id;
  }

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Check if any teams are assigned to this package
  const assignments = await db.query.packageAssignments.findMany({
    where: eq(packageAssignments.packageId, id),
  });

  if (assignments.length > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${assignments.length} team(s) assigned to this package` },
      { status: 409 }
    );
  }

  const [deleted] = await db
    .delete(servicePackages)
    .where(eq(servicePackages.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
