/**
 * POST /api/draw/share — persist a ShareableDrawState and hand back a
 * short id the wizard navigates to.
 *
 * Anonymous endpoint (no auth): this backs the standalone /draw
 * product, which is meant for visitors who don't have a Goality
 * account yet. Rate-limiting is left as a TODO; v1 rides on the
 * assumption that the payload is bounded (~8 KB from the wizard) and
 * the volume is low.
 *
 * Shape validation reuses the same isShareableDrawState guard the
 * client encoder uses, so both paths agree on what a valid draw
 * looks like.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { publicDraws } from "@/db/schema";
import { generateShortId } from "@/lib/draw-show/short-id";

// Conservative cap so an abusive client can't stuff the table with
// megabyte payloads. The wizard produces a few KB at most.
const MAX_BODY_BYTES = 32 * 1024;

export async function POST(req: NextRequest) {
  // Reject oversized bodies before we even parse JSON.
  const len = req.headers.get("content-length");
  if (len && parseInt(len) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!isShareableDrawStateShape(raw)) {
    return NextResponse.json({ error: "invalid_state_shape" }, { status: 400 });
  }

  // Collision-retry a few times. With 31^6 ≈ 887M keys and current
  // volume this is paranoia, but it costs nothing.
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const id = generateShortId();
    try {
      const existing = await db
        .select({ id: publicDraws.id })
        .from(publicDraws)
        .where(eq(publicDraws.id, id))
        .limit(1);
      if (existing.length > 0) continue;
      await db.insert(publicDraws).values({ id, state: raw });
      return NextResponse.json({ id }, { status: 201 });
    } catch (e) {
      lastError = e;
    }
  }

  // We exhausted retries — surface a 500 rather than an infinite loop.
  console.error("public_draws insert failed after retries", lastError);
  return NextResponse.json({ error: "id_generation_failed" }, { status: 500 });
}

// ─── Local shape guard (mirrors client-side validation) ───────────────

function isShareableDrawStateShape(value: unknown): value is object {
  if (!isRecord(value)) return false;
  if (value.v !== 1) return false;

  const config = value.config;
  if (!isRecord(config)) return false;
  if (
    config.mode !== "groups" &&
    config.mode !== "playoff" &&
    config.mode !== "league" &&
    config.mode !== "groups-playoff"
  ) {
    return false;
  }
  if (config.seedingMode !== "random" && config.seedingMode !== "pots") {
    return false;
  }
  if (typeof config.seed !== "string" || config.seed.length === 0) return false;

  const teams = value.teams;
  if (!Array.isArray(teams)) return false;
  if (teams.length < 2 || teams.length > 128) return false;
  for (const t of teams) {
    if (!isRecord(t)) return false;
    if (typeof t.id !== "string" || t.id.length === 0) return false;
    if (typeof t.name !== "string" || t.name.length === 0) return false;
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
