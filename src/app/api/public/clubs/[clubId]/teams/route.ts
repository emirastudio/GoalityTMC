import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, tournamentClasses, tournamentRegistrations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET /api/public/clubs/[clubId]/teams
//
// Public — used by the tournament-registration wizard before the user
// is authenticated. Returns the club's teams so an incoming coach can
// pick "their" team or click "+ Создать новую команду". Exposes only
// identity fields (name / birthYear / gender) — no roster, no contacts.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params;
  const cid = parseInt(clubId);
  if (isNaN(cid)) return NextResponse.json([]);

  const clubTeams = await db.query.teams.findMany({
    where: eq(teams.clubId, cid),
    orderBy: (t, { asc, desc }) => [desc(t.birthYear), asc(t.gender), asc(t.id)],
  });

  const result = await Promise.all(
    clubTeams.map(async (team) => {
      // Include the most recent class name (for display only — the new
      // registration picks its own classes per tournament).
      let className = "";
      const reg = await db.query.tournamentRegistrations.findFirst({
        where: eq(tournamentRegistrations.teamId, team.id),
        orderBy: (r) => [desc(r.id)],
      });
      if (reg?.classId) {
        const cls = await db.query.tournamentClasses.findFirst({
          where: eq(tournamentClasses.id, reg.classId),
        });
        className = cls?.name ?? "";
      }
      // Identity priority for the picker label:
      //   1. Custom name + year (e.g. "Academy A · 2015")
      //   2. Year only (the canonical identity in our model)
      //   3. Custom name only
      //   4. Fallback to "—" so the row is never gender-only
      const yearStr = team.birthYear ? String(team.birthYear) : null;
      const label = team.name && yearStr ? `${team.name} · ${yearStr}`
        : yearStr ?? team.name ?? "—";
      return {
        id: team.id,
        name: team.name,
        birthYear: team.birthYear,
        gender: team.gender,
        label,
        className,
      };
    })
  );

  return NextResponse.json(result);
}
