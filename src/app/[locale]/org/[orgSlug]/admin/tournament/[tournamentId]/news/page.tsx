"use client";

import { useParams } from "next/navigation";
import { OrgNewsPageContent } from "@/components/admin/pages/news-page";

export default function OrgNewsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const tournamentId = Number(params.tournamentId);
  return <OrgNewsPageContent orgSlug={orgSlug} tournamentId={tournamentId} />;
}
