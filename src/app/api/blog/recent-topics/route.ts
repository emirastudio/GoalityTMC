import { NextResponse } from "next/server";
import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET /api/blog/recent-topics
// Returns the last 20 published blog article titles (for n8n / AI context).
// Deduplicates by normalised title so near-identical AI re-runs don't pollute the list.
export async function GET() {
  const rows = await db
    .select({
      title: blogPosts.titleEn,
      slug: blogPosts.slug,
      category: blogPosts.category,
    })
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"))
    .orderBy(desc(blogPosts.createdAt))
    .limit(60); // fetch more, then dedupe down to 20

  // Deduplicate: normalise title to lowercase + strip punctuation, keep first occurrence
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    const key = r.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const topics = unique.slice(0, 20).map((r) => r.title);

  return NextResponse.json({ topics });
}
