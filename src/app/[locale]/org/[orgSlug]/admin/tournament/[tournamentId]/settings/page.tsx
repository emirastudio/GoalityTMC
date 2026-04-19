"use client";

import { SettingsPageContent } from "@/components/admin/pages/settings-page";

// Offerings v3 is enabled by default system-wide (migration 0022). The
// former OfferingsV3Toggle (v3 switch + auto-assign + payment instructions)
// has been folded into /offerings — the natural home for everything
// pricing-related.
export default function TournamentSettingsPage() {
  return <SettingsPageContent />;
}
