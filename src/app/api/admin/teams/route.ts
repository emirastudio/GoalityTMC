import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  tournaments,
  teams,
  clubs,
  tournamentClasses,
  people,
  teamBookings,
  payments,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.registrationOpen, true),
  });
  if (!tournament) {
    return NextResponse.json(
      { error: "No active tournament" },
      { status: 404 }
    );
  }

  const result = await db
    .select({
      id: teams.id,
      name: teams.name,
      regNumber: teams.regNumber,
      status: teams.status,
      notes: teams.notes,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
      clubId: clubs.id,
      clubName: clubs.name,
      clubBadgeUrl: clubs.badgeUrl,
      className: tournamentClasses.name,
      classId: tournamentClasses.id,
      playerCount: sql<number>`(
        SELECT COUNT(*) FROM people
        WHERE people.team_id = ${teams.id} AND people.person_type = 'player'
      )`.as("player_count"),
      staffCount: sql<number>`(
        SELECT COUNT(*) FROM people
        WHERE people.team_id = ${teams.id} AND people.person_type IN ('staff', 'accompanying')
      )`.as("staff_count"),
      orderTotal: sql<string>`COALESCE((
        SELECT SUM(total::numeric) FROM team_bookings WHERE team_bookings.team_id = ${teams.id}
      ), 0)`.as("order_total"),
      paidTotal: sql<string>`COALESCE((
        SELECT SUM(amount::numeric) FROM payments
        WHERE payments.team_id = ${teams.id} AND payments.status = 'received'
      ), 0)`.as("paid_total"),
    })
    .from(teams)
    .leftJoin(clubs, eq(teams.clubId, clubs.id))
    .leftJoin(tournamentClasses, eq(teams.classId, tournamentClasses.id))
    .where(eq(teams.tournamentId, tournament.id))
    .orderBy(teams.regNumber);

  const enriched = result.map((row) => ({
    id: row.id,
    name: row.name,
    regNumber: row.regNumber,
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    club: {
      id: row.clubId,
      name: row.clubName,
      badgeUrl: row.clubBadgeUrl,
    },
    class: {
      id: row.classId,
      name: row.className,
    },
    playerCount: Number(row.playerCount),
    staffCount: Number(row.staffCount),
    orderTotal: parseFloat(row.orderTotal ?? "0").toFixed(2),
    paidTotal: parseFloat(row.paidTotal ?? "0").toFixed(2),
    balance: (
      parseFloat(row.paidTotal ?? "0") - parseFloat(row.orderTotal ?? "0")
    ).toFixed(2),
  }));

  return NextResponse.json(enriched);
}
