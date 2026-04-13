/**
 * live-standings.ts
 *
 * Computes PROVISIONAL (live) group standings by overlaying
 * in-progress match scores on top of stored (finished-only) standings.
 *
 * Used by the public standings API for Pro/Elite plan tournaments.
 */

import { db } from "@/db";
import { matches } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export type LiveMatch = {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
};

// Accepts any standing row shape (from Drizzle relations) — just needs numeric fields
export type StoredStandingRow = {
  teamId: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  position: number | null;
  form: string[] | null;
  headToHead: Record<string, unknown> | null;
  // team object (nested) — kept as-is
  team?: unknown;
  [key: string]: unknown;
};

export type LiveStandingRow = StoredStandingRow & {
  provisional: boolean;   // true = row has a live in-progress contribution
  livePoints: number;     // provisional points added from live match(es)
};

export type LiveGroupResult = {
  hasLive: boolean;
  liveMatches: LiveMatch[];
  standings: LiveStandingRow[];
};

/**
 * Merge in-progress match scores into stored standings.
 *
 * @param groupId      - DB group ID
 * @param storedRows   - standings rows from the DB (finished matches only)
 * @param pointsWin    - points for a win (default 3)
 * @param pointsDraw   - points for a draw (default 1)
 */
export async function computeLiveGroupStandings(
  groupId: number,
  storedRows: StoredStandingRow[],
  pointsWin = 3,
  pointsDraw = 1,
): Promise<LiveGroupResult> {

  // Fetch all currently live matches for this group
  const raw = await db
    .select({
      id:          matches.id,
      homeTeamId:  matches.homeTeamId,
      awayTeamId:  matches.awayTeamId,
      homeScore:   matches.homeScore,
      awayScore:   matches.awayScore,
    })
    .from(matches)
    .where(and(
      eq(matches.groupId, groupId),
      eq(matches.status, "live"),
      isNull(matches.deletedAt)
    ));

  // Only keep matches where both teams are known
  const liveMatches: LiveMatch[] = raw
    .filter(m => m.homeTeamId != null && m.awayTeamId != null)
    .map(m => ({
      id:          m.id,
      homeTeamId:  m.homeTeamId!,
      awayTeamId:  m.awayTeamId!,
      homeScore:   m.homeScore ?? 0,
      awayScore:   m.awayScore ?? 0,
    }));

  if (liveMatches.length === 0) {
    return {
      hasLive:     false,
      liveMatches: [],
      standings:   storedRows.map(r => ({ ...r, provisional: false, livePoints: 0 })),
    };
  }

  // ── Build per-team adjustment from live matches ──────────────────────────────

  type Adj = {
    points: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
  };

  const adj = new Map<number, Adj>();
  const emptyAdj = (): Adj => ({ points: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 });

  for (const m of liveMatches) {
    const hs  = m.homeScore;
    const as_ = m.awayScore;

    const home = adj.get(m.homeTeamId) ?? emptyAdj();
    const away = adj.get(m.awayTeamId) ?? emptyAdj();

    if (hs > as_) {
      home.points += pointsWin; home.won  += 1;
      away.lost   += 1;
    } else if (hs < as_) {
      away.points += pointsWin; away.won  += 1;
      home.lost   += 1;
    } else {
      home.points += pointsDraw; home.drawn += 1;
      away.points += pointsDraw; away.drawn += 1;
    }

    home.goalsFor      += hs;   home.goalsAgainst += as_;
    away.goalsFor      += as_;  away.goalsAgainst += hs;

    adj.set(m.homeTeamId, home);
    adj.set(m.awayTeamId, away);
  }

  // ── Merge into stored rows ───────────────────────────────────────────────────

  const merged: LiveStandingRow[] = storedRows.map(row => {
    const a = adj.get(row.teamId);
    if (!a) return { ...row, provisional: false, livePoints: 0 };

    const gf = row.goalsFor  + a.goalsFor;
    const ga = row.goalsAgainst + a.goalsAgainst;

    return {
      ...row,
      played:        row.played        + 1,          // one match in progress
      won:           row.won           + a.won,
      drawn:         row.drawn         + a.drawn,
      lost:          row.lost          + a.lost,
      goalsFor:      gf,
      goalsAgainst:  ga,
      goalDiff:      gf - ga,
      points:        row.points        + a.points,
      provisional:   true,
      livePoints:    a.points,
    };
  });

  // ── Re-sort: points → goal diff → goals for ──────────────────────────────────

  merged.sort((a, b) =>
    b.points  - a.points  ||
    b.goalDiff - a.goalDiff ||
    b.goalsFor - a.goalsFor
  );

  merged.forEach((row, i) => { row.position = i + 1; });

  return { hasLive: true, liveMatches, standings: merged };
}
