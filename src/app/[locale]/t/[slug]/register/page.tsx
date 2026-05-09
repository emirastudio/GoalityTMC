import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { tournaments, organizations } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// Short registration link: /<locale>/t/<slug>/register
//
// Resolves the global slug → canonical /<locale>/t/<orgSlug>/<slug>/register.
// This is the URL we hand out to clubs (printed posters, club emails,
// social posts) — much shorter than the canonical and safe to share.
export default async function ShortTournamentRegister({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

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
