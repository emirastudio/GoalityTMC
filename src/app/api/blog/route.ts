import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { VALID_CATEGORY_SLUGS, CATEGORY_SLUGS } from "@/lib/blog-categories";

function verifyApiKey(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7) === process.env.BLOG_API_KEY;
}

export async function POST(req: NextRequest) {
  if (!verifyApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    slug,
    titleEn,
    titleRu,
    contentEn,
    contentRu,
    excerptEn,
    excerptRu,
    coverImageUrl,
    category,
    tags,
    seoTitleEn,
    seoTitleRu,
    seoDescriptionEn,
    seoDescriptionRu,
    authorName,
    status = "draft",
  } = body;

  if (!slug || !titleEn || !contentEn) {
    return NextResponse.json(
      { error: "slug, titleEn, and contentEn are required" },
      { status: 400 }
    );
  }

  // Soft-validate category — warn but don't reject (backward compat)
  if (category && !VALID_CATEGORY_SLUGS.has(category)) {
    console.warn(`[BLOG] Unknown category "${category}". Valid: ${CATEGORY_SLUGS.join(", ")}`);
  }

  const existing = await db.query.blogPosts.findFirst({
    where: eq(blogPosts.slug, slug),
  });
  if (existing) {
    return NextResponse.json(
      { error: "Slug already exists", existingId: existing.id },
      { status: 409 }
    );
  }

  const [post] = await db
    .insert(blogPosts)
    .values({
      slug,
      titleEn,
      titleRu,
      contentEn,
      contentRu,
      excerptEn,
      excerptRu,
      coverImageUrl,
      category,
      tags: tags ?? [],
      seoTitleEn,
      seoTitleRu,
      seoDescriptionEn,
      seoDescriptionRu,
      authorName: authorName ?? "Goality Team",
      status,
      publishedAt: status === "published" ? new Date() : null,
    })
    .returning();

  return NextResponse.json({ post }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!verifyApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { slug, ...updates } = body;

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const existing = await db.query.blogPosts.findFirst({
    where: eq(blogPosts.slug, slug),
  });
  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (updates.status === "published" && !existing.publishedAt) {
    updates.publishedAt = new Date();
  }

  const [post] = await db
    .update(blogPosts)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(blogPosts.slug, slug))
    .returning();

  return NextResponse.json({ post });
}
