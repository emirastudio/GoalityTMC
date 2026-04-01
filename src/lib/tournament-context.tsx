"use client";

import { createContext, useContext, type ReactNode } from "react";

type TournamentContextType = {
  tournamentId: number;
  orgSlug: string;
};

const TournamentContext = createContext<TournamentContextType | null>(null);

export function TournamentProvider({
  tournamentId,
  orgSlug,
  children,
}: TournamentContextType & { children: ReactNode }) {
  return (
    <TournamentContext.Provider value={{ tournamentId, orgSlug }}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const ctx = useContext(TournamentContext);
  return ctx;
}

/**
 * Build an API URL with tournamentId query param.
 * Use this in fetch calls to make them tenant-aware.
 *
 * Example: apiUrl("/api/admin/teams", 5) → "/api/admin/teams?tournamentId=5"
 */
export function apiUrl(path: string, tournamentId?: number | null): string {
  if (!tournamentId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}tournamentId=${tournamentId}`;
}
