import { and, asc, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentReferees } from "@/db/schema";
import { isError, requireGameAdmin } from "@/lib/game-auth";

type Params = { orgSlug: string; tournamentId: string };

/**
 * GET — list all referees for this tournament (non-deleted).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const rows = await db
    .select()
    .from(tournamentReferees)
    .where(
      and(
        eq(tournamentReferees.tournamentId, ctx.tournament.id),
        isNull(tournamentReferees.deletedAt),
      ),
    )
    .orderBy(asc(tournamentReferees.lastName));

  return NextResponse.json({ referees: rows });
}

/**
 * POST — create a referee.
 * Body: { firstName, lastName, phone?, email?, level?, colorTag?, notes? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const body = await req.json().catch(() => ({}));
  const { firstName, lastName, phone, email, level, colorTag, notes } = body as {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    level?: string;
    colorTag?: string;
    notes?: string;
  };
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "firstName and lastName required" }, { status: 400 });
  }

  const [inserted] = await db
    .insert(tournamentReferees)
    .values({
      tournamentId: ctx.tournament.id,
      organizationId: ctx.organizationId,
      firstName,
      lastName,
      phone: phone ?? null,
      email: email ?? null,
      level: level ?? null,
      colorTag: colorTag ?? null,
      notes: notes ?? null,
    })
    .returning();

  return NextResponse.json({ referee: inserted });
}
