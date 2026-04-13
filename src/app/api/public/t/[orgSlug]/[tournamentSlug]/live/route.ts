/**
 * GET /api/public/t/[orgSlug]/[tournamentSlug]/live
 *
 * Server-Sent Events (SSE) endpoint — pushes match score updates in real-time.
 *
 * Plan gate: Pro/Elite only (hasLiveTimeline).
 * Free/Starter: returns 403.
 *
 * Client connects once; server pushes events whenever a match score changes.
 * Each event is a JSON object: { matchId, groupId, homeScore, awayScore, status }
 *
 * The client re-fetches /standings after each event to get updated provisional standings.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, tournaments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getEffectivePlan, PLAN_LIMITS } from "@/lib/plan-gates";
import { onMatchUpdate, type MatchUpdateEvent } from "@/lib/match-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentSlug: string }> }
) {
  const { orgSlug, tournamentSlug } = await params;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tournament = await db.query.tournaments.findFirst({
    where: and(
      eq(tournaments.organizationId, org.id),
      eq(tournaments.slug, tournamentSlug)
    ),
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Plan gate: live SSE only for Pro/Elite
  const effectivePlan = getEffectivePlan(
    (tournament.plan ?? "free") as Parameters<typeof getEffectivePlan>[0],
    org.eliteSubStatus
  );
  if (!PLAN_LIMITS[effectivePlan].hasLiveTimeline) {
    return NextResponse.json({ error: "Live standings require Pro or Elite plan" }, { status: 403 });
  }

  const tournamentId = tournament.id;

  // ── Server-Sent Events stream ─────────────────────────────────────────────

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection confirmation
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ tournamentId })}\n\n`)
      );

      // Subscribe to match updates for this tournament
      const unsubscribe = onMatchUpdate(tournamentId, (event: MatchUpdateEvent) => {
        try {
          const payload = JSON.stringify({
            matchId:    event.matchId,
            groupId:    event.groupId,
            homeTeamId: event.homeTeamId,
            awayTeamId: event.awayTeamId,
            homeScore:  event.homeScore,
            awayScore:  event.awayScore,
            status:     event.status,
            ts:         Date.now(),
          });
          controller.enqueue(encoder.encode(`event: match:update\ndata: ${payload}\n\n`));
        } catch {
          // Client disconnected — ignore
        }
      });

      // Heartbeat every 25s to prevent proxy timeouts
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25_000);

      // Cleanup when client disconnects
      req.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type":                "text/event-stream",
      "Cache-Control":               "no-cache, no-transform",
      "Connection":                  "keep-alive",
      "X-Accel-Buffering":           "no",   // disable nginx buffering
      "Access-Control-Allow-Origin": "*",
    },
  });
}
