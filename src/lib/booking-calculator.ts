/**
 * Single source of truth for booking price calculation.
 * Always recalculates from current admin settings + per-team overrides.
 * Stored unitPrice/total in teamBookings is ignored — only selections (serviceId, quantity, notes) matter.
 */

export type BookingRow = {
  id?: number;
  bookingType: string;
  serviceId: number;
  quantity: number;
  notes: string | null;
  unitPrice: string;
  total: string;
};

export type ServiceData = {
  accommodation: {
    id: number;
    pricePerPlayer: string;
    pricePerStaff: string;
    pricePerAccompanying: string;
  }[];
  meals: { id: number; pricePerPerson: string; perDay?: boolean }[];
  transfers: { id: number; pricePerPerson: string }[];
  registration: { id: number; price: string }[];
};

export type OverrideData = {
  serviceType: string;
  serviceId: number;
  customPrice: string | null;
};

/** Returns effective unit price for a service, applying per-team overrides */
function effectiveUnitPrice(
  type: string,
  serviceId: number,
  basePrice: string,
  overrides: OverrideData[]
): string {
  const ov = overrides.find(
    (o) => o.serviceType === type && o.serviceId === serviceId
  );
  if (ov?.customPrice != null) return String(ov.customPrice);
  return basePrice;
}

/**
 * Recalculate a single booking's unitPrice and total
 * based on CURRENT service settings + overrides.
 */
export function recalculateBooking(
  booking: BookingRow,
  services: ServiceData,
  overrides: OverrideData[]
): { unitPrice: string; total: string } {
  // Free slots (e.g. 'staff_free', 'players_free') are always 0
  if (booking.notes?.includes("_free")) {
    return { unitPrice: "0.00", total: "0.00" };
  }

  let unitPrice = "0.00";

  switch (booking.bookingType) {
    case "registration": {
      const svc = services.registration.find((r) => r.id === booking.serviceId);
      if (svc) {
        unitPrice = effectiveUnitPrice("registration", svc.id, svc.price, overrides);
      }
      break;
    }

    case "accommodation": {
      const svc = services.accommodation.find((a) => a.id === booking.serviceId);
      if (svc) {
        const notes = booking.notes ?? "players";
        const basePrice =
          notes === "staff"
            ? svc.pricePerStaff
            : notes === "accompanying"
            ? svc.pricePerAccompanying
            : svc.pricePerPlayer; // default = players
        unitPrice = effectiveUnitPrice("accommodation", svc.id, basePrice, overrides);
      }
      break;
    }

    case "transfer": {
      const svc = services.transfers.find((t) => t.id === booking.serviceId);
      if (svc) {
        unitPrice = effectiveUnitPrice("transfer", svc.id, svc.pricePerPerson, overrides);
      }
      break;
    }

    case "meal": {
      const svc = services.meals.find((m) => m.id === booking.serviceId);
      if (svc) {
        unitPrice = effectiveUnitPrice("meal", svc.id, svc.pricePerPerson, overrides);
      }
      break;
    }
  }

  const unit = parseFloat(unitPrice || "0");
  const total = (unit * booking.quantity).toFixed(2);
  return { unitPrice: unit.toFixed(2), total };
}

/**
 * Recalculate all bookings and return updated rows + grand total.
 */
export function recalculateAll(
  bookings: BookingRow[],
  services: ServiceData,
  overrides: OverrideData[]
): { bookings: BookingRow[]; total: number } {
  let total = 0;
  const updated = bookings.map((b) => {
    const { unitPrice, total: t } = recalculateBooking(b, services, overrides);
    total += parseFloat(t);
    return { ...b, unitPrice, total: t };
  });
  return { bookings: updated, total };
}
