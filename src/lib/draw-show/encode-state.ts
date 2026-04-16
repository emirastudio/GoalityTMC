/**
 * Draw Show — share-URL state encoding.
 *
 * The standalone flow (/draw) keeps everything client-side: when a user
 * finishes setting up their draw, we serialize the minimum state into the
 * URL so they can share a link that reproduces the exact same show.
 *
 * Encoding: JSON → UTF-8 → base64url (RFC 4648 §5, url-safe, no padding).
 * This is the same encoding Next.js uses for cookies/OAuth state, so no
 * extra deps and it round-trips cleanly through URL params.
 *
 * Size budget: we aim to stay under ~2 KB so shared links don't break on
 * platforms with URL length limits. That's why ShareableDrawState omits
 * logos, cities, club names — only names + country codes survive.
 */

import type { ShareableDrawState } from "./types";

const SCHEMA_VERSION = 1 as const;

/**
 * Encode state for inclusion in a URL query param.
 *
 * Works in both browser (atob/btoa) and Node (Buffer) — the helpers below
 * pick the right primitive. Don't pre-compress: payloads this small aren't
 * worth the LZ library and base64 already handles the character set.
 */
export function encodeDrawState(state: ShareableDrawState): string {
  if (state.v !== SCHEMA_VERSION) {
    throw new Error(
      `encodeDrawState: unsupported schema version ${state.v}; expected ${SCHEMA_VERSION}`,
    );
  }
  const json = JSON.stringify(state);
  return base64urlEncode(json);
}

/**
 * Decode + validate a share-URL state string. Returns null on any failure
 * (malformed base64, bad JSON, wrong version, shape mismatch) so callers
 * can render a "link expired / invalid" UI rather than crashing.
 *
 * Do NOT throw — this runs on user-supplied URL params, which are
 * attacker-controlled. Always fail soft.
 */
export function decodeDrawState(encoded: string): ShareableDrawState | null {
  try {
    const json = base64urlDecode(encoded);
    const parsed = JSON.parse(json) as unknown;
    if (!isShareableDrawState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  base64url ↔ UTF-8 string
// ─────────────────────────────────────────────────────────────────────────

function base64urlEncode(input: string): string {
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(input, "utf-8").toString("base64")
      : // Browser: btoa needs a binary string, so encode UTF-8 bytes first.
        btoa(
          String.fromCharCode(...new TextEncoder().encode(input)),
        );
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(input: string): string {
  // Restore padding and non-url-safe characters so the standard decoder
  // accepts it.
  const padded = input
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(input.length / 4) * 4, "=");

  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf-8");
  }
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ─────────────────────────────────────────────────────────────────────────
//  Shape validation
//
//  Hand-rolled instead of reaching for Zod — this module has exactly one
//  shape to check and we want zero extra dependencies in the shared engine.
// ─────────────────────────────────────────────────────────────────────────

function isShareableDrawState(value: unknown): value is ShareableDrawState {
  if (!isRecord(value)) return false;
  if (value.v !== SCHEMA_VERSION) return false;

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
  if (typeof config.seed !== "string") return false;
  if (
    config.groupCount !== undefined &&
    (typeof config.groupCount !== "number" || config.groupCount < 2)
  ) {
    return false;
  }

  const teams = value.teams;
  if (!Array.isArray(teams)) return false;
  if (teams.length < 2) return false;
  for (const t of teams) {
    if (!isRecord(t)) return false;
    if (typeof t.id !== "string" || !t.id) return false;
    if (typeof t.name !== "string" || !t.name) return false;
    if (
      t.countryCode !== undefined &&
      t.countryCode !== null &&
      typeof t.countryCode !== "string"
    ) {
      return false;
    }
    if (
      t.logoUrl !== undefined &&
      t.logoUrl !== null &&
      typeof t.logoUrl !== "string"
    ) {
      return false;
    }
    if (
      t.pot !== undefined &&
      t.pot !== null &&
      typeof t.pot !== "number"
    ) {
      return false;
    }
  }

  // Branding block is optional; when present, each field is a string.
  if (value.branding !== undefined) {
    if (!isRecord(value.branding)) return false;
    for (const key of ["tournamentName", "divisionName", "logoUrl"] as const) {
      const v = (value.branding as Record<string, unknown>)[key];
      if (v !== undefined && typeof v !== "string") return false;
    }
  }

  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
