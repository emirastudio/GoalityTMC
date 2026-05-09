import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { tournaments, organizations } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// Short registration link: /<locale>/t/<slug>/register
//
// The "orgSlug" param is reused here as the TOURNAMENT slug (Next.js
// rule: same dynamic-param name at the same path depth). Resolves the
// global slug → canonical /<locale>/t/<orgSlug>/<slug>/register. The
// shareable URL we hand out — short, posters/QR-friendly.
export default async function ShortTournamentRegister({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string }>;
}) {
  const { locale, orgSlug: slug } = await params;

  const t = await db.query.tournaments.findFirst({
    where: and(eq(tournaments.slug, slug), isNull(tournaments.deletedAt)),
  });
  if (!t) notFound();

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, t.organizationId),
  });
  if (!org) notFound();

  redirect(`/${locale}/t/${org.slug}/${t.slug}/register`);
}
