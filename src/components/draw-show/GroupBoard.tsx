"use client";

/**
 * GroupBoard — the grid of groups that fills up as the draw progresses.
 *
 * Renders one column per group. Each column has:
 *   - A big letter header (A, B, C, …)
 *   - A fixed number of slot placeholders (count = group size)
 *   - Teams that have been "placed" so far, rendered via <TeamCard variant="slot">
 *
 * The component receives the FULL final layout plus a set of team ids
 * already revealed. Non-revealed slots show as empty placeholders so the
 * audience sees the target capacity of each group (keeps tension — "Group
 * D still has 2 open slots").
 */

import { motion, AnimatePresence } from "framer-motion";
import { TeamCard } from "./TeamCard";
import type { DrawInputTeam } from "@/lib/draw-show/types";

type Props = {
  /** Final group layout: groups[g][slot] = team. Never changes during a show. */
  groups: DrawInputTeam[][];
  /** Team ids that have been revealed so far. */
  revealedTeamIds: ReadonlySet<string>;
  /**
   * Build the layoutId used by <TeamCard> — must match what the spotlight
   * passes so framer-motion animates the morph between the two.
   */
  layoutIdFor: (teamId: string) => string;
  /**
   * Translated label prefix for the group letter row (e.g. "Group"). The
   * letter itself (A, B, …) is computed locally so translation stays
   * decoupled from the A-Z sequence.
   */
  groupLabel: string;
  /**
   * The group index that should pulse/highlight — usually the one receiving
   * the current spotlight team. Pass `null` when nothing is being revealed.
   */
  activeGroupIndex: number | null;
};

export function GroupBoard({
  groups,
  revealedTeamIds,
  layoutIdFor,
  groupLabel,
  activeGroupIndex,
}: Props) {
  if (groups.length === 0) return null;

  // Responsive column count: target ~4 columns on wide screens, fewer when
  // there are fewer groups. This keeps cards readable at typical presenter
  // widths (1080p / 4K).
  const cols = Math.min(groups.length, 4);
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  }[cols] ?? "grid-cols-4";

  return (
    <div className={`relative grid ${gridCols} gap-4 w-full max-w-6xl mx-auto`}>
      {groups.map((teams, gi) => {
        const letter = String.fromCharCode(65 + gi);
        const isActive = activeGroupIndex === gi;
        return (
          <motion.div
            key={gi}
            animate={{
              scale: isActive ? 1.02 : 1,
              transition: { type: "spring", stiffness: 260, damping: 22 },
            }}
            className="relative rounded-2xl p-3 flex flex-col"
            style={{
              background: isActive
                ? "rgba(43,254,186,0.08)"
                : "rgba(255,255,255,0.035)",
              border: `1px solid ${
                isActive ? "rgba(43,254,186,0.45)" : "rgba(255,255,255,0.07)"
              }`,
              boxShadow: isActive
                ? "0 0 40px -8px rgba(43,254,186,0.4)"
                : undefined,
            }}
          >
            {/* Group letter header */}
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-baseline gap-2">
                <span
                  className="text-2xl font-black leading-none"
                  style={{ color: isActive ? "#2BFEBA" : "#f5f7fb" }}
                >
                  {letter}
                </span>
                <span
                  className="text-[11px] font-semibold uppercase tracking-widest"
                  style={{ color: "rgba(245,247,251,0.45)" }}
                >
                  {groupLabel}
                </span>
              </div>
              <span
                className="text-xs font-bold tabular-nums"
                style={{ color: "rgba(245,247,251,0.5)" }}
              >
                {teams.filter((t) => revealedTeamIds.has(t.id)).length}/
                {teams.length}
              </span>
            </div>

            {/* Slots */}
            <div className="space-y-1.5">
              {teams.map((team, si) => {
                const revealed = revealedTeamIds.has(team.id);
                return (
                  <div key={`${gi}-${si}`} className="min-h-[38px]">
                    <AnimatePresence mode="popLayout">
                      {revealed ? (
                        <TeamCard
                          key="placed"
                          team={team}
                          variant="slot"
                          layoutId={layoutIdFor(team.id)}
                        />
                      ) : (
                        <EmptySlot key="empty" />
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function EmptySlot() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="rounded-xl px-2.5 py-2 flex items-center"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px dashed rgba(255,255,255,0.08)",
        minHeight: 38,
      }}
    >
      <div
        className="w-6 h-6 rounded-md shrink-0"
        style={{ background: "rgba(255,255,255,0.04)" }}
      />
    </motion.div>
  );
}
