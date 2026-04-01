import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamInvites, teams, clubs } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

type RouteContext = { params: Promise<{ token: string }> };

// GET /api/invites/[token]
// Публичный — возвращает инфо о приглашении (имя команды, клуба)
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { token } = await params;

  const invite = await db.query.teamInvites.findFirst({
    where: and(eq(teamInvites.token, token), isNull(teamInvites.usedAt)),
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found or already used" }, { status: 404 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  const [team, club] = await Promise.all([
    db.query.teams.findFirst({ where: eq(teams.id, invite.teamId) }),
    db.query.clubs.findFirst({ where: eq(clubs.id, invite.clubId) }),
  ]);

  if (!team || !club) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    teamId: team.id,
    teamName: team.name,
    clubName: club.name,
    expiresAt: invite.expiresAt,
  });
}
