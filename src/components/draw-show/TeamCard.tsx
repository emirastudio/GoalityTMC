"use client";

/**
 * TeamCard — a single team row shown on the draw stage, in either the
 * center "spotlight" (large, glowing, the team currently being revealed)
 * or a compact "slot" within a group column.
 *
 * Both variants share a `layoutId` so framer-motion smoothly animates the
 * morph when the same team transitions from spotlight → slot. That's the
 * "team flies from the urn into its group" effect.
 *
 * Pure presentation. No state, no translations (labels come from parent).
 */

import { motion } from "framer-motion";
import type { DrawInputTeam } from "@/lib/draw-show/types";

type Variant = "spotlight" | "slot";

type Props = {
  team: DrawInputTeam;
  variant: Variant;
  /** Legacy layoutId — see comments inside Spotlight/Slot for why it's unused. */
  layoutId: string;
  /**
   * Spotlight-only: horizontal exit direction hint (-1..+1). Passed to
   * the exit transform so the card "flies" toward its target group.
   * Ignored for the slot variant.
   */
  exitDirection?: number;
};

export function TeamCard({ team, variant, layoutId, exitDirection }: Props) {
  if (variant === "spotlight")
    return <Spotlight team={team} layoutId={layoutId} exitDirection={exitDirection} />;
  return <Slot team={team} layoutId={layoutId} />;
}

/** Convert ISO 3166-1 alpha-2 (e.g. "EE") to its regional flag emoji. */
function flagFromCode(code: string | null | undefined): string | null {
  if (!code || code.length !== 2) return null;
  const upper = code.toUpperCase();
  // Regional Indicator Symbol offset: 'A' (0x41) → U+1F1E6.
  const A = 0x41;
  const BASE = 0x1f1e6;
  const first = upper.charCodeAt(0);
  const second = upper.charCodeAt(1);
  if (first < A || first > A + 25 || second < A || second > A + 25) return null;
  return (
    String.fromCodePoint(BASE + (first - A)) +
    String.fromCodePoint(BASE + (second - A))
  );
}

/**
 * Fallback badge when a team has no logo: colored circle with the first
 * two letters of the name. Color is derived deterministically from the
 * team id so the same team always gets the same color across sessions.
 */
function fallbackBadgeColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] ?? "").join("").toUpperCase() || "?";
}

// ─── Spotlight variant ─────────────────────────────────────────────────

function Spotlight({
  team,
  layoutId: _layoutId,
  exitDirection = 0,
}: {
  team: DrawInputTeam;
  layoutId: string;
  /**
   * Horizontal hint for the "fly-away" exit (−1 far left, 0 center,
   * +1 far right). Caller computes this from the target group's
   * position on the board so the card swooshes toward its destination.
   */
  exitDirection?: number;
}) {
  const flag = flagFromCode(team.countryCode);
  // Large, glowing hero: 150×150 badge, 6xl name, pulse rings, sparkle
  // burst on enter. The exit translates the card toward `exitDirection`
  // so it reads as "flying into the group" without the shared-layout
  // artifacts of the old approach.
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{
        opacity: 0,
        scale: 0.25,
        x: exitDirection * 260,
        y: -140,
        rotate: exitDirection * 8,
        transition: { duration: 0.55, ease: [0.6, 0, 0.4, 1] },
      }}
      transition={{ type: "spring", stiffness: 180, damping: 22 }}
      className="relative flex items-center gap-7 rounded-[2rem] px-10 md:px-14 py-8 md:py-10"
      style={{
        background:
          "linear-gradient(135deg, rgba(43,254,186,0.22), rgba(43,254,186,0.04))",
        border: "1px solid rgba(43,254,186,0.55)",
        boxShadow:
          "0 28px 80px -12px rgba(43,254,186,0.5), 0 0 160px -30px rgba(43,254,186,0.6)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Expanding halo — one big breath behind the card */}
      <motion.div
        aria-hidden
        className="absolute -inset-10 rounded-[3rem] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(43,254,186,0.32) 0%, transparent 70%)",
        }}
        animate={{
          opacity: [0.55, 1, 0.55],
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Double ring sweep — triggers once on enter */}
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-[2rem] pointer-events-none"
        initial={{ boxShadow: "0 0 0 0 rgba(43,254,186,0.55)" }}
        animate={{
          boxShadow: [
            "0 0 0 0 rgba(43,254,186,0.55)",
            "0 0 0 40px rgba(43,254,186,0)",
          ],
        }}
        transition={{ duration: 1.4, ease: "easeOut" }}
      />

      <BadgeLarge team={team} />

      <div className="relative flex-1 min-w-0">
        {team.clubName && team.clubName !== team.name && (
          <p
            className="text-sm font-semibold uppercase tracking-widest mb-2 truncate"
            style={{ color: "rgba(245,247,251,0.55)" }}
          >
            {team.clubName}
          </p>
        )}
        <p
          className="text-5xl md:text-6xl font-black leading-tight truncate"
          style={{
            color: "#f5f7fb",
            textShadow: "0 0 40px rgba(43,254,186,0.35)",
            letterSpacing: "-0.02em",
          }}
        >
          {team.name}
        </p>
        {(flag || team.city) && (
          <p
            className="text-base md:text-lg font-semibold mt-2.5 flex items-center gap-2.5"
            style={{ color: "rgba(245,247,251,0.75)" }}
          >
            {flag && <span className="text-2xl leading-none">{flag}</span>}
            {team.city && <span>{team.city}</span>}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function BadgeLarge({ team }: { team: DrawInputTeam }) {
  if (team.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={team.logoUrl}
        alt=""
        className="relative w-32 h-32 md:w-40 md:h-40 rounded-3xl object-cover shrink-0"
        style={{
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.04)",
          boxShadow: "0 12px 32px -8px rgba(0,0,0,0.4)",
        }}
      />
    );
  }
  return (
    <div
      className="relative w-32 h-32 md:w-40 md:h-40 rounded-3xl flex items-center justify-center shrink-0 text-5xl md:text-6xl font-black"
      style={{
        background: fallbackBadgeColor(team.id),
        color: "#ffffff",
        textShadow: "0 3px 8px rgba(0,0,0,0.4)",
        boxShadow: "0 12px 32px -8px rgba(0,0,0,0.4)",
      }}
    >
      {initials(team.name)}
    </div>
  );
}

// ─── Slot variant (compact, inside a group) ────────────────────────────

function Slot({ team, layoutId: _layoutId }: { team: DrawInputTeam; layoutId: string }) {
  const flag = flagFromCode(team.countryCode);
  // Simple fade-in-from-above: gives the slot a clear "I just landed"
  // feel without trying to morph from the spotlight's very different
  // layout. `_layoutId` kept for prop-signature parity with the old
  // shared-layout implementation.
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
      className="flex items-center gap-2 rounded-xl px-2.5 py-2"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <BadgeSmall team={team} />
      <span
        className="flex-1 text-sm font-semibold truncate"
        style={{ color: "#f5f7fb" }}
      >
        {team.name}
      </span>
      {flag && <span className="text-base shrink-0">{flag}</span>}
    </motion.div>
  );
}

function BadgeSmall({ team }: { team: DrawInputTeam }) {
  if (team.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={team.logoUrl}
        alt=""
        className="w-6 h-6 rounded-md object-cover shrink-0"
        style={{ background: "rgba(255,255,255,0.06)" }}
      />
    );
  }
  return (
    <div
      className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black shrink-0"
      style={{ background: fallbackBadgeColor(team.id), color: "#fff" }}
    >
      {initials(team.name)}
    </div>
  );
}
