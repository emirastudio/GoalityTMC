import Stripe from "stripe";
import { getStripeMode, getStripeSecretKey } from "./stripe-mode";

// Lazy singleton — resets automatically when mode changes
let _stripe: Stripe | null = null;
let _cachedMode: string | null = null;

export function getStripe(): Stripe {
  const mode = getStripeMode();

  // Reset instance if mode switched
  if (_cachedMode !== mode) {
    _stripe = null;
    _cachedMode = mode;
  }

  if (!_stripe) {
    _stripe = new Stripe(getStripeSecretKey(), {
      apiVersion: "2025-03-31.basil",
      typescript: true,
    });
  }
  return _stripe;
}

/** @deprecated Use getStripe() for lazy initialization */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as any)[prop];
  },
});
