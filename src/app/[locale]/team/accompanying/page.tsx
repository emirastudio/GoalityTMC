"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { AccompanyingInlineTable } from "@/components/team/accompanying-inline-table";
import { HealthDisclaimer } from "@/components/team/health-disclaimer";
import { useTeam } from "@/lib/team-context";

export default function AccompanyingPage() {
  const t = useTranslations("accompanying");
  const { teamId } = useTeam();
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPersons = useCallback(async () => {
    if (!teamId) return;
    const res = await fetch(`/api/teams/${teamId}/people?type=accompanying`);
    if (res.ok) setPersons(await res.json());
    setLoading(false);
  }, [teamId]);

  useEffect(() => { fetchPersons(); }, [fetchPersons]);

  if (loading) return null;

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-text-primary">{t("title")}</h2>
        <p className="text-sm text-text-secondary mt-0.5">{t("description")} ({persons.length})</p>
      </div>

      <AccompanyingInlineTable
        persons={persons}
        teamId={teamId!}
        onRefresh={fetchPersons}
      />

      <HealthDisclaimer />
    </div>
  );
}
