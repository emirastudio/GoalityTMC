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
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Trophy,
  ArrowDown,
  Play,
} from "lucide-react";
import { buildDrawPlan } from "@/lib/draw-show/engine";
import type { DrawConfig, DrawInputTeam, DrawResult } from "@/lib/draw-show/types";
import { TeamCard } from "./TeamCard";
import { GroupBoard } from "./GroupBoard";
import { PresentationControls } from "./PresentationControls";

type Props = {
  teams: DrawInputTeam[];
  config: DrawConfig;
  /** Tournament name shown big in the stage header (e.g. "PRO Cup"). */
  title?: string;
  /**
   * Secondary line under the title — typically the division/age-class
   * name ("U14") when running inside a specific division's draw.
   */
  subtitle?: string;
  /** Optional badge/logo URL shown next to the title. */
  logoUrl?: string | null;
  /** Called when the user exits the stage (Esc, X, or clicks backdrop). */
  onClose: () => void;
  /**
   * Standalone-only: short id of the persisted public draw. When set,
   * the stage POSTs to /api/draw/s/<id>/activate the moment the show
   * actually begins so superadmin can track conversion. Embedded
   * (in-tournament) flow leaves this undefined.
   */
  publicDrawId?: string;
  /**
   * iframe-embed mode (`?embed=1` on the present page). Hides the
   * close button (there's nowhere to close to inside an iframe),
   * shrinks the brand credit, and turns key hints down a notch so
   * the embed doesn't look like a debug overlay on the host page.
   */
  embedMode?: boolean;
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
const FIRST_SPOTLIGHT_DELAY_MS = 400;
const BETWEEN_REVEALS_MS = 500;
const SPOTLIGHT_DURATION_MS = 2100;
const CONTROLS_IDLE_MS = 1800;

// Dramatic intro countdown before the very first team is revealed. Each
// number sits on screen for this many ms; at 0 the show begins.
const INTRO_STEP_MS = 900;

export function DrawStage({
  teams,
  config,
  title,
  subtitle,
  logoUrl,
  onClose,
  unassignedTeams,
  totalTeamsCount,
  publicDrawId,
  embedMode = false,
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
  // Intro countdown (5..4..3..2..1..GO). `null` means "intro done,
  // proceed with reveals". We render a dedicated panel while this is
  // non-null and suppress the reveal loop during it.
  const [introStep, setIntroStep] = useState<number | "go" | null>(5);

  // Fire the audit-log "activated" event the first time the show
  // actually starts (i.e. the intro hands off to the reveal loop).
  // Runs once per stage mount; failures are silent.
  const activatedRef = useRef(false);
  useEffect(() => {
    if (!publicDrawId) return;
    if (introStep !== null) return;
    if (activatedRef.current) return;
    activatedRef.current = true;
    fetch(`/api/draw/s/${publicDrawId}/activate`, { method: "POST" }).catch(
      () => {},
    );
  }, [publicDrawId, introStep]);

  // Drive the intro countdown. Each tick lasts INTRO_STEP_MS; the
  // final "GO" flashes for a beat before we hand off to the reveal
  // engine.
  useEffect(() => {
    if (introStep === null) return;
    if (!playing) return;
    const t = window.setTimeout(() => {
      if (introStep === "go") {
        setIntroStep(null);
      } else if (introStep <= 1) {
        setIntroStep("go");
      } else {
        setIntroStep((s) =>
          s === null || s === "go" ? s : (s as number) - 1,
        );
      }
    }, INTRO_STEP_MS);
    return () => window.clearTimeout(t);
  }, [introStep, playing]);

  // Driving timer: chain spotlight → place → advance.
  useEffect(() => {
    if (!playing || isError) return;
    if (introStep !== null) return; // wait for 5..4..3..2..1..GO
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
  }, [playing, placedCount, total, isError, introStep]);

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
  // Only groups / playoff steps carry a single "team" payload we track
  // here; league steps carry a pair (home + away) and are tracked
  // separately via revealedLeagueKeys below.
  const revealedTeamIds = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < placedCount && i < steps.length; i++) {
      const s = steps[i];
      if (s.kind === "place-group" || s.kind === "pair") set.add(s.team.id);
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

  // Map the active group index to a horizontal "fly-away" direction so
  // the spotlight visibly heads toward its target when it exits.
  // Groups A-D form the top row, E-H the bottom row — we only care
  // about the column, which is gi % 4 for most configurations.
  const exitDirection = useMemo(() => {
    if (activeGroupIndex == null) return 0;
    if ("error" in plan) return 0;
    const groupCount =
      plan.config.mode === "groups" ? (plan.groups?.length ?? 4) : 4;
    const cols = Math.min(groupCount, 4);
    // Centre of the grid is (cols - 1) / 2 — direction is signed
    // distance from that centre normalised to roughly [-1, 1].
    const col = activeGroupIndex % cols;
    const centre = (cols - 1) / 2;
    return cols === 1 ? 0 : (col - centre) / centre;
  }, [activeGroupIndex, plan]);

  const isGroupsMode = !isError && plan.config.mode === "groups";
  const isLeagueMode = !isError && plan.config.mode === "league";
  const isPlayoffMode = !isError && plan.config.mode === "playoff";
  const isDone = placedCount >= total && total > 0;

  // For playoff: each step has (pairIndex, side), so we track which
  // (pairIndex, side) tuples have been revealed for the bracket grid
  // to know which slots to fill. The set is keyed "pi:side" to avoid
  // collisions between, say, pair 1 home and pair 1 away.
  const revealedPairKeys = useMemo(() => {
    const set = new Set<string>();
    if (!isPlayoffMode) return set;
    for (let i = 0; i < placedCount && i < steps.length; i++) {
      const s = steps[i];
      if (s.kind === "pair") set.add(`${s.pairIndex}:${s.side}`);
    }
    return set;
  }, [isPlayoffMode, placedCount, steps]);

  // Derived data for league mode: which match is currently in the
  // spotlight and which match ids have been revealed. The set is indexed
  // by (round, matchInRound) to avoid any string-key collisions.
  const revealedLeagueKeys = useMemo(() => {
    const set = new Set<string>();
    if (!isLeagueMode) return set;
    for (let i = 0; i < placedCount && i < steps.length; i++) {
      const s = steps[i];
      if (s.kind === "league-match") set.add(`${s.round}:${s.matchInRound}`);
    }
    return set;
  }, [isLeagueMode, placedCount, steps]);

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
        <div className="flex items-center gap-3 min-w-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="w-12 h-12 rounded-xl object-cover shrink-0"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
              }}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "#2BFEBA", color: "#05080f" }}
            >
              <Sparkles className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0">
            <p
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "rgba(245,247,251,0.55)" }}
            >
              {t("stage.eyebrow")}
            </p>
            {/* Tournament name is the big primary line; division/stage
                name (if given) rides under it as a muted chip. */}
            <h2 className="text-xl md:text-2xl font-black leading-tight truncate">
              {title ?? t("stage.defaultTitle")}
            </h2>
            {subtitle && (
              <p
                className="text-sm font-semibold mt-0.5 truncate"
                style={{ color: "rgba(245,247,251,0.65)" }}
              >
                {subtitle}
              </p>
            )}
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
          {!embedMode && (
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
          )}
        </div>
      </div>

      {/* Dramatic 5..4..3..2..1..GO overlay, rendered above the body
          until the intro finishes. Portals stay where they are so
          closing/Esc still works during the intro. */}
      <AnimatePresence>
        {introStep !== null && !isError && (
          <IntroCountdown step={introStep} goLabel={t("stage.introGo")} />
        )}
      </AnimatePresence>

      {/* ── Body ──────────────────────────────────────────────── */}
      {/* IMPORTANT: `min-h-0` on the flex child is required for the
          inner overflow-y-auto to actually scroll; without it the
          browser gives the child its content height (≥viewport) and
          the scrollbar never appears.

          Spotlight is rendered as an absolutely-positioned overlay
          centred on the body so it stays visible regardless of where
          the user has scrolled the (potentially long) board. */}
      <div className="relative flex-1 flex items-stretch justify-center min-h-0 z-[1]">
        {isError ? (
          <div className="flex-1 flex items-center justify-center px-6 pb-16">
            <ErrorPanel
              message={plan.error}
              title={t("stage.errorTitle")}
            />
          </div>
        ) : isGroupsMode ? (
          <>
            <div className="flex-1 overflow-y-auto px-6 pb-44 pt-2 w-full">
              <GroupBoard
                groups={plan.groups ?? []}
                revealedTeamIds={revealedTeamIds}
                layoutIdFor={layoutIdFor}
                groupLabel={t("stage.groupLabel")}
                activeGroupIndex={activeGroupIndex}
              />
            </div>
            <BodyOverlay>
              <AnimatePresence mode="wait">
                {isDone ? (
                  <DonePanel
                    key="done"
                    title={t("stage.doneTitle")}
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
                ) : showSpotlight &&
                  currentStep &&
                  currentStep.kind === "place-group" ? (
                  <SpotlightWithTarget
                    key={`spot-${placedCount}`}
                    team={currentStep.team}
                    layoutId={layoutIdFor(currentStep.team.id)}
                    targetLetter={String.fromCharCode(
                      65 + currentStep.groupIndex,
                    )}
                    targetLabel={t("stage.toGroup")}
                    exitDirection={exitDirection}
                  />
                ) : null}
              </AnimatePresence>
            </BodyOverlay>
          </>
        ) : isLeagueMode ? (
          <>
            <div className="flex-1 overflow-y-auto px-6 pb-56 pt-2 w-full">
              <LeagueBoard
                rounds={plan.leagueRounds ?? []}
                revealedKeys={revealedLeagueKeys}
                roundLabel={t("stage.roundLabel")}
                totalRounds={plan.leagueRounds?.length ?? 0}
                placedCount={placedCount}
                totalMatches={total}
                statusLabel={t("stage.leagueStatus")}
              />
            </div>
            <BodyOverlay>
              <AnimatePresence mode="wait">
                {isDone ? (
                  <DonePanel
                    key="done"
                    title={t("stage.leagueDoneTitle")}
                    subtitle={t("stage.leagueDoneSubtitle", {
                      matches: total,
                      rounds: plan.leagueRounds?.length ?? 0,
                    })}
                  />
                ) : showSpotlight &&
                  currentStep &&
                  currentStep.kind === "league-match" ? (
                  <LeagueSpotlight
                    key={`lspot-${placedCount}`}
                    home={currentStep.home}
                    away={currentStep.away}
                    round={currentStep.round}
                    roundLabel={t("stage.roundLabel")}
                  />
                ) : null}
              </AnimatePresence>
            </BodyOverlay>
          </>
        ) : isPlayoffMode ? (
          <>
            <div className="flex-1 overflow-y-auto px-6 pb-44 pt-2 w-full">
              <PlayoffBracket
                pairs={plan.pairs ?? []}
                revealedPairKeys={revealedPairKeys}
                pairLabel={t("stage.pairLabel")}
                vsLabel={t("stage.vs")}
                byeLabel={t("stage.bye")}
              />
            </div>
            <BodyOverlay>
              <AnimatePresence mode="wait">
                {isDone ? (
                  <DonePanel
                    key="done"
                    title={t("stage.playoffDoneTitle")}
                    subtitle={t("stage.playoffDoneSubtitle", {
                      pairs: plan.pairs?.length ?? 0,
                    })}
                  />
                ) : showSpotlight &&
                  currentStep &&
                  currentStep.kind === "pair" ? (
                  <PlayoffSpotlight
                    key={`pspot-${placedCount}`}
                    team={currentStep.team}
                    pairIndex={currentStep.pairIndex}
                    side={currentStep.side}
                    pairLabel={t("stage.pairLabel")}
                    sideLabel={t(
                      currentStep.side === "home"
                        ? "stage.sideHome"
                        : "stage.sideAway",
                    )}
                  />
                ) : null}
              </AnimatePresence>
            </BodyOverlay>
          </>
        ) : (
          // Other modes — phase 3.5 fills these in.
          <div className="flex-1 flex items-center justify-center px-6 pb-16">
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
      {!embedMode && (
        <div
          className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-5 px-8 text-[11px]"
          style={{ color: "rgba(245,247,251,0.4)", zIndex: 2 }}
        >
          <KbdHint label={t("stage.hintPlayPause")}>Space</KbdHint>
          <KbdHint label={t("stage.hintStep")}>← →</KbdHint>
          <KbdHint label={t("stage.hintFullscreen")}>F</KbdHint>
          <KbdHint label={t("stage.hintClose")}>Esc</KbdHint>
        </div>
      )}

      {/* ── Brand credit ────────────────────────────────────────
          Small but unmissable: every show carries a link back to
          the platform. Positioned at the very top-edge footer so
          it's visible whether the user is in fullscreen or not. */}
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className={`absolute right-4 inline-flex items-center gap-1.5 font-semibold tracking-wide transition-opacity hover:opacity-100 ${
          embedMode
            ? "bottom-1.5 text-[9px]"
            : "bottom-3 text-[10px]"
        }`}
        style={{ color: "rgba(245,247,251,0.35)", zIndex: 2 }}
      >
        <Sparkles
          className={embedMode ? "w-2.5 h-2.5" : "w-3 h-3"}
          style={{ color: "#2BFEBA" }}
        />
        <span>{t("stage.madeWith")}</span>
        <span
          className="font-black"
          style={{ color: "rgba(245,247,251,0.6)" }}
        >
          Goality TMC
        </span>
      </a>
    </div>,
    document.body,
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

/**
 * Cinema-style 5..4..3..2..1..GO overlay shown before the first reveal.
 * Huge number in the centre with a pulse-and-shrink animation and an
 * expanding mint ring; final "GO" flashes green. Non-interactive — the
 * parent drives the number via `step` and swaps us out when done.
 */
function IntroCountdown({
  step,
  goLabel,
}: {
  step: number | "go";
  goLabel: string;
}) {
  const isGo = step === "go";
  const display = isGo ? goLabel : String(step);
  return (
    <motion.div
      key={display}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
    >
      {/* Ambient darkening so the number pops over the stage */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "rgba(5,8,15,0.5)" }}
      />

      {/* Expanding ring */}
      <motion.div
        aria-hidden
        key={`ring-${display}`}
        className="absolute rounded-full"
        initial={{
          width: 80,
          height: 80,
          opacity: 0.9,
          borderWidth: 3,
        }}
        animate={{
          width: 520,
          height: 520,
          opacity: 0,
          borderWidth: 1,
        }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        style={{
          border: `1px solid ${isGo ? "#2BFEBA" : "rgba(43,254,186,0.6)"}`,
          boxShadow: `0 0 60px ${isGo ? "rgba(43,254,186,0.5)" : "rgba(43,254,186,0.3)"}`,
        }}
      />

      {/* The number / GO label */}
      <motion.div
        key={`num-${display}`}
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.5, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        className="relative font-black select-none tabular-nums"
        style={{
          color: isGo ? "#2BFEBA" : "#f5f7fb",
          fontSize: isGo ? "14rem" : "18rem",
          lineHeight: 1,
          letterSpacing: "-0.05em",
          textShadow: isGo
            ? "0 0 80px rgba(43,254,186,0.7), 0 0 140px rgba(43,254,186,0.4)"
            : "0 0 60px rgba(43,254,186,0.35)",
        }}
      >
        {display}
      </motion.div>
    </motion.div>
  );
}

function SpotlightWithTarget({
  team,
  layoutId,
  targetLetter,
  targetLabel,
  exitDirection = 0,
}: {
  team: DrawInputTeam;
  layoutId: string;
  targetLetter?: string;
  targetLabel: string;
  exitDirection?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <TeamCard
        team={team}
        variant="spotlight"
        layoutId={layoutId}
        exitDirection={exitDirection}
      />
      {targetLetter && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
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
    </div>
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
  // Solid dark backdrop + border so the done summary clearly sits
  // ABOVE the bracket / board behind it instead of melting into the
  // grid. Padding pulled in so the card still feels compact at the
  // centre of the viewport.
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className="text-center flex flex-col items-center gap-3 rounded-3xl px-8 py-7 max-w-md"
      style={{
        background:
          "linear-gradient(135deg, rgba(11,17,34,0.95), rgba(5,8,15,0.95))",
        border: "1px solid rgba(43,254,186,0.4)",
        boxShadow:
          "0 32px 80px -12px rgba(0,0,0,0.6), 0 0 120px -30px rgba(43,254,186,0.45)",
        backdropFilter: "blur(18px)",
      }}
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

// ─── League visualisation ─────────────────────────────────────────────
// League mode doesn't use groups; it reveals a round-robin schedule one
// match at a time. The board shows all rounds as columns (or rows on
// narrow screens); matches fill in as they're revealed. A short
// spotlight under the board announces the pair currently being shown.

function LeagueBoard({
  rounds,
  revealedKeys,
  roundLabel,
  totalRounds,
  placedCount,
  totalMatches,
  statusLabel,
}: {
  rounds: { home: DrawInputTeam; away: DrawInputTeam }[][];
  revealedKeys: ReadonlySet<string>;
  roundLabel: string;
  totalRounds: number;
  placedCount: number;
  totalMatches: number;
  statusLabel: string;
}) {
  if (rounds.length === 0) return null;
  return (
    <div className="w-full max-w-6xl">
      <div
        className="flex items-center justify-between px-1 mb-3 text-xs font-bold uppercase tracking-widest"
        style={{ color: "rgba(245,247,251,0.55)" }}
      >
        <span>
          {statusLabel} · {placedCount}/{totalMatches}
        </span>
        <span>
          {totalRounds} {roundLabel.toLowerCase()}
        </span>
      </div>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${Math.min(rounds.length, 4)}, minmax(0,1fr))`,
        }}
      >
        {rounds.map((matches, ri) => {
          const allRevealed = matches.every((_, mi) =>
            revealedKeys.has(`${ri + 1}:${mi}`),
          );
          return (
            <div
              key={ri}
              className="rounded-2xl p-3 flex flex-col"
              style={{
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <span
                  className="text-sm font-black"
                  style={{ color: allRevealed ? "#2BFEBA" : "#f5f7fb" }}
                >
                  {roundLabel} {ri + 1}
                </span>
                <span
                  className="text-[10px] font-bold tabular-nums"
                  style={{ color: "rgba(245,247,251,0.5)" }}
                >
                  {matches.filter((_, mi) => revealedKeys.has(`${ri + 1}:${mi}`)).length}
                  /{matches.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {matches.map((m, mi) => {
                  const revealed = revealedKeys.has(`${ri + 1}:${mi}`);
                  return (
                    <div
                      key={mi}
                      className="rounded-lg px-2 py-1.5 flex items-center gap-1.5 text-[11px] min-h-[28px]"
                      style={{
                        background: revealed
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(255,255,255,0.02)",
                        border: revealed
                          ? "1px solid rgba(255,255,255,0.1)"
                          : "1px dashed rgba(255,255,255,0.07)",
                      }}
                    >
                      {revealed ? (
                        <>
                          <span
                            className="flex-1 truncate font-semibold"
                            style={{ color: "#f5f7fb" }}
                          >
                            {m.home.name}
                          </span>
                          <span
                            className="text-[9px] font-black uppercase tracking-widest shrink-0"
                            style={{ color: "rgba(245,247,251,0.4)" }}
                          >
                            vs
                          </span>
                          <span
                            className="flex-1 truncate font-semibold text-right"
                            style={{ color: "#f5f7fb" }}
                          >
                            {m.away.name}
                          </span>
                        </>
                      ) : (
                        <span
                          className="flex-1 text-center"
                          style={{ color: "rgba(245,247,251,0.3)" }}
                        >
                          ·
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * BodyOverlay — fixed-position centred wrapper for the spotlight /
 * done panel. The board scrolls behind it; the overlay stays put.
 * `pointer-events-none` lets scroll/click pass through except where
 * children opt in.
 */
function BodyOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="absolute inset-x-0 top-0 bottom-0 flex items-center justify-center pointer-events-none px-6"
      style={{ zIndex: 5 }}
    >
      {children}
    </div>
  );
}

/**
 * PlayoffBracket — vertical list of head-to-head pairs that fill in
 * as the draw reveals each side. BYE entries (id `__bye__`) render
 * as a muted "BYE — advances" pill instead of a real team row.
 */
function PlayoffBracket({
  pairs,
  revealedPairKeys,
  pairLabel,
  vsLabel,
  byeLabel,
}: {
  pairs: [DrawInputTeam, DrawInputTeam][];
  revealedPairKeys: ReadonlySet<string>;
  pairLabel: string;
  vsLabel: string;
  byeLabel: string;
}) {
  if (pairs.length === 0) return null;
  const cols = pairs.length <= 4 ? 1 : pairs.length <= 8 ? 2 : 3;
  return (
    <div className="w-full max-w-5xl mx-auto">
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {pairs.map((pair, pi) => {
          const homeRevealed = revealedPairKeys.has(`${pi}:home`);
          const awayRevealed = revealedPairKeys.has(`${pi}:away`);
          const bothRevealed = homeRevealed && awayRevealed;
          return (
            <div
              key={pi}
              className="rounded-2xl p-3 flex flex-col"
              style={{
                background: bothRevealed
                  ? "rgba(43,254,186,0.06)"
                  : "rgba(255,255,255,0.035)",
                border: `1px solid ${
                  bothRevealed
                    ? "rgba(43,254,186,0.35)"
                    : "rgba(255,255,255,0.07)"
                }`,
              }}
            >
              <div className="flex items-center justify-between px-1 mb-2">
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: bothRevealed ? "#2BFEBA" : "#f5f7fb" }}
                >
                  {pairLabel} {pi + 1}
                </span>
              </div>
              <div className="space-y-1.5">
                <PairSlot
                  team={pair[0]}
                  revealed={homeRevealed}
                  byeLabel={byeLabel}
                />
                <div
                  className="text-center text-[10px] font-black uppercase tracking-widest"
                  style={{ color: "rgba(245,247,251,0.4)" }}
                >
                  {vsLabel}
                </div>
                <PairSlot
                  team={pair[1]}
                  revealed={awayRevealed}
                  byeLabel={byeLabel}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PairSlot({
  team,
  revealed,
  byeLabel,
}: {
  team: DrawInputTeam;
  revealed: boolean;
  byeLabel: string;
}) {
  const isBye = team.id === "__bye__";
  if (!revealed) {
    return (
      <div
        className="rounded-lg px-2.5 py-2 min-h-[34px]"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px dashed rgba(255,255,255,0.07)",
        }}
      />
    );
  }
  if (isBye) {
    // Self-explanatory BYE pill — icon + the shorter "проходит
    // дальше / advances" wording works better than the bare term.
    return (
      <div
        className="rounded-lg px-2.5 py-2 flex items-center justify-center gap-2"
        style={{
          background: "rgba(245,158,11,0.1)",
          border: "1px dashed rgba(245,158,11,0.4)",
          color: "#f59e0b",
        }}
      >
        <Trophy className="w-3.5 h-3.5" />
        <span className="text-xs font-bold uppercase tracking-widest">
          {byeLabel}
        </span>
      </div>
    );
  }

  // Real team row — same shape as the GroupBoard slot: badge, name,
  // country flag. Picks up logoUrl from the team payload (uploaded
  // via wizard or wired from the embedded tournament).
  const flag = teamFlag(team.countryCode);
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
      className="rounded-lg px-2.5 py-2 flex items-center gap-2"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <PairBadge team={team} />
      <span
        className="text-sm font-semibold truncate flex-1"
        style={{ color: "#f5f7fb" }}
      >
        {team.name}
      </span>
      {flag && <span className="text-base shrink-0">{flag}</span>}
    </motion.div>
  );
}

function PairBadge({ team }: { team: DrawInputTeam }) {
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
      style={{
        background: stableColorFromId(team.id),
        color: "#ffffff",
        textShadow: "0 1px 2px rgba(0,0,0,0.3)",
      }}
    >
      {teamInitials(team.name)}
    </div>
  );
}

// ── Tiny shared helpers (kept local to avoid circular imports) ──

function teamFlag(code: string | null | undefined): string | null {
  if (!code || code.length !== 2) return null;
  const A = 0x41;
  const BASE = 0x1f1e6;
  const a = code.toUpperCase().charCodeAt(0);
  const b = code.toUpperCase().charCodeAt(1);
  if (a < A || a > A + 25 || b < A || b > A + 25) return null;
  return (
    String.fromCodePoint(BASE + (a - A)) +
    String.fromCodePoint(BASE + (b - A))
  );
}

function teamInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] ?? "").join("").toUpperCase() || "?";
}

function stableColorFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360}, 70%, 55%)`;
}

function PlayoffSpotlight({
  team,
  pairIndex,
  side,
  pairLabel,
  sideLabel,
}: {
  team: DrawInputTeam;
  pairIndex: number;
  side: "home" | "away";
  pairLabel: string;
  sideLabel: string;
}) {
  const isBye = team.id === "__bye__";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{
        opacity: 0,
        scale: 0.5,
        y: side === "home" ? 80 : -80,
        transition: { duration: 0.45, ease: [0.6, 0, 0.4, 1] },
      }}
      transition={{ type: "spring", stiffness: 180, damping: 22 }}
      className="flex flex-col items-center gap-3 relative"
    >
      <motion.div
        aria-hidden
        className="absolute -inset-12 rounded-[3rem] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(43,254,186,0.32) 0%, transparent 70%)",
        }}
        animate={{ opacity: [0.55, 1, 0.55], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div
        className="relative flex items-center gap-6 rounded-[2rem] px-8 md:px-12 py-7 md:py-9"
        style={{
          background:
            "linear-gradient(135deg, rgba(43,254,186,0.22), rgba(43,254,186,0.04))",
          border: "1px solid rgba(43,254,186,0.55)",
          boxShadow:
            "0 28px 80px -12px rgba(43,254,186,0.5), 0 0 160px -30px rgba(43,254,186,0.6)",
          backdropFilter: "blur(12px)",
        }}
      >
        <p
          className="text-4xl md:text-6xl font-black truncate max-w-[60vw]"
          style={{
            color: "#f5f7fb",
            letterSpacing: "-0.02em",
            textShadow: "0 0 40px rgba(43,254,186,0.35)",
          }}
        >
          {isBye ? "BYE" : team.name}
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
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
          {pairLabel} {pairIndex + 1} · {sideLabel}
        </span>
      </motion.div>
    </motion.div>
  );
}

function LeagueSpotlight({
  home,
  away,
  round,
  roundLabel,
}: {
  home: DrawInputTeam;
  away: DrawInputTeam;
  round: number;
  roundLabel: string;
}) {
  // WOW-sized league pair card matching the groups Spotlight scale:
  // big pulse halo, ring sweep on enter, large typography. The
  // round badge sits above as a chip.
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{
        opacity: 0,
        scale: 0.6,
        y: -50,
        transition: { duration: 0.45, ease: [0.6, 0, 0.4, 1] },
      }}
      transition={{ type: "spring", stiffness: 180, damping: 22 }}
      className="flex flex-col items-center gap-4 relative"
    >
      <motion.div
        aria-hidden
        className="absolute -inset-12 rounded-[3rem] pointer-events-none"
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

      <motion.span
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative text-sm font-bold uppercase tracking-widest px-4 py-1.5 rounded-full"
        style={{
          background: "rgba(43,254,186,0.16)",
          color: "#2BFEBA",
          border: "1px solid rgba(43,254,186,0.45)",
        }}
      >
        {roundLabel} {round}
      </motion.span>

      <div
        className="relative flex items-center gap-6 md:gap-10 rounded-[2rem] px-8 md:px-14 py-7 md:py-9"
        style={{
          background:
            "linear-gradient(135deg, rgba(43,254,186,0.22), rgba(43,254,186,0.04))",
          border: "1px solid rgba(43,254,186,0.55)",
          boxShadow:
            "0 28px 80px -12px rgba(43,254,186,0.5), 0 0 160px -30px rgba(43,254,186,0.6)",
          backdropFilter: "blur(12px)",
        }}
      >
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
        <p
          className="text-3xl md:text-5xl font-black truncate max-w-[40vw]"
          style={{
            color: "#f5f7fb",
            letterSpacing: "-0.02em",
            textShadow: "0 0 40px rgba(43,254,186,0.35)",
          }}
        >
          {home.name}
        </p>
        <span
          className="text-base md:text-lg font-black uppercase tracking-widest shrink-0"
          style={{ color: "#2BFEBA" }}
        >
          vs
        </span>
        <p
          className="text-3xl md:text-5xl font-black truncate max-w-[40vw]"
          style={{
            color: "#f5f7fb",
            letterSpacing: "-0.02em",
            textShadow: "0 0 40px rgba(43,254,186,0.35)",
          }}
        >
          {away.name}
        </p>
      </div>
    </motion.div>
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
