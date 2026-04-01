"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type TeamContextType = {
  teamId: number | null;
  clubId: number | null;
  tournamentId: number | null;
  setTeamId: (id: number) => void;
  inboxCount: number;
  setInboxCount: (n: number) => void;
  isTeamManager: boolean; // тренер команды — видит только свою команду
};

const TeamContext = createContext<TeamContextType>({
  teamId: null,
  clubId: null,
  tournamentId: null,
  setTeamId: () => {},
  inboxCount: 0,
  setInboxCount: () => {},
  isTeamManager: false,
});

export function TeamProvider({
  children,
  initialTeamId,
  initialClubId,
  initialTournamentId,
  initialInboxCount,
  isTeamManager = false,
}: {
  children: ReactNode;
  initialTeamId: number | null;
  initialClubId: number | null;
  initialTournamentId: number | null;
  initialInboxCount: number;
  isTeamManager?: boolean;
}) {
  const [teamId, setTeamId] = useState(initialTeamId);
  const [inboxCount, setInboxCount] = useState(initialInboxCount);

  return (
    <TeamContext.Provider value={{ teamId, clubId: initialClubId, tournamentId: initialTournamentId, setTeamId, inboxCount, setInboxCount, isTeamManager }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}
