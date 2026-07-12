import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid, Radio, CalendarDays, Settings, BookOpen,
  FileText, Users, CreditCard, ShoppingBag, MapPin, Hotel,
  Users2, MessageSquare, Newspaper,
} from "lucide-react";

/**
 * SINGLE SOURCE OF TRUTH for tournament-context navigation.
 *
 * Both the desktop sidebar (`org-admin-sidebar.tsx`) and the mobile drawer
 * (`org-admin-mobile-nav.tsx`) derive their tournament nav from the
 * definitions below. Previously each kept its own hand-written array; they
 * drifted and the mobile menu silently lost Control Room / referees /
 * regulations / news — which made the Control Room unreachable on a phone
 * during a live tournament. Never add a second per-surface route array:
 * add a definition HERE.
 *
 * Design boundary (kept deliberately thin):
 *   - `tournamentNavDefinitions` — pure data: id, path, i18n key, section,
 *     entitlement. No React, no colours. Trivially unit-testable.
 *   - `buildTournamentHref` / `resolveTournamentNavAccess` — pure helpers.
 *   - `tournamentNavPresentation` — icon/colour map, shared because BOTH
 *     surfaces render identical icons+accent colours today. Kept separate
 *     from the definitions so presentation never leaks into the route model.
 *
 * NOT modelled here (they are not routes that can drift): the desktop
 * division accordion and the extras cart. Those stay desktop-only in the
 * sidebar.
 */

export type NavSection =
  | "tournament"
  | "participants"
  | "finance"
  | "organization"
  | "communication";

/**
 * Feature flags that gate items. Structural subset of the sidebar's
 * `TournamentModules` and of the `billing-info` response, so any caller can
 * pass what it already has without a shared class.
 */
export interface NavModules {
  hasMatchHub?: boolean;
  hasFinance?: boolean;
  hasMessaging?: boolean;
}

/** Pure route definition — no presentation, no React. */
export interface TournamentNavDefinition {
  /** stable id — React key, presentation lookup, and desktop⇄mobile diffing */
  id: string;
  /** path relative to the tournament base ("" = the overview/root page) */
  path: string;
  /** i18n key + the namespace it lives in (labels are split across two) */
  labelKey: string;
  labelNs: "nav" | "orgAdmin";
  section: NavSection;
  /** match the pathname exactly (only the overview/root item) */
  exact?: boolean;
  /**
   * Entitlement flag. If set and the flag is explicitly false, the item is
   * rendered LOCKED (upgrade nudge) rather than hidden — identical on both
   * surfaces. NOTE: `referees` intentionally shares the `hasMatchHub`
   * entitlement — this preserves the EXISTING desktop behaviour (referees
   * live under the Match-Hub/Pro feature). Preserved as-is in this
   * stabilization pass; revisit the product rule separately, do not silently
   * re-model it here.
   */
  entitlement?: keyof NavModules;
  /** plan label shown on the locked state, e.g. "Pro" */
  lockedPlan?: string;
}

/**
 * Canonical, ordered tournament nav. Order + entitlement mirror the desktop
 * sidebar EXACTLY (verified route-by-route against org-admin-sidebar.tsx), so
 * both surfaces stay in lockstep.
 */
export const tournamentNavDefinitions: readonly TournamentNavDefinition[] = [
  // ── Tournament ────────────────────────────────────────────────────────────
  { id: "overview",    path: "",             labelKey: "overview",    labelNs: "nav",      section: "tournament",    exact: true },
  { id: "hub",         path: "/hub",         labelKey: "matchHub",    labelNs: "orgAdmin", section: "tournament",    entitlement: "hasMatchHub", lockedPlan: "Pro" },
  { id: "planner",     path: "/planner",     labelKey: "planner",     labelNs: "orgAdmin", section: "tournament" },
  { id: "setup",       path: "/setup",       labelKey: "settings",    labelNs: "orgAdmin", section: "tournament" },
  { id: "regulations", path: "/regulations", labelKey: "regulations", labelNs: "orgAdmin", section: "tournament" },

  // ── Participants ──────────────────────────────────────────────────────────
  { id: "registrations", path: "/registrations", labelKey: "registrations", labelNs: "nav", section: "participants" },
  { id: "teams",         path: "/teams",         labelKey: "teams",         labelNs: "nav", section: "participants" },

  // ── Finance ───────────────────────────────────────────────────────────────
  { id: "payments", path: "/payments", labelKey: "payments", labelNs: "nav", section: "finance", entitlement: "hasFinance", lockedPlan: "Pro" },

  // ── Organization ──────────────────────────────────────────────────────────
  { id: "offerings", path: "/offerings", labelKey: "feesServices", labelNs: "orgAdmin", section: "organization" },
  { id: "stadiums",  path: "/stadiums",  labelKey: "stadiums",     labelNs: "orgAdmin", section: "organization" },
  { id: "hotels",    path: "/hotels",    labelKey: "hotels",       labelNs: "orgAdmin", section: "organization" },
  { id: "referees",  path: "/referees",  labelKey: "referees",     labelNs: "orgAdmin", section: "organization", entitlement: "hasMatchHub", lockedPlan: "Pro" },

  // ── Communication (pinned bottom on desktop) ──────────────────────────────
  { id: "messages", path: "/messages", labelKey: "messagesLabel", labelNs: "nav",      section: "communication", entitlement: "hasMessaging", lockedPlan: "Pro" },
  { id: "news",     path: "/news",     labelKey: "newsLabel",     labelNs: "orgAdmin", section: "communication" },
] as const;

/** Presentation (icon + accent colour + active background). Shared because
 *  both surfaces render these identically. Separate from the route model. */
export const tournamentNavPresentation: Record<
  string,
  { icon: LucideIcon; color: string; bg?: string }
> = {
  overview:      { icon: LayoutGrid,   color: "var(--cat-accent)" },
  hub:           { icon: Radio,        color: "#ef4444", bg: "rgba(239,68,68,0.10)" },
  planner:       { icon: CalendarDays, color: "#06b6d4", bg: "rgba(6,182,212,0.10)" },
  setup:         { icon: Settings,     color: "var(--cat-text-muted)" },
  regulations:   { icon: BookOpen,     color: "#06b6d4", bg: "rgba(6,182,212,0.10)" },
  registrations: { icon: FileText,     color: "#10b981", bg: "rgba(16,185,129,0.10)" },
  teams:         { icon: Users,        color: "#10b981", bg: "rgba(16,185,129,0.10)" },
  payments:      { icon: CreditCard,   color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
  offerings:     { icon: ShoppingBag,  color: "#ec4899", bg: "rgba(236,72,153,0.10)" },
  stadiums:      { icon: MapPin,       color: "#ec4899", bg: "rgba(236,72,153,0.10)" },
  hotels:        { icon: Hotel,        color: "#ec4899", bg: "rgba(236,72,153,0.10)" },
  referees:      { icon: Users2,       color: "#ec4899", bg: "rgba(236,72,153,0.10)" },
  messages:      { icon: MessageSquare,color: "#8b5cf6", bg: "rgba(139,92,246,0.10)" },
  news:          { icon: Newspaper,    color: "#06b6d4", bg: "rgba(6,182,212,0.10)" },
};

/** Absolute href for a definition. `base` = `/org/{slug}/admin/tournament/{id}`. */
export function buildTournamentHref(def: TournamentNavDefinition, base: string): string {
  return def.path ? `${base}${def.path}` : base;
}

/**
 * Access state of a nav item — a small state machine so both surfaces render
 * gated links identically and never flash unlocked→locked:
 *   - `open`    → normal link (ungated, or entitled)
 *   - `locked`  → shown with an upgrade lock (entitlement explicitly false)
 *   - `pending` → modules unknown (still loading, or a transient billing-info
 *                 error): shown but neutral/disabled — never hidden, never
 *                 auto-unlocked. Ungated items are always `open`, so the main
 *                 routes (incl. non-gated ones) appear instantly.
 */
export type NavAccess = "open" | "locked" | "pending";
export type NavLoadStatus = "loading" | "ready" | "error";

export function resolveTournamentNavAccess(
  def: TournamentNavDefinition,
  modules: NavModules | null,
  status: NavLoadStatus = "loading",
): { state: NavAccess } {
  if (!def.entitlement) return { state: "open" };
  if (modules) return { state: modules[def.entitlement] === false ? "locked" : "open" };
  // No entitlement data:
  //  - still loading            → pending (neutral, animated; never unlocked)
  //  - error / empty (e.g. 401) → locked  (safe default — never unlock a paid
  //    feature on missing data, and never animate forever; the user can retry
  //    by navigating to the page, which reloads entitlements)
  return { state: status === "loading" ? "pending" : "locked" };
}

/** Definitions grouped by section, order preserved. */
export function groupTournamentNavItems(
  defs: readonly TournamentNavDefinition[] = tournamentNavDefinitions,
): Record<NavSection, TournamentNavDefinition[]> {
  const groups: Record<NavSection, TournamentNavDefinition[]> = {
    tournament: [], participants: [], finance: [], organization: [], communication: [],
  };
  for (const d of defs) groups[d.section].push(d);
  return groups;
}
