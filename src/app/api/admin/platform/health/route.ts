import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { requireAdmin, isError } from "@/lib/api-auth";
import { getStripeMode } from "@/lib/stripe-mode";

export async function GET() {
  const session = await requireAdmin();
  if (isError(session)) return session;
  if (!session.isSuper) {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }

  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // ── Database ─────────────────────────────────────────────────────
  try {
    const [row] = await db.execute<{ now: string }>(sql`SELECT NOW() as now`);
    checks.database = { ok: true, detail: `Connected — server time: ${row.now}` };
  } catch (e) {
    checks.database = { ok: false, detail: String(e) };
  }

  // ── Environment variables ─────────────────────────────────────────
  checks.smtp = {
    ok: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    detail: process.env.SMTP_HOST
      ? `${process.env.SMTP_USER} @ ${process.env.SMTP_HOST}:${process.env.SMTP_PORT ?? 587}`
      : "SMTP_HOST not set",
  };

  const stripeMode = getStripeMode();
  const stripeKeyVar = stripeMode === "test" ? "STRIPE_SECRET_KEY_TEST" : "STRIPE_SECRET_KEY_LIVE";
  const stripeWebhookVar = stripeMode === "test" ? "STRIPE_WEBHOOK_SECRET_TEST" : "STRIPE_WEBHOOK_SECRET_LIVE";
  const stripeKey = process.env[stripeKeyVar];
  const stripeWebhook = process.env[stripeWebhookVar];
  checks.stripe = {
    ok: Boolean(stripeKey && stripeWebhook),
    detail: !stripeKey
      ? `${stripeKeyVar} not set (mode: ${stripeMode})`
      : !stripeWebhook
      ? `${stripeWebhookVar} not set (mode: ${stripeMode})`
      : `${stripeMode.toUpperCase()} — key ${stripeKey.slice(0, 8)}…, webhook configured`,
  };

  checks.jwt = {
    ok: Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32),
    detail: process.env.JWT_SECRET ? `Length: ${process.env.JWT_SECRET.length} chars` : "JWT_SECRET not set",
  };

  checks.blogApiKey = {
    ok: Boolean(process.env.BLOG_API_KEY),
    detail: process.env.BLOG_API_KEY ? "Set" : "BLOG_API_KEY not set",
  };

  // ── Node.js runtime ───────────────────────────────────────────────
  const uptimeSeconds = Math.floor(process.uptime());
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const uptimeStr = days > 0
    ? `${days}d ${hours}h ${minutes}m`
    : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const runtime = {
    uptime: uptimeStr,
    uptimeSeconds,
    nodeVersion: process.version,
    memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    platform: process.platform,
    pid: process.pid,
  };

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json({ ok: allOk, checks, runtime, timestamp: new Date().toISOString() });
}
