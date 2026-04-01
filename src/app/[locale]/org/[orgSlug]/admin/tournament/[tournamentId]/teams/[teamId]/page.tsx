"use client";
import { useParams } from "next/navigation";
import { TeamDetailPageContent } from "@/components/admin/pages/team-detail-page";
export default function OrgTeamDetailPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  return <TeamDetailPageContent teamId={teamId} />;
}
