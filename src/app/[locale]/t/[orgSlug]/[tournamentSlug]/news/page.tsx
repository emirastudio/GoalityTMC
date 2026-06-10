import { db } from "@/db";
import {
  organizations,
  tournaments,
  tournamentNews,
  tournamentNewsReads,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { markdownToPlain } from "@/lib/markdown";
import { Newspaper, ArrowRight } from "lucide-react";

type Params = { locale: string; orgSlug: string; tournamentSlug: string };

export const dynamic = "force-dynamic";

export default async function TournamentNewsListPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, orgSlug, tournamentSlug } = await params;
  const t = await getTranslations({ locale, namespace: "tournament.news" });

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });
  if (!org) redirect(`/${locale}/catalog`);

  const tournament = await db.query.tournaments.findFirst({
    where: and(
      eq(tournaments.organizationId, org.id),
      eq(tournaments.slug, tournamentSlug),
    ),
  });
  if (!tournament) redirect(`/${locale}/catalog`);

  // Logged-in club → read markers for unread-dot rendering.
  const session = await getSession();
  const clubId = session?.role === "club" && session.clubId ? session.clubId : null;

  const posts = await db
    .select({
      id: tournamentNews.id,
      subject: tournamentNews.subject,
      bodyMarkdown: tournamentNews.bodyMarkdown,
      coverUrl: tournamentNews.coverUrl,
      publishedAt: tournamentNews.publishedAt,
      ctaLabel: tournamentNews.ctaLabel,
      ctaUrl: tournamentNews.ctaUrl,
    })
    .from(tournamentNews)
    .where(
      and(
        eq(tournamentNews.tournamentId, tournament.id),
        eq(tournamentNews.status, "published"),
      ),
    )
    .orderBy(desc(tournamentNews.id))
    .limit(40);

  // Compute unread set in one go for the club.
  let readIds = new Set<number>();
  if (clubId && posts.length > 0) {
    const ids = posts.map((p) => p.id);
    const reads = await db
      .select({ newsId: tournamentNewsReads.newsId })
      .from(tournamentNewsReads)
      .where(
        and(
          eq(tournamentNewsReads.clubId, clubId),
          // Use SQL IN for the small list.
          sql`${tournamentNewsReads.newsId} IN (${sql.join(ids, sql`, `)})`,
        ),
      );
    readIds = new Set(reads.map((r) => r.newsId));
  }

  const baseHref = `/t/${orgSlug}/${tournamentSlug}/news`;

  if (posts.length === 0) {
    return (
      <div className="py-12 text-center">
        <Newspaper className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--cat-text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-16">
      <h1 className="text-2xl md:text-3xl font-black mb-2" style={{ color: "var(--cat-text)" }}>
        {t("pageTitle")}
      </h1>

      <div className="grid gap-4">
        {posts.map((post) => {
          const isUnread = clubId !== null && !readIds.has(post.id);
          const excerpt = markdownToPlain(post.bodyMarkdown, 220);
          const dateLabel = post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString(locale, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "";
          return (
            <Link
              key={post.id}
              href={`${baseHref}/${post.id}`}
              className="rounded-2xl border overflow-hidden transition-all hover:scale-[1.005]"
              style={{
                background: "var(--cat-card-bg)",
                borderColor: isUnread ? "rgba(43,254,186,0.4)" : "var(--cat-card-border)",
                boxShadow: isUnread
                  ? "0 4px 24px rgba(43,254,186,0.15)"
                  : "0 4px 24px rgba(0,0,0,0.2)",
              }}
            >
              {post.coverUrl && (
                <div className="relative w-full" style={{ aspectRatio: "1200/630" }}>
                  <img
                    src={post.coverUrl}
                    alt={post.subject}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  {isUnread && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: "var(--cat-accent)" }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: "var(--cat-accent)" }} />
                      {t("published")}
                    </span>
                  )}
                  {dateLabel && (
                    <span className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                      {dateLabel}
                    </span>
                  )}
                </div>
                <h2
                  className="text-lg md:text-xl font-bold leading-snug"
                  style={{ color: "var(--cat-text)" }}
                >
                  {post.subject}
                </h2>
                {excerpt && (
                  <p
                    className="mt-2 text-sm leading-relaxed"
                    style={{ color: "var(--cat-text-secondary)" }}
                  >
                    {excerpt}
                  </p>
                )}
                <span
                  className="inline-flex items-center gap-1 mt-3 text-xs font-semibold"
                  style={{ color: "var(--cat-accent)" }}
                >
                  {t("readMore")} <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
