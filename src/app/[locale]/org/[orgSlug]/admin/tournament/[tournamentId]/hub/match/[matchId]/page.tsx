"use client";

import { use } from "react";
import { MatchProtocolPage } from "@/components/admin/pages/match-protocol-page";

interface Props {
  params: Promise<{ matchId: string }>;
}

export default function TournamentMatchProtocolPage({ params }: Props) {
  const { matchId } = use(params);
  return <MatchProtocolPage matchId={parseInt(matchId)} />;
}
