/**
 * Single source of truth for all blog categories.
 * Used by: blog-list-client, blog-post-client, api/blog, admin/blog
 *
 * DB stores the `slug` value in the `category` column (varchar 100).
 * `label` is the human-readable display name.
 * `color` is the accent hex used for badges and filter buttons.
 */

export type BlogCategory = {
  slug: string;
  label: string;
  color: string;
  bg: string;      // rgba background for badge
  border: string;  // rgba border for badge
};

export const BLOG_CATEGORIES: BlogCategory[] = [
  {
    slug: "company",
    label: "Company",
    color: "#818CF8",
    bg: "rgba(129,140,248,0.12)",
    border: "rgba(129,140,248,0.3)",
  },
  {
    slug: "product",
    label: "Product",
    color: "#2BFEBA",
    bg: "rgba(43,254,186,0.12)",
    border: "rgba(43,254,186,0.3)",
  },
  {
    slug: "strategy",
    label: "Strategy",
    color: "#60A5FA",
    bg: "rgba(96,165,250,0.12)",
    border: "rgba(96,165,250,0.3)",
  },
  {
    slug: "marketing",
    label: "Marketing",
    color: "#F472B6",
    bg: "rgba(244,114,182,0.12)",
    border: "rgba(244,114,182,0.3)",
  },
  {
    slug: "operations",
    label: "Operations",
    color: "#FBBF24",
    bg: "rgba(251,191,36,0.12)",
    border: "rgba(251,191,36,0.3)",
  },
  {
    slug: "coaching",
    label: "Coaching",
    color: "#34D399",
    bg: "rgba(52,211,153,0.12)",
    border: "rgba(52,211,153,0.3)",
  },
  {
    slug: "tournament-management",
    label: "Tournament Management",
    color: "#A78BFA",
    bg: "rgba(167,139,250,0.12)",
    border: "rgba(167,139,250,0.3)",
  },
  {
    slug: "business",
    label: "Business",
    color: "#FB923C",
    bg: "rgba(251,146,60,0.12)",
    border: "rgba(251,146,60,0.3)",
  },
];

/** Default category for posts with no category set */
export const DEFAULT_CATEGORY_SLUG = "strategy";

/**
 * Legacy slug aliases — maps old category slugs to new ones.
 * Keeps backward compatibility with posts created before the new system.
 */
const LEGACY_ALIASES: Record<string, string> = {
  "organizer-tips":  "tournament-management",
  "youth-football":  "coaching",
  "coach-insights":  "coaching",
  "platform":        "product",
};

/** Returns the canonical slug, resolving legacy aliases */
export function resolveCategory(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_CATEGORY_SLUG;
  return LEGACY_ALIASES[raw] ?? raw;
}

/** Lookup a BlogCategory by slug (with legacy alias + default fallback) */
export function getCategoryMeta(raw: string | null | undefined): BlogCategory {
  const slug = resolveCategory(raw);
  return (
    BLOG_CATEGORIES.find((c) => c.slug === slug) ??
    BLOG_CATEGORIES.find((c) => c.slug === DEFAULT_CATEGORY_SLUG)!
  );
}

/** All valid slugs for API validation */
export const VALID_CATEGORY_SLUGS = new Set(
  BLOG_CATEGORIES.map((c) => c.slug)
);

/** Valid slugs as a plain array (for n8n JSON docs, etc.) */
export const CATEGORY_SLUGS = BLOG_CATEGORIES.map((c) => c.slug);
