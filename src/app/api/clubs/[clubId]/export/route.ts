import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  clubs,
  clubUsers,
  clubInvites,
  teamInvites,
  teams,
  people,
  tournamentRegistrations,
  tournaments,
  payments,
  orders,
  teamBookings,
  teamTravel,
  matchLineup,
  matchEvents,
  matches,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, inArray, isNull, or } from "drizzle-orm";

/**
 * GDPR Art. 15 (right of access) + Art. 20 (data portability) export.
 *
 * Returns a structured JSON dump of everything we store about a club and
 * its teams, players, registrations and payments. Scoped strictly to the
 * authenticated club — an admin of club A cannot export club B.
 *
 * Emitted with Content-Disposition so the browser prompts a download.
 * Safe to call repeatedly; no side effects.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId } = await params;
  const cid = parseInt(clubId);
  if (session.clubId !== cid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1. Club + its admins/invites
  const [club] = await db.select().from(clubs).where(eq(clubs.id, cid));
  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }
  const users = await db.select().from(clubUsers).where(eq(clubUsers.clubId, cid));
  const clubInvitesRows = await db.select().from(clubInvites).where(eq(clubInvites.clubId, cid));
  const teamInvitesRows = await db.select().from(teamInvites).where(eq(teamInvites.clubId, cid));

  // 2. Teams
  const teamsRows = await db.select().from(teams).where(eq(teams.clubId, cid));
  const teamIds = teamsRows.map(t => t.id);

  // 3. People (players + staff) attached to club's teams
  const peopleRows = teamIds.length > 0
    ? await db.select().from(people).where(inArray(people.teamId, teamIds))
    : [];
  const personIds = peopleRows.map(p => p.id);

  // 4. Tournament registrations (waitlist / accepted) for the club's teams
  const registrations = teamIds.length > 0
    ? await db.select().from(tournamentRegistrations).where(inArray(tournamentRegistrations.teamId, teamIds))
    : [];
  const registrationIds = registrations.map(r => r.id);
  const tournamentIdSet = new Set(registrations.map(r => r.tournamentId));

  // 5. Tournament context (summary only — public data)
  const tournamentSummaries = tournamentIdSet.size > 0
    ? await db
        .select({
          id: tournaments.id,
          name: tournaments.name,
          slug: tournaments.slug,
          startDate: tournaments.startDate,
          endDate: tournaments.endDate,
        })
        .from(tournaments)
        .where(inArray(tournaments.id, Array.from(tournamentIdSet)))
    : [];

  // 6. Financial records — the club's own payments and orders
  const paymentsRows = registrationIds.length > 0
    ? await db.select().from(payments).where(inArray(payments.registrationId, registrationIds))
    : [];
  const ordersRows = registrationIds.length > 0
    ? await db.select().from(orders).where(inArray(orders.registrationId, registrationIds))
    : [];
  const bookingsRows = registrationIds.length > 0
    ? await db.select().from(teamBookings).where(inArray(teamBookings.registrationId, registrationIds))
    : [];
  const travelRows = registrationIds.length > 0
    ? await db.select().from(teamTravel).where(inArray(teamTravel.registrationId, registrationIds))
    : [];

  // 7. Match participation — lineups and events for the club's players
  const lineupRows = personIds.length > 0
    ? await db.select().from(matchLineup).where(inArray(matchLineup.personId, personIds))
    : [];
  const eventRows = personIds.length > 0
    ? await db
        .select()
        .from(matchEvents)
        .where(
          or(
            inArray(matchEvents.personId, personIds),
            inArray(matchEvents.assistPersonId, personIds),
          )
        )
    : [];

  // 8. Meta info about the matches referenced above — so the dump is
  //    readable without cross-referencing the platform.
  const matchIds = Array.from(new Set([
    ...lineupRows.map(l => l.matchId),
    ...eventRows.map(e => e.matchId),
  ]));
  const matchSummaries = matchIds.length > 0
    ? await db
        .select({
          id: matches.id,
          tournamentId: matches.tournamentId,
          stageId: matches.stageId,
          groupId: matches.groupId,
          roundId: matches.roundId,
          matchNumber: matches.matchNumber,
          scheduledAt: matches.scheduledAt,
          status: matches.status,
          homeTeamId: matches.homeTeamId,
          awayTeamId: matches.awayTeamId,
          homeScore: matches.homeScore,
          awayScore: matches.awayScore,
        })
        .from(matches)
        .where(and(inArray(matches.id, matchIds), isNull(matches.deletedAt)))
    : [];

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      format: "goality-club-export",
      version: 1,
      legalBasis: "GDPR Art. 15 (right of access), Art. 20 (data portability)",
      controller: {
        name: "Goality Sport Group OÜ",
        registryCode: "17232252",
        address: "Tallinn, Estonia",
        contactEmail: "privacy@goality.app",
      },
      clubId: cid,
      counts: {
        teams: teamsRows.length,
        people: peopleRows.length,
        registrations: registrations.length,
        payments: paymentsRows.length,
        orders: ordersRows.length,
        matchesReferenced: matchSummaries.length,
      },
      note: "This export covers personal data we process as a processor on behalf of the organisers and as a controller for your account. Tournament schedules and standings are public data and can be viewed directly on the platform. If something is missing, contact privacy@goality.app — under GDPR we have 30 days to provide any additional records.",
    },
    club,
    accounts: {
      users,
      clubInvites: clubInvitesRows,
      teamInvites: teamInvitesRows,
    },
    teams: teamsRows,
    people: peopleRows,
    registrations,
    tournaments: tournamentSummaries,
    finance: {
      payments: paymentsRows,
      orders: ordersRows,
      bookings: bookingsRows,
      travel: travelRows,
    },
    matchParticipation: {
      lineups: lineupRows,
      events: eventRows,
      matchesReferenced: matchSummaries,
    },
  };

  const filename = `goality-club-${cid}-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, private",
    },
  });
}
