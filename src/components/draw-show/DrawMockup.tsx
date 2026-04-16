"use client";

/**
 * DrawMockup — decorative auto-playing preview of Draw Show for the
 * landing page. Not interactive — cycles through a small set of fake
 * team reveals on repeat so visitors see what the real show feels like
 * without having to click through the wizard first.
 *
 * Uses the same cinema palette and framer-motion primitives as the
 * real DrawStage so the preview and the product look like one thing.
 * Deliberately smaller and card-shaped (not fullscreen) so it fits in
 * the hero layout.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

// Fake-but-plausible team list. Sixteen teams → four groups of four —
// the classic UEFA group-stage shape, and visually dense enough to
// fill the hero mockup without awkward empty space in the middle.
const DEMO_TEAMS = [
  { name: "Ajax Juniors",   flag: "🇳🇱", group: 0, color: "#ef4444" },
  { name: "FC Barcelona",   flag: "🇪🇸", group: 1, color: "#3b82f6" },
  { name: "Bayern U15",     flag: "🇩🇪", group: 2, color: "#f59e0b" },
  { name: "AC Milano",      flag: "🇮🇹", group: 3, color: "#10b981" },
  { name: "Porto Academy",  flag: "🇵🇹", group: 0, color: "#8b5cf6" },
  { name: "PSG Jeunes",     flag: "🇫🇷", group: 1, color: "#ec4899" },
  { name: "Celtic FC",      flag: "🇬🇧", group: 2, color: "#06b6d4" },
  { name: "Benfica U15",    flag: "🇵🇹", group: 3, color: "#f97316" },
  { name: "Juventus Next",  flag: "🇮🇹", group: 0, color: "#64748b" },
  { name: "Man City EDS",   flag: "🇬🇧", group: 1, color: "#0ea5e9" },
  { name: "Real Madrid C",  flag: "🇪🇸", group: 2, color: "#a855f7" },
  { name: "Dortmund U15",   flag: "🇩🇪", group: 3, color: "#facc15" },
  { name: "Feyenoord Jr",   flag: "🇳🇱", group: 0, color: "#14b8a6" },
  { name: "Lyon OL Jeunes", flag: "🇫🇷", group: 1, color: "#dc2626" },
  { name: "Sporting CP",    flag: "🇵🇹", group: 2, color: "#22c55e" },
  { name: "Inter Milano",   flag: "🇮🇹", group: 3, color: "#1e40af" },
];

// Keep the whole cycle under ~20s so visitors see a "complete"
// moment and a restart without scrolling away.
const REVEAL_MS = 900;
const PAUSE_AT_END_MS = 2400;

export function DrawMockup() {
  // step = how many teams revealed so far (0..DEMO_TEAMS.length).
  // When it reaches the end we pause briefly on the "complete" state,
  // then reset. spotlightIdx = the team currently in the center, or -1
  // between reveals.
  const [step, setStep] = useState(0);
  const [spotlight, setSpotlight] = useState(true);

  useEffect(() => {
    if (step >= DEMO_TEAMS.length) {
      const t = window.setTimeout(() => {
        setStep(0);
        setSpotlight(true);
      }, PAUSE_AT_END_MS);
      return () => window.clearTimeout(t);
    }

    // Two-phase loop: spotlight visible for most of the cycle, then a
    // brief gap before advancing — same rhythm as the real stage.
    const showT = window.setTimeout(() => setSpotlight(false), REVEAL_MS - 250);
    const nextT = window.setTimeout(() => {
      setStep((s) => s + 1);
      setSpotlight(true);
    }, REVEAL_MS);
    return () => {
      window.clearTimeout(showT);
      window.clearTimeout(nextT);
    };
  }, [step]);

  const currentTeam = step < DEMO_TEAMS.length ? DEMO_TEAMS[step] : null;

  return (
    // 16:7.5-ish aspect matches what the real fullscreen stage feels
    // like (header + groups + controls strip) without leaving empty
    // space in the middle that the 16:9 version had with only 8 teams.
    <div
      className="relative mx-auto max-w-5xl rounded-3xl overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #05080f 0%, #0b1122 50%, #05080f 100%)",
        border: "1px solid rgba(43,254,186,0.2)",
        boxShadow: "0 24px 80px -20px rgba(43,254,186,0.3)",
        aspectRatio: "16 / 10",
      }}
    >
      {/* Ambient mint spotlight from top — echoes the real stage. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(43,254,186,0.25) 0%, transparent 55%)",
        }}
      />

      {/* Fake chrome: logo + "TOURNAMENT DRAW · DEMO". */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3.5 z-10">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "#2BFEBA", color: "#05080f" }}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p
              className="text-[9px] font-bold uppercase tracking-widest"
              style={{ color: "rgba(245,247,251,0.55)" }}
            >
              Tournament Draw
            </p>
            <p
              className="text-xs font-black leading-tight"
              style={{ color: "#f5f7fb" }}
            >
              Demo Cup · U14
            </p>
          </div>
        </div>
        <span
          className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md"
          style={{
            background: "rgba(43,254,186,0.12)",
            color: "#2BFEBA",
          }}
        >
          Live
        </span>
      </div>

      {/* Groups grid: four groups, four slots each — matches the most
          common real-world tournament shape (UEFA-style). Groups grow
          to fill the available vertical space below the header, so
          there's no dead zone in the middle of the card. */}
      <div className="absolute top-14 bottom-6 left-0 right-0 px-5 grid grid-cols-4 gap-2.5">
        {[0, 1, 2, 3].map((gi) => {
          const placed = DEMO_TEAMS
            .slice(0, step)
            .filter((team) => team.group === gi);
          const groupTeams = DEMO_TEAMS.filter((team) => team.group === gi);
          return (
            <div
              key={gi}
              className="rounded-xl p-2.5 flex flex-col"
              style={{
                background:
                  currentTeam?.group === gi && spotlight
                    ? "rgba(43,254,186,0.08)"
                    : "rgba(255,255,255,0.03)",
                border:
                  currentTeam?.group === gi && spotlight
                    ? "1px solid rgba(43,254,186,0.4)"
                    : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-baseline justify-between gap-1 mb-2 px-0.5">
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-lg font-black leading-none"
                    style={{
                      color:
                        currentTeam?.group === gi && spotlight
                          ? "#2BFEBA"
                          : "#f5f7fb",
                    }}
                  >
                    {String.fromCharCode(65 + gi)}
                  </span>
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: "rgba(245,247,251,0.5)" }}
                  >
                    Grp
                  </span>
                </div>
                <span
                  className="text-[10px] font-bold tabular-nums"
                  style={{ color: "rgba(245,247,251,0.45)" }}
                >
                  {placed.length}/{groupTeams.length}
                </span>
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                {placed.map((team, i) => (
                  <motion.div
                    key={`${gi}-${i}-${team.name}`}
                    layoutId={`mockup-team-${team.name}`}
                    transition={{ type: "spring", stiffness: 220, damping: 28 }}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1.5"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-black text-white shrink-0"
                      style={{ background: team.color }}
                    >
                      {team.name[0]}
                    </div>
                    <span
                      className="text-[11px] font-semibold truncate flex-1"
                      style={{ color: "#f5f7fb" }}
                    >
                      {team.name}
                    </span>
                    <span className="text-[10px] shrink-0">{team.flag}</span>
                  </motion.div>
                ))}
                {/* Filler empty slots so group height is stable. */}
                {Array.from({ length: Math.max(0, groupTeams.length - placed.length) }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex-1 min-h-[22px] rounded-md"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px dashed rgba(255,255,255,0.07)",
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Spotlight overlay — centered vertically over the groups so
          the big "team leaving the urn" card is the focal point. */}
      <div className="absolute inset-x-0 top-14 bottom-6 flex items-center justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          {currentTeam && spotlight && (
            <motion.div
              key={`spot-${step}`}
              layoutId={`mockup-team-${currentTeam.name}`}
              transition={{ type: "spring", stiffness: 200, damping: 24 }}
              className="flex items-center gap-3.5 rounded-2xl px-6 py-4"
              style={{
                background:
                  "linear-gradient(135deg, rgba(43,254,186,0.2), rgba(43,254,186,0.04))",
                border: "1px solid rgba(43,254,186,0.55)",
                boxShadow:
                  "0 20px 60px -10px rgba(43,254,186,0.5), 0 0 100px -20px rgba(43,254,186,0.5)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black text-white shrink-0"
                style={{ background: currentTeam.color }}
              >
                {currentTeam.name[0]}
              </div>
              <div className="flex flex-col gap-0.5">
                <span
                  className="text-base md:text-lg font-black leading-tight"
                  style={{ color: "#f5f7fb" }}
                >
                  {currentTeam.name}
                </span>
                <span
                  className="text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1"
                  style={{ color: "#2BFEBA" }}
                >
                  <span className="text-sm leading-none">{currentTeam.flag}</span>
                  → group {String.fromCharCode(65 + currentTeam.group)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress strip at very bottom. */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <motion.div
          className="h-full"
          style={{
            background:
              "linear-gradient(90deg, #2BFEBA, rgba(43,254,186,0.5))",
          }}
          animate={{ width: `${(step / DEMO_TEAMS.length) * 100}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 28 }}
        />
      </div>
    </div>
  );
}
