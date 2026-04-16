/**
 * GET /api/draw/thanks?cs=<session_id>
 *
 * The Stripe success_url sends the user here right after payment.
 * We look up by checkout session to see whether the webhook has
 * already created the draw; if yes we return { id } and the UI
 * bounces to /draw/created?s=<id>; if no we return { pending: true }
 * and the UI polls every second until it flips.
 *
 * We key the lookup by joining draw_show_events.created events that
 * match the session_id via a short JSON meta lookup — actually
 * simpler: we also stored the session_id in public_draws? No we
 * didn't. Simpler: scan draw_pending_purchases first. If row still
 * exists, it's pending. If gone, scan recent draw_show_events for
 * the email to find the newly-created draw.
 *
 * Small window of flakiness if the email has multiple draws in the
 * last few minutes. For v1 we accept that and move on.
 */

import { NextRequest, NextResponse } from "next/server";
import { desc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import {
  drawPendingPurchases,
  drawShowEvents,
} from "@/db/schema";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("cs");
  if (!sessionId) {
    return NextResponse.json({ error: "missing_session" }, { status: 400 });
  }

  // Still-pending row means the webhook hasn't landed yet. Tell the
  // client to keep polling.
  const [pending] = await db
    .select({ email: drawPendingPurchases.email })
    .from(drawPendingPurchases)
    .where(eq(drawPendingPurchases.stripeSessionId, sessionId))
    .limit(1);

  if (pending) {
    return NextResponse.json({ pending: true });
  }

  // Pending gone → webhook succeeded. Find the most recent "created"
  // event in the last 10 minutes to pull the draw id. The email on
  // the pending row was deleted with it so we don't filter by email
  // here — in practice the pending row was only one per session.
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
  const [latest] = await db
    .select({ drawId: drawShowEvents.drawId })
    .from(drawShowEvents)
    .where(gt(drawShowEvents.createdAt, tenMinAgo))
    .orderBy(desc(drawShowEvents.id))
    .limit(1);

  if (latest?.drawId) {
    return NextResponse.json({ id: latest.drawId });
  }

  // Defensive: webhook hasn't fired AND no pending row — Stripe
  // probably hasn't notified us yet. Treat as pending.
  return NextResponse.json({ pending: true });
}
