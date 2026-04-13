import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  tournaments,
  teams,
  clubs,
  tournamentClasses,
  people,
  teamBookings,
  payments,
  tournamentRegistrations,
  organizations,
} from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq, and, sql, asc, max, count } from "drizzle-orm";
import { getEffectivePlan, PLAN_LIMITS, TournamentPlan } from "@/lib/plan-gates";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  // Prefer explicit tournamentId from query param (set by adminFetch context)
  const urlTournamentId = req.nextUrl.searchParams.get("tournamentId");
  let tournament;

  if (urlTournamentId) {
    tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, parseInt(urlTournamentId)),
    });
  } else {
    // Fallback: find first open tournament (legacy behavior)
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

  const urlClassId = req.nextUrl.searchParams.get("classId");
  const classId = urlClassId ? parseInt(urlClassId) : null;

  // Step 1: Get registrations for this tournament (optionally filtered by classId)
  const regs = await db.query.tournamentRegistrations.findMany({
    where: classId
      ? and(
          eq(tournamentRegistrations.tournamentId, tournament.id),
          eq(tournamentRegistrations.classId, classId)
        )
      : eq(tournamentRegistrations.tournamentId, tournament.id),
    with: {
      team: { with: { club: true } },
      class: true,
    },
    orderBy: [asc(tournamentRegistrations.regNumber)],
  });

  // Step 2: For each registration, compute financial aggregates and people counts
  const enriched = await Promise.all(
    regs.map(async (reg) => {
      const team = reg.team;
      const club = team?.club ?? null;

      const [playerCountRow, staffCountRow, orderTotalRow, paidTotalRow] =
        await Promise.all([
          db
            .select({ count: sql<number>`COUNT(*)` })
            .from(people)
            .where(
              and(eq(people.teamId, team.id), eq(people.personType, "player"))
            ),
          db
            .select({ count: sql<number>`COUNT(*)` })
            .from(people)
            .where(
              and(
                eq(people.teamId, team.id),
                sql`${people.personType} IN ('staff', 'accompanying')`
              )
            ),
          db
            .select({
              total: sql<string>`COALESCE(SUM(${teamBookings.unitPrice}::numeric * ${teamBookings.quantity}::numeric), 0)`,
            })
            .from(teamBookings)
            .where(eq(teamBookings.registrationId, reg.id)),
          db
            .select({
              total: sql<string>`COALESCE(SUM(${payments.amount}::numeric), 0)`,
            })
            .from(payments)
            .where(
              and(
                eq(payments.registrationId, reg.id),
                eq(payments.status, "received")
              )
            ),
        ]);

      const orderTotal = parseFloat(orderTotalRow[0]?.total ?? "0");
      const paidTotal = parseFloat(paidTotalRow[0]?.total ?? "0");

      return {
        id: team.id,
        registrationId: reg.id,
        name: team.name,
        displayName: reg.displayName ?? null,
        birthYear: team.birthYear ?? null,
        gender: team.gender ?? null,
        squadAlias: reg.squadAlias ?? null,
        regNumber: reg.regNumber,
        status: reg.status,
        notes: reg.notes,
        createdAt: reg.createdAt,
        updatedAt: reg.updatedAt,
        club: club
          ? { id: club.id, name: club.name, badgeUrl: club.badgeUrl, slug: club.slug ?? null }
          : null,
        class: reg.classId
          ? { id: reg.classId, name: reg.class?.name ?? null }
          : null,
        playerCount: Number(playerCountRow[0]?.count ?? 0),
        staffCount: Number(staffCountRow[0]?.count ?? 0),
        orderTotal: orderTotal.toFixed(2),
        paidTotal: paidTotal.toFixed(2),
        balance: (paidTotal - orderTotal).toFixed(2),
      };
    })
  );

  return NextResponse.json(enriched);
}

// POST — manually create a team + registration (organizer action)
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const body = await req.json();
  const { name, classId, tournamentId, clubName, contactEmail, contactPhone, contactPersonName } = body;

  if (!name || !tournamentId) {
    return NextResponse.json({ error: "name and tournamentId are required" }, { status: 400 });
  }

  const tournament = await db.query.tournaments.findFirst({ where: eq(tournaments.id, Number(tournamentId)) });
  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

  // ── Find or create club ──────────────────────────────────────────
  // clubs.clubId is NOT NULL, so we always need a club (use team name as fallback)
  const resolvedClubName = clubName?.trim() || name.trim();
  let clubId: number;

  const existingClub = await db.query.clubs.findFirst({ where: eq(clubs.name, resolvedClubName) });
  if (existingClub) {
    clubId = existingClub.id;
    // Update contact info if provided and missing
    const updates: Record<string, string> = {};
    if (contactEmail && !existingClub.contactEmail) updates.contactEmail = contactEmail.trim();
    if (contactPhone && !existingClub.contactPhone) updates.contactPhone = contactPhone.trim();
    if (contactPersonName && !existingClub.contactName) updates.contactName = contactPersonName.trim();
    if (Object.keys(updates).length > 0) {
      await db.update(clubs).set(updates).where(eq(clubs.id, existingClub.id));
    }
  } else {
    const [newClub] = await db.insert(clubs).values({
      name: resolvedClubName,
      contactEmail: contactEmail?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
      contactName: contactPersonName?.trim() || null,
    }).returning();
    clubId = newClub.id;
  }

  // ── Check plan team limit ────────────────────────────────────────
  const [regCountRow] = await db
    .select({ count: count() })
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.tournamentId, Number(tournamentId)));
  const currentRegCount = Number(regCountRow?.count ?? 0);

  const org = tournament.organizationId
    ? await db.query.organizations.findFirst({ where: eq(organizations.id, tournament.organizationId) })
    : null;
  const effectivePlan = getEffectivePlan(tournament.plan as TournamentPlan, org?.eliteSubStatus);
  const pricePerExtra = PLAN_LIMITS[effectivePlan].extraTeamPriceEur;

  if (pricePerExtra === 0) {
    // Free plan: hard cap — cannot exceed base maxTeams
    const baseMax = PLAN_LIMITS[effectivePlan].maxTeams;
    if (currentRegCount >= baseMax) {
      return NextResponse.json({
        error: `Free plan is limited to ${baseMax} teams. Upgrade to Starter, Pro or Elite to register more teams.`,
        code: "TEAM_LIMIT",
        currentPlan: effectivePlan,
        maxTeams: baseMax,
        currentTeams: currentRegCount,
      }, { status: 402 });
    }
  }
  // Paid plans: no hard cap — extra teams are billed at registration close

  // ── Create team ──────────────────────────────────────────────────
  const [team] = await db.insert(teams).values({
    name: name.trim(),
    clubId,
  }).returning();

  // ── Next regNumber for this tournament ───────────────────────────
  const [maxRow] = await db
    .select({ maxReg: max(tournamentRegistrations.regNumber) })
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.tournamentId, Number(tournamentId)));

  const nextRegNumber = (maxRow?.maxReg ?? 0) + 1;

  // ── Create registration ──────────────────────────────────────────
  // displayName = "one truth" for display — set it from the typed name so
  // all display logic (matches API, schedule page, etc.) can rely on displayName first.
  const [registration] = await db.insert(tournamentRegistrations).values({
    teamId: team.id,
    tournamentId: Number(tournamentId),
    classId: classId ? Number(classId) : null,
    regNumber: nextRegNumber,
    status: "open",
    displayName: name.trim(),
  }).returning();

  return NextResponse.json({ team, registration }, { status: 201 });
}
