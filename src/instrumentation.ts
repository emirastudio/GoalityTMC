/**
 * Next.js instrumentation hook — runs once on server startup.
 *
 * https://nextjs.org/docs/app/guides/instrumentation
 *
 * We use this to launch the in-process scheduling workers (notification drain
 * + retention sweep). These run only on the Node.js server runtime, never in
 * the edge runtime (which is short-lived and cannot host setInterval).
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Dynamic import so edge-runtime builds don't try to resolve nodemailer etc.
  const { startNotificationDrain, startRetentionSweep } = await import("./worker/notifications");
  startNotificationDrain();
  startRetentionSweep();
}
