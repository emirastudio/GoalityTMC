import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ABOUT_PUBLISHED_SLUGS, getAboutPage } from "@/lib/about/content";
import { AboutFeaturePage } from "@/components/about/about-feature-page";

type RouteParams = { locale: string; slug: string };

const SITE = "https://goalityfootball.com";

export function generateStaticParams() {
  // Only published pages × locales. New clusters opt in via `published: true`
  // in src/lib/about/content.ts.
  return routing.locales.flatMap((locale) =>
    ABOUT_PUBLISHED_SLUGS.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = getAboutPage(slug);
  if (!page) return {};

  const t = await getTranslations({
    locale,
    namespace: `about.pages.${slug}`,
  });

  const title = t("metaTitle");
  const description = t("metaDesc");
  const url = `${SITE}/${locale}/about/${slug}`;

  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = `${SITE}/${l}/about/${slug}`;
  }
  languages["x-default"] = `${SITE}/${routing.defaultLocale}/about/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url, languages },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: "Goality TMC",
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function AboutSlugPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { locale, slug } = await params;
  const page = getAboutPage(slug);
  if (!page || !page.published) notFound();

  setRequestLocale(locale);

  const t = await getTranslations({
    locale,
    namespace: `about.pages.${slug}`,
  });

  // FAQPage JSON-LD — strong SEO signal, eligible for rich results.
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: Array.from({ length: page.faqCount }, (_, i) => i + 1).map(
      (n) => ({
        "@type": "Question",
        name: t(`q${n}`),
        acceptedAnswer: {
          "@type": "Answer",
          text: t(`a${n}`),
        },
      }),
    ),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "About",
        item: `${SITE}/${locale}/about`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: t("heroH1"),
        item: `${SITE}/${locale}/about/${slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <AboutFeaturePage page={page} />
    </>
  );
}

