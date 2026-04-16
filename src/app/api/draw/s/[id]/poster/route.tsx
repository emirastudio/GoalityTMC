/**
 * GET /api/draw/s/[id]/poster — generate a 1080×1920 vertical PNG
 * (Instagram / Facebook / Telegram story format) advertising a draw.
 *
 * Layout:
 *   • Eyebrow chip ("PREMIERE" with countdown OR "LIVE NOW")
 *   • Tournament name (huge)
 *   • Optional division line + team count
 *   • Premiere date/time when scheduled
 *   • Big mint CTA card with the share URL
 *   • Goality TMC brand at the bottom
 *
 * Rendered server-side via Next.js's built-in next/og (Satori). No
 * client work — the user just downloads the PNG and posts to a
 * story.
 *
 * Cached for 5 minutes per id. Stale repeats are fine — the share
 * link doesn't change once the draw is created.
 */

import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";
import { db } from "@/db";
import { publicDraws } from "@/db/schema";
import { isShortId } from "@/lib/draw-show/short-id";

export const runtime = "nodejs";

type Params = { id: string };

type Branding = {
  tournamentName?: string;
  divisionName?: string;
  logoUrl?: string;
};

type StoredState = {
  v: number;
  config: { mode: string; groupCount?: number };
  teams: { id: string; name: string }[];
  branding?: Branding;
  scheduledAt?: string;
  scheduledAtTz?: string;
};

const W = 1080;
const H = 1920;

export async function GET(
  req: Request,
  { params }: { params: Promise<Params> },
) {
  const { id } = await params;
  if (!isShortId(id)) {
    return new Response("invalid_id", { status: 400 });
  }

  const [row] = await db
    .select({ state: publicDraws.state })
    .from(publicDraws)
    .where(eq(publicDraws.id, id))
    .limit(1);

  if (!row) {
    return new Response("not_found", { status: 404 });
  }

  const state = row.state as StoredState;
  const branding = state.branding ?? {};
  const tournamentName = branding.tournamentName?.trim() || "Tournament Draw";
  const division = branding.divisionName?.trim();
  const logoUrl = absolutizeLogo(req.url, branding.logoUrl);
  const teamCount = state.teams.length;

  // Premiere chip — three states:
  //   • scheduled in the future → "PREMIERE in 3d 12h" countdown
  //   • scheduled in the past   → "LIVE NOW"
  //   • not scheduled           → "LIVE NOW"
  const now = Date.now();
  const scheduledMs = state.scheduledAt ? Date.parse(state.scheduledAt) : null;
  const isFuture = scheduledMs != null && scheduledMs > now;
  const eyebrowChip = isFuture ? formatCountdown(scheduledMs - now) : "LIVE NOW";

  const dateLabel =
    isFuture && scheduledMs != null
      ? formatDate(scheduledMs, state.scheduledAtTz)
      : null;

  const presentUrl = absoluteUrl(req.url, `/en/draw/present?s=${id}`);
  const shortShareLabel = presentUrl
    .replace(/^https?:\/\//, "")
    .replace(/\/en\/draw\/present\?s=/, "/draw/s/");

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #05080f 0%, #0b1122 50%, #05080f 100%)",
          color: "#f5f7fb",
          fontFamily: "Inter, sans-serif",
          padding: 80,
          position: "relative",
        }}
      >
        {/* Mint glow on top */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 0%, rgba(43,254,186,0.22) 0%, transparent 55%)",
          }}
        />

        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 40,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "16px 32px",
              borderRadius: 999,
              background: "rgba(43,254,186,0.16)",
              border: "2px solid rgba(43,254,186,0.55)",
              color: "#2BFEBA",
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            {isFuture ? "PREMIERE" : "LIVE NOW"} · {eyebrowChip}
          </div>
        </div>

        {/* Optional logo */}
        {logoUrl && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: 80,
              position: "relative",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt=""
              width={220}
              height={220}
              style={{
                borderRadius: 40,
                objectFit: "cover",
                border: "2px solid rgba(255,255,255,0.14)",
              }}
            />
          </div>
        )}

        {/* Tournament name */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 60,
            position: "relative",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: "rgba(245,247,251,0.55)",
              marginBottom: 24,
            }}
          >
            Tournament Draw
          </div>
          <div
            style={{
              fontSize: tournamentName.length > 16 ? 96 : 128,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: "#f5f7fb",
              textAlign: "center",
              maxWidth: 920,
            }}
          >
            {tournamentName}
          </div>
          {division && (
            <div
              style={{
                marginTop: 28,
                fontSize: 56,
                fontWeight: 800,
                color: "rgba(245,247,251,0.7)",
              }}
            >
              {division}
            </div>
          )}
        </div>

        {/* Scheduled date / team count */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 60,
            gap: 24,
            position: "relative",
          }}
        >
          {dateLabel && (
            <div
              style={{
                display: "flex",
                fontSize: 40,
                fontWeight: 700,
                color: "#f5f7fb",
              }}
            >
              📅 {dateLabel}
            </div>
          )}
          <div
            style={{
              display: "flex",
              fontSize: 36,
              fontWeight: 600,
              color: "rgba(245,247,251,0.6)",
            }}
          >
            {teamCount} teams · {labelForMode(state.config.mode, state.config.groupCount)}
          </div>
        </div>

        {/* Spacer pushes the CTA + brand to the bottom */}
        <div style={{ flex: 1 }} />

        {/* CTA — share URL */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "32px 56px",
              borderRadius: 32,
              background:
                "linear-gradient(135deg, rgba(43,254,186,0.2), rgba(43,254,186,0.04))",
              border: "2px solid rgba(43,254,186,0.55)",
              color: "#2BFEBA",
              fontSize: 44,
              fontWeight: 900,
              letterSpacing: 0.5,
            }}
          >
            🎬 {shortShareLabel}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontSize: 28,
              fontWeight: 600,
              color: "rgba(245,247,251,0.55)",
            }}
          >
            {isFuture ? "Tap the link to watch live" : "Tap to watch the show"}
          </div>
        </div>

        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            position: "relative",
            color: "rgba(245,247,251,0.5)",
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          ✨ Made with{" "}
          <span style={{ color: "#f5f7fb", fontWeight: 900 }}>Goality TMC</span>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    },
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function absoluteUrl(reqUrl: string, path: string): string {
  try {
    const u = new URL(reqUrl);
    return `${u.origin}${path}`;
  } catch {
    return path;
  }
}

function absolutizeLogo(reqUrl: string, logoUrl?: string): string | null {
  if (!logoUrl) return null;
  if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
  // Relative path stored by the uploader → resolve against request origin.
  return absoluteUrl(reqUrl, logoUrl.startsWith("/") ? logoUrl : `/${logoUrl}`);
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (days >= 1) return `IN ${days}d ${hours}h`;
  if (hours >= 1) return `IN ${hours}h ${minutes}m`;
  return `IN ${minutes} MIN`;
}

function formatDate(ms: number, tz?: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz || "UTC",
      timeZoneName: "short",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString();
  }
}

function labelForMode(mode: string, groupCount?: number): string {
  switch (mode) {
    case "groups":
      return groupCount ? `${groupCount} groups` : "groups";
    case "league":
      return "round-robin league";
    case "playoff":
      return "playoff bracket";
    default:
      return "draw";
  }
}
