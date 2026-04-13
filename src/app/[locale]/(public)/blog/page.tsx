import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { PublicNavHeader } from "@/components/ui/public-nav-header";
import { BlogListClient, type BlogPostEntry } from "./blog-list-client";

async function getPublishedPosts(): Promise<BlogPostEntry[]> {
  try {
    const posts = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"))
      .orderBy(desc(blogPosts.publishedAt));

    return posts.map((p) => ({
      id: p.id,
      slug: p.slug,
      titleEn: p.titleEn,
      titleRu: p.titleRu,
      excerptEn: p.excerptEn,
      excerptRu: p.excerptRu,
      coverImageUrl: p.coverImageUrl,
      category: p.category,
      tags: p.tags as string[] | null,
      authorName: p.authorName,
      publishedAt: p.publishedAt?.toISOString() ?? null,
    }));
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen" style={{ background: "var(--cat-bg)" }}>
        <PublicNavHeader />
        <BlogListClient posts={posts} />
      </div>
    </ThemeProvider>
  );
}
