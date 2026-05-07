import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentReferees } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { assertFeature } from "@/lib/plan-gates";
import { and, eq, isNull } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string; refereeId: string };

/**
 * POST — generate or regenerate an access token for a referee.
 * Organizer-only. Requires Pro+ plan (hasMatchHub gate).
 * Returns { token: string } — the caller should build the public URL:
 *   ${origin}/referee/${token}
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (isError(ctx)) return ctx;

  const gate = assertFeature(ctx.effectivePlan, "hasMatchHub");
  if (gate) return gate;

  const refereeId = parseInt(p.refereeId);
  if (isNaN(refereeId)) {
    return NextResponse.json({ error: "Invalid refereeId" }, { status: 400 });
  }

  // Verify this referee belongs to this tournament (security check)
  const existing = await db.query.tournamentReferees.findFirst({
    where: and(
      eq(tournamentReferees.id, refereeId),
      eq(tournamentReferees.tournamentId, ctx.tournament.id),
      isNull(tournamentReferees.deletedAt),
    ),
  });

  if (!existing) {
    return NextResponse.json({ error: "Referee not found" }, { status: 404 });
  }

  // Generate a 32-char hex token
  const newToken = crypto.randomUUID().replace(/-/g, "");

  await db
    .update(tournamentReferees)
    .set({ accessToken: newToken, updatedAt: new Date() })
    .where(eq(tournamentReferees.id, refereeId));

  return NextResponse.json({ token: newToken });
}
