import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const locale = searchParams.get("locale") ?? "en";

  const post = await db.query.blogPosts.findFirst({
    where: and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")),
  });

  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: post.id,
    slug: post.slug,
    title: (locale === "ru" && post.titleRu) ? post.titleRu : post.titleEn,
    content: (locale === "ru" && post.contentRu) ? post.contentRu : post.contentEn,
    excerpt: (locale === "ru" && post.excerptRu) ? post.excerptRu : post.excerptEn,
    coverImageUrl: post.coverImageUrl,
    category: post.category,
    tags: post.tags,
    authorName: post.authorName,
    publishedAt: post.publishedAt,
    seoTitle: (locale === "ru" && post.seoTitleRu) ? post.seoTitleRu : post.seoTitleEn,
    seoDescription: (locale === "ru" && post.seoDescriptionRu) ? post.seoDescriptionRu : post.seoDescriptionEn,
  });
}
