"use client";

/**
 * PresentationControls — translucent overlay with play/pause/next/prev.
 *
 * Appears when the organizer moves the mouse; fades out after a short
 * idle period to keep the stage clean for the audience. All actions also
 * have keyboard shortcuts handled upstream in DrawStage.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

type Props = {
  visible: boolean;
  playing: boolean;
  canPrev: boolean;
  canNext: boolean;
  stepIndex: number; // -1 when not started
  totalSteps: number;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  labels: {
    play: string;
    pause: string;
    prev: string;
    next: string;
    stepCounter: (current: number, total: number) => string;
  };
};

export function PresentationControls(props: Props) {
  const { visible, playing, stepIndex, totalSteps, labels } = props;
  // Display: before start → 0 / N; during → step+1; after → N / N.
  const displayStep = stepIndex < 0 ? 0 : Math.min(stepIndex + 1, totalSteps);
  const progressPct =
    totalSteps === 0 ? 0 : (displayStep / totalSteps) * 100;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.18 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-auto"
          style={{ zIndex: 5 }}
        >
          {/* Progress bar */}
          <div
            className="h-1 w-72 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <motion.div
              className="h-full"
              style={{
                background:
                  "linear-gradient(90deg, #2BFEBA, rgba(43,254,186,0.6))",
              }}
              animate={{ width: `${progressPct}%` }}
              transition={{ type: "spring", stiffness: 160, damping: 28 }}
            />
          </div>

          {/* Control pill */}
          <div
            className="flex items-center gap-1 rounded-full px-2 py-1.5"
            style={{
              background: "rgba(15,19,32,0.85)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(12px)",
            }}
          >
            <CtrlBtn
              onClick={props.onPrev}
              disabled={!props.canPrev}
              title={labels.prev}
            >
              <SkipBack className="w-4 h-4" />
            </CtrlBtn>

            <CtrlBtn
              onClick={props.onTogglePlay}
              title={playing ? labels.pause : labels.play}
              primary
            >
              {playing ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </CtrlBtn>

            <CtrlBtn
              onClick={props.onNext}
              disabled={!props.canNext}
              title={labels.next}
            >
              <SkipForward className="w-4 h-4" />
            </CtrlBtn>

            <span
              className="text-xs font-semibold tabular-nums pl-2 pr-2"
              style={{ color: "rgba(245,247,251,0.75)" }}
            >
              {labels.stepCounter(displayStep, totalSteps)}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CtrlBtn({
  children,
  onClick,
  disabled,
  primary,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-30"
      style={{
        background: primary ? "#2BFEBA" : "rgba(255,255,255,0.08)",
        color: primary ? "#05080f" : "#f5f7fb",
      }}
    >
      {children}
    </button>
  );
}
