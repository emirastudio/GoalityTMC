import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  organizations,
  tournaments,
  teams,
  people,
  matchLineup,
  matchEvents,
  matches,
  registrationPeople,
  tournamentRegistrations,
} from "@/db/schema";
import { eq, and, isNull, inArray, sql } from "drizzle-orm";

// GET /api/public/t/[orgSlug]/[tournamentSlug]/teams/[teamId]/squad
// Public squad + aggregated tournament stats for a team.
// Combines:
//   - roster: every player who appeared in at least one match lineup
//     for this team in this tournament
//   - stats: goals (incl. penalty_scored), assists, yellow / red cards,
//     appearances count — from matchEvents, scoped to this tournament
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentSlug: string; teamId: string }> }
) {
  const { orgSlug, tournamentSlug, teamId } = await params;
  const tid = parseInt(teamId);
  if (isNaN(tid)) return NextResponse.json({ error: "Invalid teamId" }, { status: 400 });

  // Resolve org + tournament
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

  const team = await db.query.teams.findFirst({ where: eq(teams.id, tid) });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  // Build the roster from TWO sources:
  //  (a) matchLineup  — players the referee fielded in starting/bench
  //  (b) matchEvents  — anyone who scored/assisted/got a card etc.
  // Not every tournament uses lineups, so events are the real source of truth
  // for "did this person appear in the tournament".
  const lineupRows = await db
    .selectDistinct({
      personId: matchLineup.personId,
      shirtNumber: matchLineup.shirtNumber,
      position: matchLineup.position,
    })
    .from(matchLineup)
    .innerJoin(matches, eq(matches.id, matchLineup.matchId))
    .where(
      and(
        eq(matchLineup.teamId, tid),
        eq(matches.tournamentId, tournament.id),
        isNull(matches.deletedAt),
        eq(matches.isPublic, true),
      )
    );

  // Collect personIds from events (personId AND assistPersonId).
  const eventPeople = await db
    .select({
      personId: matchEvents.personId,
      assistPersonId: matchEvents.assistPersonId,
    })
    .from(matchEvents)
    .where(
      and(
        eq(matchEvents.tournamentId, tournament.id),
        eq(matchEvents.teamId, tid),
      )
    );

  // Per-person shirt/position hints from lineup (if any).
  const shirtByPerson = new Map<number, { shirtNumber: number | null; position: string | null }>();
  for (const r of lineupRows) {
    if (!shirtByPerson.has(r.personId)) {
      shirtByPerson.set(r.personId, { shirtNumber: r.shirtNumber, position: r.position });
    }
  }

  const personIdSet = new Set<number>();
  for (const r of lineupRows) personIdSet.add(r.personId);
  for (const e of eventPeople) {
    if (e.personId) personIdSet.add(e.personId);
    if (e.assistPersonId) personIdSet.add(e.assistPersonId);
  }

  // Also include every person belonging directly to the team's roster
  // (people.teamId = tid) — that's the static team list, even if they haven't
  // touched a match yet.
  const teamRosterPeople = await db
    .select({ id: people.id })
    .from(people)
    .where(eq(people.teamId, tid));
  for (const p of teamRosterPeople) personIdSet.add(p.id);

  const personIds = Array.from(personIdSet);
  if (personIds.length === 0) {
    return NextResponse.json({ players: [] });
  }

  // Fetch person records. We deliberately do NOT filter by showPublicly here:
  // the aggregate tournament stats are public context; hiding a name because
  // someone forgot a profile toggle would leave empty cells under goals.
  // Staff (coaches etc.) are separated visually by personType.
  const peopleRows = await db
    .select({
      id: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      position: people.position,
      personType: people.personType,
      teamId: people.teamId,
    })
    .from(people)
    .where(inArray(people.id, personIds));

  const peopleById = new Map(peopleRows.map(p => [p.id, p]));

  // Fallback shirt number: из registrationPeople этой команды в этом турнире
  // (если команда заявлена — у неё есть регистрация, в pivot лежит турнирный №).
  const teamReg = await db.query.tournamentRegistrations.findFirst({
    where: and(
      eq(tournamentRegistrations.teamId, tid),
      eq(tournamentRegistrations.tournamentId, tournament.id),
    ),
  });
  const regShirtByPerson = new Map<number, number | null>();
  if (teamReg) {
    const rows = await db
      .select({ personId: registrationPeople.personId, shirtNumber: registrationPeople.shirtNumber })
      .from(registrationPeople)
      .where(
        and(
          eq(registrationPeople.registrationId, teamReg.id),
          inArray(registrationPeople.personId, personIds),
        )
      );
    for (const r of rows) regShirtByPerson.set(r.personId, r.shirtNumber);
  }

  // Appearances: count distinct matchIds per person in matchLineup.
  const appearanceRows = await db
    .select({
      personId: matchLineup.personId,
      appearances: sql<number>`COUNT(DISTINCT ${matchLineup.matchId})::int`,
      startsCount: sql<number>`SUM(CASE WHEN ${matchLineup.isStarting} THEN 1 ELSE 0 END)::int`,
    })
    .from(matchLineup)
    .innerJoin(matches, eq(matches.id, matchLineup.matchId))
    .where(
      and(
        eq(matchLineup.teamId, tid),
        eq(matches.tournamentId, tournament.id),
        isNull(matches.deletedAt),
        eq(matches.isPublic, true),
        inArray(matchLineup.personId, personIds),
      )
    )
    .groupBy(matchLineup.personId);

  const appearancesByPerson = new Map(
    appearanceRows.map(r => [r.personId, {
      appearances: Number(r.appearances ?? 0),
      starts: Number(r.startsCount ?? 0),
    }])
  );

  // Goal/assist/card counts from matchEvents.
  // goals: eventType in (goal, penalty_scored) grouped by personId
  // assists: eventType = goal (or penalty_scored) grouped by assistPersonId
  // cards: yellow / red / yellow_red by personId
  const eventRows = await db
    .select({
      personId: matchEvents.personId,
      assistPersonId: matchEvents.assistPersonId,
      eventType: matchEvents.eventType,
    })
    .from(matchEvents)
    .where(
      and(
        eq(matchEvents.tournamentId, tournament.id),
        eq(matchEvents.teamId, tid),
      )
    );

  type Stats = { goals: number; assists: number; yellow: number; red: number };
  const statsByPerson = new Map<number, Stats>();
  const ensure = (pid: number): Stats => {
    let s = statsByPerson.get(pid);
    if (!s) {
      s = { goals: 0, assists: 0, yellow: 0, red: 0 };
      statsByPerson.set(pid, s);
    }
    return s;
  };

  for (const e of eventRows) {
    if (e.eventType === "goal" || e.eventType === "penalty_scored") {
      if (e.personId) ensure(e.personId).goals += 1;
      if (e.assistPersonId) ensure(e.assistPersonId).assists += 1;
    } else if (e.eventType === "yellow") {
      if (e.personId) ensure(e.personId).yellow += 1;
    } else if (e.eventType === "red" || e.eventType === "yellow_red") {
      if (e.personId) ensure(e.personId).red += 1;
    }
  }

  // Build response — one row per person.
  const players = peopleRows.map(person => {
    const hint = shirtByPerson.get(person.id);
    const stats = statsByPerson.get(person.id) ?? { goals: 0, assists: 0, yellow: 0, red: 0 };
    const appearances = appearancesByPerson.get(person.id) ?? { appearances: 0, starts: 0 };
    const fullName = [person.firstName, person.lastName].filter(Boolean).join(" ") || "—";
    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      fullName,
      // Prefer lineup-level shirt/position (match-specific), fall back to per-tournament roster number.
      shirtNumber: hint?.shirtNumber ?? regShirtByPerson.get(person.id) ?? null,
      position: hint?.position ?? person.position ?? null,
      personType: person.personType,
      appearances: appearances.appearances,
      starts: appearances.starts,
      goals: stats.goals,
      assists: stats.assists,
      yellow: stats.yellow,
      red: stats.red,
    };
  });

  // Sort: players first (by goals desc, assists desc, name asc), staff after.
  players.sort((a, b) => {
    if (a.personType !== b.personType) {
      if (a.personType === "player") return -1;
      if (b.personType === "player") return 1;
    }
    if (b.goals !== a.goals) return b.goals - a.goals;
    if (b.assists !== a.assists) return b.assists - a.assists;
    return a.fullName.localeCompare(b.fullName);
  });

  return NextResponse.json({ players });
}
