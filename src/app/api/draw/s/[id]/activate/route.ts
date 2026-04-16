/**
 * POST /api/draw/s/[id]/activate
 *
 * Fired by the stage component when the show actually starts (after
 * the 5..4..3..2..1..GO intro hands off to the first reveal). Records
 * an "activated" entry in draw_show_events so superadmin can see how
 * many created links actually got run vs abandoned at the wizard.
 *
 * Best-effort fire-and-forget: returns 204 even when nothing was
 * inserted. The client should not block UX on this call.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { drawShowEvents } from "@/db/schema";
import { isShortId } from "@/lib/draw-show/short-id";

type Params = { id: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { id } = await params;
  if (!isShortId(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = req.headers.get("user-agent") ?? null;
    const referrer = req.headers.get("referer") ?? null;
    const locale =
      req.headers.get("accept-language")?.split(",")[0]?.trim() ?? null;
    await db.insert(drawShowEvents).values({
      eventType: "activated",
      status: "free_standalone",
      drawId: id,
      ip,
      userAgent,
      referrer,
      locale,
    });
  } catch (e) {
    console.error("draw_show_events insert (activated) failed", e);
  }

  return new NextResponse(null, { status: 204 });
}
