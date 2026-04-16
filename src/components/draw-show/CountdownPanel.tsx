"use client";

/**
 * CountdownPanel — fullscreen "premiere in T-days" screen shown when a
 * scheduled draw hasn't reached its start time yet.
 *
 * Visitors land on /draw/present?s=<id>, we see scheduledAt is in the
 * future, and render this instead of the stage. When the timer hits
 * zero we call onComplete() so the host page can swap to the real
 * DrawStage without a full navigation.
 *
 * The clock ticks every 500 ms rather than 1000 so rounding never
 * makes the display skip a second. All rendering is local — no server
 * round-trip — so lingering tabs behave predictably when the window
 * was backgrounded.
 */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Sparkles, Calendar, Eye } from "lucide-react";

type Props = {
  scheduledAt: string; // ISO timestamp
  /** Tournament name → big title. Falls back to a generic label. */
  title?: string;
  /** Division / age class → subtitle. Rendered under the title. */
  subtitle?: string;
  /** Tournament logo → header badge. */
  logoUrl?: string | null;
  /** Fires once when scheduledAt is reached (tab was open at the time). */
  onComplete: () => void;
  /**
   * Creator preview: when true, render a "Watch now" button that
   * skips the countdown. Enable on the page load of every visitor so
   * anyone with the link can preview before the premiere — the user
   * asked for "preview at create time".
   */
  allowPreview?: boolean;
  /** When user chooses preview mode, host page swaps to DrawStage. */
  onPreview?: () => void;
};

export function CountdownPanel({
  scheduledAt,
  title,
  subtitle,
  logoUrl,
  onComplete,
  allowPreview = true,
  onPreview,
}: Props) {
  const t = useTranslations("countdown");
  const locale = useLocale();

  const target = useMemo(() => new Date(scheduledAt).getTime(), [scheduledAt]);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  // Fire onComplete exactly once when we cross zero.
  const [fired, setFired] = useState(false);
  useEffect(() => {
    if (!fired && now >= target) {
      setFired(true);
      onComplete();
    }
  }, [now, target, fired, onComplete]);

  const diff = Math.max(0, target - now);
  const seconds = Math.floor(diff / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const targetDateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "full",
        timeStyle: "short",
      }).format(new Date(scheduledAt)),
    [scheduledAt, locale],
  );

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #05080f 0%, #0b1122 50%, #05080f 100%)",
        color: "#f5f7fb",
      }}
    >
      {/* Ambient glow matches the DrawStage header so the transition
          from countdown to show feels continuous. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% -10%, rgba(43,254,186,0.22) 0%, transparent 55%)",
        }}
      />

      {/* Title + logo */}
      <div className="relative z-10 px-8 py-6 flex items-center gap-3 justify-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="w-12 h-12 rounded-xl object-cover"
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.04)",
            }}
          />
        ) : (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "#2BFEBA", color: "#05080f" }}
          >
            <Sparkles className="w-6 h-6" />
          </div>
        )}
        <div className="text-left">
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "#2BFEBA" }}
          >
            {t("eyebrow")}
          </p>
          <p className="text-xl md:text-2xl font-black leading-tight">
            {title ?? t("defaultTitle")}
          </p>
          {subtitle && (
            <p
              className="text-sm font-semibold"
              style={{ color: "rgba(245,247,251,0.65)" }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* The clock. */}
      <div className="relative z-[1] flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <p
          className="text-xs md:text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2"
          style={{ color: "rgba(245,247,251,0.55)" }}
        >
          <Calendar className="w-3.5 h-3.5" />
          {t("startsAt", { when: targetDateLabel })}
        </p>

        <div className="flex items-start gap-3 md:gap-6">
          <DigitBlock value={days} label={t("unitDays")} />
          <Separator />
          <DigitBlock value={hours} label={t("unitHours")} width="2" />
          <Separator />
          <DigitBlock value={minutes} label={t("unitMinutes")} width="2" />
          <Separator />
          <DigitBlock value={secs} label={t("unitSeconds")} width="2" animate />
        </div>

        {allowPreview && onPreview && (
          <button
            onClick={onPreview}
            className="mt-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-opacity hover:opacity-80"
            style={{
              background: "rgba(255,255,255,0.08)",
              color: "rgba(245,247,251,0.8)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            <Eye className="w-3.5 h-3.5" />
            {t("previewNow")}
          </button>
        )}
        <p
          className="mt-3 text-[11px] text-center max-w-md"
          style={{ color: "rgba(245,247,251,0.4)" }}
        >
          {t("previewHint")}
        </p>
      </div>

      {/* Brand credit echoes the stage footer so the two screens feel
          like one product. */}
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-4 inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wide"
        style={{ color: "rgba(245,247,251,0.35)" }}
      >
        <Sparkles className="w-3 h-3" style={{ color: "#2BFEBA" }} />
        <span>{t("madeWith")}</span>
        <span
          className="font-black"
          style={{ color: "rgba(245,247,251,0.6)" }}
        >
          Goality TMC
        </span>
      </a>
    </div>
  );
}

function DigitBlock({
  value,
  label,
  width = "3",
  animate,
}: {
  value: number;
  label: string;
  /** Minimum character width for zero-padding; "2" pads "7" → "07". */
  width?: "2" | "3";
  /** Small scale nudge every second on the seconds block. */
  animate?: boolean;
}) {
  const padded = width === "3"
    ? value.toString().padStart(3, "0")
    : value.toString().padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        key={padded}
        // Only the seconds block gets the little "tick" pulse; days/
        // hours/minutes stay still so the clock isn't visually noisy.
        initial={animate ? { scale: 0.95, opacity: 0.8 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="tabular-nums font-black leading-none text-5xl md:text-7xl px-4 md:px-6 py-4 md:py-6 rounded-2xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(43,254,186,0.12), rgba(43,254,186,0.03))",
          border: "1px solid rgba(43,254,186,0.25)",
          color: "#f5f7fb",
          minWidth: width === "3" ? "5rem" : "4rem",
          textAlign: "center",
        }}
      >
        {padded}
      </motion.div>
      <span
        className="text-[10px] md:text-xs font-bold uppercase tracking-widest"
        style={{ color: "rgba(245,247,251,0.55)" }}
      >
        {label}
      </span>
    </div>
  );
}

function Separator() {
  return (
    <span
      className="text-4xl md:text-6xl font-black select-none mt-2"
      style={{ color: "rgba(43,254,186,0.35)" }}
    >
      :
    </span>
  );
}
