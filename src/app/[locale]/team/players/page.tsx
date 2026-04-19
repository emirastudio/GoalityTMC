"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { PlayerInlineTable } from "@/components/team/player-inline-table";
import { HealthDisclaimer } from "@/components/team/health-disclaimer";
import { useTeam } from "@/lib/team-context";

type RosterPlayer = {
  personId: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  position: string | null;
  personType: "player" | "staff" | "accompanying";
  includedInRoster: boolean;
  needsHotel: boolean;
  shirtNumber: number | null;
  allergies: string | null;
  dietaryRequirements: string | null;
  medicalNotes: string | null;
};

export default function PlayersPage() {
  const t = useTranslations("players");
  const tp = useTranslations("people");
  const { teamId } = useTeam();
  const [registrationId, setRegistrationId] = useState<number | null>(null);
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [minBirthYear, setMinBirthYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setPlayers([]);

    // 1. overview даёт registration.id + minBirthYear
    const overviewRes = await fetch(`/api/teams/${teamId}/overview`);
    if (!overviewRes.ok) { setLoading(false); return; }
    const overview = await overviewRes.json();
    const regId = overview.registration?.id ?? null;
    setRegistrationId(regId);
    setMinBirthYear(overview.minBirthYear ?? null);

    // 2. ростер с турнирными полями (номер, отель, аллергии, медицина)
    if (regId) {
      const rosterRes = await fetch(`/api/registrations/${regId}/roster`);
      if (rosterRes.ok) {
        const data = await rosterRes.json();
        const playersOnly: RosterPlayer[] = (data.people ?? []).filter(
          (p: RosterPlayer) => p.personType === "player"
        );
        setPlayers(playersOnly);
      }
    }
    setLoading(false);
  }, [teamId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const positionOptions = [
    { value: "goalkeeper", label: t("positions.goalkeeper") },
    { value: "defender", label: t("positions.defender") },
    { value: "midfielder", label: t("positions.midfielder") },
    { value: "forward", label: t("positions.forward") },
  ];

  if (loading) return null;

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold th-text">{t("title")}</h2>
        <p className="text-sm th-text-2 mt-0.5">
          {t("description")} ({players.length})
        </p>
      </div>

      {minBirthYear && (
        <Alert variant="info">
          {tp("birthYearInfo", { year: String(minBirthYear) })}
        </Alert>
      )}

      <PlayerInlineTable
        players={players}
        teamId={teamId!}
        registrationId={registrationId}
        positionOptions={positionOptions}
        onRefresh={fetchData}
      />

      <HealthDisclaimer />
    </div>
  );
}
