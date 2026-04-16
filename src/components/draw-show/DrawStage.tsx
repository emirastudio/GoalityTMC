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
  subtitle,
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

  const isGroupsMode = !isError && plan.config.mode === "groups";
  const isLeagueMode = !isError && plan.config.mode === "league";
  const isDone = placedCount >= total && total > 0;

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
        ) : isLeagueMode ? (
          <div className="w-full flex flex-col items-center justify-start gap-6 pt-2 overflow-y-auto">
            <LeagueBoard
              rounds={plan.leagueRounds ?? []}
              revealedKeys={revealedLeagueKeys}
              roundLabel={t("stage.roundLabel")}
              totalRounds={plan.leagueRounds?.length ?? 0}
              placedCount={placedCount}
              totalMatches={total}
              statusLabel={t("stage.leagueStatus")}
            />
            <div className="flex-1 flex items-center justify-center min-h-[140px] w-full">
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
                ) : showSpotlight && currentStep && currentStep.kind === "league-match" ? (
                  <LeagueSpotlight
                    key={`lspot-${placedCount}`}
                    home={currentStep.home}
                    away={currentStep.away}
                    round={currentStep.round}
                    roundLabel={t("stage.roundLabel")}
                  />
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          // Other modes (playoff pairs etc.) — phase 3.5 fills these in.
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

      {/* ── Brand credit ────────────────────────────────────────
          Small but unmissable: every show carries a link back to
          the platform. Positioned at the very top-edge footer so
          it's visible whether the user is in fullscreen or not. */}
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-4 inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wide transition-opacity hover:opacity-100"
        style={{ color: "rgba(245,247,251,0.35)", zIndex: 2 }}
      >
        <Sparkles
          className="w-3 h-3"
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
  // The outer wrapper intentionally has no motion props: the inner
  // TeamCard carries the layoutId that framer-motion uses for the
  // shared-layout morph into the group slot. Wrapping it in another
  // fading motion.div conflicts with that transition and produces the
  // visible "ghost" double-render we saw during QA.
  return (
    <div className="flex flex-col items-center gap-3">
      <TeamCard team={team} variant="spotlight" layoutId={layoutId} />
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
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className="flex flex-col items-center gap-3"
    >
      <span
        className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
        style={{
          background: "rgba(43,254,186,0.12)",
          color: "#2BFEBA",
          border: "1px solid rgba(43,254,186,0.35)",
        }}
      >
        {roundLabel} {round}
      </span>
      <div
        className="flex items-center gap-4 md:gap-6 rounded-3xl px-6 md:px-10 py-5"
        style={{
          background:
            "linear-gradient(135deg, rgba(43,254,186,0.14), rgba(43,254,186,0.04))",
          border: "1px solid rgba(43,254,186,0.45)",
          boxShadow:
            "0 16px 50px -10px rgba(43,254,186,0.35), 0 0 100px -20px rgba(43,254,186,0.5)",
        }}
      >
        <p
          className="text-xl md:text-2xl font-black truncate"
          style={{ color: "#f5f7fb" }}
        >
          {home.name}
        </p>
        <span
          className="text-sm md:text-base font-black uppercase tracking-widest"
          style={{ color: "#2BFEBA" }}
        >
          vs
        </span>
        <p
          className="text-xl md:text-2xl font-black truncate"
          style={{ color: "#f5f7fb" }}
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
