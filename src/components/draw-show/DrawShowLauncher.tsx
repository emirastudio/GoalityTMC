"use client";

/**
 * DrawShowLauncher — the button that sits next to "Apply draw" on the
 * tournament admin Schedule page. Click it, a fullscreen DrawStage portal
 * opens, organizer shows the reveal to the audience, closes.
 *
 * Responsibilities:
 *   - Fetch the Pro/Elite entitlement (`hasDrawShow`) for this tournament
 *   - Render the button in one of three states: loading / locked / ready
 *   - Translate the pre-assigned group layout from the admin UI into the
 *     engine's `DrawConfig.preAssignedGroups` shape
 *   - Mount/unmount DrawStage on click
 *
 * The button is intentionally narrow: organisers don't configure anything
 * here (pots, group count, etc.) — that's already configured above on the
 * Schedule page. We just animate whatever is already laid out.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Lock, Loader2 } from "lucide-react";
import { DrawStage } from "./DrawStage";
import type { DrawConfig, DrawInputTeam } from "@/lib/draw-show/types";

export type LauncherGroup = {
  id: number;
  /** Team ids (numbers, per the DB) in the order the organiser placed them. */
  teamIds: number[];
};

export type LauncherTeam = {
  id: number;
  name: string;
  logoUrl?: string | null;
  countryCode?: string | null;
  clubName?: string | null;
  city?: string | null;
  /** Basket/pot index if using seeded draw. */
  pot?: number | null;
};

type Props = {
  orgSlug: string;
  tournamentId: number;
  /** Current stage id — used as part of the seed so re-opening produces same show. */
  stageId: number;
  /** Groups with their currently assigned team ids (from the Draw tab state). */
  groups: LauncherGroup[];
  /** Full team pool (for name/logo lookup). */
  allTeams: LauncherTeam[];
  /** Human title shown on the stage header (e.g. "PRO Cup · U14"). */
  title?: string;
  /** Club/tournament logo shown on the stage header. */
  logoUrl?: string | null;
};

type Entitlement =
  | { status: "loading" }
  | { status: "ready"; hasDrawShow: boolean }
  | { status: "error" };

export function DrawShowLauncher(props: Props) {
  const t = useTranslations("schedule");
  const [open, setOpen] = useState(false);
  const [ent, setEnt] = useState<Entitlement>({ status: "loading" });

  // ── Fetch plan entitlement (same endpoint the sidebar already uses) ──
  useEffect(() => {
    let cancelled = false;
    const url = `/api/org/${props.orgSlug}/tournament/${props.tournamentId}/billing-info`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { features?: { hasDrawShow?: boolean } }) => {
        if (cancelled) return;
        setEnt({
          status: "ready",
          hasDrawShow: data.features?.hasDrawShow === true,
        });
      })
      .catch(() => {
        if (cancelled) return;
        // Fail closed: treat as locked so we don't leak a Pro feature on
        // transient API failures. User can retry.
        setEnt({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [props.orgSlug, props.tournamentId]);

  // ── Build engine-shaped teams + preAssignedGroups ─────────────────
  // Memoized because it's passed to DrawStage which memoizes buildDrawPlan
  // by reference equality — we don't want a fresh array on every render.
  const { engineTeams, engineConfig } = useMemo(() => {
    const teams: DrawInputTeam[] = props.allTeams.map((team) => ({
      id: String(team.id),
      name: team.name,
      logoUrl: team.logoUrl ?? null,
      countryCode: team.countryCode ?? null,
      city: team.city ?? null,
      clubName: team.clubName ?? null,
      pot: team.pot ?? null,
    }));

    // preAssignedGroups[groupIndex][slotIndex] = teamId (string)
    const preAssignedGroups: string[][] = props.groups
      .filter((g) => g.teamIds.length > 0)
      .map((g) => g.teamIds.map((id) => String(id)));

    // Seed derived from stage + team layout so identical setup replays the
    // same show; adding or moving a team changes it (users experience this
    // as "re-drawing" after a manual edit).
    const seed = [
      "stage",
      props.stageId,
      ...preAssignedGroups.flatMap((g, i) => [i, ...g]),
    ].join(":");

    const config: DrawConfig = {
      mode: "groups",
      groupCount: preAssignedGroups.length,
      seedingMode: props.allTeams.some((t) => t.pot != null)
        ? "pots"
        : "random",
      seed,
      preAssignedGroups,
    };

    return { engineTeams: teams, engineConfig: config };
  }, [props.allTeams, props.groups, props.stageId]);

  const assignedTeamCount = engineConfig.preAssignedGroups?.reduce(
    (sum, g) => sum + g.length,
    0,
  ) ?? 0;

  const handleOpen = useCallback(() => {
    if (assignedTeamCount < 2) return;
    setOpen(true);
  }, [assignedTeamCount]);

  const handleClose = useCallback(() => setOpen(false), []);

  // ── Render ────────────────────────────────────────────────────────

  // Hide button entirely while the entitlement check is in flight —
  // avoids flicker between "Upgrade" badge and "Draw Show" button.
  if (ent.status === "loading") {
    return (
      <button
        disabled
        className="inline-flex items-center gap-1.5 rounded-lg font-semibold px-3 py-1.5 text-xs opacity-40"
        style={{
          background: "var(--cat-tag-bg)",
          color: "var(--cat-text-muted)",
        }}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {t("showDraw")}
      </button>
    );
  }

  const isLocked = ent.status !== "ready" || !ent.hasDrawShow;

  if (isLocked) {
    // Locked state: button leads to billing. We still render it so the
    // organizer sees the feature exists; clicking takes them to upgrade.
    const billingUrl = `/org/${props.orgSlug}/admin/tournament/${props.tournamentId}/billing`;
    return (
      <a
        href={billingUrl}
        title={t("showDraw")}
        className="inline-flex items-center gap-1.5 rounded-lg font-semibold px-3 py-1.5 text-xs transition-opacity hover:opacity-80"
        style={{
          background: "transparent",
          color: "var(--cat-text-secondary)",
          border: "1px dashed var(--cat-card-border)",
        }}
      >
        <Lock className="w-3.5 h-3.5" />
        {t("showDraw")}
      </a>
    );
  }

  const canStart = assignedTeamCount >= 2;

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={!canStart}
        className="inline-flex items-center gap-1.5 rounded-lg font-semibold px-3 py-1.5 text-xs transition-opacity hover:opacity-80 disabled:opacity-40"
        style={{
          background: "transparent",
          color: "var(--cat-accent)",
          border: "1px solid var(--cat-accent)",
        }}
      >
        <Sparkles className="w-3.5 h-3.5" />
        {t("showDraw")}
      </button>
      {open && (
        <DrawStage
          teams={engineTeams}
          config={engineConfig}
          title={props.title}
          logoUrl={props.logoUrl}
          onClose={handleClose}
        />
      )}
    </>
  );
}
