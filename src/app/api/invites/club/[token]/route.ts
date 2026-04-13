import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubInvites, clubs } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

type RouteContext = { params: Promise<{ token: string }> };

// GET /api/invites/club/[token]
// Публичный — возвращает инфо о приглашении (название клуба)
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { token } = await params;

  const invite = await db.query.clubInvites.findFirst({
    where: and(eq(clubInvites.token, token), isNull(clubInvites.usedAt)),
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found or already used" }, { status: 404 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  const club = await db.query.clubs.findFirst({ where: eq(clubs.id, invite.clubId) });

  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  return NextResponse.json({
    clubId: club.id,
    clubName: club.name,
    badgeUrl: club.badgeUrl ?? null,
    expiresAt: invite.expiresAt,
  });
}
