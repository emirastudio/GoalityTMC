import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments } from "@/db/schema";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { eq } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string };

/**
 * GET    → return current publish status
 * POST   → publish schedule (set schedulePublishedAt = now)
 * DELETE → unpublish schedule (clear schedulePublishedAt)
 */

export async function GET(req: NextRequest, { params }: { params: Promise<Params> }) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, ctx.tournament.id),
    columns: { schedulePublishedAt: true },
  });

  return NextResponse.json({
    published: !!tournament?.schedulePublishedAt,
    publishedAt: tournament?.schedulePublishedAt?.toISOString() ?? null,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  await db
    .update(tournaments)
    .set({ schedulePublishedAt: new Date(), updatedAt: new Date() })
    .where(eq(tournaments.id, ctx.tournament.id));

  return NextResponse.json({ published: true, publishedAt: new Date().toISOString() });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<Params> }) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  await db
    .update(tournaments)
    .set({ schedulePublishedAt: null, updatedAt: new Date() })
    .where(eq(tournaments.id, ctx.tournament.id));

  return NextResponse.json({ published: false });
}
