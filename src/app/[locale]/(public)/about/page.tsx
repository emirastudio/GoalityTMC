import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { AboutHub } from "@/components/about/about-hub";

const SITE = "https://goalityfootball.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about.hub" });
  const url = `${SITE}/${locale}/about`;

  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `${SITE}/${l}/about`;
  languages["x-default"] = `${SITE}/${routing.defaultLocale}/about`;

  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
    alternates: { canonical: url, languages },
    openGraph: {
      type: "website",
      url,
      title: t("metaTitle"),
      description: t("metaDesc"),
      siteName: "Goality TMC",
      locale,
    },
  };
}

export default async function AboutHubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AboutHub />;
}
