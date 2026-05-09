import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";

type Props = {
  params: Promise<{ tournamentId: string }>;
};

// /club/tournaments/[id] used to render an intermediate detail page
// that mostly duplicated /team/overview. It's gone — we now set the
// active_tournament_id cookie (so the team layout picks the right
// tournament) and forward the user to the operational area.
export default async function ClubTournamentDetailRedirect({ params }: Props) {
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
