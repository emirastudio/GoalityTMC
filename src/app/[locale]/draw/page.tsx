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
import { PublicNavHeader } from "@/components/ui/public-nav-header";

const WIZARD_ID = "draw-wizard";

export default function DrawLandingPage() {
  const wizardRef = useRef<HTMLDivElement>(null);

  const scrollToWizard = useCallback(() => {
    const el = document.getElementById(WIZARD_ID);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // PublicNavHeader now owns the top-level chrome (logo + nav
  // dropdown + Sign in / Get started + lang/theme), so DrawLanding
  // only renders the hero + mockup block beneath it.
  return (
    <main
      ref={wizardRef}
      style={{ background: "var(--cat-bg)", color: "var(--cat-text)" }}
    >
      <PublicNavHeader />
      <DrawLanding onStart={scrollToWizard} />
      <DrawWizard id={WIZARD_ID} />
      <DrawLandingFooter />
    </main>
  );
}
