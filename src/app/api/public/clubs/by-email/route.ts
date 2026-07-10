import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubUsers, clubs, teams, tournamentClasses, tournamentRegistrations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // This unauthenticated lookup reveals whether an email maps to a club/team,
  // so cap it per IP to blunt mass enumeration. Legit use is one debounced
  // call as the user types their own email on the login page. On limit we
  // return null (indistinguishable from "no such account") rather than 429.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { allowed } = checkRateLimit(`by-email:${ip}`, 20, 10 * 60 * 1000);
  if (!allowed) return NextResponse.json(null);

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
    // classId is now on tournamentRegistrations, not teams
    const reg = await db.query.tournamentRegistrations.findFirst({
      where: eq(tournamentRegistrations.teamId, user.teamId),
      orderBy: (r, { desc }) => [desc(r.id)],
    });
    if (reg?.classId) {
      const cls = await db.query.tournamentClasses.findFirst({
        where: eq(tournamentClasses.id, reg.classId),
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
