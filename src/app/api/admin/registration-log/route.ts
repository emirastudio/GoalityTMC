import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { registrationAttempts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireTournamentAdmin, isError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const ctx = await requireTournamentAdmin(req);
  if (isError(ctx)) return ctx;

  const rows = await db
    .select()
    .from(registrationAttempts)
    .where(eq(registrationAttempts.tournamentId, ctx.tournament.id))
    .orderBy(desc(registrationAttempts.createdAt))
    .limit(200);

  return NextResponse.json(rows);
}
