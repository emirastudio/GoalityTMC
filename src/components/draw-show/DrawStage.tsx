"use client";

/**
 * DrawStage — fullscreen presentation for the tournament draw reveal.
 *
 * Phase 2 scope (this file): render a themed fullscreen shell that:
 *   - covers the viewport via React portal
 *   - reacts to Escape / F / Space / Arrow keys
 *   - enters/exits the native fullscreen API on demand
 *   - shows a placeholder "engine running…" state until Phase 3 wires in the
 *     animated team reveal.
 *
 * Phase 3 will fill in:
 *   - <GroupBoard /> and <PlayoffBracket /> bodies
 *   - step-by-step sequencer driving DrawStep[] from the engine
 *   - framer-motion team-card reveal animations
 *
 * Why portal: the stage must sit above the admin sidebar, header, and any
 * modals the underlying page uses. Portaling to document.body guarantees a
 * clean z-index context regardless of where the launcher button lives.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Maximize2, Minimize2, X, Sparkles } from "lucide-react";
import { buildDrawPlan } from "@/lib/draw-show/engine";
import type { DrawConfig, DrawInputTeam, DrawResult } from "@/lib/draw-show/types";

type Props = {
  teams: DrawInputTeam[];
  config: DrawConfig;
  /** Tournament/event title shown in the stage header for context. */
  title?: string;
  /** Optional badge/logo URL shown next to the title. */
  logoUrl?: string | null;
  /** Called when the user exits the stage (Esc, X, or clicks backdrop). */
  onClose: () => void;
};

export function DrawStage({ teams, config, title, logoUrl, onClose }: Props) {
  // SSR guard: portal needs window.document. We only render after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const t = useTranslations("drawShow");
  const rootRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Build the draw plan once per (teams, config) combination. If either
  // input changes we recompute — but in practice the launcher passes stable
  // values for the lifetime of a show.
  const plan = useMemo<DrawResult | { error: string }>(() => {
    try {
      return buildDrawPlan(teams, config);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Unknown engine error" };
    }
  }, [teams, config]);

  // ── Keyboard controls ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Fullscreen API tracking ─────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function toggleFullscreen() {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void el.requestFullscreen().catch(() => {});
    }
  }

  if (!mounted) return null;

  const isError = "error" in plan;

  return createPortal(
    <div
      ref={rootRef}
      // Avoid role="dialog" since we want keyboard defaults (arrow keys)
      // and don't have a focused form inside. onClose is wired to ESC above.
      className="fixed inset-0 z-[100] flex flex-col"
      style={{
        background:
          "linear-gradient(135deg, var(--cat-bg) 0%, color-mix(in srgb, var(--cat-accent) 8%, var(--cat-bg)) 100%)",
        color: "var(--cat-text)",
      }}
    >
      {/* Decorative glow — pure CSS, no animation cost */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--cat-accent) 18%, transparent) 0%, transparent 60%)",
        }}
      />

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="relative flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="w-10 h-10 rounded-xl object-cover"
              style={{ border: "1px solid var(--cat-card-border)" }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "var(--cat-accent)",
                color: "var(--cat-accent-text)",
              }}
            >
              <Sparkles className="w-5 h-5" />
            </div>
          )}
          <div>
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--cat-text-muted)" }}
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
            title={t(isFullscreen ? "stage.exitFullscreen" : "stage.enterFullscreen")}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-70"
            style={{
              background: "var(--cat-tag-bg)",
              color: "var(--cat-text-muted)",
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
              background: "var(--cat-tag-bg)",
              color: "var(--cat-text-muted)",
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Body (Phase 3 will replace this placeholder) ────── */}
      <div className="relative flex-1 flex items-center justify-center px-8 pb-10">
        {isError ? (
          <div
            className="max-w-md text-center rounded-2xl px-6 py-8"
            style={{
              background: "var(--cat-card-bg)",
              border: "1px solid var(--badge-error-text)",
            }}
          >
            <p
              className="text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: "var(--badge-error-text)" }}
            >
              {t("stage.errorTitle")}
            </p>
            <p className="text-sm" style={{ color: "var(--cat-text)" }}>
              {plan.error}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: "var(--cat-text-muted)" }}
            >
              {t("stage.ready")}
            </p>
            <p
              className="text-3xl font-black mb-2"
              style={{ color: "var(--cat-text)" }}
            >
              {t("stage.placeholderTitle")}
            </p>
            <p
              className="text-sm max-w-md mx-auto"
              style={{ color: "var(--cat-text-muted)" }}
            >
              {t("stage.placeholderHint", { count: plan.steps.length })}
            </p>
          </div>
        )}
      </div>

      {/* ── Footer hints ──────────────────────────────────── */}
      <div
        className="relative flex items-center justify-center gap-6 px-8 py-4 text-xs"
        style={{ color: "var(--cat-text-muted)" }}
      >
        <span>
          <kbd className="px-1.5 py-0.5 rounded mr-1" style={{ background: "var(--cat-tag-bg)" }}>F</kbd>
          {t("stage.hintFullscreen")}
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 rounded mr-1" style={{ background: "var(--cat-tag-bg)" }}>Esc</kbd>
          {t("stage.hintClose")}
        </span>
      </div>
    </div>,
    document.body,
  );
}
