import { getSession } from "@/lib/auth";
import { authorizeOrg, getOrgTournament } from "@/lib/tenant";
import { TournamentProvider } from "@/lib/tournament-context";
import { redirect } from "next/navigation";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string; orgSlug: string; tournamentId: string }>;
};

export default async function TournamentLayout({ children, params }: Props) {
  const { locale, orgSlug, tournamentId } = await params;
  const session = await getSession();

  if (!session || session.role !== "admin") {
    redirect(`/${locale}/login`);
  }

  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) {
    redirect(`/${locale}/login`);
  }

  const tournament = await getOrgTournament(
    parseInt(tournamentId),
    organization.id
  );

  if (!tournament) {
    redirect(`/${locale}/org/${orgSlug}/admin/tournaments`);
  }

  return (
    <TournamentProvider tournamentId={tournament.id} orgSlug={orgSlug}>
      {children}
    </TournamentProvider>
  );
}
