import { NextRequest, NextResponse } from "next/server";
import { requireGameAdmin } from "@/lib/game-auth";
import { db } from "@/db";
import { tournaments, organizations, tournamentClasses, tournamentRegistrations } from "@/db/schema";
import { eq, isNull, and, count } from "drizzle-orm";
import {
  getEffectivePlan,
  PLAN_LIMITS,
  EXTRA_DIVISION_PRICE_CENTS,
  type TournamentPlan,
} from "@/lib/plan-gates";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentId: string }> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (ctx instanceof NextResponse) return ctx;

  const [row] = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      plan: tournaments.plan,
      extraTeamsPurchased: tournaments.extraTeamsPurchased,
      extraDivisionsPurchased: tournaments.extraDivisionsPurchased,
      extrasPaymentDue: tournaments.extrasPaymentDue,
      planOverrideAt: tournaments.planOverrideAt,
      planOverrideReason: tournaments.planOverrideReason,
      orgEliteSubStatus: organizations.eliteSubStatus,
      // Модули услуг турнира
      hasAccommodation: tournaments.hasAccommodation,
      hasMeals: tournaments.hasMeals,
      hasTransfer: tournaments.hasTransfer,
    })
    .from(tournaments)
    .leftJoin(organizations, eq(organizations.id, tournaments.organizationId))
    .where(eq(tournaments.id, ctx.tournament.id))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check if this is a "second free" tournament (needs plan upgrade)
  let needsPlanUpgrade = false;
  if ((row.plan as TournamentPlan) === "free") {
    const allActive = await db
      .select({ id: tournaments.id, createdAt: tournaments.createdAt })
      .from(tournaments)
      .where(and(
        eq(tournaments.organizationId, ctx.tournament.organizationId),
        isNull(tournaments.deletedAt),
        isNull(tournaments.deleteRequestedAt),
      ));
    if (allActive.length > 1) {
      const oldest = allActive.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )[0];
      needsPlanUpgrade = oldest.id !== ctx.tournament.id;
    }
  }

  const effectivePlan = getEffectivePlan(
    (row.plan as TournamentPlan) ?? "free",
    row.orgEliteSubStatus
  );
  const limits = PLAN_LIMITS[effectivePlan];

  // ── Extras owed: calculate what organizer owes beyond purchased slots ──
  const [divCountRow] = await db
    .select({ value: count() })
    .from(tournamentClasses)
    .where(eq(tournamentClasses.tournamentId, ctx.tournament.id));
  const currentDivisions = Number(divCountRow?.value ?? 0);

  // Actual registered teams count — billed at registration close
  const [teamCountRow] = await db
    .select({ value: count() })
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.tournamentId, ctx.tournament.id));
  const currentTeams = Number(teamCountRow?.value ?? 0);

  const planIncludedDivisions = limits.maxDivisions === Infinity ? Infinity : limits.maxDivisions;
  const planIncludedTeams     = limits.maxTeams === Infinity ? Infinity : limits.maxTeams;

  const paidDivisions = planIncludedDivisions === Infinity ? Infinity : planIncludedDivisions + (row.extraDivisionsPurchased ?? 0);
  const paidTeams     = planIncludedTeams     === Infinity ? Infinity : planIncludedTeams     + (row.extraTeamsPurchased     ?? 0);

  const divisionsOwed = (effectivePlan === "free" || paidDivisions === Infinity)
    ? 0
    : Math.max(0, currentDivisions - paidDivisions);

  // Teams: NOT included in upfront extras cart — billed separately at registration close.
  // teamsOwed is still computed for informational display only (not charged now).
  const teamsOwed     = (effectivePlan === "free" || paidTeams === Infinity)
    ? 0
    : Math.max(0, currentTeams - paidTeams);

  const extraTeamPriceCents = (limits.extraTeamPriceEur ?? 0) * 100;
  // Divisions are charged upfront; teams are billed at registration close (no refunds)
  const divisionsAmountCents = divisionsOwed * EXTRA_DIVISION_PRICE_CENTS;
  const teamsAmountCents     = teamsOwed * extraTeamPriceCents;
  // amountCents = divisions only (what's charged now via pay-extras)
  const extrasAmountCents    = divisionsAmountCents;

  // Extras blocking logic: blocked if due date has passed and unpaid divisions exist
  const nowDateStr = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
  const extrasBlocked =
    divisionsOwed > 0 &&
    !!row.extrasPaymentDue &&
    row.extrasPaymentDue < nowDateStr;

  return NextResponse.json({
    id: row.id,
    name: row.name,
    plan: row.plan,
    effectivePlan,
    needsPlanUpgrade,
    extraTeamsPurchased: row.extraTeamsPurchased,
    extraDivisionsPurchased: row.extraDivisionsPurchased,
    planOverrideAt: row.planOverrideAt,
    planOverrideReason: row.planOverrideReason,
    features: {
      hasCatalog:      limits.hasCatalog,
      hasDocuments:    limits.hasDocuments,
      hasMessaging:    limits.hasMessaging,
      hasFinance:      limits.hasFinance,
      hasLiveTimeline: limits.hasLiveTimeline,
      hasMatchHub:     limits.hasMatchHub,
      hasEliteFormats: limits.hasEliteFormats,
      hasMultiAdmin:   limits.hasMultiAdmin,
      hasDrawShow:     limits.hasDrawShow,
      // Effective maximums accounting for extra purchased slots
      maxDivisions:    limits.maxDivisions === Infinity ? 9999 : limits.maxDivisions + (row.extraDivisionsPurchased ?? 0),
      maxTeams:        limits.maxTeams === Infinity ? 9999 : limits.maxTeams + (row.extraTeamsPurchased ?? 0),
      // Base included teams (billing threshold, before any extras purchased)
      planIncludedTeams: limits.maxTeams === Infinity ? 9999 : limits.maxTeams,
      // Price per extra team in cents
      extraTeamPriceCents: (limits.extraTeamPriceEur ?? 0) * 100,
    },
    // Extras owed (deferred billing cart)
    // amountCents = divisions only (charged now)
    // teamsPendingCents = teams (charged at registration close, shown as live counter)
    extrasOwed: {
      divisions:            divisionsOwed,
      teams:                teamsOwed,
      amountCents:          extrasAmountCents,      // divisions only — for pay-extras
      teamsPendingCents:    teamsAmountCents,        // teams — displayed but paid at close
      displayAmountCents:   divisionsAmountCents + teamsAmountCents, // full cart total for UI
      extraDivisionPriceCents: EXTRA_DIVISION_PRICE_CENTS,
      extraTeamPriceCents:     extraTeamPriceCents,
      paymentDue:           row.extrasPaymentDue ?? null,  // "YYYY-MM-DD" or null
      blocked:              extrasBlocked,                   // true = publish is locked
    },
    // Модули услуг турнира (проживание, питание, трансфер)
    tournament: {
      hasAccommodation: row.hasAccommodation ?? false,
      hasMeals:         row.hasMeals         ?? false,
      hasTransfer:      row.hasTransfer       ?? false,
    },
  });
}
