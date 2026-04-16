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

// Slower, more cinematic cadence so each reveal has a clear "appear ·
// breathe · fly away" arc rather than feeling like a flipbook. Visitors
// still see a full loop in ~25 s which is fine for an auto-playing hero.
const REVEAL_MS = 1500;
const GAP_MS = 250;
const PAUSE_AT_END_MS = 2800;

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

    // Three-phase loop so each card has space to breathe:
    //   1. spotlight appears and holds for REVEAL_MS
    //   2. spotlight exits (handled by AnimatePresence below)
    //   3. GAP_MS pause before the next step mounts
    // This avoids the "flip-book" feel the old 900 ms cadence had.
    const hideT = window.setTimeout(() => setSpotlight(false), REVEAL_MS);
    const nextT = window.setTimeout(() => {
      setStep((s) => s + 1);
      setSpotlight(true);
    }, REVEAL_MS + GAP_MS);
    return () => {
      window.clearTimeout(hideT);
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

      {/* Spotlight overlay — centered vertically over the groups. Big,
          glowing card with a pulse ring on enter and a "swoosh toward
          the target group" on exit so the visitor's eye naturally
          follows where the team is headed. */}
      <div className="absolute inset-x-0 top-14 bottom-6 flex items-center justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          {currentTeam && spotlight && (
            <motion.div
              key={`spot-${step}`}
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{
                // Swoosh toward the target group (left/right half).
                // Mockup has 4 groups in one row, so direction is
                // simply signed distance from centre normalised.
                opacity: 0,
                scale: 0.3,
                x: ((currentTeam.group - 1.5) / 1.5) * 180,
                y: -120,
                rotate: ((currentTeam.group - 1.5) / 1.5) * 6,
                transition: { duration: 0.5, ease: [0.6, 0, 0.4, 1] },
              }}
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
              className="relative flex items-center gap-4 rounded-3xl px-7 md:px-9 py-5 md:py-6"
              style={{
                background:
                  "linear-gradient(135deg, rgba(43,254,186,0.22), rgba(43,254,186,0.04))",
                border: "1px solid rgba(43,254,186,0.6)",
                boxShadow:
                  "0 24px 70px -12px rgba(43,254,186,0.55), 0 0 140px -25px rgba(43,254,186,0.6)",
                backdropFilter: "blur(10px)",
              }}
            >
              {/* Pulse ring on enter — single sweep */}
              <motion.div
                aria-hidden
                className="absolute inset-0 rounded-3xl pointer-events-none"
                initial={{ boxShadow: "0 0 0 0 rgba(43,254,186,0.6)" }}
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(43,254,186,0.6)",
                    "0 0 0 36px rgba(43,254,186,0)",
                  ],
                }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
              <div
                className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-black text-white shrink-0"
                style={{
                  background: currentTeam.color,
                  boxShadow: "0 10px 28px -6px rgba(0,0,0,0.45)",
                }}
              >
                {currentTeam.name[0]}
              </div>
              <div className="flex flex-col gap-1">
                <span
                  className="text-xl md:text-2xl font-black leading-tight"
                  style={{
                    color: "#f5f7fb",
                    letterSpacing: "-0.02em",
                    textShadow: "0 0 30px rgba(43,254,186,0.3)",
                  }}
                >
                  {currentTeam.name}
                </span>
                <span
                  className="text-[11px] md:text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1.5"
                  style={{ color: "#2BFEBA" }}
                >
                  <span className="text-base leading-none">{currentTeam.flag}</span>
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
