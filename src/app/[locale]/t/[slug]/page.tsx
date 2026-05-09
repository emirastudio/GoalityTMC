import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { tournaments, organizations } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// Short tournament link: /<locale>/t/<slug>
//
// Resolves the (globally unique, see migration 0032) tournament slug,
// finds its org, and 302-redirects to the canonical long URL. Soft-
// deleted tournaments fall through to 404. This file is the public
// face of every shareable short link — QR codes, posters, etc.
export default async function ShortTournamentRoot({
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

  redirect(`/${locale}/t/${org.slug}/${t.slug}`);
}
