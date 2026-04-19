import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authorizeOrg, getOrgTournament } from "@/lib/tenant";
import { db } from "@/db";
import { tournamentClasses, tournaments, organizations } from "@/db/schema";
import { eq, asc, gt } from "drizzle-orm";
import { getEffectivePlan, PLAN_LIMITS, type TournamentPlan } from "@/lib/plan-gates";

type Params = { orgSlug: string; tournamentId: string };

// GET — список дивизионов турнира (для сайдбара и прочих мест)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { orgSlug, tournamentId } = await params;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tournament = await getOrgTournament(parseInt(tournamentId), organization.id);
  if (!tournament)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const classes = await db
    .select({
      id:             tournamentClasses.id,
      name:           tournamentClasses.name,
      format:         tournamentClasses.format,
      minBirthYear:   tournamentClasses.minBirthYear,
      maxBirthYear:   tournamentClasses.maxBirthYear,
      maxPlayers:     tournamentClasses.maxPlayers,
      maxStaff:       tournamentClasses.maxStaff,
      maxTeams:       tournamentClasses.maxTeams,
      scheduleConfig: tournamentClasses.scheduleConfig,
      startDate:      tournamentClasses.startDate,
      endDate:        tournamentClasses.endDate,
    })
    .from(tournamentClasses)
    .where(eq(tournamentClasses.tournamentId, tournament.id))
    .orderBy(asc(tournamentClasses.id));

  return NextResponse.json(classes);
}

// POST — создать новый дивизион
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { orgSlug, tournamentId } = await params;

  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tournament = await getOrgTournament(parseInt(tournamentId), organization.id);
  if (!tournament)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Проверяем лимит дивизионов по плану
  const [orgRow] = await db
    .select({ eliteSubStatus: organizations.eliteSubStatus })
    .from(organizations)
    .where(eq(organizations.id, organization.id))
    .limit(1);

  const [tRow] = await db
    .select({
      plan:                    tournaments.plan,
      extraDivisionsPurchased: tournaments.extraDivisionsPurchased,
      extrasPaymentDue:        tournaments.extrasPaymentDue,
    })
    .from(tournaments)
    .where(eq(tournaments.id, tournament.id))
    .limit(1);

  const effectivePlan = getEffectivePlan(
    (tRow?.plan as TournamentPlan) ?? "free",
    orgRow?.eliteSubStatus
  );
  const limits = PLAN_LIMITS[effectivePlan];

  const existing = await db
    .select({ id: tournamentClasses.id })
    .from(tournamentClasses)
    .where(eq(tournamentClasses.tournamentId, tournament.id));

  // NOTE: no hard block on division creation — every plan can create unlimited
  // divisions. Overage is tracked in extras_payment_due and shown in the cart
  // (billing-info). Payment is required before the tournament goes live, not
  // at creation time.

  const body = await req.json();
  const {
    name,
    format        = null,
    minBirthYear  = null,
    maxBirthYear  = null,
    maxPlayers    = 25,
    maxStaff      = 5,
    maxTeams      = null,
    startDate     = null,
    endDate       = null,
  } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Division name is required" }, { status: 400 });
  }

  // Day-limit gate: a division's date range must fit within the plan's maxDays.
  // This is a HARD gate — Free/Starter can't schedule a 5-day tournament.
  if (startDate && endDate && limits.maxDays !== Infinity) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    if (days > limits.maxDays) {
      return NextResponse.json(
        {
          error: "Day limit exceeded",
          feature: "maxDays",
          currentPlan: effectivePlan,
          maxDays: limits.maxDays,
          requestedDays: days,
          upgradeUrl: "/billing",
        },
        { status: 402 }
      );
    }
  }

  const [newClass] = await db
    .insert(tournamentClasses)
    .values({
      tournamentId: tournament.id,
      name:         name.trim(),
      format:       format || null,
      minBirthYear: minBirthYear ? Number(minBirthYear) : null,
      maxBirthYear: maxBirthYear ? Number(maxBirthYear) : null,
      maxPlayers:   maxPlayers ? Number(maxPlayers) : 25,
      maxStaff:     maxStaff   ? Number(maxStaff)   : 5,
      maxTeams:     maxTeams   ? Number(maxTeams)   : null,
      startDate:    startDate || null,
      endDate:      endDate || null,
    })
    .returning();

  // If this division is beyond the plan limit → set payment due to end of current month.
  // Applies to every plan (including Free) — overage is always billable via cart.
  const planLimit = limits.maxDivisions === Infinity ? Infinity : limits.maxDivisions;
  const newCount  = existing.length + 1;
  if (planLimit !== Infinity && newCount > planLimit + (tRow?.extraDivisionsPurchased ?? 0)) {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const endOfMonthStr = endOfMonth.toISOString().split("T")[0]; // "YYYY-MM-DD"
    // Extend due date only (never move it earlier)
    const existingDue = tRow?.extrasPaymentDue;
    if (!existingDue || endOfMonthStr > existingDue) {
      await db
        .update(tournaments)
        .set({ extrasPaymentDue: endOfMonthStr, updatedAt: new Date() })
        .where(eq(tournaments.id, tournament.id));
    }
  }

  return NextResponse.json(newClass, { status: 201 });
}
