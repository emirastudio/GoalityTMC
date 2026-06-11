/**
 * Structural config for /about/[slug] feature pages.
 *
 * 22 SEO-strong marketing pages grouped in 5 clusters. The TEXT lives in
 * src/messages/{locale}.json under `about.pages.<slug>.*`; this file owns
 * the structure: ordering, visual accent, icon, sister-page links.
 *
 * Adding a new page:
 *   1. Add an entry to ABOUT_PAGES (keep cluster + order intact).
 *   2. Add `about.pages.<slug>` block to all 4 message files (i18n:check).
 *   3. Add the slug to sitemap.ts (it is read from this file automatically).
 */

export type AboutClusterId = 1 | 2 | 3 | 4 | 5;

export type AboutPage = {
  slug: string;
  cluster: AboutClusterId;
  /** lucide-react icon name */
  icon: string;
  /** Accent colour for hero / icon background (hex) */
  accent: string;
  /** Secondary accent for gradient ends */
  accentTo: string;
  /** Slugs of 3 related pages for cross-linking (SEO + UX) */
  related: [string, string, string];
  /** Number of feature cards rendered (matches f1..fN keys in i18n) */
  featureCount: number;
  /** Number of FAQ Q/A pairs (matches q1/a1..qN/aN in i18n) */
  faqCount: number;
  /** Number of "for whom" chips */
  forWhomCount: number;
  /**
   * True once i18n content exists for all 4 locales. Pages flip to `true`
   * cluster by cluster as we write copy; the hub and sitemap filter on it.
   */
  published: boolean;
  /**
   * Optional per-page CTA overrides. Hero + final CTA share the same
   * targets. Defaults: primary → /onboarding, secondary → /catalog.
   */
  ctaPrimaryHref?: string;
  ctaSecondaryHref?: string;
};

export type AboutCluster = {
  id: AboutClusterId;
  /** i18n key under about.clusters.<key> */
  key: "hits" | "organizer" | "operations" | "participants" | "trust";
  accent: string;
};

export const ABOUT_CLUSTERS: AboutCluster[] = [
  { id: 1, key: "hits",         accent: "#2BFEBA" },
  { id: 2, key: "organizer",    accent: "#8B5CF6" },
  { id: 3, key: "operations",   accent: "#F59E0B" },
  { id: 4, key: "participants", accent: "#22C55E" },
  { id: 5, key: "trust",        accent: "#3B82F6" },
];

export const ABOUT_PAGES: AboutPage[] = [
  // ── Cluster 1 — Хиты ────────────────────────────────────────────────
  {
    slug: "auto-schedule",
    cluster: 1,
    icon: "Zap",
    accent: "#2BFEBA",
    accentTo: "#00E5FF",
    related: ["stadiums-fields", "referees", "brackets-stages"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
  },
  {
    slug: "tournament-website",
    cluster: 1,
    icon: "Globe",
    accent: "#00E5FF",
    accentTo: "#2BFEBA",
    related: ["regulations-documents", "follow-news", "catalog"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
    // Primary CTA = "See an example tournament" → real public catalog.
    ctaPrimaryHref: "/catalog",
    ctaSecondaryHref: "/onboarding",
  },
  {
    slug: "team-registration",
    cluster: 1,
    icon: "ClipboardList",
    accent: "#F59E0B",
    accentTo: "#F472B6",
    related: ["team-shop", "services-packages", "pricing-tiers"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
  },
  {
    slug: "draw-show",
    cluster: 1,
    icon: "Sparkles",
    accent: "#A855F7",
    accentTo: "#EC4899",
    related: ["brackets-stages", "tournament-website", "follow-news"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
    // Primary = "Watch a sample show" → live /draw demo.
    ctaPrimaryHref: "/draw",
    ctaSecondaryHref: "/onboarding",
  },
  {
    slug: "live-standings",
    cluster: 1,
    icon: "Activity",
    accent: "#22C55E",
    accentTo: "#2BFEBA",
    related: ["brackets-stages", "match-operations", "follow-news"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
    // Primary = "See live demo" → real catalog tournaments with live data.
    ctaPrimaryHref: "/catalog",
    ctaSecondaryHref: "/onboarding",
  },

  // ── Cluster 2 — Организатор ─────────────────────────────────────────
  {
    slug: "organizer-dashboard",
    cluster: 2,
    icon: "LayoutDashboard",
    accent: "#8B5CF6",
    accentTo: "#3B82F6",
    related: ["pricing-tiers", "org-listing", "divisions"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
  },
  {
    slug: "divisions",
    cluster: 2,
    icon: "Layers",
    accent: "#8B5CF6",
    accentTo: "#22C55E",
    related: ["team-registration", "brackets-stages", "auto-schedule"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
  },
  {
    slug: "stadiums-fields",
    cluster: 2,
    icon: "MapPin",
    accent: "#3B82F6",
    accentTo: "#22C55E",
    related: ["auto-schedule", "match-operations", "accommodation-logistics"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
  },
  {
    slug: "regulations-documents",
    cluster: 2,
    icon: "FileText",
    accent: "#F59E0B",
    accentTo: "#8B5CF6",
    related: ["tournament-website", "team-registration", "players-roster"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
  },
  {
    slug: "org-listing",
    cluster: 2,
    icon: "Building2",
    accent: "#8B5CF6",
    accentTo: "#00E5FF",
    related: ["tournament-website", "catalog", "organizer-dashboard"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
    // Primary CTA = "See live org listings" → real /catalog with organizations.
    ctaPrimaryHref: "/catalog",
    ctaSecondaryHref: "/onboarding",
  },
  {
    slug: "pricing-tiers",
    cluster: 2,
    icon: "Tag",
    accent: "#F59E0B",
    accentTo: "#2BFEBA",
    related: ["organizer-dashboard", "team-registration", "services-packages"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
    // Primary CTA → /pricing (real pricing page).
    ctaPrimaryHref: "/pricing",
    ctaSecondaryHref: "/onboarding",
  },

  // ── Cluster 3 — Операции ────────────────────────────────────────────
  {
    slug: "match-operations",
    cluster: 3,
    icon: "ClipboardCheck",
    accent: "#F59E0B",
    accentTo: "#22C55E",
    related: ["live-standings", "referees", "brackets-stages"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
    ctaPrimaryHref: "/catalog",
    ctaSecondaryHref: "/onboarding",
  },
  {
    slug: "brackets-stages",
    cluster: 3,
    icon: "GitBranch",
    accent: "#F59E0B",
    accentTo: "#A855F7",
    related: ["auto-schedule", "live-standings", "match-operations"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
    ctaPrimaryHref: "/catalog",
    ctaSecondaryHref: "/onboarding",
  },
  {
    slug: "referees",
    cluster: 3,
    icon: "Flag",
    accent: "#F59E0B",
    accentTo: "#EF4444",
    related: ["match-operations", "auto-schedule", "stadiums-fields"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
  },
  {
    slug: "services-packages",
    cluster: 3,
    icon: "Package",
    accent: "#F59E0B",
    accentTo: "#2BFEBA",
    related: ["team-shop", "accommodation-logistics", "team-registration"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
  },
  {
    slug: "accommodation-logistics",
    cluster: 3,
    icon: "Hotel",
    accent: "#F59E0B",
    accentTo: "#3B82F6",
    related: ["services-packages", "stadiums-fields", "team-workspace"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
  },

  // ── Cluster 4 — Участники ──────────────────────────────────────────
  {
    slug: "team-workspace",
    cluster: 4,
    icon: "Users",
    accent: "#22C55E",
    accentTo: "#2BFEBA",
    related: ["players-roster", "team-shop", "follow-news"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
    ctaPrimaryHref: "/catalog",
    ctaSecondaryHref: "/onboarding",
  },
  {
    slug: "players-roster",
    cluster: 4,
    icon: "UserCheck",
    accent: "#22C55E",
    accentTo: "#3B82F6",
    related: ["team-workspace", "regulations-documents", "team-registration"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
  },
  {
    slug: "team-shop",
    cluster: 4,
    icon: "ShoppingBag",
    accent: "#22C55E",
    accentTo: "#F59E0B",
    related: ["services-packages", "team-workspace", "accommodation-logistics"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
    ctaPrimaryHref: "/catalog",
    ctaSecondaryHref: "/onboarding",
  },
  {
    slug: "follow-news",
    cluster: 4,
    icon: "Bell",
    accent: "#22C55E",
    accentTo: "#A855F7",
    related: ["tournament-website", "live-standings", "team-workspace"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
    ctaPrimaryHref: "/catalog",
    ctaSecondaryHref: "/onboarding",
  },

  // ── Cluster 5 — Доверие ────────────────────────────────────────────
  {
    slug: "catalog",
    cluster: 5,
    icon: "Search",
    accent: "#3B82F6",
    accentTo: "#2BFEBA",
    related: ["tournament-website", "org-listing", "follow-news"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
    ctaPrimaryHref: "/catalog",
    ctaSecondaryHref: "/onboarding",
  },
  {
    slug: "security-infrastructure",
    cluster: 5,
    icon: "Shield",
    accent: "#3B82F6",
    accentTo: "#8B5CF6",
    related: ["players-roster", "organizer-dashboard", "team-workspace"],
    featureCount: 6, faqCount: 4, forWhomCount: 4,
    published: true,
  },
];

export const ABOUT_SLUGS = ABOUT_PAGES.map((p) => p.slug);

export const ABOUT_PUBLISHED = ABOUT_PAGES.filter((p) => p.published);
export const ABOUT_PUBLISHED_SLUGS = ABOUT_PUBLISHED.map((p) => p.slug);

export function getAboutPage(slug: string): AboutPage | undefined {
  return ABOUT_PAGES.find((p) => p.slug === slug);
}

export function getPagesByCluster(
  clusterId: AboutClusterId,
  opts: { publishedOnly?: boolean } = {},
): AboutPage[] {
  return ABOUT_PAGES.filter(
    (p) => p.cluster === clusterId && (!opts.publishedOnly || p.published),
  );
}
