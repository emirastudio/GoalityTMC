"use client";
import { createContext, useContext } from "react";

export type TournamentPublicData = {
  org: { name: string; slug: string; logo: string | null; brandColor: string; city: string | null; country: string | null; contactEmail: string | null; website: string | null };
  // Resolved contact — tournament Step 7 with org fallback (см. layout.tsx).
  contact: {
    name: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    city: string | null;
    country: string | null;
    instagram: string | null;
    facebook: string | null;
    twitter: string | null;
    youtube: string | null;
  };
  tournament: { id: number; name: string; slug: string; year: number; description: string | null; descriptionRu: string | null; descriptionEt: string | null; descriptionEs: string | null; logoUrl: string | null; coverUrl: string | null; registrationOpen: boolean; registrationDeadline: string | null; startDate: string | null; endDate: string | null; currency: string };
  stats: { clubCount: number; teamCount: number; classCount: number; days: number | null };
  classes: { id: number; name: string; format: string | null; minBirthYear: number | null; maxBirthYear: number | null; maxPlayers: number | null; teamCount: number }[];
};

const Ctx = createContext<TournamentPublicData | null>(null);

export function TournamentPublicProvider({ children, data }: { children: React.ReactNode; data: TournamentPublicData }) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useTournamentPublic() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Must be inside TournamentPublicProvider");
  return ctx;
}
