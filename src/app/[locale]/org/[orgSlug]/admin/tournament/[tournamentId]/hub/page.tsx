"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MatchHubPage } from "@/components/admin/pages/match-hub-page";
import { PlanGate } from "@/components/ui/plan-gate";

export default function TournamentHubPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const tournamentId = Number(params.tournamentId);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/billing-info`)
      .then(r => r.json())
      .then(d => setHasAccess(d.features?.hasMatchHub === true))
      .catch(() => setHasAccess(true));
  }, [orgSlug, tournamentId]);

  if (hasAccess === null) return null;
  if (!hasAccess) return <PlanGate feature="hasMatchHub" orgSlug={orgSlug} tournamentId={tournamentId} />;
  return <MatchHubPage />;
}
