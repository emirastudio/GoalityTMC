import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { ClubTournamentsClient } from "./tournaments-client";

export default async function ClubTournamentsPage() {
  const session = await getSession();
  const locale = await getLocale();

  if (!session || session.role !== "club" || !session.clubId) {
    redirect(`/${locale}/login`);
  }

  return <ClubTournamentsClient clubId={session.clubId} />;
}
