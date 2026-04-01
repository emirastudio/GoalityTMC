import { NextResponse } from "next/server";
import { db } from "@/db";
import { packageAssignments, servicePackages } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const rows = await db
    .select({
      teamId: packageAssignments.teamId,
      packageId: packageAssignments.packageId,
      packageName: servicePackages.name,
      assignedAt: packageAssignments.assignedAt,
      isPublished: packageAssignments.isPublished,
    })
    .from(packageAssignments)
    .leftJoin(servicePackages, eq(packageAssignments.packageId, servicePackages.id));

  return NextResponse.json(rows);
}
