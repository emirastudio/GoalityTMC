/**
 * Dynamic Open Graph image for /about/[slug] pages.
 *
 * Renders a 1200×630 PNG per locale + slug:
 *   • Page-specific accent gradient (matches the page header)
 *   • Tournament-management eyebrow ("ABOUT GOALITY TMC")
 *   • The hero H1 (with the highlight word in gradient)
 *   • Cluster label as a tag
 *   • Goality brand mark + URL footer
 *
 * Statically generated at build for every (locale, slug) pair returned
 * by generateImageMetadata — the same set the page itself prerenders.
 *
 * Next.js wires the right <meta property="og:image"> automatically;
 * the same handler also covers twitter-image via re-export.
 */

import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import {
  ABOUT_PUBLISHED_SLUGS,
  getAboutPage,
  ABOUT_CLUSTERS,
} from "@/lib/about/content";
import { routing } from "@/i18n/routing";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "Goality TMC";

type RouteParams = { locale: string; slug: string };

export async function generateImageMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { locale, slug } = await params;
  // Only published pages need an OG image — same gating as the page itself.
  if (!ABOUT_PUBLISHED_SLUGS.includes(slug)) return [];
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) return [];
  return [{ id: "og", size, contentType, alt }];
}

export default async function OgImage({ params }: { params: Promise<RouteParams> }) {
  const { locale, slug } = await params;
  const page = getAboutPage(slug);
  if (!page) {
    return new ImageResponse(<div>Not found</div>, size);
  }

  const cluster = ABOUT_CLUSTERS.find((c) => c.id === page.cluster)!;
  const t = await getTranslations({ locale, namespace: `about.pages.${slug}` });
  const tc = await getTranslations({ locale, namespace: "about.common" });

  const heroH1 = t("heroH1");
  const highlight = t("heroH1Highlight");
  const clusterLabel = tc(`clusterLabels.${cluster.key}`);
  const eyebrow = t("heroEyebrow");

  const accent = page.accent;
  const accentTo = page.accentTo;
  // Background: dark + radial accent glows in two corners
  const bg = `radial-gradient(900px 600px at 85% 5%, ${accent}33, transparent 60%), radial-gradient(700px 500px at 5% 95%, ${accentTo}22, transparent 70%), #0B1015`;
  const gradient = `linear-gradient(135deg, ${accent}, ${accentTo})`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: bg,
          color: "#FFFFFF",
          fontFamily: "sans-serif",
          padding: "70px 80px",
        }}
      >
        {/* Top row: brand mark + cluster tag */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: 0.5,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0B1015",
                fontWeight: 900,
              }}
            >
              G
            </div>
            <span>Goality TMC</span>
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              borderRadius: 999,
              background: `${accent}22`,
              border: `1px solid ${accent}66`,
              color: accent,
              fontSize: 22,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            {clusterLabel}
          </div>
        </div>

        {/* Middle: eyebrow + H1 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: accent,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              fontSize: 74,
              lineHeight: 1.05,
              fontWeight: 900,
              letterSpacing: -1,
              maxWidth: 1040,
            }}
          >
            <span>{heroH1}</span>
            {highlight && (
              <span
                style={{
                  backgroundImage: gradient,
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {highlight}
              </span>
            )}
          </div>
        </div>

        {/* Bottom: URL */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#9CA3AF",
            borderTop: "1px solid #1F2937",
            paddingTop: 22,
            width: "100%",
          }}
        >
          <span>goalityfootball.com/{locale}/about/{slug}</span>
          <span style={{ color: accent, fontWeight: 800 }}>Play. Grow. Win.</span>
        </div>
      </div>
    ),
    size,
  );
}
