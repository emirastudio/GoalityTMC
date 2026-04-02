import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubUsers, clubs, teams, tournamentClasses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim() ?? "";
  if (!email || !email.includes("@")) return NextResponse.json(null);

  const user = await db.query.clubUsers.findFirst({
    where: eq(clubUsers.email, email),
  });
  if (!user) return NextResponse.json(null);

  const club = await db.query.clubs.findFirst({
    where: eq(clubs.id, user.clubId),
  });
  if (!club) return NextResponse.json(null);

  let teamName: string | null = null;
  let className: string | null = null;

  if (user.teamId) {
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, user.teamId),
    });
    teamName = team?.name ?? null;
    if (team?.classId) {
      const cls = await db.query.tournamentClasses.findFirst({
        where: eq(tournamentClasses.id, team.classId),
      });
      className = cls?.name ?? null;
    }
  }

  return NextResponse.json({
    clubId: club.id,
    clubName: club.name,
    clubBadge: club.badgeUrl,
    teamName,
    className,
    isClubAdmin: !user.teamId,
  });
}
