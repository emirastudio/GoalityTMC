import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentClasses } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const tournamentId = req.nextUrl.searchParams.get("tournamentId");
  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId is required" }, { status: 400 });
  }

  const classes = await db.query.tournamentClasses.findMany({
    where: eq(tournamentClasses.tournamentId, parseInt(tournamentId)),
    orderBy: (c, { asc }) => [asc(c.name)],
  });

  return NextResponse.json(classes);
}
