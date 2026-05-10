import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { pickLocaleTextEn } from "@/lib/i18n-text";

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

  const p = post as unknown as Record<string, unknown>;
  return NextResponse.json({
    id: post.id,
    slug: post.slug,
    title:          pickLocaleTextEn(p, locale, "title"),
    content:        pickLocaleTextEn(p, locale, "content"),
    excerpt:        pickLocaleTextEn(p, locale, "excerpt"),
    coverImageUrl:  post.coverImageUrl,
    category:       post.category,
    tags:           post.tags,
    authorName:     post.authorName,
    publishedAt:    post.publishedAt,
    seoTitle:       pickLocaleTextEn(p, locale, "seoTitle"),
    seoDescription: pickLocaleTextEn(p, locale, "seoDescription"),
  });
}
