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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const isRu = locale === "ru";
  const title = (isRu && post.seoTitleRu) || post.seoTitleEn || (isRu && post.titleRu) || post.titleEn;
  const description = (isRu && post.seoDescriptionRu) || post.seoDescriptionEn || (isRu && post.excerptRu) || post.excerptEn || "";

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

  const isRu = locale === "ru";

  const data = {
    id: post.id,
    slug: post.slug,
    title: (isRu && post.titleRu) || post.titleEn,
    content: (isRu && post.contentRu) || post.contentEn,
    excerpt: (isRu && post.excerptRu) || post.excerptEn || null,
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
