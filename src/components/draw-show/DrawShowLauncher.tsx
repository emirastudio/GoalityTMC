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
import type {
  DrawConfig,
  DrawInputTeam,
  ScheduleMatchInput,
} from "@/lib/draw-show/types";

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
  /**
   * "groups" — distribute teams into the groups already laid out on the
   * Draw tab (reveal-only; `groups` prop carries the assignment).
   * "league" — round-robin reveal over every team in the division; no
   * group assignment needed, `groups` is ignored.
   * "playoff" — bracket pairing reveal over every team in the division.
   * Round-1 knockout matches start as empty TBD shells (no prior
   * pairing data), so this always draws a fresh random pairing — same
   * as "league", `groups` is ignored. The show itself doesn't write the
   * pairing back to the actual bracket matches (that's a separate,
   * not-yet-built "apply" step); it's a reveal/preview for now.
   */
  mode: "groups" | "league" | "playoff";
  /** Groups with their currently assigned team ids (from the Draw tab state). Ignored when mode !== "groups". */
  groups: LauncherGroup[];
  /** Full team pool (for name/logo lookup, and the full roster when mode !== "groups"). */
  allTeams: LauncherTeam[];
  /**
   * Division / age-class name shown as the subtitle on the stage header
   * (e.g. "U14"). The tournament name itself is fetched by the launcher
   * from the billing-info endpoint we already hit for the entitlement.
   */
  divisionName?: string;
};

type Entitlement =
  | { status: "loading" }
  | {
      status: "ready";
      hasDrawShow: boolean;
      tournamentName?: string;
      tournamentLogoUrl?: string | null;
    }
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
      .then(
        (data: {
          name?: string;
          logoUrl?: string | null;
          features?: { hasDrawShow?: boolean };
        }) => {
          if (cancelled) return;
          setEnt({
            status: "ready",
            hasDrawShow: data.features?.hasDrawShow === true,
            tournamentName: data.name,
            tournamentLogoUrl: data.logoUrl ?? null,
          });
        },
      )
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

  // ── Real schedule (league mode only) ───────────────────────────────
  // When the division already has a generated calendar (matches with real
  // times + fields), a league draw upgrades into a "schedule reveal": the
  // real fixtures are revealed slot by slot, honouring the field count.
  // Fetch it lazily; if there's no schedule yet we stay in league mode.
  const [schedule, setSchedule] = useState<ScheduleMatchInput[] | null>(null);
  useEffect(() => {
    if (props.mode !== "league") {
      setSchedule(null);
      return;
    }
    let cancelled = false;
    const url = `/api/org/${props.orgSlug}/tournament/${props.tournamentId}/matches?stageId=${props.stageId}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((rows: any[]) => {
        if (cancelled) return;
        setSchedule(buildScheduleMatches(rows));
      })
      .catch(() => {
        if (!cancelled) setSchedule(null);
      });
    return () => {
      cancelled = true;
    };
  }, [props.mode, props.orgSlug, props.tournamentId, props.stageId]);

  const scheduleActive = props.mode === "league" && !!schedule && schedule.length > 0;

  // ── Build engine-shaped teams + config ─────────────────────────────
  // Memoized because it's passed to DrawStage which memoizes buildDrawPlan
  // by reference equality — we don't want a fresh array on every render.
  const { engineTeams, engineConfig } = useMemo(() => {
    // Schedule reveal: hand the real calendar to the engine, no teams needed.
    if (scheduleActive && schedule) {
      const seed = ["stage", props.stageId, "schedule", schedule.length].join(":");
      const config: DrawConfig = {
        mode: "schedule",
        seedingMode: "random",
        seed,
        scheduleMatches: schedule,
      };
      return { engineTeams: [] as DrawInputTeam[], engineConfig: config };
    }
    return buildTeamsConfig();

    function buildTeamsConfig() {
    const teams: DrawInputTeam[] = props.allTeams.map((team) => ({
      id: String(team.id),
      name: team.name,
      logoUrl: team.logoUrl ?? null,
      countryCode: team.countryCode ?? null,
      city: team.city ?? null,
      clubName: team.clubName ?? null,
      pot: team.pot ?? null,
    }));

    if (props.mode === "league" || props.mode === "playoff") {
      // Round-robin / bracket-pairing reveal over the whole roster — no
      // group assignment needed, so the seed is just the stage + team-id
      // set (stable across reopens, changes if the roster changes).
      const seed = [
        "stage",
        props.stageId,
        props.mode,
        ...teams.map((t) => t.id).sort(),
      ].join(":");
      const config: DrawConfig = {
        mode: props.mode,
        seedingMode: "random",
        seed,
      };
      return { engineTeams: teams, engineConfig: config };
    }

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
    }
  }, [scheduleActive, schedule, props.mode, props.allTeams, props.groups, props.stageId]);

  const assignedTeamCount = props.mode === "league" || props.mode === "playoff"
    ? props.allTeams.length
    : engineConfig.preAssignedGroups?.reduce((sum, g) => sum + g.length, 0) ?? 0;
  // The engine requires >= 2 groups for mode="groups" — a single filled
  // group (e.g. a division with just "Main Group", no A/B/C split) used to
  // pass the team-count check below and then throw once DrawStage actually
  // called buildDrawPlan(). Gate on group count too. Not applicable in
  // league/playoff mode — round-robin/bracket just needs >= 2 teams, no
  // groups at all.
  const needsMoreGroups = props.mode === "groups"
    && (engineConfig.preAssignedGroups?.filter((g) => g.length > 0).length ?? 0) < 2;

  // Set of team ids actually placed in a group — used to compute the
  // "team not in any group" remainder we surface in the done summary.
  // Every team participates in league/playoff mode, so nothing is "unassigned"
  // (an odd playoff roster gets a BYE inside the engine, not an exclusion here).
  const assignedIds = useMemo(() => {
    if (props.mode === "league" || props.mode === "playoff") {
      return new Set(props.allTeams.map((t) => t.id));
    }
    const s = new Set<number>();
    for (const g of props.groups) for (const id of g.teamIds) s.add(id);
    return s;
  }, [props.mode, props.groups, props.allTeams]);

  const handleOpen = useCallback(() => {
    if (assignedTeamCount < 2 || needsMoreGroups) return;
    setOpen(true);
  }, [assignedTeamCount, needsMoreGroups]);

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

  const canStart = assignedTeamCount >= 2 && !needsMoreGroups;

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={!canStart}
        title={!canStart && needsMoreGroups ? t("showDrawNeedsGroups") : undefined}
        className="inline-flex items-center gap-1.5 rounded-lg font-semibold px-3 py-1.5 text-xs transition-opacity hover:opacity-80 disabled:opacity-40"
        style={{
          background: "transparent",
          color: "var(--cat-accent)",
          border: "1px solid var(--cat-accent)",
        }}
      >
        <Sparkles className="w-3.5 h-3.5" />
        {scheduleActive ? t("showScheduleDraw") : t("showDraw")}
      </button>
      {open && (
        <DrawStage
          teams={engineTeams}
          config={engineConfig}
          title={
            ent.status === "ready" && ent.tournamentName
              ? ent.tournamentName
              : undefined
          }
          subtitle={props.divisionName}
          logoUrl={
            ent.status === "ready" ? ent.tournamentLogoUrl ?? null : null
          }
          onClose={handleClose}
          // Surface unassigned teams to the stage so the "draw complete"
          // summary can say "37 placed · 1 team not in a group" rather
          // than implicitly claiming every team is in a group.
          unassignedTeams={props.allTeams
            .filter((tm) => !assignedIds.has(tm.id))
            .map((tm) => tm.name)}
          totalTeamsCount={props.allTeams.length}
        />
      )}
    </>
  );
}

// ── Schedule helpers ─────────────────────────────────────────────────

/** "HH:MM" in the stored wall-clock (prod stores/serves times in UTC). */
function slotTimeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** "DD.MM" for multi-day tournaments so slots on different days differ. */
function slotDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}`;
}

/**
 * Turn the matches API rows into `ScheduleMatchInput[]`. Only real, placed
 * matches count (both teams set + a scheduled time). If the schedule spans
 * more than one day, slot labels get a "DD.MM " date prefix so identical
 * clock times on different days stay distinct.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildScheduleMatches(rows: any[]): ScheduleMatchInput[] {
  const placed = (rows ?? []).filter(
    (m) => m?.scheduledAt && m?.homeTeamId && m?.awayTeamId,
  );
  const multiDay =
    new Set(placed.map((m) => slotDateLabel(m.scheduledAt as string))).size > 1;

  return placed.map((m) => {
    const iso = m.scheduledAt as string;
    const time = slotTimeLabel(iso);
    return {
      slotKey: iso,
      slotLabel: multiDay ? `${slotDateLabel(iso)} ${time}` : time,
      slotSort: Date.parse(iso) || 0,
      fieldId: m.fieldId ?? null,
      fieldName: m.field?.name ?? "—",
      home: {
        id: String(m.homeTeamId),
        name: m.homeTeam?.name ?? "—",
        logoUrl: m.homeTeam?.club?.badgeUrl ?? null,
      },
      away: {
        id: String(m.awayTeamId),
        name: m.awayTeam?.name ?? "—",
        logoUrl: m.awayTeam?.club?.badgeUrl ?? null,
      },
    };
  });
}
