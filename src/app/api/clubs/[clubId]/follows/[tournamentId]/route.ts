import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentFollowers, tournaments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { nanoid } from "nanoid";

// POST /api/clubs/[clubId]/follows/[tournamentId]
//
// Idempotent: clicking Follow twice returns the existing row.
// Rotates `unsubscribeToken` whenever a club re-follows after an
// earlier unfollow — old email unsub links go dead automatically.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string; tournamentId: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId, tournamentId } = await params;
  const cId = parseInt(clubId);
  const tId = parseInt(tournamentId);
  if (Number.isNaN(cId) || Number.isNaN(tId)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (cId !== session.clubId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Tournament must exist (avoid orphan follower rows; CASCADE would
  // also clean them, but better to 404 the request honestly).
  const [tournament] = await db
    .select({ id: tournaments.id })
    .from(tournaments)
    .where(eq(tournaments.id, tId))
    .limit(1);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const token = nanoid(32);
  const inserted = await db
    .insert(tournamentFollowers)
    .values({ clubId: cId, tournamentId: tId, unsubscribeToken: token })
    .onConflictDoNothing()
    .returning({ id: tournamentFollowers.id });

  if (inserted.length === 0) {
    // Already following — return existing row, do NOT rotate token.
    const [existing] = await db
      .select()
      .from(tournamentFollowers)
      .where(
        and(eq(tournamentFollowers.clubId, cId), eq(tournamentFollowers.tournamentId, tId)),
      );
    return NextResponse.json({ isFollowing: true, id: existing?.id ?? null });
  }

  return NextResponse.json({ isFollowing: true, id: inserted[0].id });
}

// DELETE /api/clubs/[clubId]/follows/[tournamentId] — hard unfollow.
// Re-follow will mint a fresh token.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string; tournamentId: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId, tournamentId } = await params;
  const cId = parseInt(clubId);
  const tId = parseInt(tournamentId);
  if (Number.isNaN(cId) || Number.isNaN(tId)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (cId !== session.clubId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .delete(tournamentFollowers)
    .where(
      and(eq(tournamentFollowers.clubId, cId), eq(tournamentFollowers.tournamentId, tId)),
    );

  return NextResponse.json({ isFollowing: false });
}

// GET /api/clubs/[clubId]/follows/[tournamentId] — status check
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string; tournamentId: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ isFollowing: false }, { status: 200 });
  }

  const { clubId, tournamentId } = await params;
  const cId = parseInt(clubId);
  const tId = parseInt(tournamentId);
  if (Number.isNaN(cId) || Number.isNaN(tId)) {
    return NextResponse.json({ isFollowing: false }, { status: 200 });
  }
  if (cId !== session.clubId) {
    return NextResponse.json({ isFollowing: false }, { status: 200 });
  }

  const [row] = await db
    .select({ id: tournamentFollowers.id })
    .from(tournamentFollowers)
    .where(
      and(eq(tournamentFollowers.clubId, cId), eq(tournamentFollowers.tournamentId, tId)),
    )
    .limit(1);

  return NextResponse.json({ isFollowing: !!row });
}
