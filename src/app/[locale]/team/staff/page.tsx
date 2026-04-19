"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { StaffInlineTable } from "@/components/team/staff-inline-table";
import { HealthDisclaimer } from "@/components/team/health-disclaimer";
import { useTeam } from "@/lib/team-context";

type RosterStaff = {
  personId: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  personType: "player" | "staff" | "accompanying";
  isResponsibleOnSite: boolean;
  needsHotel: boolean;
};

export default function StaffPage() {
  const t = useTranslations("staff");
  const { teamId } = useTeam();
  const [registrationId, setRegistrationId] = useState<number | null>(null);
  const [staff, setStaff] = useState<RosterStaff[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setStaff([]);

    const overviewRes = await fetch(`/api/teams/${teamId}/overview`);
    if (!overviewRes.ok) { setLoading(false); return; }
    const overview = await overviewRes.json();
    const regId = overview.registration?.id ?? null;
    setRegistrationId(regId);

    if (regId) {
      const rosterRes = await fetch(`/api/registrations/${regId}/roster`);
      if (rosterRes.ok) {
        const data = await rosterRes.json();
        setStaff((data.people ?? []).filter((p: RosterStaff) => p.personType === "staff"));
      }
    }
    setLoading(false);
  }, [teamId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const hasResponsible = staff.some((s) => s.isResponsibleOnSite);

  const roleOptions = [
    { value: "headCoach", label: t("roles.headCoach") },
    { value: "assistant", label: t("roles.assistant") },
    { value: "physio", label: t("roles.physio") },
    { value: "teamManager", label: t("roles.teamManager") },
    { value: "other", label: t("roles.other") },
  ];

  if (loading) return null;

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold th-text">{t("title")}</h2>
        <p className="text-sm th-text-2 mt-0.5">{t("description")} ({staff.length})</p>
      </div>

      {!hasResponsible && (
        <Alert variant="warning">{t("noResponsibleWarning")}</Alert>
      )}

      <StaffInlineTable
        staff={staff}
        teamId={teamId!}
        registrationId={registrationId}
        roleOptions={roleOptions}
        onRefresh={fetchData}
      />

      <HealthDisclaimer />
    </div>
  );
}
