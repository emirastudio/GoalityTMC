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
  /**
   * Stable layoutId tying spotlight and slot renders of the same team
   * together so framer-motion animates between them. Usually
   * `team-${team.id}` but the parent controls it to avoid collisions
   * when a team could theoretically appear twice in the same draw.
   */
  layoutId: string;
};

export function TeamCard({ team, variant, layoutId }: Props) {
  if (variant === "spotlight") return <Spotlight team={team} layoutId={layoutId} />;
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

function Spotlight({ team, layoutId }: { team: DrawInputTeam; layoutId: string }) {
  const flag = flagFromCode(team.countryCode);
  // Note on exit: we DON'T declare an exit variant here. The slot card
  // that takes over uses the same layoutId, so framer-motion runs a
  // shared-layout morph (center→slot). Adding an opacity/scale exit on
  // top of that produces two conflicting animations and visually
  // manifests as a "ghost" double-render. Shared layout alone is
  // cleaner: the big card shrinks and flies into its slot in one tween.
  return (
    <motion.div
      layoutId={layoutId}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className="relative flex items-center gap-5 rounded-3xl px-8 py-6"
      style={{
        background:
          "linear-gradient(135deg, rgba(43,254,186,0.16), rgba(43,254,186,0.04))",
        border: "1px solid rgba(43,254,186,0.45)",
        boxShadow:
          "0 20px 60px -10px rgba(43,254,186,0.35), 0 0 120px -20px rgba(43,254,186,0.5)",
        backdropFilter: "blur(10px)",
      }}
    >
      {/* Pulsing halo behind the card */}
      <motion.div
        aria-hidden
        className="absolute -inset-6 rounded-[2rem] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(43,254,186,0.28) 0%, transparent 70%)",
        }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />

      <BadgeLarge team={team} />

      <div className="relative flex-1 min-w-0">
        {team.clubName && team.clubName !== team.name && (
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-1 truncate"
            style={{ color: "rgba(245,247,251,0.55)" }}
          >
            {team.clubName}
          </p>
        )}
        <p
          className="text-4xl font-black leading-tight truncate"
          style={{ color: "#f5f7fb" }}
        >
          {team.name}
        </p>
        {(flag || team.city) && (
          <p
            className="text-sm font-semibold mt-1.5 flex items-center gap-2"
            style={{ color: "rgba(245,247,251,0.7)" }}
          >
            {flag && <span className="text-xl">{flag}</span>}
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
        className="relative w-24 h-24 rounded-2xl object-cover shrink-0"
        style={{ border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.04)" }}
      />
    );
  }
  return (
    <div
      className="relative w-24 h-24 rounded-2xl flex items-center justify-center shrink-0 text-3xl font-black"
      style={{
        background: fallbackBadgeColor(team.id),
        color: "#ffffff",
        textShadow: "0 2px 4px rgba(0,0,0,0.3)",
      }}
    >
      {initials(team.name)}
    </div>
  );
}

// ─── Slot variant (compact, inside a group) ────────────────────────────

function Slot({ team, layoutId }: { team: DrawInputTeam; layoutId: string }) {
  const flag = flagFromCode(team.countryCode);
  // No initial/animate props: the matching layoutId on the incoming
  // spotlight drives a single shared-layout tween into this slot. Any
  // extra opacity/scale animation here fights that tween and causes a
  // double-render "ghost" mid-transition (observed in QA).
  return (
    <motion.div
      layoutId={layoutId}
      transition={{ type: "spring", stiffness: 240, damping: 28 }}
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
