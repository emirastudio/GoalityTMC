import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";

type Props = {
  params: Promise<{ tournamentId: string }>;
};

// /club/tournaments/[id] is no longer a real page — the detail UI
// duplicated /team/overview and was removed. Any direct hit (browser
// history, bookmark, manual URL) is forwarded to /team/overview after
// pinning the requested tournament as the active one for the team
// layout. The cookie is plain (not httpOnly) so the same flow as a
// client-side click on the tournament list still applies.
export default async function ClubTournamentRedirect({ params }: Props) {
  const session = await getSession();
  const locale = await getLocale();

  if (!session || session.role !== "club" || !session.clubId) {
    redirect(`/${locale}/login`);
  }

  const { tournamentId } = await params;
  const tid = parseInt(tournamentId);
  if (Number.isFinite(tid)) {
    const jar = await cookies();
    jar.set("active_tournament_id", String(tid), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  redirect(`/${locale}/team/overview`);
}
