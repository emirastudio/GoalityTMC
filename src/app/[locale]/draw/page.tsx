"use client";

/**
 * /draw — landing for the standalone Draw Show product.
 *
 * Single-page flow: hero → inline wizard → footer CTA. No modals, no
 * multi-step navigation. The wizard's "Start Draw Show" submit handler
 * encodes the state into a URL and pushes to /draw/present where the
 * actual stage runs.
 */

import { useCallback, useRef } from "react";
import { DrawLanding, DrawLandingFooter } from "@/components/draw-show/DrawLanding";
import { DrawWizard } from "@/components/draw-show/DrawWizard";

const WIZARD_ID = "draw-wizard";

export default function DrawLandingPage() {
  const wizardRef = useRef<HTMLDivElement>(null);

  // Scroll the wizard into view instead of opening a modal — keeps the
  // hero visible as context and works nicely with deep-linking to the
  // anchor (#draw-wizard).
  const scrollToWizard = useCallback(() => {
    const el = document.getElementById(WIZARD_ID);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <main
      ref={wizardRef}
      style={{ background: "var(--cat-bg)", color: "var(--cat-text)" }}
    >
      <DrawLanding onStart={scrollToWizard} />
      <DrawWizard id={WIZARD_ID} />
      <DrawLandingFooter />
    </main>
  );
}
