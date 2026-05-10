import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { eq, desc, count, and } from "drizzle-orm";

// Blog uses an explicit `*_en` base instead of bare `<base>` like other
// tables (titleEn / contentEn / excerptEn). pickLocaleText() expects bare
// base, so we adapt: try `<base><LocaleSuffix>` first, fall back to *En.
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
  // Fallback chain: any locale → English (canonical base for blog).
  const en = p[`${base}En`];
  return typeof en === "string" ? en : "";
}

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
    title: pickBlogText(p as unknown as Record<string, unknown>, locale, "title"),
    excerpt: pickBlogText(p as unknown as Record<string, unknown>, locale, "excerpt"),
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
