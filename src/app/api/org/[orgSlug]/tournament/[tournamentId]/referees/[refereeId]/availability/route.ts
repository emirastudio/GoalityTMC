import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { refereeAvailability, tournamentReferees } from "@/db/schema";
import { isError, requireGameAdmin } from "@/lib/game-auth";

type Params = { orgSlug: string; tournamentId: string; refereeId: string };

/**
 * GET — returns the referee's availability windows.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const resolved = await params;
  const ctx = await requireGameAdmin(req, resolved);
  if (isError(ctx)) return ctx;

  // Confirm referee belongs to this tournament
  const [ref] = await db
    .select()
    .from(tournamentReferees)
    .where(
      and(
        eq(tournamentReferees.id, Number(resolved.refereeId)),
        eq(tournamentReferees.tournamentId, ctx.tournament.id),
      ),
    );
  if (!ref) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select()
    .from(refereeAvailability)
    .where(eq(refereeAvailability.refereeId, ref.id));

  return NextResponse.json({ availability: rows });
}

/**
 * PUT — replaces the referee's availability with the given entries.
 * Body: { entries: [{date, startTime?, endTime?, isBlackout, notes?}] }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const resolved = await params;
  const ctx = await requireGameAdmin(req, resolved);
  if (isError(ctx)) return ctx;

  const body = await req.json().catch(() => ({}));
  const entries = Array.isArray(body.entries) ? body.entries : null;
  if (!entries) {
    return NextResponse.json({ error: "entries required" }, { status: 400 });
  }

  const [ref] = await db
    .select()
    .from(tournamentReferees)
    .where(
      and(
        eq(tournamentReferees.id, Number(resolved.refereeId)),
        eq(tournamentReferees.tournamentId, ctx.tournament.id),
      ),
    );
  if (!ref) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.transaction(async (tx) => {
    await tx.delete(refereeAvailability).where(eq(refereeAvailability.refereeId, ref.id));
    if (entries.length > 0) {
      await tx.insert(refereeAvailability).values(
        entries.map(
          (e: {
            date: string;
            startTime?: string | null;
            endTime?: string | null;
            isBlackout?: boolean;
            notes?: string;
          }) => ({
            refereeId: ref.id,
            date: e.date,
            startTime: e.startTime ?? null,
            endTime: e.endTime ?? null,
            isBlackout: e.isBlackout === true,
            notes: e.notes ?? null,
          }),
        ),
      );
    }
  });

  return NextResponse.json({ ok: true, saved: entries.length });
}
