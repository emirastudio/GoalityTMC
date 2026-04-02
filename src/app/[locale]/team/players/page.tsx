"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { PlayerInlineTable } from "@/components/team/player-inline-table";
import { HealthDisclaimer } from "@/components/team/health-disclaimer";
import { useTeam } from "@/lib/team-context";

export default function PlayersPage() {
  const t = useTranslations("players");
  const tp = useTranslations("people");
  const { teamId } = useTeam();
  const [players, setPlayers] = useState<any[]>([]);
  const [minBirthYear, setMinBirthYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlayers = useCallback(async () => {
    if (!teamId) return;
    const [playersRes, overviewRes] = await Promise.all([
      fetch(`/api/teams/${teamId}/people?type=player`),
      fetch(`/api/teams/${teamId}/overview`),
    ]);
    if (playersRes.ok) setPlayers(await playersRes.json());
    if (overviewRes.ok) {
      const data = await overviewRes.json();
      setMinBirthYear(data.minBirthYear ?? null);
    }
    setLoading(false);
  }, [teamId]);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

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
        positionOptions={positionOptions}
        onRefresh={fetchPlayers}
      />

      <HealthDisclaimer />
    </div>
  );
}
