import fs from "fs";
import path from "path";

export type StripeMode = "live" | "test";

const MODE_FILE = path.join(process.cwd(), "stripe-mode.json");

export function getStripeMode(): StripeMode {
  try {
    const raw = fs.readFileSync(MODE_FILE, "utf-8");
    const cfg = JSON.parse(raw);
    return cfg.mode === "test" ? "test" : "live";
  } catch {
    return "live";
  }
}

export function setStripeMode(mode: StripeMode): void {
  fs.writeFileSync(MODE_FILE, JSON.stringify({ mode }, null, 2), "utf-8");
}

export function getStripeSecretKey(): string {
  const mode = getStripeMode();
  const key =
    mode === "test"
      ? process.env.STRIPE_SECRET_KEY_TEST
      : process.env.STRIPE_SECRET_KEY_LIVE;
  if (!key) throw new Error(`STRIPE_SECRET_KEY_${mode.toUpperCase()} is not set`);
  return key;
}

export function getStripeWebhookSecret(): string {
  const mode = getStripeMode();
  const secret =
    mode === "test"
      ? process.env.STRIPE_WEBHOOK_SECRET_TEST
      : process.env.STRIPE_WEBHOOK_SECRET_LIVE;
  if (!secret) throw new Error(`STRIPE_WEBHOOK_SECRET_${mode.toUpperCase()} is not set`);
  return secret;
}
