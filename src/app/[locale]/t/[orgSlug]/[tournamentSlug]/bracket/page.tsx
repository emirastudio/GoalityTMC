import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string; orgSlug: string; tournamentSlug: string }>;
};

export default async function BracketRedirectPage({ params }: Props) {
  const { locale, orgSlug, tournamentSlug } = await params;
  redirect(`/${locale}/t/${orgSlug}/${tournamentSlug}/standings`);
}
