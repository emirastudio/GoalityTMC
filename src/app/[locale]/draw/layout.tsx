import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { routing } from "@/i18n/routing";

/**
 * /draw — standalone Draw Show landing + wizard.
 *
 * This route is deliberately kept lean: no tournament context, no
 * admin sidebar, no auth. Its only job is to let an anonymous visitor
 * build a draw, run the presentation, and (later) pay for it. The
 * root [locale] layout already provides i18n — here we wrap children
 * with the ThemeProvider and attach rich SEO metadata so the page
 * competes for the tournament-draw keyword set on search engines.
 *
 * Important for SEO:
 *   - Metadata title/description pulled from locale files (keyword
 *     density handled per-language via drawLandingSeo.* keys).
 *   - Open Graph + Twitter card so shares render a nice preview.
 *   - alternates.languages set for every supported locale so search
 *     engines can serve the right-language result to the right user.
 *   - JSON-LD SoftwareApplication schema injected into the landing
 *     page itself (see DrawLanding) for structured-data eligibility.
 */

const BASE_URL = "https://goality.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "drawLandingSeo" });
  const title = t("title");
  const description = t("description");
  const keywords = t("keywords");

  const canonical = `${BASE_URL}/${locale}/draw`;
  const alternates: Record<string, string> = {};
  for (const l of routing.locales) alternates[l] = `${BASE_URL}/${l}/draw`;

  return {
    title,
    description,
    keywords,
    // Helpful for multi-language competition on the same query.
    alternates: {
      canonical,
      languages: alternates,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      siteName: "Goality TMC",
      locale: localeToOg(locale),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    // Let search bots know this page is fully public.
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

function localeToOg(locale: string): string {
  switch (locale) {
    case "ru":
      return "ru_RU";
    case "et":
      return "et_EE";
    default:
      return "en_US";
  }
}

export default function DrawStandaloneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
