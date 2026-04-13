import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin, isError } from "@/lib/api-auth";

// GET /api/admin/blog — все статьи (включая draft/archived)
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const posts = await db
    .select({
      id: blogPosts.id,
      slug: blogPosts.slug,
      titleEn: blogPosts.titleEn,
      titleRu: blogPosts.titleRu,
      status: blogPosts.status,
      category: blogPosts.category,
      authorName: blogPosts.authorName,
      coverImageUrl: blogPosts.coverImageUrl,
      publishedAt: blogPosts.publishedAt,
      createdAt: blogPosts.createdAt,
      updatedAt: blogPosts.updatedAt,
    })
    .from(blogPosts)
    .orderBy(desc(blogPosts.createdAt));

  return NextResponse.json({ posts });
}

// DELETE /api/admin/blog?id=123 — удалить статью по id
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") ?? "");

  if (!id || isNaN(id)) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(blogPosts)
    .where(eq(blogPosts.id, id))
    .returning({ id: blogPosts.id, slug: blogPosts.slug });

  if (!deleted) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, deleted });
}

// PATCH /api/admin/blog — изменить статус статьи
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { id, status } = await req.json();

  if (!id || !status) {
    return NextResponse.json({ error: "id and status are required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { status, updatedAt: new Date() };
  if (status === "published") {
    updates.publishedAt = new Date();
  }

  const [post] = await db
    .update(blogPosts)
    .set(updates)
    .where(eq(blogPosts.id, id))
    .returning();

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, post });
}
