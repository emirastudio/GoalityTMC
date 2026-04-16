/**
 * Draw Show — types shared between the pure draw engine and the React
 * presentation layer. This file is the contract: any surface that wants to
 * feed teams into a Draw Show (embedded tournament page, standalone /draw
 * wizard, future formats) speaks in these shapes.
 *
 * No React, no DOM, no Next.js — keep this file importable from anywhere.
 */

/**
 * A team as it enters the draw. Only `id` and `name` are required.
 * Everything else is optional decoration for the presentation layer.
 *
 * `id` must be stable within a single draw (used as React key and for
 * deterministic ordering); collisions are the caller's problem.
 */
export type DrawInputTeam = {
  id: string;
  name: string;
  /** Image URL for the team/club badge shown on the card. */
  logoUrl?: string | null;
  /** ISO-3166 alpha-2 country code, uppercased (e.g. "EE", "RU"). Used for flag. */
  countryCode?: string | null;
  /** Human city, e.g. "Tallinn". Rendered as a secondary line on the card. */
  city?: string | null;
  /** Human club name, e.g. "FC Emira". Rendered when different from team name. */
  clubName?: string | null;
  /**
   * Seeding pot index (1-based). When `DrawConfig.seedingMode === "pots"`,
   * teams are drawn pot-by-pot so strong teams end up in different groups.
   * Ignored in random mode.
   */
  pot?: number | null;
};

/**
 * How the engine should arrange the teams.
 *
 * - `groups` — distribute N teams into K groups (no pairings generated).
 * - `playoff` — pair teams into N/2 matches, no groups.
 * - `league` — round-robin: every team plays every other team once. Draw
 *   reveals the full schedule round by round, pair by pair.
 * - `groups-playoff` — reserved for a future iteration; engine may throw.
 */
export type DrawMode = "groups" | "playoff" | "league" | "groups-playoff";

/**
 * - `random` — fully random order, one team at a time.
 * - `pots` — rotate through pots; all pot-1 teams placed first (one per
 *   group), then pot-2, etc. Requires every team to have a `pot` value.
 */
export type SeedingMode = "random" | "pots";

/**
 * Input configuration for `buildDrawPlan`.
 *
 * `seed` is REQUIRED for reproducibility. Pass `Date.now().toString()` when
 * you don't care, or a stable string (e.g. "tournament-42-stage-7") when you
 * want the same teams + same seed to always produce the same show.
 */
export type DrawConfig = {
  mode: DrawMode;
  /** Required when mode === "groups" or "groups-playoff". Number of groups. */
  groupCount?: number;
  seedingMode: SeedingMode;
  seed: string;
  /**
   * Pre-assigned distribution: `preAssigned[groupIdx][slotIdx] = teamId`.
   * When provided (used by the embedded flow where the organizer has already
   * placed teams into groups on the Schedule page), the engine preserves the
   * mapping and only computes the REVEAL ORDER — i.e. which team pops out
   * of the virtual urn first, second, etc.
   *
   * When absent, the engine performs a real distribution from scratch.
   */
  preAssignedGroups?: string[][];
  /** Same idea but for playoff pairs: `preAssignedPairs[i] = [homeId, awayId]`. */
  preAssignedPairs?: [string, string][];
};

/**
 * A single step in the draw animation sequence. Emit one at a time with a
 * delay between them to produce the "one ball from the urn" feeling.
 *
 * The presentation layer consumes this list; it does not need to know
 * anything about seeding or pots — just "show this team appearing in that
 * slot".
 */
export type DrawStep =
  | {
      kind: "place-group";
      /** Step index, 0-based. Stable ordering. */
      index: number;
      team: DrawInputTeam;
      /** 0-based group index. Map to letter via `String.fromCharCode(65+i)`. */
      groupIndex: number;
      /** 0-based slot within the group. */
      slotIndex: number;
      /** Pot number this team came from (for caption "Pot 1"), if applicable. */
      pot?: number | null;
    }
  | {
      kind: "pair";
      index: number;
      team: DrawInputTeam;
      /** 0-based pair index. */
      pairIndex: number;
      /** Which side of the pair this team goes on. */
      side: "home" | "away";
    }
  | {
      kind: "league-match";
      index: number;
      /** 1-based round number (Berger output uses 1..N-1 for n teams). */
      round: number;
      /** 0-based match index within the round. */
      matchInRound: number;
      home: DrawInputTeam;
      away: DrawInputTeam;
    };

/**
 * Output of the engine: the final layout + the ordered reveal sequence.
 *
 * - `groups` is populated when `config.mode === "groups"`.
 * - `pairs` is populated when `config.mode === "playoff"`.
 * - `steps` is ALWAYS populated — this is what the stage animates.
 *
 * `seed` is echoed back so the caller can store/share it for reproducibility.
 */
export type DrawResult = {
  config: DrawConfig;
  seed: string;
  groups?: DrawInputTeam[][];
  pairs?: [DrawInputTeam, DrawInputTeam][];
  /**
   * League round-robin schedule: `leagueRounds[round-1]` is the list of
   * matches in that round. Populated when `config.mode === "league"`.
   */
  leagueRounds?: { home: DrawInputTeam; away: DrawInputTeam }[][];
  steps: DrawStep[];
};

/**
 * Minimal state object we serialize into the share URL for the standalone
 * flow. Keep this small — it goes through base64url and has to fit in a URL.
 *
 * We intentionally do NOT include logoUrl / city / clubName here: only names
 * + optional country code survive the round-trip, to keep URLs short. The
 * embedded flow has the full context from the DB and doesn't need this.
 */
export type ShareableDrawState = {
  /** Schema version. Bump when shape changes so old links don't silently break. */
  v: 1;
  config: Pick<DrawConfig, "mode" | "groupCount" | "seedingMode" | "seed">;
  teams: {
    id: string;
    name: string;
    countryCode?: string | null;
    logoUrl?: string | null;
    pot?: number | null;
  }[];
  /**
   * Optional event-level branding rendered in the stage header when
   * the user fills it into the wizard. None of these are required: an
   * empty set falls back to the default "Tournament Draw" title.
   */
  branding?: {
    tournamentName?: string;
    divisionName?: string;
    logoUrl?: string;
  };
  /**
   * Optional ISO timestamp for a scheduled premiere. When present and
   * in the future, the present page shows a countdown instead of
   * immediately starting the show. Hitting the timestamp (or any visit
   * after it) plays the premiere; subsequent visits play replays.
   */
  scheduledAt?: string;
};
