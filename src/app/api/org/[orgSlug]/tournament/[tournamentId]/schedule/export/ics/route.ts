import { NextRequest, NextResponse } from "next/server";
import { isError, requireGameAdmin } from "@/lib/game-auth";
import {
  buildIcs,
  buildProblem,
  type Assignment,
} from "@/lib/scheduling";
import { loadSchedulingSnapshot } from "@/lib/scheduling-db";

type Params = { orgSlug: string; tournamentId: string };

/**
 * GET /api/org/[orgSlug]/tournament/[tournamentId]/schedule/export/ics
 *   ?team=<teamId>
 *   ?field=<fieldId>
 *   ?referee=<refereeId>
 *
 * Produces an iCalendar file containing the requested subset of matches.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("team") ? Number(searchParams.get("team")) : null;
  const fieldId = searchParams.get("field") ? Number(searchParams.get("field")) : null;
  const refereeId = searchParams.get("referee") ? Number(searchParams.get("referee")) : null;

  const snapshot = await loadSchedulingSnapshot({
    tournamentId: ctx.tournament.id,
    classId: null,
  });
  const problem = buildProblem(snapshot);

  const assignments: Assignment[] = snapshot.matches
    .filter((m) => m.scheduledAt && m.fieldId)
    .filter((m) => (teamId == null ? true : m.homeTeamId === teamId || m.awayTeamId === teamId))
    .filter((m) => (fieldId == null ? true : m.fieldId === fieldId))
    .filter((m) =>
      refereeId == null ? true : m.matchReferees.some((r) => r.refereeId === refereeId),
    )
    .map((m) => ({
      matchId: m.id,
      slotId: `${m.fieldId}:${m.scheduledAt!.toISOString()}`,
      fieldId: m.fieldId!,
      scheduledAtUtc: m.scheduledAt!.toISOString(),
      refereeAssignments: m.matchReferees,
    }));

  const result = buildIcs({
    calendarName: ctx.tournament.name,
    assignments,
    matches: problem.matchTemplates,
    slots: problem.slots,
    teams: problem.teams,
    tournamentName: ctx.tournament.name,
    timeZone: problem.timeZone,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return new NextResponse(result.ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${ctx.tournament.slug}.ics"`,
    },
  });
}
