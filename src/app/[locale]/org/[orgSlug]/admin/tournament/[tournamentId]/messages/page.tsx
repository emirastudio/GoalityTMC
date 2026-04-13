"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MessagesPageContent } from "@/components/admin/pages/messages-page";
import { PlanGate } from "@/components/ui/plan-gate";

export default function OrgMessagesPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const tournamentId = Number(params.tournamentId);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/billing-info`)
      .then(r => r.json())
      .then(d => setHasAccess(d.features?.hasMessaging === true))
      .catch(() => setHasAccess(true)); // fail open
  }, [orgSlug, tournamentId]);

  if (hasAccess === null) return null;
  if (!hasAccess) return <PlanGate feature="hasMessaging" orgSlug={orgSlug} tournamentId={tournamentId} />;
  return <MessagesPageContent />;
}
