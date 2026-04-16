/**
 * GET /api/draw/s/[id] — retrieve a persisted standalone draw state.
 *
 * Powers the short-URL flow: /draw/present?s=<id> fetches the state
 * here instead of decoding a base64 blob from the query string.
 *
 * Returns 404 when the id doesn't exist — callers render the same
 * "invalid link" UI they already show for malformed base64. The view
 * counter is bumped on every successful read; it's informational, not
 * authoritative (no rate-limit or deduplication).
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { publicDraws, drawShowEvents } from "@/db/schema";
import { isShortId } from "@/lib/draw-show/short-id";

type Params = { id: string };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { id } = await params;
  if (!isShortId(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const [row] = await db
    .select({ state: publicDraws.state, viewCount: publicDraws.viewCount })
    .from(publicDraws)
    .where(eq(publicDraws.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Bump view count in the background; we don't care about the result
  // for the response. Any failure here is logged and swallowed.
  db.update(publicDraws)
    .set({ viewCount: sql`${publicDraws.viewCount} + 1` })
    .where(eq(publicDraws.id, id))
    .catch((e) => console.error("view_count bump failed", e));

  // Record the visit so superadmin can track funnel conversion
  // (visited → activated). Best-effort; failures don't block.
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = req.headers.get("user-agent") ?? null;
    const referrer = req.headers.get("referer") ?? null;
    const locale =
      req.headers.get("accept-language")?.split(",")[0]?.trim() ?? null;
    await db.insert(drawShowEvents).values({
      eventType: "visited",
      status: "free_standalone",
      drawId: id,
      ip,
      userAgent,
      referrer,
      locale,
    });
  } catch (e) {
    console.error("draw_show_events insert (visited) failed", e);
  }

  return NextResponse.json({ id, state: row.state, viewCount: row.viewCount });
}
