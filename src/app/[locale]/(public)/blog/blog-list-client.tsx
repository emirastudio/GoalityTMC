"use client";

import { useState, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Calendar, ArrowRight, BookOpen, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { BLOG_CATEGORIES, getCategoryMeta } from "@/lib/blog-categories";

export type BlogPostEntry = {
  id: number;
  slug: string;
  titleEn: string;
  titleRu: string | null;
  excerptEn: string | null;
  excerptRu: string | null;
  coverImageUrl: string | null;
  category: string | null;
  tags: string[] | null;
  authorName: string | null;
  publishedAt: string | null;
};

const POSTS_PER_PAGE = 12;

const GRADIENT_COVERS = [
  "linear-gradient(135deg, #1a2a3a 0%, #2d4a5a 50%, #1a3a4a 100%)",
  "linear-gradient(135deg, #2a1a3a 0%, #4a2d5a 50%, #3a1a4a 100%)",
  "linear-gradient(135deg, #1a3a2a 0%, #2d5a4a 50%, #1a4a3a 100%)",
  "linear-gradient(135deg, #3a2a1a 0%, #5a4a2d 50%, #4a3a1a 100%)",
];

function formatDate(d: string | null, locale: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export function BlogListClient({ posts }: { posts: BlogPostEntry[] }) {
  const t = useTranslations("blog");
  const locale = useLocale();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Only show filter tabs for categories that have at least one post
  const categoriesWithPosts = useMemo(() => {
    const seen = new Set<string>();
    posts.forEach((p) => seen.add(getCategoryMeta(p.category).slug));
    return BLOG_CATEGORIES.filter((c) => seen.has(c.slug));
  }, [posts]);

  const filtered = useMemo(() => {
    if (!activeCategory) return posts;
    // resolve legacy slugs so old posts appear under new canonical tabs
    return posts.filter((p) => getCategoryMeta(p.category).slug === activeCategory);
  }, [posts, activeCategory]);

  const totalPages = Math.ceil(filtered.length / POSTS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);

  const getTitle   = (p: BlogPostEntry) => (locale === "ru" && p.titleRu) ? p.titleRu : p.titleEn;
  const getExcerpt = (p: BlogPostEntry) => (locale === "ru" && p.excerptRu) ? p.excerptRu : p.excerptEn;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">

      {/* Header */}
      <div className="text-center mb-12">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
          style={{ background: "rgba(43,254,186,0.1)", color: "#2BFEBA", border: "1px solid rgba(43,254,186,0.2)" }}
        >
          <BookOpen size={14} />
          {t("title")}
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4" style={{ color: "var(--cat-text)" }}>
          {t("title")}
        </h1>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: "var(--cat-text-secondary)" }}>
          {t("subtitle")}
        </p>
      </div>

      {/* Telegram Banner */}
      {(() => {
        const tgLink = locale === "ru" ? "https://t.me/goalitytmcru" : "https://t.me/goalitytmc";
        return (
          <a
            href={tgLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col sm:flex-row items-center gap-5 sm:gap-8 w-full rounded-2xl overflow-hidden mb-10 px-7 py-6 transition-transform duration-300 hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #0d1b2e 0%, #1a2f4a 40%, #0a2a1a 100%)",
              border: "1px solid rgba(43,254,186,0.25)",
              boxShadow: "0 0 40px rgba(43,254,186,0.08), 0 4px 24px rgba(0,0,0,0.4)",
            }}
          >
            {/* Glow orbs */}
            <span
              className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, #2CA5E0, transparent 70%)" }}
            />
            <span
              className="pointer-events-none absolute -bottom-10 -right-10 w-48 h-48 rounded-full opacity-15"
              style={{ background: "radial-gradient(circle, #2BFEBA, transparent 70%)" }}
            />

            {/* Icon */}
            <div
              className="relative shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #2CA5E0, #1a8fc8)",
                boxShadow: "0 0 24px rgba(44,165,224,0.5)",
              }}
            >
              <Send size={28} color="#fff" strokeWidth={1.8} />
            </div>

            {/* Text */}
            <div className="relative flex-1 text-center sm:text-left">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#2CA5E0" }}>
                Telegram
              </p>
              <h2 className="text-lg sm:text-xl font-bold mb-1 leading-tight" style={{ color: "#fff" }}>
                {t("telegram.headline")}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                {t("telegram.subtext")}
              </p>
            </div>

            {/* CTA */}
            <div className="relative shrink-0 flex flex-col items-center gap-2">
              <span
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 group-hover:scale-105"
                style={{
                  background: "linear-gradient(90deg, #2CA5E0, #1a8fc8)",
                  color: "#fff",
                  boxShadow: "0 0 16px rgba(44,165,224,0.4)",
                }}
              >
                {t("telegram.cta")}
                <ArrowRight size={15} />
              </span>
              <span className="text-[10px] font-black tracking-[0.2em]" style={{ color: "#2BFEBA" }}>
                {t("telegram.tagline")}
              </span>
            </div>
          </a>
        );
      })()}

      {/* Category filter — tabs built from canonical BLOG_CATEGORIES that have posts */}
      {categoriesWithPosts.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          <button
            onClick={() => { setActiveCategory(null); setPage(1); }}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background: !activeCategory ? "rgba(43,254,186,0.15)" : "rgba(255,255,255,0.05)",
              color:      !activeCategory ? "#2BFEBA"               : "var(--cat-text-secondary)",
              border: `1px solid ${!activeCategory ? "rgba(43,254,186,0.3)" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            {t("allPosts")}
          </button>
          {categoriesWithPosts.map((cat) => {
            const isActive = activeCategory === cat.slug;
            return (
              <button
                key={cat.slug}
                onClick={() => { setActiveCategory(cat.slug); setPage(1); }}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  background: isActive ? cat.bg                      : "rgba(255,255,255,0.05)",
                  color:      isActive ? cat.color                   : "var(--cat-text-secondary)",
                  border: `1px solid ${isActive ? cat.border : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {t(`category.${cat.slug}` as any)}
              </button>
            );
          })}
        </div>
      )}

      {/* Posts grid */}
      {paginated.length === 0 ? (
        <div className="text-center py-20" style={{ color: "var(--cat-text-secondary)" }}>
          <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">{t("noPosts")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginated.map((post, i) => {
            // Always resolve category — falls back to "Strategy" if null
            const catMeta = getCategoryMeta(post.category);
            return (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: "var(--cat-card-bg)",
                  border: "1px solid var(--cat-card-border)",
                  boxShadow: "var(--cat-card-shadow)",
                }}
              >
                {/* Cover */}
                <div
                  className="aspect-[16/9] relative overflow-hidden"
                  style={{
                    background: post.coverImageUrl
                      ? `url(${post.coverImageUrl}) center/cover no-repeat`
                      : GRADIENT_COVERS[i % GRADIENT_COVERS.length],
                  }}
                >
                  {/* Category badge — always shown, never hidden */}
                  <span
                    className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      background: "rgba(0,0,0,0.55)",
                      color: catMeta.color,
                      backdropFilter: "blur(8px)",
                      border: `1px solid ${catMeta.border}`,
                    }}
                  >
                    {t(`category.${catMeta.slug}` as any)}
                  </span>
                </div>

                {/* Card content */}
                <div className="p-5">
                  {post.publishedAt && (
                    <div className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "var(--cat-text-secondary)" }}>
                      <Calendar size={12} />
                      {formatDate(post.publishedAt, locale)}
                    </div>
                  )}
                  <h2
                    className="text-lg font-bold mb-2 line-clamp-2 transition-colors"
                    style={{ color: "var(--cat-text)" }}
                  >
                    {getTitle(post)}
                  </h2>
                  {getExcerpt(post) && (
                    <p className="text-sm line-clamp-3 mb-4" style={{ color: "var(--cat-text-secondary)" }}>
                      {getExcerpt(post)}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-sm font-medium" style={{ color: catMeta.color }}>
                    {t("readMore")}
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-12">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg transition-colors disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.05)", color: "var(--cat-text)" }}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-medium" style={{ color: "var(--cat-text-secondary)" }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg transition-colors disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.05)", color: "var(--cat-text)" }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
