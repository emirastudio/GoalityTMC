"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { AccompanyingInlineTable } from "@/components/team/accompanying-inline-table";
import { HealthDisclaimer } from "@/components/team/health-disclaimer";
import { useTeam } from "@/lib/team-context";

type RosterAccompanying = {
  personId: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  personType: "player" | "staff" | "accompanying";
  needsHotel: boolean;
  allergies: string | null;
  dietaryRequirements: string | null;
  medicalNotes: string | null;
};

export default function AccompanyingPage() {
  const t = useTranslations("accompanying");
  const { teamId } = useTeam();
  const [registrationId, setRegistrationId] = useState<number | null>(null);
  const [persons, setPersons] = useState<RosterAccompanying[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setPersons([]);

    const overviewRes = await fetch(`/api/teams/${teamId}/overview`);
    if (!overviewRes.ok) { setLoading(false); return; }
    const overview = await overviewRes.json();
    const regId = overview.registration?.id ?? null;
    setRegistrationId(regId);

    if (regId) {
      const rosterRes = await fetch(`/api/registrations/${regId}/roster`);
      if (rosterRes.ok) {
        const data = await rosterRes.json();
        setPersons((data.people ?? []).filter((p: RosterAccompanying) => p.personType === "accompanying"));
      }
    }
    setLoading(false);
  }, [teamId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return null;

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold th-text">{t("title")}</h2>
        <p className="text-sm th-text-2 mt-0.5">{t("description")} ({persons.length})</p>
      </div>

      <AccompanyingInlineTable
        persons={persons}
        teamId={teamId!}
        registrationId={registrationId}
        onRefresh={fetchData}
      />

      <HealthDisclaimer />
    </div>
  );
}
