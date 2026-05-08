import { redirect } from "next/navigation";

/**
 * Legacy /settings route. The settings page was merged into /setup so admins
 * have one place for everything tournament-related. Permanent redirect.
 */
export default async function TournamentSettingsRedirect({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string; tournamentId: string }>;
}) {
  const { locale, orgSlug, tournamentId } = await params;
  redirect(`/${locale}/org/${orgSlug}/admin/tournament/${tournamentId}/setup`);
}
