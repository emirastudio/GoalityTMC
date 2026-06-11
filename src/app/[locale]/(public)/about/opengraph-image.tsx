/**
 * OG image for the /about hub page (per locale).
 *
 * Shows the big "About Goality TMC" headline in brand mint→cyan
 * gradient. One image per locale, statically generated at build.
 */

import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "Goality TMC";

type RouteParams = { locale: string };

export async function generateImageMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) return [];
  return [{ id: "og", size, contentType, alt }];
}

export default async function OgImage({ params }: { params: Promise<RouteParams> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about.hub" });
  const accent = "#2BFEBA";
  const accentTo = "#00E5FF";
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
          padding: "80px 90px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0B1015",
              fontWeight: 900,
              fontSize: 30,
            }}
          >
            G
          </div>
          <span style={{ fontSize: 30, fontWeight: 800 }}>Goality TMC</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: accent,
            }}
          >
            {t("heroEyebrow")}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 20,
              fontSize: 92,
              lineHeight: 1.05,
              fontWeight: 900,
              letterSpacing: -2,
            }}
          >
            <span>{t("heroH1")}</span>
            <span
              style={{
                backgroundImage: gradient,
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {t("heroH1Highlight")}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#9CA3AF",
              maxWidth: 1000,
              lineHeight: 1.3,
            }}
          >
            Tournament Management Cloud — 22 deep-dive pages.
          </div>
        </div>

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
          <span>goalityfootball.com/{locale}/about</span>
          <span style={{ color: accent, fontWeight: 800 }}>Play. Grow. Win.</span>
        </div>
      </div>
    ),
    size,
  );
}
