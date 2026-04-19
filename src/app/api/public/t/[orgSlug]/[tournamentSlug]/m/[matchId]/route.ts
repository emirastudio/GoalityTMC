import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  organizations,
  tournaments,
  matches,
  matchLineup,
  matchEvents,
  people,
} from "@/db/schema";
import { eq, and, isNull, inArray, asc } from "drizzle-orm";
import { resolveTeamDisplayNames } from "@/lib/team-display-names";

// GET /api/public/t/[orgSlug]/[tournamentSlug]/m/[matchId]
// Public match protocol: score, meta, lineups, timeline of events, per-team stats.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentSlug: string; matchId: string }> }
) {
  const { orgSlug, tournamentSlug, matchId } = await params;
  const mid = parseInt(matchId);
  if (isNaN(mid)) return NextResponse.json({ error: "Invalid matchId" }, { status: 400 });

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tournament = await db.query.tournaments.findFirst({
    where: and(
      eq(tournaments.organizationId, org.id),
      eq(tournaments.slug, tournamentSlug)
    ),
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const match = await db.query.matches.findFirst({
    where: and(
      eq(matches.id, mid),
      eq(matches.tournamentId, tournament.id),
      eq(matches.isPublic, true),
      isNull(matches.deletedAt),
    ),
    with: {
      homeTeam: { with: { club: true } },
      awayTeam: { with: { club: true } },
      field: { with: { stadium: true } },
      stage: true,
      group: true,
      round: true,
    },
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  // Resolve displayName fallback for both teams.
  const teamIds: number[] = [];
  if (match.homeTeam?.id) teamIds.push(match.homeTeam.id);
  if (match.awayTeam?.id) teamIds.push(match.awayTeam.id);
  const displayNames = await resolveTeamDisplayNames(tournament.id, teamIds);
  if (match.homeTeam) {
    const dn = displayNames.get(match.homeTeam.id);
    if (dn && !match.homeTeam.name) match.homeTeam.name = dn;
  }
  if (match.awayTeam) {
    const dn = displayNames.get(match.awayTeam.id);
    if (dn && !match.awayTeam.name) match.awayTeam.name = dn;
  }

  // Detect 3rd-place flag.
  let isThirdPlace = false;
  if (match.round?.hasThirdPlace && match.roundId) {
    const all = await db
      .select({ id: matches.id })
      .from(matches)
      .where(and(eq(matches.roundId, match.roundId), isNull(matches.deletedAt)))
      .orderBy(asc(matches.matchNumber));
    const idx = all.findIndex(r => r.id === mid);
    isThirdPlace = idx >= match.round.matchCount;
  }

  // Lineups
  const lineupRows = await db
    .select({
      id: matchLineup.id,
      teamId: matchLineup.teamId,
      personId: matchLineup.personId,
      isStarting: matchLineup.isStarting,
      shirtNumber: matchLineup.shirtNumber,
      position: matchLineup.position,
    })
    .from(matchLineup)
    .where(eq(matchLineup.matchId, mid));

  const personIds = Array.from(new Set(lineupRows.map(r => r.personId)));
  const peopleRows = personIds.length > 0
    ? await db
        .select({
          id: people.id,
          firstName: people.firstName,
          lastName: people.lastName,
          position: people.position,
          personType: people.personType,
        })
        .from(people)
        .where(inArray(people.id, personIds))
    : [];
  const peopleById = new Map(peopleRows.map(p => [p.id, p]));

  type LineupPlayer = {
    personId: number;
    firstName: string | null;
    lastName: string | null;
    fullName: string;
    shirtNumber: number | null;
    position: string | null;
    isStarting: boolean;
  };
  const toPlayer = (r: typeof lineupRows[number]): LineupPlayer | null => {
    const p = peopleById.get(r.personId);
    if (!p) return null;
    return {
      personId: r.personId,
      firstName: p.firstName,
      lastName: p.lastName,
      fullName: [p.firstName, p.lastName].filter(Boolean).join(" ") || "—",
      // shirt number appears only if it was recorded on the lineup row —
      // lookup via registration is omitted here for brevity (matches without
      // a proper lineup entry shouldn't happen in practice).
      shirtNumber: r.shirtNumber ?? null,
      position: r.position ?? p.position ?? null,
      isStarting: r.isStarting,
    };
  };

  const home = {
    starters: [] as LineupPlayer[],
    bench: [] as LineupPlayer[],
  };
  const away = {
    starters: [] as LineupPlayer[],
    bench: [] as LineupPlayer[],
  };
  for (const r of lineupRows) {
    const pl = toPlayer(r);
    if (!pl) continue;
    const bucket = r.teamId === match.homeTeamId ? home : r.teamId === match.awayTeamId ? away : null;
    if (!bucket) continue;
    (pl.isStarting ? bucket.starters : bucket.bench).push(pl);
  }
  const byShirtThenName = (a: LineupPlayer, b: LineupPlayer) => {
    const sa = a.shirtNumber ?? 9999;
    const sb = b.shirtNumber ?? 9999;
    if (sa !== sb) return sa - sb;
    return a.fullName.localeCompare(b.fullName);
  };
  home.starters.sort(byShirtThenName);
  home.bench.sort(byShirtThenName);
  away.starters.sort(byShirtThenName);
  away.bench.sort(byShirtThenName);

  // Events (timeline)
  const eventRows = await db
    .select({
      id: matchEvents.id,
      teamId: matchEvents.teamId,
      personId: matchEvents.personId,
      assistPersonId: matchEvents.assistPersonId,
      eventType: matchEvents.eventType,
      minute: matchEvents.minute,
      minuteExtra: matchEvents.minuteExtra,
      notes: matchEvents.notes,
    })
    .from(matchEvents)
    .where(eq(matchEvents.matchId, mid))
    .orderBy(asc(matchEvents.minute), asc(matchEvents.minuteExtra));

  // Fetch any additional persons referenced by events (e.g. assist/subs)
  // that weren't in the lineup.
  const eventPersonIds = new Set<number>();
  for (const e of eventRows) {
    if (e.personId) eventPersonIds.add(e.personId);
    if (e.assistPersonId) eventPersonIds.add(e.assistPersonId);
  }
  for (const pid of eventPersonIds) {
    if (!peopleById.has(pid)) {
      const extra = await db.query.people.findFirst({
        where: eq(people.id, pid),
        columns: { id: true, firstName: true, lastName: true, personType: true, position: true },
      });
      if (extra) peopleById.set(pid, extra);
    }
  }

  const nameOf = (pid: number | null) => {
    if (!pid) return null;
    const p = peopleById.get(pid);
    if (!p) return null;
    return [p.firstName, p.lastName].filter(Boolean).join(" ") || null;
  };

  const events = eventRows.map(e => ({
    id: e.id,
    teamId: e.teamId,
    side: e.teamId === match.homeTeamId ? "home" : e.teamId === match.awayTeamId ? "away" : null,
    personId: e.personId,
    personName: nameOf(e.personId),
    assistPersonId: e.assistPersonId,
    assistPersonName: nameOf(e.assistPersonId),
    eventType: e.eventType,
    minute: e.minute,
    minuteExtra: e.minuteExtra,
    notes: e.notes,
  }));

  // Per-side aggregate stats for a quick summary block.
  const aggregate = (teamId: number | null | undefined) => {
    const r = { goals: 0, yellow: 0, red: 0 };
    if (!teamId) return r;
    for (const e of eventRows) {
      if (e.teamId !== teamId) continue;
      if (e.eventType === "goal" || e.eventType === "penalty_scored") r.goals += 1;
      else if (e.eventType === "yellow") r.yellow += 1;
      else if (e.eventType === "red" || e.eventType === "yellow_red") r.red += 1;
    }
    return r;
  };

  return NextResponse.json({
    match: {
      id: match.id,
      matchNumber: match.matchNumber,
      status: match.status,
      scheduledAt: match.scheduledAt,
      startedAt: match.startedAt,
      finishedAt: match.finishedAt,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homeTeam: match.homeTeam ? {
        id: match.homeTeam.id,
        name: match.homeTeam.name,
        club: match.homeTeam.club ? { name: match.homeTeam.club.name, badgeUrl: match.homeTeam.club.badgeUrl } : null,
      } : null,
      awayTeam: match.awayTeam ? {
        id: match.awayTeam.id,
        name: match.awayTeam.name,
        club: match.awayTeam.club ? { name: match.awayTeam.club.name, badgeUrl: match.awayTeam.club.badgeUrl } : null,
      } : null,
      field: match.field ? {
        name: match.field.name,
        stadium: match.field.stadium ? {
          name: match.field.stadium.name,
          mapsUrl: match.field.stadium.mapsUrl,
          wazeUrl: match.field.stadium.wazeUrl,
        } : null,
      } : null,
      stage: match.stage ? { id: match.stage.id, name: match.stage.name, nameRu: match.stage.nameRu } : null,
      group: match.group ? { id: match.group.id, name: match.group.name } : null,
      round: match.round ? { id: match.round.id, name: match.round.name, shortName: match.round.shortName } : null,
      isThirdPlace,
    },
    lineup: {
      home,
      away,
    },
    events,
    stats: {
      home: aggregate(match.homeTeamId),
      away: aggregate(match.awayTeamId),
    },
  });
}
