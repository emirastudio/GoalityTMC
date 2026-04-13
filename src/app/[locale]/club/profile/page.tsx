import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClubProfileClient } from "./profile-client";

export default async function ClubProfilePage() {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    redirect("/en/login");
  }

  return <ClubProfileClient clubId={session.clubId} />;
}
