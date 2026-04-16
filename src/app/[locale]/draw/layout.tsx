import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ThemeProvider } from "@/components/ui/theme-provider";

/**
 * /draw — standalone Draw Show landing + wizard.
 *
 * This route is deliberately kept lean: no tournament context, no
 * admin sidebar, no auth. Its only job is to let an anonymous visitor
 * build a draw, run the presentation, and (later) pay for it. The root
 * [locale] layout already provides i18n — we just wrap children with
 * the ThemeProvider so the page respects the visitor's dark/light
 * preference.
 *
 * OG metadata is tuned for a landing page rather than for the app, so
 * social sharing surfaces the product pitch instead of the generic
 * platform description.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "drawLanding" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      type: "website",
    },
  };
}

export default function DrawStandaloneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
