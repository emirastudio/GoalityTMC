import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  tournaments,
  teams,
  clubs,
  tournamentClasses,
  teamBookings,
  payments,
} from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq, and, count, sum, sql, desc } from "drizzle-orm";

export async function GET() {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.registrationOpen, true),
  });
  if (!tournament) {
    return NextResponse.json(
      { error: "No active tournament" },
      { status: 404 }
    );
  }

  // Total teams
  const [totalTeamsRow] = await db
    .select({ value: count() })
    .from(teams)
    .where(eq(teams.tournamentId, tournament.id));

  // Confirmed teams
  const [confirmedTeamsRow] = await db
    .select({ value: count() })
    .from(teams)
    .where(
      and(
        eq(teams.tournamentId, tournament.id),
        eq(teams.status, "confirmed")
      )
    );

  // Pending payments: teams where sum(team_bookings.total) > sum(received payments)
  const pendingPaymentsResult = await db.execute<{ value: string }>(sql`
    SELECT COUNT(*) AS value FROM (
      SELECT t.id
      FROM teams t
      LEFT JOIN (
        SELECT team_id, COALESCE(SUM(total::numeric), 0) AS order_total
        FROM team_bookings GROUP BY team_id
      ) o ON o.team_id = t.id
      LEFT JOIN (
        SELECT team_id, COALESCE(SUM(amount::numeric), 0) AS paid_total
        FROM payments WHERE status = 'received' GROUP BY team_id
      ) p ON p.team_id = t.id
      WHERE t.tournament_id = ${tournament.id}
        AND COALESCE(o.order_total, 0) > COALESCE(p.paid_total, 0)
    ) sub
  `);
  const pendingPayments = Number(pendingPaymentsResult[0]?.value ?? 0);

  // Total revenue
  const [revenueRow] = await db
    .select({
      value: sql<string>`COALESCE(SUM(${payments.amount}::numeric), 0)`,
    })
    .from(payments)
    .innerJoin(teams, eq(payments.teamId, teams.id))
    .where(
      and(
        eq(teams.tournamentId, tournament.id),
        eq(payments.status, "received")
      )
    );

  // Recent teams
  const recentTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      regNumber: teams.regNumber,
      status: teams.status,
      createdAt: teams.createdAt,
      clubName: clubs.name,
      className: tournamentClasses.name,
    })
    .from(teams)
    .leftJoin(clubs, eq(teams.clubId, clubs.id))
    .leftJoin(tournamentClasses, eq(teams.classId, tournamentClasses.id))
    .where(eq(teams.tournamentId, tournament.id))
    .orderBy(desc(teams.createdAt))
    .limit(5);

  return NextResponse.json({
    totalTeams: totalTeamsRow.value,
    confirmedTeams: confirmedTeamsRow.value,
    pendingPayments,
    totalRevenue: parseFloat(revenueRow?.value ?? "0").toFixed(2),
    recentTeams,
  });
}
