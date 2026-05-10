import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { PublicNavHeader } from "@/components/ui/public-nav-header";
import { BlogPostClient } from "./blog-post-client";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

async function getPost(slug: string) {
  return db.query.blogPosts.findFirst({
    where: and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")),
  });
}

// Blog hat seine eigene `*En`-конвенция (а не bare base). Локаль-маппинг
// делает то же что pickLocaleText() — выбираем `<base><Suffix>` или
// fallback на `<base>En` (английский — канон).
function pickBlogText(
  p: Record<string, unknown>,
  locale: string,
  base: "title" | "content" | "excerpt" | "seoTitle" | "seoDescription",
): string {
  const lc = locale.slice(0, 2).toLowerCase();
  const suffix =
    lc === "ru" ? "Ru" :
    lc === "et" ? "Et" :
    lc === "es" ? "Es" :
    "En";
  const v = p[`${base}${suffix}`];
  if (typeof v === "string" && v.trim()) return v;
  const en = p[`${base}En`];
  return typeof en === "string" ? en : "";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const p = post as unknown as Record<string, unknown>;
  // SEO title — приоритет seoTitle над title (если задан организатором).
  const title =
    pickBlogText(p, locale, "seoTitle") ||
    pickBlogText(p, locale, "title");
  const description =
    pickBlogText(p, locale, "seoDescription") ||
    pickBlogText(p, locale, "excerpt") ||
    "";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      ...(post.coverImageUrl ? { images: [post.coverImageUrl] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const p = post as unknown as Record<string, unknown>;

  const data = {
    id: post.id,
    slug: post.slug,
    title:   pickBlogText(p, locale, "title"),
    content: pickBlogText(p, locale, "content"),
    excerpt: pickBlogText(p, locale, "excerpt") || null,
    coverImageUrl: post.coverImageUrl,
    category: post.category,
    tags: post.tags as string[] | null,
    authorName: post.authorName,
    publishedAt: post.publishedAt?.toISOString() ?? null,
  };

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen" style={{ background: "var(--cat-bg)" }}>
        <PublicNavHeader />
        <BlogPostClient post={data} />
      </div>
    </ThemeProvider>
  );
}
