import { db } from "@/db";
import {
  organizations,
  tournaments,
  tournamentNews,
  adminUsers,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { cache } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { markdownToHtml, markdownToPlain } from "@/lib/markdown";
import { getSession } from "@/lib/auth";
import { NewsReadMarker } from "./read-marker";

type Params = {
  locale: string;
  orgSlug: string;
  tournamentSlug: string;
  newsId: string;
};

const BASE = "https://goalityfootball.com";

const fetchPost = cache(async (orgSlug: string, tournamentSlug: string, newsId: string) => {
  const nId = parseInt(newsId);
  if (Number.isNaN(nId)) return null;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });
  if (!org) return null;

  const tournament = await db.query.tournaments.findFirst({
    where: and(
      eq(tournaments.organizationId, org.id),
      eq(tournaments.slug, tournamentSlug),
    ),
  });
  if (!tournament) return null;

  const [post] = await db
    .select({
      id: tournamentNews.id,
      tournamentId: tournamentNews.tournamentId,
      subject: tournamentNews.subject,
      bodyMarkdown: tournamentNews.bodyMarkdown,
      coverUrl: tournamentNews.coverUrl,
      ctaLabel: tournamentNews.ctaLabel,
      ctaUrl: tournamentNews.ctaUrl,
      status: tournamentNews.status,
      publishedAt: tournamentNews.publishedAt,
      authorName: adminUsers.name,
    })
    .from(tournamentNews)
    .leftJoin(adminUsers, eq(tournamentNews.authorId, adminUsers.id))
    .where(eq(tournamentNews.id, nId))
    .limit(1);

  if (!post || post.tournamentId !== tournament.id) return null;
  if (post.status !== "published") return null;

  return { org, tournament, post };
});

// Per-post OG metadata — copies the absolute-URL pattern from the
// tournament layout, so shared posts render with the cover image and
// the right title in Telegram/WhatsApp.
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, orgSlug, tournamentSlug, newsId } = await params;
  const data = await fetchPost(orgSlug, tournamentSlug, newsId);
  if (!data) return {};
  const { org, tournament, post } = data;

  const title = `${post.subject} | ${tournament.name}`;
  const description = markdownToPlain(post.bodyMarkdown, 280);
  const url = `${BASE}/${locale}/t/${orgSlug}/${tournamentSlug}/news/${post.id}`;

  // og:image MUST be absolute; same lesson as the tournament layout.
  const toAbs = (u: string | null) =>
    !u ? null : (/^https?:\/\//i.test(u) ? u : `${BASE}${u.startsWith("/") ? "" : "/"}${u}`);
  const image =
    toAbs(post.coverUrl) ??
    toAbs(tournament.cardImageUrl) ??
    toAbs(tournament.coverUrl) ??
    `${BASE}/defaults/tournament-cover-default.jpg`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Goality TMC",
      images: [{ url: image, width: 1200, height: 630, alt: post.subject }],
      type: "article",
      locale: locale === "ru" ? "ru_RU" : locale === "et" ? "et_EE" : locale === "es" ? "es_ES" : "en_US",
      ...(post.publishedAt ? { publishedTime: post.publishedAt.toISOString() } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    robots: { index: true, follow: true },
  };
}

export default async function TournamentNewsSinglePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, orgSlug, tournamentSlug, newsId } = await params;
  const data = await fetchPost(orgSlug, tournamentSlug, newsId);
  if (!data) redirect(`/${locale}/t/${orgSlug}/${tournamentSlug}/news`);

  const { post } = data;
  const t = await getTranslations({ locale, namespace: "tournament.news" });

  const session = await getSession();
  const viewerClubId = session?.role === "club" && session.clubId ? session.clubId : null;

  const html = markdownToHtml(post.bodyMarkdown);
  const dateLabel = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <article className="pb-16">
      <Link
        href={`/t/${orgSlug}/${tournamentSlug}/news`}
        className="inline-flex items-center gap-1 text-xs font-semibold mb-4"
        style={{ color: "var(--cat-text-muted)" }}
      >
        <ArrowLeft className="w-3.5 h-3.5" /> {t("backToTournament")}
      </Link>

      {post.coverUrl && (
        <div
          className="relative w-full rounded-2xl overflow-hidden mb-6"
          style={{ aspectRatio: "1200/630" }}
        >
          <img
            src={post.coverUrl}
            alt={post.subject}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      )}

      <div className="flex items-center gap-3 mb-3 text-xs" style={{ color: "var(--cat-text-muted)" }}>
        {dateLabel && <span>{dateLabel}</span>}
        {post.authorName && (
          <span>
            · {t("byAuthor", { default: "by" })} {post.authorName}
          </span>
        )}
      </div>

      <h1
        className="text-2xl md:text-4xl font-black leading-tight mb-6"
        style={{ color: "var(--cat-text)" }}
      >
        {post.subject}
      </h1>

      <div
        className="prose prose-invert max-w-none text-[15px] leading-relaxed"
        style={{ color: "var(--cat-text-secondary)" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {post.ctaLabel && post.ctaUrl && (
        <div className="mt-8">
          <a
            href={post.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
            style={{
              background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))",
              color: "var(--cat-accent-text)",
              boxShadow: "0 4px 16px var(--cat-accent-glow)",
            }}
          >
            {post.ctaLabel} <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      )}

      {viewerClubId && (
        <NewsReadMarker clubId={viewerClubId} newsId={post.id} />
      )}
    </article>
  );
}
