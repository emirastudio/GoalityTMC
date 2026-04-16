"use client";

/**
 * DrawStage — fullscreen presentation for the tournament draw reveal.
 *
 * Responsibilities:
 *   - Lay out the stage shell (cinema palette, header, footer)
 *   - Run the reveal sequencer: spotlight a team for ~1.6s, drop it into
 *     its target slot (framer-motion layoutId morph), auto-advance to the
 *     next team
 *   - Handle keyboard shortcuts (Esc/F/Space/←/→) and auto-hiding controls
 *   - Show a "draw complete" summary when all teams are placed
 *
 * The stage palette is intentionally decoupled from the host page theme
 * (see commit d0bb1ff): real broadcasts dim the room and light the stage,
 * so we always render on a deep navy gradient regardless of light/dark
 * mode in the admin.
 *
 * Rendered via React portal to document.body so the stage stacks above
 * sidebars and modals of the host page.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Trophy,
  ArrowDown,
} from "lucide-react";
import { buildDrawPlan } from "@/lib/draw-show/engine";
import type { DrawConfig, DrawInputTeam, DrawResult } from "@/lib/draw-show/types";
import { TeamCard } from "./TeamCard";
import { GroupBoard } from "./GroupBoard";
import { PresentationControls } from "./PresentationControls";

type Props = {
  teams: DrawInputTeam[];
  config: DrawConfig;
  /** Tournament/event title shown in the stage header for context. */
  title?: string;
  /** Optional badge/logo URL shown next to the title. */
  logoUrl?: string | null;
  /** Called when the user exits the stage (Esc, X, or clicks backdrop). */
  onClose: () => void;
  /**
   * Names of teams that belong to this tournament but are NOT in any
   * group — the unassigned pool. Surfaced on the done screen so the
   * organizer knows why the total doesn't match their expectation.
   */
  unassignedTeams?: string[];
  /**
   * Grand total of teams in the division (placed + unassigned). When
   * provided, the done subtitle shows "N of M placed". When omitted,
   * falls back to the all-teams-placed phrasing.
   */
  totalTeamsCount?: number;
};

// ── Timing ─────────────────────────────────────────────────────────────
// Tuned for a live audience: long enough to read a team name, short
// enough that a 40-team draw doesn't drag. Presenters can tap → to skip.
const FIRST_SPOTLIGHT_DELAY_MS = 700;
const BETWEEN_REVEALS_MS = 350;
const SPOTLIGHT_DURATION_MS = 1700;
const CONTROLS_IDLE_MS = 1800;

export function DrawStage({
  teams,
  config,
  title,
  logoUrl,
  onClose,
  unassignedTeams,
  totalTeamsCount,
}: Props) {
  // SSR guard: portal needs document.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const t = useTranslations("drawShow");
  const rootRef = useRef<HTMLDivElement>(null);

  // Build the deterministic draw plan once.
  const plan = useMemo<DrawResult | { error: string }>(() => {
    try {
      return buildDrawPlan(teams, config);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Unknown engine error" };
    }
  }, [teams, config]);

  const isError = "error" in plan;
  const steps = isError ? [] : plan.steps;
  const total = steps.length;

  // ── Sequencer state ──────────────────────────────────────────────
  // `placedCount`: how many teams have already transitioned from spotlight
  //               into their slot. placedCount === total means the show is
  //               over.
  // `showSpotlight`: whether to render the spotlight card for the current
  //                  step (step index = placedCount).
  // Rule: slot rendering depends on placedCount (team placed iff its step
  //       index is strictly less than placedCount). Spotlight rendering
  //       uses step at index = placedCount. This keeps framer-motion's
  //       layoutId lookup unambiguous — at any instant a team id exists in
  //       at most one of the two regions.
  const [placedCount, setPlacedCount] = useState(0);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [playing, setPlaying] = useState(true);

  // Driving timer: chain spotlight → place → advance.
  useEffect(() => {
    if (!playing || isError) return;
    if (placedCount >= total) return; // done

    const delayToShow =
      placedCount === 0 ? FIRST_SPOTLIGHT_DELAY_MS : BETWEEN_REVEALS_MS;

    const showTimer = window.setTimeout(() => {
      setShowSpotlight(true);
    }, delayToShow);

    const placeTimer = window.setTimeout(() => {
      setShowSpotlight(false);
      setPlacedCount((c) => c + 1);
    }, delayToShow + SPOTLIGHT_DURATION_MS);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(placeTimer);
    };
  }, [playing, placedCount, total, isError]);

  // Manual controls.
  const canNext = placedCount < total;
  const canPrev = placedCount > 0;

  const handleNext = useCallback(() => {
    if (!canNext) return;
    setShowSpotlight(false);
    setPlacedCount((c) => Math.min(c + 1, total));
  }, [canNext, total]);

  const handlePrev = useCallback(() => {
    if (!canPrev) return;
    setShowSpotlight(false);
    setPlacedCount((c) => Math.max(c - 1, 0));
  }, [canPrev]);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  // ── Fullscreen + keyboard ─────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void el.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, toggleFullscreen, togglePlay, handleNext, handlePrev]);

  // ── Auto-hiding controls on mouse idle ────────────────────────────
  const [controlsVisible, setControlsVisible] = useState(true);
  useEffect(() => {
    let t: number | undefined;
    const show = () => {
      setControlsVisible(true);
      window.clearTimeout(t);
      t = window.setTimeout(() => setControlsVisible(false), CONTROLS_IDLE_MS);
    };
    show();
    window.addEventListener("mousemove", show);
    window.addEventListener("keydown", show);
    return () => {
      window.removeEventListener("mousemove", show);
      window.removeEventListener("keydown", show);
      window.clearTimeout(t);
    };
  }, []);

  // ── Derived view state ────────────────────────────────────────────
  const revealedTeamIds = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < placedCount && i < steps.length; i++) {
      set.add(steps[i].team.id);
    }
    return set;
  }, [placedCount, steps]);

  const currentStep =
    placedCount < steps.length ? steps[placedCount] : null;

  // Layout id helper: prefix so it doesn't collide with any other
  // layoutIds on the page (the stage is a portal, but still in the tree).
  const layoutIdFor = useCallback(
    (teamId: string) => `draw-show-team-${teamId}`,
    [],
  );

  const activeGroupIndex =
    currentStep && currentStep.kind === "place-group"
      ? currentStep.groupIndex
      : null;

  const isGroupsMode = !isError && plan.config.mode === "groups";
  const isDone = placedCount >= total && total > 0;

  if (!mounted) return null;

  // ── Render ───────────────────────────────────────────────────────
  return createPortal(
    <div
      ref={rootRef}
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #05080f 0%, #0b1122 50%, #05080f 100%)",
        color: "#f5f7fb",
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(43,254,186,0.18) 0%, transparent 55%)",
        }}
      />

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="relative flex items-center justify-between px-8 py-5 z-10">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="w-10 h-10 rounded-xl object-cover"
              style={{ border: "1px solid rgba(255,255,255,0.12)" }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#2BFEBA", color: "#05080f" }}
            >
              <Sparkles className="w-5 h-5" />
            </div>
          )}
          <div>
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "rgba(245,247,251,0.55)" }}
            >
              {t("stage.eyebrow")}
            </p>
            <h2 className="text-lg font-black leading-tight">
              {title ?? t("stage.defaultTitle")}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            title={t(
              isFullscreen ? "stage.exitFullscreen" : "stage.enterFullscreen",
            )}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-70"
            style={{
              background: "rgba(255,255,255,0.08)",
              color: "rgba(245,247,251,0.7)",
            }}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onClose}
            title={t("stage.close")}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-70"
            style={{
              background: "rgba(255,255,255,0.08)",
              color: "rgba(245,247,251,0.7)",
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="relative flex-1 flex items-stretch justify-center px-6 pb-16 z-[1]">
        {isError ? (
          <ErrorPanel message={plan.error} title={t("stage.errorTitle")} />
        ) : isGroupsMode ? (
          // LayoutGroup is required so framer-motion coordinates layoutId
          // transitions between Spotlight and Slot positions.
          <LayoutGroup id="draw-show">
            <div className="w-full flex flex-col items-center justify-start gap-6 pt-2">
              <GroupBoard
                groups={plan.groups ?? []}
                revealedTeamIds={revealedTeamIds}
                layoutIdFor={layoutIdFor}
                groupLabel={t("stage.groupLabel")}
                activeGroupIndex={activeGroupIndex}
              />

              {/* Spotlight / Done summary */}
              <div className="flex-1 flex items-center justify-center min-h-[180px] w-full">
                <AnimatePresence mode="wait">
                  {isDone ? (
                    <DonePanel
                      key="done"
                      title={t("stage.doneTitle")}
                      // When unassigned teams exist, the subtitle
                      // explicitly calls out the mismatch between
                      // placed count and tournament total. Otherwise
                      // fall back to the simple "all N placed" copy.
                      subtitle={
                        unassignedTeams && unassignedTeams.length > 0 &&
                        totalTeamsCount != null
                          ? t("stage.donePartialSubtitle", {
                              placed: total,
                              total: totalTeamsCount,
                            })
                          : t("stage.doneSubtitle", { count: total })
                      }
                      unassignedTeams={unassignedTeams}
                      unassignedLabel={t("stage.unassignedTeams")}
                    />
                  ) : showSpotlight && currentStep ? (
                    <SpotlightWithTarget
                      key={`spot-${placedCount}`}
                      team={currentStep.team}
                      layoutId={layoutIdFor(currentStep.team.id)}
                      targetLetter={
                        currentStep.kind === "place-group"
                          ? String.fromCharCode(65 + currentStep.groupIndex)
                          : undefined
                      }
                      targetLabel={t("stage.toGroup")}
                    />
                  ) : (
                    <motion.div
                      key="gap"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.3 }}
                      exit={{ opacity: 0 }}
                      className="text-xs font-semibold uppercase tracking-widest"
                      style={{ color: "rgba(245,247,251,0.45)" }}
                    >
                      {placedCount === 0 ? t("stage.startingIn") : ""}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </LayoutGroup>
        ) : (
          // Non-groups modes (playoff, etc.) — placeholder until phase 3.5
          <div className="flex items-center justify-center">
            <p className="text-sm" style={{ color: "rgba(245,247,251,0.6)" }}>
              {t("stage.modeComingSoon")}
            </p>
          </div>
        )}
      </div>

      {/* ── Controls overlay ────────────────────────────────── */}
      <PresentationControls
        visible={controlsVisible && !isError}
        playing={playing}
        canPrev={canPrev}
        canNext={canNext}
        stepIndex={placedCount - 1}
        totalSteps={total}
        onTogglePlay={togglePlay}
        onPrev={handlePrev}
        onNext={handleNext}
        labels={{
          play: t("controls.play"),
          pause: t("controls.pause"),
          prev: t("controls.prev"),
          next: t("controls.next"),
          stepCounter: (c, n) => t("controls.stepCounter", { current: c, total: n }),
        }}
      />

      {/* ── Footer key hints ────────────────────────────────── */}
      <div
        className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-5 px-8 text-[11px]"
        style={{ color: "rgba(245,247,251,0.4)", zIndex: 2 }}
      >
        <KbdHint label={t("stage.hintPlayPause")}>Space</KbdHint>
        <KbdHint label={t("stage.hintStep")}>← →</KbdHint>
        <KbdHint label={t("stage.hintFullscreen")}>F</KbdHint>
        <KbdHint label={t("stage.hintClose")}>Esc</KbdHint>
      </div>
    </div>,
    document.body,
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function SpotlightWithTarget({
  team,
  layoutId,
  targetLetter,
  targetLabel,
}: {
  team: DrawInputTeam;
  layoutId: string;
  targetLetter?: string;
  targetLabel: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-3"
    >
      <TeamCard team={team} variant="spotlight" layoutId={layoutId} />
      {targetLetter && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full"
          style={{
            background: "rgba(43,254,186,0.12)",
            border: "1px solid rgba(43,254,186,0.35)",
          }}
        >
          <ArrowDown className="w-3.5 h-3.5" style={{ color: "#2BFEBA" }} />
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#2BFEBA" }}
          >
            {targetLabel} {targetLetter}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

function DonePanel({
  title,
  subtitle,
  unassignedTeams,
  unassignedLabel,
}: {
  title: string;
  subtitle: string;
  unassignedTeams?: string[];
  unassignedLabel?: string;
}) {
  const hasUnassigned = (unassignedTeams?.length ?? 0) > 0;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className="text-center flex flex-col items-center gap-3"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, #2BFEBA, rgba(43,254,186,0.5))",
          color: "#05080f",
          boxShadow: "0 12px 36px -8px rgba(43,254,186,0.55)",
        }}
      >
        <Trophy className="w-7 h-7" />
      </div>
      <p
        className="text-2xl font-black"
        style={{ color: "#f5f7fb" }}
      >
        {title}
      </p>
      <p
        className="text-sm"
        style={{ color: "rgba(245,247,251,0.65)" }}
      >
        {subtitle}
      </p>
      {hasUnassigned && unassignedLabel && (
        <div
          className="mt-2 rounded-2xl px-4 py-2.5 max-w-md"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.3)",
          }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-widest mb-1"
            style={{ color: "#f59e0b" }}
          >
            {unassignedLabel} ({unassignedTeams!.length})
          </p>
          <p
            className="text-xs leading-relaxed"
            style={{ color: "rgba(245,247,251,0.75)" }}
          >
            {unassignedTeams!.join(" · ")}
          </p>
        </div>
      )}
    </motion.div>
  );
}

function ErrorPanel({ message, title }: { message: string; title: string }) {
  return (
    <div className="self-center">
      <div
        className="max-w-md text-center rounded-2xl px-6 py-8"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid #ef4444",
        }}
      >
        <p
          className="text-xs font-bold uppercase tracking-widest mb-2"
          style={{ color: "#ef4444" }}
        >
          {title}
        </p>
        <p className="text-sm" style={{ color: "#f5f7fb" }}>
          {message}
        </p>
      </div>
    </div>
  );
}

function KbdHint({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <kbd
        className="px-1.5 py-0.5 rounded font-mono text-[10px]"
        style={{
          background: "rgba(255,255,255,0.08)",
          color: "#f5f7fb",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {children}
      </kbd>
      <span>{label}</span>
    </span>
  );
}
