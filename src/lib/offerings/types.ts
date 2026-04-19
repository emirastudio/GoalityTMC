/**
 * Shared client-side types for offerings v3.
 * Mirror the JSON shapes returned by the admin API — keep in sync when the
 * server DTOs change.
 */

export type OfferingKind = "single" | "package";
export type OfferingInclusion = "required" | "default" | "optional";
export type OfferingPriceModel =
  | "flat" | "per_team" | "per_person" | "per_player" | "per_staff"
  | "per_accompanying" | "per_night" | "per_meal" | "per_unit";
export type DealState = "proposed" | "accepted" | "declined" | "archived";
export type AdjustmentKind = "discount" | "surcharge";
export type AdjustmentMode = "fixed_cents" | "percent_bps" | "per_player";

export interface OfferingDTO {
  id: number;
  tournamentId: number;
  kind: OfferingKind;
  inclusion: OfferingInclusion;
  title: string;
  titleRu: string | null;
  titleEt: string | null;
  description: string | null;
  icon: string | null;
  priceModel: OfferingPriceModel;
  priceCents: number;
  currency: string;
  packagePriceOverrideCents: number | null;
  /** Fixed nights count for per_night pricing. NULL → auto-from-tournament. */
  nightsCount: number | null;
  scopeClassIds: number[] | null;
  availableFrom: string | null;
  availableUntil: string | null;
  inventoryLimit: number | null;
  sortOrder: number;
  isArchived: boolean;
  childOfferingIds: number[];
  createdAt: string;
  updatedAt: string;
}

export interface LineBreakdown {
  offeringId: number;
  title: string;
  icon: string | null;
  priceModel: OfferingPriceModel;
  /** Human-readable sub-line shown under the service title
   *  ("Per team", "17 players · 2 free", "17 × 2 nights", "6 meals"). */
  conditionsText: string;
  unitPriceCents: number;
  /** Present only when an inline price override is active on this line;
   *  UI shows "€230 → €220" with the original struck through. */
  originalUnitPriceCents?: number | null;
  overrideReason?: string | null;
  /** Raw multiplicand before deducting free slots. */
  quantity: number;
  /** After free-slot deduction — what the line actually costs. */
  quantityPaid: number;
  /** True when the line is an organiser gift (price=0, reason=gift). */
  isGift: boolean;
  lineCents: number;
  isPackageRollup?: boolean;
}
export interface AdjustmentBreakdown {
  id: number;
  kind: AdjustmentKind;
  mode: AdjustmentMode;
  value: number;
  targetOfferingId: number | null;
  reason: string;
  effectCents: number;
}
export interface DealFreeSlots {
  playersCount: number;
  staffCount: number;
  accompanyingCount: number;
  mealsCountOverride: number | null;
}
export interface DealBreakdown {
  dealId: number;
  offering: { id: number; title: string; kind: OfferingKind; icon: string | null };
  lines: LineBreakdown[];
  freeSlots: DealFreeSlots;
  subtotalCents: number;
  adjustments: AdjustmentBreakdown[];
  totalCents: number;
  paidCents: number;
  outstandingCents: number;
  currency: string;
}

export interface DealListItem {
  id: number;
  registrationId: number;
  teamName: string;
  classId: number | null;
  offeringId: number;
  offeringTitle: string;
  offeringKind: OfferingKind;
  state: DealState;
  dueDate: string | null;
  breakdown: DealBreakdown | null;
}

export interface OfferingSettings {
  offeringsV3Enabled: boolean;
  paymentInstructions: string | null;
  /** When non-null, the backend auto-creates a published deal for this
   *  offering id as soon as the club confirms accommodation. */
  autoAssignPackageOfferingId: number | null;
}

/** Format cents → "€12.34" / "€1,200" (rounds integers). */
export function formatMoney(cents: number, currency = "EUR", locale = "en-GB"): string {
  const amount = cents / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/** Human label for a price model. */
export function priceModelLabel(m: OfferingPriceModel): string {
  const map: Record<OfferingPriceModel, string> = {
    flat: "flat",
    per_team: "per team",
    per_person: "per person",
    per_player: "per player",
    per_staff: "per staff",
    per_accompanying: "per accompanying",
    per_night: "per person × night",
    per_meal: "per person × meal",
    per_unit: "per unit",
  };
  return map[m];
}
