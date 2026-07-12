"use client";

import { useEffect, useState, useCallback } from "react";
import type { TournamentPlan } from "@/lib/plan-gates";
import {
  ensureLoaded,
  invalidate,
  subscribe,
  getCached,
  type CacheStatus,
} from "@/lib/tournament-modules-cache";

/**
 * Tournament feature flags + plan, as consumed by the admin navigation.
 *
 * The desktop sidebar and the mobile drawer both need this and are mounted at
 * the same time (one is CSS-hidden per breakpoint). To avoid two identical
 * `billing-info` requests and locked/unlocked flicker, both read through this
 * hook, which is a thin wrapper over the framework-free, per-tournament-keyed
 * cache in `tournament-modules-cache.ts` (see that file for the isolation and
 * dedup contract). There is no SWR/react-query in the project.
 */
export type TournamentModules = {
  hasMessaging:     boolean;
  hasFinance:       boolean;
  hasMatchHub:      boolean;
  hasAccommodation: boolean;
  hasMeals:         boolean;
  hasTransfer:      boolean;
  effectivePlan:    TournamentPlan;
  maxDivisions:     number;
  maxTeams:         number;
  needsPlanUpgrade: boolean;
  extrasOwed?: {
    divisions: number;
    teams: number;
    amountCents: number;
    teamsPendingCents?: number;
    displayAmountCents?: number;
    extraDivisionPriceCents: number;
    extraTeamPriceCents: number;
    paymentDue: string | null;
    blocked: boolean;
  };
};

/** Minimal shape of the billing-info response fields the nav consumes. */
interface BillingInfoResponse {
  features?: {
    hasMessaging?: boolean;
    hasFinance?: boolean;
    hasMatchHub?: boolean;
    maxDivisions?: number;
    maxTeams?: number;
  };
  tournament?: {
    hasAccommodation?: boolean;
    hasMeals?: boolean;
    hasTransfer?: boolean;
  };
  effectivePlan?: TournamentPlan;
  needsPlanUpgrade?: boolean;
  extrasOwed?: TournamentModules["extrasOwed"];
}

function mapModules(d: BillingInfoResponse): TournamentModules {
  return {
    hasMessaging:     d?.features?.hasMessaging     ?? false,
    hasFinance:       d?.features?.hasFinance       ?? false,
    hasMatchHub:      d?.features?.hasMatchHub      ?? false,
    hasAccommodation: d?.tournament?.hasAccommodation ?? false,
    hasMeals:         d?.tournament?.hasMeals         ?? false,
    hasTransfer:      d?.tournament?.hasTransfer       ?? false,
    effectivePlan:    (d?.effectivePlan ?? "free") as TournamentPlan,
    maxDivisions:     d?.features?.maxDivisions ?? 1,
    maxTeams:         d?.features?.maxTeams ?? 12,
    needsPlanUpgrade: d?.needsPlanUpgrade ?? false,
    extrasOwed:       d?.extrasOwed ?? undefined,
  };
}

function keyFor(orgSlug: string, tournamentId: string | number) {
  return `${orgSlug}/${tournamentId}`;
}

function fetcherFor(orgSlug: string, tournamentId: string | number) {
  return async (): Promise<TournamentModules | null> => {
    const r = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/billing-info`);
    if (!r.ok) return null;
    const d = (await r.json()) as BillingInfoResponse;
    return d ? mapModules(d) : null;
  };
}

/**
 * Shared, deduped tournament modules. `modules` is `null` until the first
 * fetch resolves; `status` distinguishes loading / ready / error so callers
 * can render a neutral "pending" state for gated links instead of flashing
 * them unlocked.
 */
export function useTournamentModules(
  orgSlug: string | null,
  tournamentId: string | number | null,
): { modules: TournamentModules | null; status: CacheStatus; refetch: () => void } {
  const enabled = !!orgSlug && tournamentId != null && tournamentId !== "";
  const key = enabled ? keyFor(orgSlug!, tournamentId!) : "";
  const [, force] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const rerender = () => force((n) => n + 1);
    const unsubscribe = subscribe(key, rerender);
    ensureLoaded(key, fetcherFor(orgSlug!, tournamentId!));
    return unsubscribe;
  }, [enabled, key, orgSlug, tournamentId]);

  const refetch = useCallback(() => {
    if (enabled) invalidate(key, fetcherFor(orgSlug!, tournamentId!));
  }, [enabled, key, orgSlug, tournamentId]);

  const snap = enabled ? getCached<TournamentModules>(key) : { value: null, status: "loading" as CacheStatus };
  return { modules: snap.value, status: snap.status, refetch };
}
