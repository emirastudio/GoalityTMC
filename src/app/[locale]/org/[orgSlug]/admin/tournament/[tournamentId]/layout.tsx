import { getSession } from "@/lib/auth";
import { authorizeOrg, getOrgTournament, getOrgTournaments } from "@/lib/tenant";
import { TournamentProvider } from "@/lib/tournament-context";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { PlanUpgradeRedirect } from "./plan-upgrade-redirect";

// Force dynamic so layout re-evaluates on every request
export const dynamic = "force-dynamic";

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

  // If deletion is requested — block all editing, redirect to org dashboard
  if ((tournament as any).deleteRequestedAt) {
    redirect(`/${locale}/org/${orgSlug}/admin?pendingDeletion=${tournament.id}`);
  }

  // Free plan: only 1 active tournament allowed per org.
  // If this tournament is free AND it's not the only active one → require upgrade.
  // Skip if already on billing page to avoid infinite redirect loop.
  // Use client-side redirect component instead of redirect() to avoid RSC crash.
  const h = await headers();
  const xPathname = h.get("x-pathname") ?? "";
  const isOnBillingPage = xPathname.endsWith("/billing");

  if (tournament.plan === "free" && !isOnBillingPage) {
    const allTournaments = await getOrgTournaments(organization.id);
    const activeTournaments = allTournaments.filter(
      (t) => !(t as any).deleteRequestedAt
    );
    const firstActive = activeTournaments.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];
    const isFreeSeat =
      activeTournaments.length <= 1 || firstActive?.id === tournament.id;

    if (!isFreeSeat) {
      const billingUrl = `/${locale}/org/${orgSlug}/admin/tournament/${tournament.id}/billing?reason=plan_required`;
      return (
        <TournamentProvider tournamentId={tournament.id} orgSlug={orgSlug}>
          <PlanUpgradeRedirect billingUrl={billingUrl} />
        </TournamentProvider>
      );
    }
  }

  return (
    <TournamentProvider tournamentId={tournament.id} orgSlug={orgSlug}>
      {children}
    </TournamentProvider>
  );
}
