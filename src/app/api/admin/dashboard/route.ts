import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  tournaments,
  teams,
  clubs,
  tournamentClasses,
  teamBookings,
  payments,
  tournamentRegistrations,
} from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq, and, count, sum, sql, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const urlTournamentId = req.nextUrl.searchParams.get("tournamentId");
  let tournament;
  if (urlTournamentId) {
    tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, parseInt(urlTournamentId)),
    });
  } else {
    tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.registrationOpen, true),
    });
  }
  if (!tournament) {
    return NextResponse.json(
      { error: "No active tournament" },
      { status: 404 }
    );
  }

  // Total teams (via registrations)
  const [totalTeamsRow] = await db
    .select({ value: count() })
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.tournamentId, tournament.id));

  // Confirmed teams (via registrations)
  const [confirmedTeamsRow] = await db
    .select({ value: count() })
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tournament.id),
        eq(tournamentRegistrations.status, "confirmed")
      )
    );

  // Pending payments: registrations where sum(team_bookings.total) > sum(received payments)
  const pendingPaymentsResult = await db.execute<{ value: string }>(sql`
    SELECT COUNT(*) AS value FROM (
      SELECT r.id
      FROM tournament_registrations r
      LEFT JOIN (
        SELECT registration_id, COALESCE(SUM(total::numeric), 0) AS order_total
        FROM team_bookings GROUP BY registration_id
      ) o ON o.registration_id = r.id
      LEFT JOIN (
        SELECT registration_id, COALESCE(SUM(amount::numeric), 0) AS paid_total
        FROM payments WHERE status = 'received' GROUP BY registration_id
      ) p ON p.registration_id = r.id
      WHERE r.tournament_id = ${tournament.id}
        AND COALESCE(o.order_total, 0) > COALESCE(p.paid_total, 0)
    ) sub
  `);
  const pendingPayments = Number(pendingPaymentsResult[0]?.value ?? 0);

  // Total revenue (via registrations)
  const [revenueRow] = await db
    .select({
      value: sql<string>`COALESCE(SUM(${payments.amount}::numeric), 0)`,
    })
    .from(payments)
    .innerJoin(tournamentRegistrations, eq(payments.registrationId, tournamentRegistrations.id))
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tournament.id),
        eq(payments.status, "received")
      )
    );

  // Recent teams (via registrations)
  const recentTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      regNumber: tournamentRegistrations.regNumber,
      status: tournamentRegistrations.status,
      createdAt: tournamentRegistrations.createdAt,
      clubName: clubs.name,
      className: tournamentClasses.name,
    })
    .from(tournamentRegistrations)
    .innerJoin(teams, eq(tournamentRegistrations.teamId, teams.id))
    .leftJoin(clubs, eq(teams.clubId, clubs.id))
    .leftJoin(tournamentClasses, eq(tournamentRegistrations.classId, tournamentClasses.id))
    .where(eq(tournamentRegistrations.tournamentId, tournament.id))
    .orderBy(desc(tournamentRegistrations.createdAt))
    .limit(5);

  return NextResponse.json({
    totalTeams: totalTeamsRow.value,
    confirmedTeams: confirmedTeamsRow.value,
    pendingPayments,
    totalRevenue: parseFloat(revenueRow?.value ?? "0").toFixed(2),
    recentTeams,
  });
}
