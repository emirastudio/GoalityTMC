/**
 * Pricing calculator for offerings v3.
 *
 * Centralises the math for a single team-offering deal:
 *   subtotal → adjustments → total → paid → outstanding
 *
 * Inputs are raw DB rows; output is a structured breakdown the UI can
 * render without any further arithmetic.
 */

import { db } from "@/db";
import {
  offerings,
  packageContents,
  teamOfferingDeals,
  dealAdjustments,
  dealPayments,
  dealItemOverrides,
  tournamentRegistrations,
  registrationPeople,
  people,
  tournaments,
  tournamentClasses,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export type PriceModel =
  | "flat" | "per_team" | "per_person" | "per_player" | "per_staff"
  | "per_accompanying" | "per_night" | "per_meal" | "per_unit";

export type AdjustmentMode = "fixed_cents" | "percent_bps" | "per_player";

type OfferingRow = {
  id: number;
  kind: "single" | "package";
  title: string;
  priceModel: PriceModel;
  priceCents: number;
  packagePriceOverrideCents: number | null;
  /** Per-offering nights override for per_night pricing. */
  nightsCount: number | null;
  icon: string | null;
};

type RegistrationContext = {
  registrationId: number;
  tournamentId: number;
  classId: number | null;
  playerCount: number;
  staffCount: number;
  accompanyingCount: number;
  nights: number;
  meals: number;
  /** Club-declared accom demand. When the club confirmed accommodation and
   *  entered explicit counts, these win over raw roster counts for
   *  per_player / per_staff / per_accompanying price models. */
  accomDemand: {
    confirmed: boolean;
    players: number;
    staff: number;
    accompanying: number;
  };
};

type DealFreeSlots = {
  playersCount: number;
  staffCount: number;
  accompanyingCount: number;
  mealsCountOverride: number | null;
};

export type LineBreakdown = {
  offeringId: number;
  title: string;
  icon: string | null;
  priceModel: PriceModel;
  /** Human-readable context for the CONDITIONS column.
   *  Example: "Per team", "17 players × 2 nights", "6 meals · 2 staff free". */
  conditionsText: string;
  /** Original (before free-slot deduction) multiplicand. */
  quantity: number;
  /** After free-slot deduction — what the club actually pays for. */
  quantityPaid: number;
  unitPriceCents: number;
  /** Set only when an organiser-level inline price override is active;
   *  lets the UI show "€230 → €220" with strike-through. */
  originalUnitPriceCents?: number | null;
  overrideReason?: string | null;
  /** True when the override was flagged as a gift (price=0 with reason=gift). */
  isGift: boolean;
  lineCents: number;
  isPackageRollup?: boolean;
};

export type AdjustmentBreakdown = {
  id: number;
  kind: "discount" | "surcharge";
  mode: AdjustmentMode;
  value: number;
  targetOfferingId: number | null;
  reason: string;
  effectCents: number; // signed — negative for discount
};

export type DealBreakdown = {
  dealId: number;
  offering: { id: number; title: string; kind: "single" | "package"; icon: string | null };
  lines: LineBreakdown[];
  /** Free slots applied to the deal (per-category gift counts + meals override). */
  freeSlots: DealFreeSlots;
  subtotalCents: number;
  adjustments: AdjustmentBreakdown[];
  totalCents: number;
  paidCents: number;
  outstandingCents: number;
  currency: string;
};

/** Fetches everything needed to price one deal in one go. */
export async function buildDealBreakdown(dealId: number): Promise<DealBreakdown | null> {
  const [deal] = await db
    .select({
      id: teamOfferingDeals.id,
      registrationId: teamOfferingDeals.registrationId,
      offeringId: teamOfferingDeals.offeringId,
      freePlayersCount: teamOfferingDeals.freePlayersCount,
      freeStaffCount: teamOfferingDeals.freeStaffCount,
      freeAccompanyingCount: teamOfferingDeals.freeAccompanyingCount,
      mealsCountOverride: teamOfferingDeals.mealsCountOverride,
    })
    .from(teamOfferingDeals)
    .where(eq(teamOfferingDeals.id, dealId))
    .limit(1);
  if (!deal) return null;

  const freeSlots: DealFreeSlots = {
    playersCount: deal.freePlayersCount ?? 0,
    staffCount: deal.freeStaffCount ?? 0,
    accompanyingCount: deal.freeAccompanyingCount ?? 0,
    mealsCountOverride: deal.mealsCountOverride ?? null,
  };

  const ctx = await buildRegistrationContext(deal.registrationId, freeSlots.mealsCountOverride);
  const [offeringRow] = await db
    .select({
      id: offerings.id,
      kind: offerings.kind,
      title: offerings.title,
      priceModel: offerings.priceModel,
      priceCents: offerings.priceCents,
      packagePriceOverrideCents: offerings.packagePriceOverrideCents,
      nightsCount: offerings.nightsCount,
      icon: offerings.icon,
      currency: offerings.currency,
    })
    .from(offerings)
    .where(eq(offerings.id, deal.offeringId))
    .limit(1);
  if (!offeringRow) return null;

  const currency = offeringRow.currency;

  // Load item-level overrides for this deal in one query.
  const overrideRows = await db
    .select({
      offeringId: dealItemOverrides.offeringId,
      priceCentsOverride: dealItemOverrides.priceCentsOverride,
      reason: dealItemOverrides.reason,
    })
    .from(dealItemOverrides)
    .where(eq(dealItemOverrides.dealId, dealId));
  const overrideByOffering = new Map(overrideRows.map(r => [r.offeringId, r]));

  // Build lines.
  let lines: LineBreakdown[] = [];
  if (offeringRow.kind === "single") {
    lines = [priceLine(offeringRow as OfferingRow, ctx, freeSlots, overrideByOffering)];
  } else {
    // Package — either sum of children or custom override price.
    if (offeringRow.packagePriceOverrideCents !== null) {
      const override = overrideByOffering.get(offeringRow.id);
      const unit = override?.priceCentsOverride ?? offeringRow.packagePriceOverrideCents;
      const qty = quantityFor(offeringRow.priceModel, ctx);
      const qtyPaid = qty; // roll-up package: free slots not applicable
      lines = [
        {
          offeringId: offeringRow.id,
          title: offeringRow.title,
          icon: offeringRow.icon,
          priceModel: offeringRow.priceModel,
          conditionsText: conditionsTextFor(offeringRow.priceModel, qty, qtyPaid, ctx, freeSlots),
          quantity: qty,
          quantityPaid: qtyPaid,
          unitPriceCents: unit,
          originalUnitPriceCents: override ? offeringRow.packagePriceOverrideCents : null,
          overrideReason: override?.reason ?? null,
          isGift: !!override && unit === 0 && isGiftReason(override.reason),
          lineCents: unit * qtyPaid,
          isPackageRollup: true,
        },
      ];
    } else {
      const children = await db
        .select({
          id: offerings.id,
          kind: offerings.kind,
          title: offerings.title,
          priceModel: offerings.priceModel,
          priceCents: offerings.priceCents,
          packagePriceOverrideCents: offerings.packagePriceOverrideCents,
          nightsCount: offerings.nightsCount,
          icon: offerings.icon,
        })
        .from(packageContents)
        .innerJoin(offerings, eq(offerings.id, packageContents.childOfferingId))
        .where(eq(packageContents.packageId, offeringRow.id))
        .orderBy(packageContents.sortOrder);
      lines = children.map(c => priceLine(c as OfferingRow, ctx, freeSlots, overrideByOffering));
    }
  }

  const subtotalCents = lines.reduce((s, l) => s + l.lineCents, 0);

  // Adjustments.
  const adjustmentRows = await db
    .select()
    .from(dealAdjustments)
    .where(eq(dealAdjustments.dealId, dealId));
  const adjustments: AdjustmentBreakdown[] = adjustmentRows.map(a => {
    const base = a.targetOfferingId
      ? (lines.find(l => l.offeringId === a.targetOfferingId)?.lineCents ?? 0)
      : subtotalCents;
    let raw = 0;
    if (a.amountMode === "fixed_cents") raw = a.amountValue;
    else if (a.amountMode === "percent_bps") raw = Math.round((base * a.amountValue) / 10000);
    else if (a.amountMode === "per_player") raw = a.amountValue * ctx.playerCount;
    const signed = a.kind === "discount" ? -raw : raw;
    return {
      id: a.id,
      kind: a.kind as "discount" | "surcharge",
      mode: a.amountMode as AdjustmentMode,
      value: a.amountValue,
      targetOfferingId: a.targetOfferingId,
      reason: a.reason,
      effectCents: signed,
    };
  });

  const totalCents = Math.max(0, subtotalCents + adjustments.reduce((s, a) => s + a.effectCents, 0));

  // Payments.
  const paymentRows = await db
    .select({ amount: dealPayments.amountCents })
    .from(dealPayments)
    .where(eq(dealPayments.dealId, dealId));
  const paidCents = paymentRows.reduce((s, p) => s + p.amount, 0);

  return {
    dealId,
    offering: { id: offeringRow.id, title: offeringRow.title, kind: offeringRow.kind, icon: offeringRow.icon },
    lines,
    freeSlots,
    subtotalCents,
    adjustments,
    totalCents,
    paidCents,
    outstandingCents: Math.max(0, totalCents - paidCents),
    currency,
  };
}

function priceLine(
  row: OfferingRow,
  ctx: RegistrationContext,
  freeSlots: DealFreeSlots,
  overrides?: Map<number, { priceCentsOverride: number; reason: string | null }>,
): LineBreakdown {
  // Per-offering nights override (set by the organiser on the offering itself)
  // wins over the auto-calculated tournament-nights context for this line only.
  const rowCtx: RegistrationContext =
    row.nightsCount != null
      ? { ...ctx, nights: row.nightsCount }
      : ctx;
  const qty = quantityFor(row.priceModel, rowCtx);
  const qtyPaid = quantityPaidFor(row.priceModel, qty, freeSlots, rowCtx);
  const override = overrides?.get(row.id) ?? null;
  const unit = override?.priceCentsOverride ?? row.priceCents;
  return {
    offeringId: row.id,
    title: row.title,
    icon: row.icon,
    priceModel: row.priceModel,
    conditionsText: conditionsTextFor(row.priceModel, qty, qtyPaid, rowCtx, freeSlots),
    quantity: qty,
    quantityPaid: qtyPaid,
    unitPriceCents: unit,
    originalUnitPriceCents: override ? row.priceCents : null,
    overrideReason: override?.reason ?? null,
    isGift: !!override && unit === 0 && isGiftReason(override.reason),
    lineCents: unit * qtyPaid,
  };
}

function isGiftReason(reason: string | null | undefined): boolean {
  if (!reason) return false;
  const r = reason.trim().toLowerCase();
  return r === "gift" || r.startsWith("gift");
}

function quantityFor(model: PriceModel, ctx: RegistrationContext): number {
  const { playerCount, staffCount, accompanyingCount, nights, meals, accomDemand } = ctx;
  // When the club has confirmed accommodation with explicit demand counts,
  // those declared numbers drive per-person pricing. This lets the club
  // say "book 13 beds" even if the roster currently holds 15 people.
  const demandP = accomDemand.confirmed && accomDemand.players > 0 ? accomDemand.players : playerCount;
  const demandS = accomDemand.confirmed && accomDemand.staff > 0 ? accomDemand.staff : staffCount;
  const demandA = accomDemand.confirmed && accomDemand.accompanying > 0 ? accomDemand.accompanying : accompanyingCount;
  const persons = demandP + demandS;
  switch (model) {
    case "flat":             return 1;
    case "per_team":         return 1; // single reg = 1 team
    case "per_person":       return persons;
    case "per_player":       return demandP;
    case "per_staff":        return demandS;
    case "per_accompanying": return demandA;
    case "per_night":        return persons * nights;
    case "per_meal":         return persons * meals;
    case "per_unit":         return 1; // UI supplies quantity explicitly (v3.1)
    default:                 return 1;
  }
}

/** Deducts free slots (gift counts) from the paid multiplicand. */
function quantityPaidFor(
  model: PriceModel,
  qty: number,
  f: DealFreeSlots,
  ctx: RegistrationContext,
): number {
  switch (model) {
    case "per_player":
      return Math.max(0, qty - f.playersCount);
    case "per_staff":
      return Math.max(0, qty - f.staffCount);
    case "per_accompanying":
      return Math.max(0, qty - f.accompanyingCount);
    case "per_person":
      return Math.max(0, qty - f.playersCount - f.staffCount);
    case "per_night": {
      const freePersonNights = (f.playersCount + f.staffCount) * ctx.nights;
      return Math.max(0, qty - freePersonNights);
    }
    default:
      return qty;
  }
}

/** Short human description of *how* this line is priced, shown under the
 *  service title in the UI. Locale-neutral by design — i18n happens at the
 *  edges (currency formatting, legend). */
function conditionsTextFor(
  model: PriceModel,
  qty: number,
  qtyPaid: number,
  ctx: RegistrationContext,
  f: DealFreeSlots,
): string {
  const freeNote = (free: number, unit: string) =>
    free > 0 ? ` · ${free} ${unit} free` : "";
  switch (model) {
    case "flat":
      return "Flat fee";
    case "per_team":
      return "Per team";
    case "per_person":
      return `${qty} persons${freeNote(f.playersCount + f.staffCount, "free")}`;
    case "per_player":
      return `${qty} players${freeNote(f.playersCount, "free")}`;
    case "per_staff":
      return `${qty} staff${freeNote(f.staffCount, "free")}`;
    case "per_accompanying":
      return `${qty} accompanying${freeNote(f.accompanyingCount, "free")}`;
    case "per_night": {
      const persons = ctx.playerCount + ctx.staffCount;
      return `${persons} × ${ctx.nights} night${ctx.nights === 1 ? "" : "s"}${
        f.playersCount + f.staffCount > 0 ? ` · ${f.playersCount + f.staffCount} free` : ""
      }`;
    }
    case "per_meal": {
      const persons = ctx.playerCount + ctx.staffCount;
      const mealsPerPerson = f.mealsCountOverride ?? ctx.meals;
      const tag = f.mealsCountOverride != null ? " (custom)" : "";
      return `${persons} × ${mealsPerPerson} meal${mealsPerPerson === 1 ? "" : "s"}${tag}`;
    }
    case "per_unit":
      return `${qty} unit${qty === 1 ? "" : "s"}`;
    default:
      return "";
  }
}

async function buildRegistrationContext(
  registrationId: number,
  mealsCountOverride: number | null,
): Promise<RegistrationContext> {
  const [reg] = await db
    .select({
      id: tournamentRegistrations.id,
      tournamentId: tournamentRegistrations.tournamentId,
      classId: tournamentRegistrations.classId,
      teamId: tournamentRegistrations.teamId,
      accomPlayers: tournamentRegistrations.accomPlayers,
      accomStaff: tournamentRegistrations.accomStaff,
      accomAccompanying: tournamentRegistrations.accomAccompanying,
      accomConfirmed: tournamentRegistrations.accomConfirmed,
    })
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.id, registrationId))
    .limit(1);
  if (!reg) {
    return {
      registrationId, tournamentId: 0, classId: null,
      playerCount: 0, staffCount: 0, accompanyingCount: 0, nights: 0, meals: 0,
      accomDemand: { confirmed: false, players: 0, staff: 0, accompanying: 0 },
    };
  }

  // Post-0018: roster lives on registration_people (per-tournament pivot).
  // Count people of each type that are included in this tournament's roster.
  const counts = await db
    .select({
      personType: people.personType,
      n: sql<number>`COUNT(*)::int`,
    })
    .from(registrationPeople)
    .innerJoin(people, eq(people.id, registrationPeople.personId))
    .where(and(
      eq(registrationPeople.registrationId, registrationId),
      eq(registrationPeople.includedInRoster, true),
    ))
    .groupBy(people.personType);
  let playerCount = 0, staffCount = 0, accompanyingCount = 0;
  for (const c of counts) {
    if (c.personType === "player") playerCount = Number(c.n);
    else if (c.personType === "staff") staffCount = Number(c.n);
    else if (c.personType === "accompanying") accompanyingCount = Number(c.n);
  }

  // Nights — from tournament dates or class dates. Prefer class if set.
  let nights = 0;
  if (reg.classId) {
    const [cls] = await db
      .select({ startDate: tournamentClasses.startDate, endDate: tournamentClasses.endDate })
      .from(tournamentClasses)
      .where(eq(tournamentClasses.id, reg.classId))
      .limit(1);
    if (cls?.startDate && cls?.endDate) {
      nights = Math.max(0, daysBetween(new Date(cls.startDate), new Date(cls.endDate)));
    }
  }
  if (nights === 0) {
    const [tour] = await db
      .select({ startDate: tournaments.startDate, endDate: tournaments.endDate })
      .from(tournaments)
      .where(eq(tournaments.id, reg.tournamentId))
      .limit(1);
    if (tour?.startDate && tour?.endDate) {
      nights = Math.max(0, daysBetween(new Date(tour.startDate), new Date(tour.endDate)));
    }
  }
  // Per-person meals default: (nights + 1) × 3 (one extra day for breakfast
  // on departure day). Override wins when the organiser set one explicitly.
  const meals = mealsCountOverride != null
    ? Math.max(0, mealsCountOverride)
    : Math.max(0, nights + 1) * 3;

  return {
    registrationId,
    tournamentId: reg.tournamentId,
    classId: reg.classId,
    playerCount,
    staffCount,
    accompanyingCount,
    nights,
    meals,
    accomDemand: {
      confirmed: reg.accomConfirmed ?? false,
      players: reg.accomPlayers ?? 0,
      staff: reg.accomStaff ?? 0,
      accompanying: reg.accomAccompanying ?? 0,
    },
  };
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** Build breakdowns for many deals in one call (list views). */
export async function buildManyDealBreakdowns(dealIds: number[]): Promise<Record<number, DealBreakdown>> {
  const result: Record<number, DealBreakdown> = {};
  for (const id of dealIds) {
    const b = await buildDealBreakdown(id);
    if (b) result[id] = b;
  }
  return result;
}
