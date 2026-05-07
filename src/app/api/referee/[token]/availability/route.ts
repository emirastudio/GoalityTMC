import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { refereeAvailability, tournamentReferees } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

type Params = { token: string };

/**
 * GET /api/referee/[token]/availability
 * Returns the referee's availability entries.
 * Authenticated by access token.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { token } = await params;

  const referee = await db.query.tournamentReferees.findFirst({
    where: and(
      eq(tournamentReferees.accessToken, token),
      isNull(tournamentReferees.deletedAt),
    ),
  });

  if (!referee) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(refereeAvailability)
    .where(eq(refereeAvailability.refereeId, referee.id));

  return NextResponse.json({ availability: rows });
}

/**
 * PUT /api/referee/[token]/availability
 * Replaces all availability entries for this referee.
 * Body: { entries: [{ date, isBlackout, notes? }] }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { token } = await params;

  const referee = await db.query.tournamentReferees.findFirst({
    where: and(
      eq(tournamentReferees.accessToken, token),
      isNull(tournamentReferees.deletedAt),
    ),
  });

  if (!referee) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const entries = Array.isArray(body.entries) ? body.entries : null;
  if (!entries) {
    return NextResponse.json({ error: "entries required" }, { status: 400 });
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(refereeAvailability)
      .where(eq(refereeAvailability.refereeId, referee.id));

    if (entries.length > 0) {
      await tx.insert(refereeAvailability).values(
        entries.map(
          (e: {
            date: string;
            isBlackout?: boolean;
            notes?: string;
          }) => ({
            refereeId: referee.id,
            date: e.date,
            isBlackout: e.isBlackout === true,
            notes: e.notes ?? null,
          }),
        ),
      );
    }
  });

  return NextResponse.json({ ok: true, saved: entries.length });
}
