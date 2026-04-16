import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { ClubTournamentDetailClient } from "./tournament-detail-client";

type Props = {
  params: Promise<{ tournamentId: string }>;
};

export default async function ClubTournamentDetailPage({ params }: Props) {
  const session = await getSession();
  const locale = await getLocale();

  if (!session || session.role !== "club" || !session.clubId) {
    redirect(`/${locale}/login`);
  }

  const { tournamentId } = await params;

  return (
    <ClubTournamentDetailClient
      clubId={session.clubId}
      tournamentId={parseInt(tournamentId)}
    />
  );
}
