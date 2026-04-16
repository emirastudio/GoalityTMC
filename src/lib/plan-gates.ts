/**
 * PLAN GATES — единственный источник правды по тарифным планам.
 * Все проверки только на сервере. Клиент лишь скрывает UI.
 */

import { NextResponse } from "next/server";

// ─── Types ──────────────────────────────────────────────────

export type TournamentPlan = "free" | "starter" | "pro" | "elite";

export type PlanLimits = {
  maxTournaments: number;       // per org
  maxTeams: number;             // included free
  maxDivisions: number;         // per tournament
  maxDays: number;              // tournament duration
  extraTeamPriceEur: number;   // 0 = not allowed
  hasCatalog: boolean;
  hasDocuments: boolean;
  hasMessaging: boolean;
  hasFinance: boolean;
  hasLiveTimeline: boolean;
  hasMatchHub: boolean;
  hasEliteFormats: boolean;
  hasMultiAdmin: boolean;
  /** Beautiful fullscreen draw-reveal presentation. Pro/Elite only. */
  hasDrawShow: boolean;
};

// ─── Feature Matrix (SINGLE SOURCE OF TRUTH) ────────────────

export const PLAN_LIMITS: Record<TournamentPlan, PlanLimits> = {
  free: {
    maxTournaments:      1,
    maxTeams:            12,
    maxDivisions:        1,
    maxDays:             1,
    extraTeamPriceEur:   0,
    hasCatalog:          false,
    hasDocuments:        false,
    hasMessaging:        false,
    hasFinance:          false,
    hasLiveTimeline:     false,
    hasMatchHub:         false,
    hasEliteFormats:     false,
    hasMultiAdmin:       false,
    hasDrawShow:         false,
  },
  starter: {
    maxTournaments:      Infinity,
    maxTeams:            16,
    maxDivisions:        1,
    maxDays:             2,
    extraTeamPriceEur:   1,
    hasCatalog:          true,
    hasDocuments:        true,
    hasMessaging:        false,
    hasFinance:          false,
    hasLiveTimeline:     false,
    hasMatchHub:         false,
    hasEliteFormats:     false,
    hasMultiAdmin:       false,
    hasDrawShow:         false,
  },
  pro: {
    maxTournaments:      Infinity,
    maxTeams:            16,
    maxDivisions:        3,
    maxDays:             Infinity,
    extraTeamPriceEur:   2,
    hasCatalog:          true,
    hasDocuments:        true,
    hasMessaging:        true,
    hasFinance:          true,
    hasLiveTimeline:     true,
    hasMatchHub:         true,
    hasEliteFormats:     true,   // Elite & custom formats unlock in Pro
    hasMultiAdmin:       false,
    hasDrawShow:         true,   // Draw Show presentation — Pro & Elite
  },
  elite: {
    maxTournaments:      Infinity,
    maxTeams:            16,         // 16 included + €2 per extra (same as Pro)
    maxDivisions:        Infinity,   // ∞ divisions
    maxDays:             Infinity,
    extraTeamPriceEur:   2,          // €2 per extra team
    hasCatalog:          true,
    hasDocuments:        true,
    hasMessaging:        true,
    hasFinance:          true,
    hasLiveTimeline:     true,
    hasMatchHub:         true,
    hasEliteFormats:     true,
    hasMultiAdmin:       true,
    hasDrawShow:         true,
  },
};

// ─── Pricing (EUR cents) ─────────────────────────────────────

export const PLAN_PRICES_EUR_CENTS = {
  starter:          1900,   // €19 per tournament
  pro:              4900,   // €49 per tournament
  elite:            8900,   // €89 per tournament
  elite_monthly:   24900,   // €249/month subscription
  elite_yearly:   199900,   // €1999/year subscription (-33%)
} as const;

/** Price per extra division slot (any plan). Single source of truth. */
export const EXTRA_DIVISION_PRICE_CENTS = 900; // €9

export const PLAN_NAMES: Record<TournamentPlan, string> = {
  free:    "Free",
  starter: "Starter",
  pro:     "Pro",
  elite:   "Elite",
};

// ─── Effective Plan Resolution ───────────────────────────────

/**
 * Org-level Elite subscription overrides any tournament plan.
 * Super-admin manual override is stored directly on tournament.plan.
 */
export function getEffectivePlan(
  tournamentPlan: TournamentPlan,
  orgEliteSubStatus: string | null | undefined
): TournamentPlan {
  if (orgEliteSubStatus === "active" || orgEliteSubStatus === "trialing") {
    return "elite";
  }
  return tournamentPlan;
}

export function getPlanLimits(plan: TournamentPlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

// ─── Limit Checks (pure functions) ───────────────────────────

export function canAddTeam(
  plan: TournamentPlan,
  currentTeamCount: number,
  extraTeamsPurchased: number = 0
): boolean {
  const limits = PLAN_LIMITS[plan];
  if (limits.maxTeams === Infinity) return true;
  return currentTeamCount < limits.maxTeams + extraTeamsPurchased;
}

export function canAddDivision(
  plan: TournamentPlan,
  currentDivisionCount: number,
  extraDivisionsPurchased: number = 0
): boolean {
  const limits = PLAN_LIMITS[plan];
  if (limits.maxDivisions === Infinity) return true;
  return currentDivisionCount < limits.maxDivisions + extraDivisionsPurchased;
}

export function hasFeature(
  plan: TournamentPlan,
  feature: keyof Pick<PlanLimits,
    "hasCatalog" | "hasDocuments" | "hasMessaging" |
    "hasFinance" | "hasLiveTimeline" | "hasMatchHub" |
    "hasEliteFormats" | "hasMultiAdmin" | "hasDrawShow">
): boolean {
  return PLAN_LIMITS[plan][feature];
}

// ─── Extra Teams Pricing ─────────────────────────────────────

export function calculateExtraTeamsCost(
  plan: TournamentPlan,
  desiredTeamCount: number
): { extraTeams: number; costEurCents: number } {
  const limits = PLAN_LIMITS[plan];
  if (limits.maxTeams === Infinity || desiredTeamCount <= limits.maxTeams) {
    return { extraTeams: 0, costEurCents: 0 };
  }
  const extra = desiredTeamCount - limits.maxTeams;
  return {
    extraTeams: extra,
    costEurCents: extra * limits.extraTeamPriceEur * 100,
  };
}

export function calculateTotalPrice(
  plan: TournamentPlan,
  extraTeams: number = 0
): number {
  if (plan === "free") return 0;
  const baseCents = PLAN_PRICES_EUR_CENTS[plan as keyof typeof PLAN_PRICES_EUR_CENTS] ?? 0;
  const extraCents = extraTeams * PLAN_LIMITS[plan].extraTeamPriceEur * 100;
  return baseCents + extraCents;
}

// ─── Server-Side API Guards ───────────────────────────────────

type PlanFeature = keyof Pick<PlanLimits,
  "hasCatalog" | "hasDocuments" | "hasMessaging" |
  "hasFinance" | "hasLiveTimeline" | "hasMatchHub" |
  "hasEliteFormats" | "hasMultiAdmin" | "hasDrawShow">;

const FEATURE_REQUIRED_PLAN: Record<PlanFeature, TournamentPlan> = {
  hasCatalog:       "starter",
  hasDocuments:     "starter",
  hasMessaging:     "pro",
  hasFinance:       "pro",
  hasLiveTimeline:  "pro",
  hasMatchHub:      "pro",
  hasEliteFormats:  "pro",
  hasMultiAdmin:    "elite",
  hasDrawShow:      "pro",
};

/**
 * Use in API routes:
 *   const gate = assertFeature(effectivePlan, "hasMessaging");
 *   if (gate) return gate;
 */
export function assertFeature(
  effectivePlan: TournamentPlan,
  feature: PlanFeature
): NextResponse | null {
  if (PLAN_LIMITS[effectivePlan][feature]) return null;
  return NextResponse.json(
    {
      error: "Plan upgrade required",
      feature,
      currentPlan: effectivePlan,
      requiredPlan: FEATURE_REQUIRED_PLAN[feature],
      upgradeUrl: "/billing",
    },
    { status: 402 }
  );
}

/**
 * Use for team count limit:
 *   const gate = assertCanAddTeam(effectivePlan, currentCount, extraPurchased);
 *   if (gate) return gate;
 */
export function assertCanAddTeam(
  effectivePlan: TournamentPlan,
  currentTeamCount: number,
  extraTeamsPurchased: number = 0
): NextResponse | null {
  if (canAddTeam(effectivePlan, currentTeamCount, extraTeamsPurchased)) return null;
  return NextResponse.json(
    {
      error: "Team limit reached for your plan",
      currentPlan: effectivePlan,
      maxTeams: PLAN_LIMITS[effectivePlan].maxTeams,
      extraTeamsPurchased,
      upgradeUrl: "/billing",
    },
    { status: 402 }
  );
}

/**
 * Use for division limit:
 *   const gate = assertCanAddDivision(effectivePlan, currentCount);
 *   if (gate) return gate;
 */
export function assertCanAddDivision(
  effectivePlan: TournamentPlan,
  currentDivisionCount: number,
  extraDivisionsPurchased: number = 0
): NextResponse | null {
  if (canAddDivision(effectivePlan, currentDivisionCount, extraDivisionsPurchased)) return null;
  return NextResponse.json(
    {
      error: "Division limit reached for your plan",
      currentPlan: effectivePlan,
      maxDivisions: PLAN_LIMITS[effectivePlan].maxDivisions + extraDivisionsPurchased,
      extraDivisionsPurchased,
      upgradeUrl: "/billing",
    },
    { status: 402 }
  );
}
