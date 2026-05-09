import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { tournaments, organizations } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// Short tournament link: /<locale>/t/<slug>
//
// Lives at /[orgSlug]/page.tsx (1-segment route under /t/). Next.js
// requires identical dynamic-param names at the same path depth, so
// the "orgSlug" param is reused here as the TOURNAMENT slug. We
// resolve the globally unique tournament slug (see migration 0032),
// find its org, and 302-redirect to the canonical long URL. Soft-
// deleted tournaments fall through to 404.
export default async function ShortTournamentRoot({
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

  redirect(`/${locale}/t/${org.slug}/${t.slug}`);
}
