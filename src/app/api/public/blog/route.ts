import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { eq, desc, count, and, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locale = searchParams.get("locale") ?? "en";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "12")));
  const category = searchParams.get("category");
  const offset = (page - 1) * limit;

  const conditions = [eq(blogPosts.status, "published")];
  if (category) {
    conditions.push(eq(blogPosts.category, category));
  }

  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  const [posts, [{ total }]] = await Promise.all([
    db
      .select()
      .from(blogPosts)
      .where(where)
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(blogPosts).where(where),
  ]);

  const mapped = posts.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: (locale === "ru" && p.titleRu) ? p.titleRu : p.titleEn,
    excerpt: (locale === "ru" && p.excerptRu) ? p.excerptRu : p.excerptEn,
    coverImageUrl: p.coverImageUrl,
    category: p.category,
    tags: p.tags,
    authorName: p.authorName,
    publishedAt: p.publishedAt,
  }));

  return NextResponse.json({
    posts: mapped,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
