import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { drawShowEvents } from "@/db/schema";

const ALLOWED_EVENTS = ["wizard_start", "promo_applied", "purchase_intent"] as const;
type TrackEvent = (typeof ALLOWED_EVENTS)[number];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventType = body.eventType as TrackEvent;
    if (!ALLOWED_EVENTS.includes(eventType)) {
      return NextResponse.json({ error: "invalid event" }, { status: 400 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null;

    await db.insert(drawShowEvents).values({
      eventType,
      status: "free_standalone",
      drawId: body.drawId ?? null,
      email: null,
      promoCode: body.promoCode ?? null,
      ip,
      userAgent: req.headers.get("user-agent") ?? null,
      referrer: req.headers.get("referer") ?? null,
      locale: body.locale ?? null,
      meta: body.meta ?? {},
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
