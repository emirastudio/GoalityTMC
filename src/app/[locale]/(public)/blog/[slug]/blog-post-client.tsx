"use client";

import { useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, ArrowRight, Calendar, User, Tag, Send } from "lucide-react";
import sanitizeHtml from "sanitize-html";
import { getCategoryMeta } from "@/lib/blog-categories";

type BlogPost = {
  id: number;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  category: string | null;
  tags: string[] | null;
  authorName: string | null;
  publishedAt: string | null;
};

function formatDate(d: string | null, locale: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function readingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, "");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function BlogPostClient({ post }: { post: BlogPost }) {
  const t = useTranslations("blog");
  const locale = useLocale();

  const cleanContent = useMemo(
    () =>
      sanitizeHtml(post.content, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
          "img",
          "h1",
          "h2",
          "h3",
          "figure",
          "figcaption",
        ]),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          img: ["src", "alt", "width", "height", "loading"],
          a: ["href", "target", "rel"],
        },
      }),
    [post.content]
  );

  const minutes = readingTime(post.content);
  // Always resolve category — falls back to "Strategy" if null
  const catMeta = getCategoryMeta(post.category);

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-8 transition-colors hover:opacity-80"
        style={{ color: catMeta.color }}
      >
        <ArrowLeft size={16} />
        {t("backToBlog")}
      </Link>

      {/* Category badge — always shown */}
      <span
        className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
        style={{
          background: catMeta.bg,
          color: catMeta.color,
          border: `1px solid ${catMeta.border}`,
        }}
      >
        {t(`category.${catMeta.slug}` as any)}
      </span>

      {/* Title */}
      <h1
        className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight"
        style={{ color: "var(--cat-text)" }}
      >
        {post.title}
      </h1>

      {/* Meta */}
      <div
        className="flex flex-wrap items-center gap-4 text-sm mb-8 pb-8"
        style={{
          color: "var(--cat-text-secondary)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {post.publishedAt && (
          <span className="flex items-center gap-1.5">
            <Calendar size={14} />
            {formatDate(post.publishedAt, locale)}
          </span>
        )}
        {post.authorName && (
          <span className="flex items-center gap-1.5">
            <User size={14} />
            {post.authorName}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          {t("minutesRead", { minutes })}
        </span>
      </div>

      {/* Cover image */}
      {post.coverImageUrl && (
        <div
          className="rounded-2xl overflow-hidden mb-10"
          style={{
            background: `url(${post.coverImageUrl}) center/cover no-repeat`,
            height: "360px",
          }}
        />
      )}

      {/* Content */}
      <div
        className="blog-content"
        style={{ color: "var(--cat-text)" }}
        dangerouslySetInnerHTML={{ __html: cleanContent }}
      />

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 mt-12 pt-8"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          <Tag size={14} style={{ color: "var(--cat-text-secondary)" }} />
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "var(--cat-text-secondary)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Telegram Banner */}
      {(() => {
        const tgLink = locale === "ru" ? "https://t.me/goalitytmcru" : "https://t.me/goalitytmc";
        return (
          <a
            href={tgLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col sm:flex-row items-center gap-5 sm:gap-8 w-full rounded-2xl overflow-hidden mt-12 px-7 py-6 transition-transform duration-300 hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #0d1b2e 0%, #1a2f4a 40%, #0a2a1a 100%)",
              border: "1px solid rgba(43,254,186,0.25)",
              boxShadow: "0 0 40px rgba(43,254,186,0.08), 0 4px 24px rgba(0,0,0,0.4)",
            }}
          >
            <span
              className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, #2CA5E0, transparent 70%)" }}
            />
            <span
              className="pointer-events-none absolute -bottom-10 -right-10 w-48 h-48 rounded-full opacity-15"
              style={{ background: "radial-gradient(circle, #2BFEBA, transparent 70%)" }}
            />
            <div
              className="relative shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #2CA5E0, #1a8fc8)",
                boxShadow: "0 0 24px rgba(44,165,224,0.5)",
              }}
            >
              <Send size={28} color="#fff" strokeWidth={1.8} />
            </div>
            <div className="relative flex-1 text-center sm:text-left">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#2CA5E0" }}>
                Telegram
              </p>
              <h3 className="text-lg sm:text-xl font-bold mb-1 leading-tight" style={{ color: "#fff" }}>
                {t("telegram.headline")}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                {t("telegram.subtext")}
              </p>
            </div>
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

      {/* Blog content styles */}
      <style>{`
        .blog-content h1 { font-size: 2rem; font-weight: 700; margin: 2rem 0 1rem; }
        .blog-content h2 { font-size: 1.5rem; font-weight: 700; margin: 1.75rem 0 0.75rem; color: var(--cat-text); }
        .blog-content h3 { font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 0.5rem; color: var(--cat-text); }
        .blog-content p { margin: 0 0 1.25rem; line-height: 1.8; color: var(--cat-text-secondary); }
        .blog-content ul, .blog-content ol { margin: 0 0 1.25rem; padding-left: 1.5rem; color: var(--cat-text-secondary); }
        .blog-content li { margin: 0 0 0.5rem; line-height: 1.7; }
        .blog-content strong { color: var(--cat-text); font-weight: 600; }
        .blog-content a { color: #2BFEBA; text-decoration: underline; text-underline-offset: 2px; }
        .blog-content a:hover { opacity: 0.8; }
        .blog-content blockquote {
          margin: 1.5rem 0;
          padding: 1rem 1.5rem;
          border-left: 3px solid #2BFEBA;
          background: rgba(43,254,186,0.05);
          border-radius: 0 0.5rem 0.5rem 0;
          color: var(--cat-text-secondary);
          font-style: italic;
        }
        .blog-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin: 1.5rem 0;
        }
        .blog-content hr {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.1);
          margin: 2rem 0;
        }
      `}</style>
    </article>
  );
}
