"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PaymentsPageContent } from "@/components/admin/pages/payments-page";
import { PlanGate } from "@/components/ui/plan-gate";

export default function OrgPaymentsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const tournamentId = Number(params.tournamentId);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/billing-info`)
      .then(r => r.json())
      .then(d => setHasAccess(d.features?.hasFinance === true))
      .catch(() => setHasAccess(false));
  }, [orgSlug, tournamentId]);

  if (hasAccess === null) return null;
  if (!hasAccess) return <PlanGate feature="hasFinance" orgSlug={orgSlug} tournamentId={tournamentId} />;
  return <PaymentsPageContent />;
}
