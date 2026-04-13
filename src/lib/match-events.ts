/**
 * match-events.ts
 *
 * In-memory event emitter for real-time match score broadcasts.
 * Used by:
 *   - PATCH /matches/[matchId]/result → emit("match:update", { tournamentId, matchId, ... })
 *   - GET  /api/public/t/[orgSlug]/[slug]/live → SSE endpoint subscribes
 *
 * Single-process only (PM2 fork mode). Works fine for our architecture.
 */

import { EventEmitter } from "events";

export type MatchUpdateEvent = {
  tournamentId:  number;
  matchId:       number;
  groupId:       number | null;
  homeTeamId:    number | null;
  awayTeamId:    number | null;
  homeScore:     number | null;
  awayScore:     number | null;
  status:        string;
};

// Global singleton — survives across requests in the same Node.js process
const globalForEmitter = global as unknown as { _matchEmitter?: EventEmitter };

if (!globalForEmitter._matchEmitter) {
  globalForEmitter._matchEmitter = new EventEmitter();
  globalForEmitter._matchEmitter.setMaxListeners(500); // allow many SSE clients
}

export const matchEmitter: EventEmitter = globalForEmitter._matchEmitter;

/** Emit a match update to all SSE subscribers of this tournament */
export function emitMatchUpdate(event: MatchUpdateEvent) {
  matchEmitter.emit(`tournament:${event.tournamentId}`, event);
}

/** Subscribe to match updates for a tournament (used by SSE route) */
export function onMatchUpdate(
  tournamentId: number,
  handler: (event: MatchUpdateEvent) => void
): () => void {
  const key = `tournament:${tournamentId}`;
  matchEmitter.on(key, handler);
  return () => matchEmitter.off(key, handler);   // returns unsubscribe fn
}
