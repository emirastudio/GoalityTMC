"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { StaffInlineTable } from "@/components/team/staff-inline-table";
import { HealthDisclaimer } from "@/components/team/health-disclaimer";
import { useTeam } from "@/lib/team-context";

export default function StaffPage() {
  const t = useTranslations("staff");
  const tp = useTranslations("people");
  const { teamId } = useTeam();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = useCallback(async () => {
    if (!teamId) return;
    const res = await fetch(`/api/teams/${teamId}/people?type=staff`);
    if (res.ok) setStaff(await res.json());
    setLoading(false);
  }, [teamId]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const hasResponsible = staff.some((s: any) => s.isResponsibleOnSite);

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
        roleOptions={roleOptions}
        onRefresh={fetchStaff}
      />

      <HealthDisclaimer />
    </div>
  );
}
