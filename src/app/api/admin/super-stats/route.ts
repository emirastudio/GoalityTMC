import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  organizations, adminUsers, clubs, clubUsers, teams,
  tournaments, tournamentRegistrations, payments, blogPosts,
} from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { count, sum, sql, eq, gte, and } from "drizzle-orm";

export async function GET() {
  const session = await requireAdmin();
  if (isError(session)) return session;
  if (!session.isSuper) {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    [orgCount],
    [clubCount],
    [teamCount],
    [regCount],
    [adminUserCount],
    [clubUserCount],
    [blogCount],
    [activeTournamentCount],
    [totalRevRow],
    [monthRevRow],
    [newRegsRow],
    [newClubsRow],
    planRows,
    recentRegs,
    recentClubs,
    topOrgs,
  ] = await Promise.all([
    db.select({ v: count() }).from(organizations),
    db.select({ v: count() }).from(clubs),
    db.select({ v: count() }).from(teams),
    db.select({ v: count() }).from(tournamentRegistrations),
    db.select({ v: count() }).from(adminUsers),
    db.select({ v: count() }).from(clubUsers),
    db.select({ v: count() }).from(blogPosts).where(eq(blogPosts.status, "published")),
    db.select({ v: count() }).from(tournaments).where(eq(tournaments.registrationOpen, true)),
    db.select({ v: sql<string>`COALESCE(SUM(amount::numeric),0)` }).from(payments).where(eq(payments.status, "received")),
    db.select({ v: sql<string>`COALESCE(SUM(amount::numeric),0)` }).from(payments).where(and(eq(payments.status, "received"), gte(payments.createdAt, startOfMonth))),
    db.select({ v: count() }).from(tournamentRegistrations).where(gte(tournamentRegistrations.createdAt, sevenDaysAgo)),
    db.select({ v: count() }).from(clubs).where(gte(clubs.createdAt, sevenDaysAgo)),
    // Plan distribution
    db.select({ plan: organizations.plan, cnt: count() }).from(organizations).groupBy(organizations.plan),
    // Recent registrations (10)
    db.select({
      id: tournamentRegistrations.id,
      regNumber: tournamentRegistrations.regNumber,
      status: tournamentRegistrations.status,
      createdAt: tournamentRegistrations.createdAt,
      teamName: teams.name,
      tournamentName: tournaments.name,
    })
      .from(tournamentRegistrations)
      .leftJoin(teams, eq(teams.id, tournamentRegistrations.teamId))
      .leftJoin(tournaments, eq(tournaments.id, tournamentRegistrations.tournamentId))
      .orderBy(sql`${tournamentRegistrations.createdAt} DESC`)
      .limit(10),
    // Recent clubs (8)
    db.select({ id: clubs.id, name: clubs.name, country: clubs.country, city: clubs.city, contactEmail: clubs.contactEmail, createdAt: clubs.createdAt })
      .from(clubs)
      .orderBy(sql`${clubs.createdAt} DESC`)
      .limit(8),
    // Top orgs by team count
    db.select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      plan: organizations.plan,
      regCount: count(tournamentRegistrations.id),
    })
      .from(organizations)
      .leftJoin(tournaments, eq(tournaments.organizationId, organizations.id))
      .leftJoin(tournamentRegistrations, eq(tournamentRegistrations.tournamentId, tournaments.id))
      .groupBy(organizations.id, organizations.name, organizations.slug, organizations.plan)
      .orderBy(sql`COUNT(${tournamentRegistrations.id}) DESC`)
      .limit(8),
  ]);

  return NextResponse.json({
    counts: {
      orgs: Number(orgCount.v),
      clubs: Number(clubCount.v),
      teams: Number(teamCount.v),
      registrations: Number(regCount.v),
      adminUsers: Number(adminUserCount.v),
      clubUsers: Number(clubUserCount.v),
      blogPosts: Number(blogCount.v),
      activeTournaments: Number(activeTournamentCount.v),
    },
    revenue: {
      total: parseFloat(totalRevRow.v),
      thisMonth: parseFloat(monthRevRow.v),
    },
    activity: {
      newRegsLast7d: Number(newRegsRow.v),
      newClubsLast7d: Number(newClubsRow.v),
    },
    planDistribution: planRows,
    recentRegistrations: recentRegs,
    recentClubs,
    topOrgs,
  });
}
